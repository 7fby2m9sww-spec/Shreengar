-- Migration: Transactional Order Placement & Idempotent Stock Restoration (Sprint 3.2)
-- Description: Implement database-level PL/pgSQL transactions to ensure order creation and stock decrements are atomic,
--              and stock restoration upon order status update is idempotent and concurrency-safe.

-- Create order number sequence if not exists
CREATE SEQUENCE IF NOT EXISTS public.order_number_seq START WITH 100000;

-- A. Alter inventory_transactions to support order-specific permanent idempotency tracking
ALTER TABLE public.inventory_transactions
ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS order_item_id UUID REFERENCES public.order_items(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS operation_key TEXT;

-- B. Create unique index to permanently enforce operation-key idempotency
CREATE UNIQUE INDEX IF NOT EXISTS inventory_transactions_op_key_uniq 
ON public.inventory_transactions (operation_key) 
WHERE operation_key IS NOT NULL;


-- C. RPC: Atomic Order Placement
CREATE OR REPLACE FUNCTION public.place_order_atomic(
  p_user_id UUID,
  p_shipping_address_id UUID,
  p_billing_address_id UUID,
  p_coupon_code VARCHAR,
  p_payment_method VARCHAR,
  p_cart_items JSONB -- [{variant_id: UUID, quantity: INT}]
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order_id UUID;
  v_order_number VARCHAR;
  v_item RECORD;
  v_variant_id UUID;
  v_qty INT;
  v_inv_id UUID;
  v_current_qty INT;
  v_new_qty INT;
  
  -- Product and Variant fields
  v_product_id UUID;
  v_product_name VARCHAR;
  v_product_slug VARCHAR;
  v_sku VARCHAR;
  v_size_name VARCHAR;
  v_color_name VARCHAR;
  v_image_url TEXT;
  v_mrp NUMERIC;
  v_selling_price NUMERIC;
  v_category_id UUID;
  v_collection_id UUID;
  
  -- Financial variables
  v_subtotal NUMERIC := 0;
  v_coupon_eligible_subtotal NUMERIC := 0;
  v_discount_amount NUMERIC := 0;
  v_shipping_charge NUMERIC := 0;
  v_total_amount NUMERIC := 0;
  v_item_total NUMERIC;
  
  -- Customer profiles variables
  v_customer_name VARCHAR;
  v_customer_email VARCHAR;
  v_customer_phone VARCHAR;
  
  -- Shipping address variables
  v_ship_name VARCHAR;
  v_ship_phone VARCHAR;
  v_ship_line1 TEXT;
  v_ship_line2 TEXT;
  v_ship_landmark TEXT;
  v_ship_city VARCHAR;
  v_ship_state VARCHAR;
  v_ship_country VARCHAR;
  v_ship_postal_code VARCHAR;
  
  -- Billing address variables
  v_bill_name VARCHAR;
  v_bill_phone VARCHAR;
  v_bill_line1 TEXT;
  v_bill_line2 TEXT;
  v_bill_landmark TEXT;
  v_bill_city VARCHAR;
  v_bill_state VARCHAR;
  v_bill_country VARCHAR;
  v_bill_postal_code VARCHAR;

  -- Coupon variables
  v_coupon_id UUID := NULL;
  v_user_used_count INT;
  v_c_active BOOLEAN;
  v_c_starts_at TIMESTAMPTZ;
  v_c_expires_at TIMESTAMPTZ;
  v_c_min_amount NUMERIC;
  v_c_max_discount NUMERIC;
  v_c_usage_limit INT;
  v_c_used_count INT;
  v_c_usage_per_user INT;
  v_c_discount_type VARCHAR;
  v_c_discount_value NUMERIC;
  v_c_app_cat_id UUID;
  v_c_app_coll_id UUID;
  
  v_order_item_id UUID;
  v_op_key TEXT;
  v_is_eligible BOOLEAN;
BEGIN
  -- 1. Reject empty cart
  IF p_cart_items IS NULL OR jsonb_array_length(p_cart_items) = 0 THEN
    RAISE EXCEPTION 'Cart is empty';
  END IF;

  -- 2. Validate payment method parameter
  IF p_payment_method NOT IN ('upi', 'card', 'cod') THEN
    RAISE EXCEPTION 'Invalid payment method: %', p_payment_method;
  END IF;

  -- 3. Load authoritative Customer profile details
  SELECT 
    COALESCE(first_name || ' ' || last_name, 'Customer'), email, phone
  INTO
    v_customer_name, v_customer_email, v_customer_phone
  FROM public.profiles
  WHERE id = p_user_id;

  IF v_customer_email IS NULL THEN
    RAISE EXCEPTION 'Customer profile not found';
  END IF;

  -- 4. Load authoritative Shipping Address (verifying ownership)
  SELECT 
    full_name, phone, address_line1, address_line2, landmark, city, state, country, postal_code
  INTO
    v_ship_name, v_ship_phone, v_ship_line1, v_ship_line2, v_ship_landmark, v_ship_city, v_ship_state, v_ship_country, v_ship_postal_code
  FROM public.addresses
  WHERE id = p_shipping_address_id AND user_id = p_user_id;

  IF v_ship_name IS NULL THEN
    RAISE EXCEPTION 'Shipping address not found or does not belong to the user';
  END IF;

  -- 5. Load authoritative Billing Address (verifying ownership)
  SELECT 
    full_name, phone, address_line1, address_line2, landmark, city, state, country, postal_code
  INTO
    v_bill_name, v_bill_phone, v_bill_line1, v_bill_line2, v_bill_landmark, v_bill_city, v_bill_state, v_bill_country, v_bill_postal_code
  FROM public.addresses
  WHERE id = p_billing_address_id AND user_id = p_user_id;

  IF v_bill_name IS NULL THEN
    RAISE EXCEPTION 'Billing address not found or does not belong to the user';
  END IF;

  -- 6. Pre-calculate subtotal
  FOR v_item IN 
    SELECT (val->>'variant_id')::UUID AS variant_id, SUM((val->>'quantity')::INT)::INT AS quantity
    FROM jsonb_array_elements(p_cart_items) AS val
    GROUP BY (val->>'variant_id')
  LOOP
    v_variant_id := v_item.variant_id;
    v_qty := v_item.quantity;

    IF v_qty IS NULL OR v_qty <= 0 THEN
      RAISE EXCEPTION 'Quantity must be a positive integer';
    END IF;

    -- Fetch variant price and details (rejecting inactive items)
    SELECT 
        pv.product_id,
        COALESCE(pv.selling_price, p.selling_price)
    INTO
        v_product_id, v_selling_price
    FROM 
        public.product_variants pv
    JOIN 
        public.products p ON p.id = pv.product_id
    WHERE 
        pv.id = v_variant_id 
        AND pv.is_active = true 
        AND p.is_active = true;

    IF v_product_id IS NULL THEN
      RAISE EXCEPTION 'Variant ID % does not exist or is inactive', v_variant_id;
    END IF;

    v_subtotal := v_subtotal + (v_selling_price * v_qty);
  END LOOP;

  -- 7. Coupon Validation & Locking (FOR UPDATE)
  IF p_coupon_code IS NOT NULL AND TRIM(p_coupon_code) <> '' THEN
    SELECT 
      id, is_active, starts_at, expires_at, minimum_order_amount, maximum_discount,
      usage_limit, used_count, usage_per_user, discount_type, discount_value,
      applicable_category_id, applicable_collection_id
    INTO
      v_coupon_id, v_c_active, v_c_starts_at, v_c_expires_at, v_c_min_amount, v_c_max_discount,
      v_c_usage_limit, v_c_used_count, v_c_usage_per_user, v_c_discount_type, v_c_discount_value,
      v_c_app_cat_id, v_c_app_coll_id
    FROM public.coupons
    WHERE code = p_coupon_code AND is_active = true
    FOR UPDATE; -- Concurrency Safe Row Locking

    IF v_coupon_id IS NULL THEN
      RAISE EXCEPTION 'Coupon is invalid or inactive';
    END IF;

    -- Validate starts and expiry dates
    IF (v_c_starts_at IS NOT NULL AND v_c_starts_at > NOW()) OR (v_c_expires_at IS NOT NULL AND v_c_expires_at < NOW()) THEN
      RAISE EXCEPTION 'Coupon has expired or is not yet active';
    END IF;

    -- Validate minimum order amount
    IF v_subtotal < COALESCE(v_c_min_amount, 0) THEN
      RAISE EXCEPTION 'Minimum order amount for coupon not met. Required: %', v_c_min_amount;
    END IF;

    -- Validate total usage limit
    IF v_c_usage_limit IS NOT NULL AND v_c_used_count >= v_c_usage_limit THEN
      RAISE EXCEPTION 'Coupon total usage limit reached';
    END IF;

    -- Validate user-specific usage limit
    SELECT COUNT(*) INTO v_user_used_count
    FROM public.coupon_usage
    WHERE coupon_id = v_coupon_id AND user_id = p_user_id;

    IF v_c_usage_per_user IS NOT NULL AND v_user_used_count >= v_c_usage_per_user THEN
      RAISE EXCEPTION 'Coupon usage limit per customer exceeded';
    END IF;

    -- Validate category/collection eligibility and compute eligible subtotal
    FOR v_item IN 
      SELECT (val->>'variant_id')::UUID AS variant_id, SUM((val->>'quantity')::INT)::INT AS quantity
      FROM jsonb_array_elements(p_cart_items) AS val
      GROUP BY (val->>'variant_id')
    LOOP
      SELECT 
          p.category_id, p.collection_id, COALESCE(pv.selling_price, p.selling_price)
      INTO 
          v_category_id, v_collection_id, v_selling_price
      FROM public.product_variants pv
      JOIN public.products p ON p.id = pv.product_id
      WHERE pv.id = v_item.variant_id;

      v_is_eligible := true;
      IF v_c_app_cat_id IS NOT NULL AND v_category_id <> v_c_app_cat_id THEN
        v_is_eligible := false;
      END IF;
      IF v_c_app_coll_id IS NOT NULL AND v_collection_id <> v_c_app_coll_id THEN
        v_is_eligible := false;
      END IF;

      IF v_is_eligible THEN
        v_coupon_eligible_subtotal := v_coupon_eligible_subtotal + (v_selling_price * v_item.quantity);
      END IF;
    END LOOP;

    IF v_coupon_eligible_subtotal = 0 THEN
      RAISE EXCEPTION 'Coupon is not applicable to any item in your cart';
    END IF;

    -- Calculate coupon discount on eligible subtotal
    IF v_c_discount_type = 'percentage' THEN
      v_discount_amount := (v_coupon_eligible_subtotal * v_c_discount_value) / 100.0;
      IF v_c_max_discount IS NOT NULL THEN
        v_discount_amount := LEAST(v_discount_amount, v_c_max_discount);
      END IF;
    ELSE
      v_discount_amount := v_c_discount_value;
    END IF;

    v_discount_amount := LEAST(v_discount_amount, v_coupon_eligible_subtotal);
  END IF;

  -- 8. Shipping Charge Calculation
  -- Rule: Free shipping above ₹999; ₹100 standard shipping otherwise.
  -- Note: Weight/postcode/courier rates are not implemented at checkout yet.
  v_shipping_charge := CASE WHEN v_subtotal > 999 THEN 0 ELSE 100 END;

  -- Derive final order total
  v_total_amount := v_subtotal - v_discount_amount + v_shipping_charge;
  IF v_total_amount < 0 THEN
    v_total_amount := 0;
  END IF;

  -- 9. Generate order number securely using DB sequence
  v_order_number := 'SHR-' || to_char(nextval('public.order_number_seq'), 'FM00000000');

  -- 10. Create the Order (initial payment_status is always pending)
  INSERT INTO public.orders (
    order_number, user_id, shipping_address_id, billing_address_id, coupon_id,
    customer_name, customer_email, customer_phone,
    shipping_name, shipping_phone, shipping_address_line1, shipping_address_line2, shipping_landmark, shipping_city, shipping_state, shipping_country, shipping_postal_code,
    billing_name, billing_phone, billing_address_line1, billing_address_line2, billing_landmark, billing_city, billing_state, billing_country, billing_postal_code,
    subtotal, discount_amount, shipping_fee, tax_amount, total_amount,
    status, payment_status, payment_method
  ) VALUES (
    v_order_number, p_user_id, p_shipping_address_id, p_billing_address_id, v_coupon_id,
    v_customer_name, v_customer_email, v_customer_phone,
    v_ship_name, v_ship_phone, v_ship_line1, v_ship_line2, v_ship_landmark, v_ship_city, v_ship_state, v_ship_country, v_ship_postal_code,
    v_bill_name, v_bill_phone, v_bill_line1, v_bill_line2, v_bill_landmark, v_bill_city, v_bill_state, v_bill_country, v_bill_postal_code,
    v_subtotal, v_discount_amount, v_shipping_charge, 0, v_total_amount,
    'pending', 'pending', p_payment_method
  ) RETURNING id INTO v_order_id;

  -- 11. Record coupon usage if applicable
  IF v_coupon_id IS NOT NULL THEN
    UPDATE public.coupons 
    SET used_count = used_count + 1 
    WHERE id = v_coupon_id;

    INSERT INTO public.coupon_usage (
      coupon_id, user_id, order_id, discount_amount, order_amount, coupon_code, applied_at
    ) VALUES (
      v_coupon_id, p_user_id, v_order_id, v_discount_amount, v_subtotal, p_coupon_code, NOW()
    );
  END IF;

  -- 12. Loop through cart items again to decrement inventory and create order items
  FOR v_item IN 
    SELECT (val->>'variant_id')::UUID AS variant_id, SUM((val->>'quantity')::INT)::INT AS quantity
    FROM jsonb_array_elements(p_cart_items) AS val
    GROUP BY (val->>'variant_id')
  LOOP
    v_variant_id := v_item.variant_id;
    v_qty := v_item.quantity;

    -- Fetch authoritative details inside transaction
    SELECT 
        pv.product_id,
        p.name,
        p.slug,
        pv.sku,
        sz.name,
        col.name,
        p.mrp,
        COALESCE(pv.selling_price, p.selling_price)
    INTO
        v_product_id, v_product_name, v_product_slug, v_sku, 
        v_size_name, v_color_name, v_mrp, v_selling_price
    FROM 
        public.product_variants pv
    JOIN 
        public.products p ON p.id = pv.product_id
    LEFT JOIN 
        public.sizes sz ON sz.id = pv.size_id
    LEFT JOIN 
        public.colors col ON col.id = pv.color_id
    WHERE 
        pv.id = v_variant_id AND pv.is_active = true AND p.is_active = true;

    -- Fetch authoritative image url
    SELECT image_url INTO v_image_url
    FROM public.product_images
    WHERE product_id = v_product_id
    ORDER BY is_primary DESC, display_order ASC, created_at ASC
    LIMIT 1;

    -- Calculate total amount for this item
    v_item_total := v_selling_price * v_qty;

    -- Lock inventory row using SELECT ... FOR UPDATE
    SELECT id, quantity INTO v_inv_id, v_current_qty
    FROM public.inventory
    WHERE variant_id = v_variant_id
    FOR UPDATE;

    -- Confirm sufficient stock availability
    IF v_current_qty < v_qty THEN
      RAISE EXCEPTION 'Insufficient stock for product "%". Only % left in stock.', v_product_name, v_current_qty;
    END IF;

    -- Decrement stock and prevent quantity from becoming negative
    v_new_qty := v_current_qty - v_qty;
    IF v_new_qty < 0 THEN
      RAISE EXCEPTION 'Stock for variant SKU % cannot become negative', v_sku;
    END IF;

    UPDATE public.inventory
    SET 
      quantity = v_new_qty,
      stock_status = CASE WHEN v_new_qty > 0 THEN 'in_stock' ELSE 'out_of_stock' END,
      updated_at = NOW()
    WHERE id = v_inv_id;

    -- Insert order item with static snapshots
    INSERT INTO public.order_items (
      order_id, product_id, variant_id, product_name, product_slug, sku,
      size_name, color_name, image_url, quantity, mrp, selling_price,
      discount_amount, tax_amount, total_amount
    ) VALUES (
      v_order_id, v_product_id, v_variant_id, v_product_name, v_product_slug, v_sku,
      v_size_name, v_color_name, v_image_url, v_qty, v_mrp, v_selling_price,
      0, 0, v_item_total
    ) RETURNING id INTO v_order_item_id;

    -- Construct unique checkout operation key
    v_op_key := 'checkout:' || v_order_id::TEXT || ':' || v_order_item_id::TEXT;

    -- Insert inventory transaction row with permanent operation key
    INSERT INTO public.inventory_transactions (
      inventory_id, variant_id, previous_quantity, new_quantity, change_amount, reason, order_id, order_item_id, operation_key, created_at
    ) VALUES (
      v_inv_id, v_variant_id, v_current_qty, v_new_qty, -v_qty, 'Order Checkout', v_order_id, v_order_item_id, v_op_key, NOW()
    );
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'order_number', v_order_number,
    'total_amount', v_total_amount
  );
END;
$$;


-- D. RPC: Atomic & Idempotent Order Status Update with Stock Restoration
CREATE OR REPLACE FUNCTION public.update_order_status_atomic(
  p_order_id UUID,
  p_new_status VARCHAR,
  p_tracking_number VARCHAR DEFAULT NULL,
  p_courier_name VARCHAR DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_current_status VARCHAR;
  v_item RECORD;
  v_inv_id UUID;
  v_current_qty INT;
  v_new_qty INT;
  v_restore_key TEXT;
  v_checkout_key TEXT;
BEGIN
  -- 1. Lock the order row before checking status
  SELECT status INTO v_current_status
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF v_current_status IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  -- 2. Validate that the requested transition is allowed by order state matrix
  IF NOT (
    (v_current_status = 'pending' AND p_new_status IN ('confirmed', 'cancelled')) OR
    (v_current_status = 'confirmed' AND p_new_status IN ('processing', 'cancelled')) OR
    (v_current_status = 'processing' AND p_new_status IN ('packed', 'cancelled')) OR
    (v_current_status = 'packed' AND p_new_status IN ('shipped', 'cancelled')) OR
    (v_current_status = 'shipped' AND p_new_status IN ('delivered', 'returned')) OR
    (v_current_status = 'delivered' AND p_new_status IN ('returned', 'refunded')) OR
    (v_current_status = 'returned' AND p_new_status = 'refunded') OR
    (v_current_status = p_new_status)
  ) THEN
    RAISE EXCEPTION 'Invalid order status transition from % to %', v_current_status, p_new_status;
  END IF;

  -- 3. Update the order status, tracking, and timestamps
  UPDATE public.orders
  SET 
    status = p_new_status,
    tracking_number = COALESCE(p_tracking_number, tracking_number),
    courier_name = COALESCE(p_courier_name, courier_name),
    updated_at = NOW(),
    shipped_at = CASE WHEN p_new_status = 'shipped' THEN NOW() ELSE shipped_at END,
    delivered_at = CASE WHEN p_new_status = 'delivered' THEN NOW() ELSE delivered_at END,
    cancelled_at = CASE WHEN p_new_status = 'cancelled' THEN NOW() ELSE cancelled_at END
  WHERE id = p_order_id;

  -- 4. Restore stock if status becomes cancelled or returned
  IF p_new_status IN ('cancelled', 'returned') THEN
    FOR v_item IN 
      SELECT id, variant_id, quantity
      FROM public.order_items
      WHERE order_id = p_order_id
    LOOP
      IF v_item.variant_id IS NOT NULL THEN
        -- Construct keys
        v_checkout_key := 'checkout:' || p_order_id::TEXT || ':' || v_item.id::TEXT;
        v_restore_key := 'restore:' || p_order_id::TEXT || ':' || v_item.id::TEXT;

        -- A. Verify that stock was originally decremented for this item
        -- B. Verify that a restoration transaction does NOT already exist
        IF EXISTS (SELECT 1 FROM public.inventory_transactions WHERE operation_key = v_checkout_key)
           AND NOT EXISTS (SELECT 1 FROM public.inventory_transactions WHERE operation_key = v_restore_key) 
        THEN
          -- Lock inventory row
          SELECT id, quantity INTO v_inv_id, v_current_qty
          FROM public.inventory
          WHERE variant_id = v_item.variant_id
          FOR UPDATE;

          IF v_inv_id IS NOT NULL THEN
            v_new_qty := v_current_qty + v_item.quantity;
            
            -- Update stock quantity
            UPDATE public.inventory
            SET 
              quantity = v_new_qty,
              stock_status = 'in_stock',
              updated_at = NOW()
            WHERE id = v_inv_id;

            -- Insert permanent restoration transaction record
            INSERT INTO public.inventory_transactions (
              inventory_id, variant_id, previous_quantity, new_quantity, change_amount, reason, order_id, order_item_id, operation_key, created_at
            ) VALUES (
              v_inv_id, v_item.variant_id, v_current_qty, v_new_qty, v_item.quantity, 
              CASE WHEN p_new_status = 'cancelled' THEN 'Order Cancellation' ELSE 'Customer Return' END, 
              p_order_id, v_item.id, v_restore_key, NOW()
            );
          END IF;
        END IF;
      END IF;
    END LOOP;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;


-- E. Set RPC execute permissions and authorization rules
REVOKE EXECUTE ON FUNCTION public.place_order_atomic(UUID, UUID, UUID, VARCHAR, VARCHAR, JSONB) FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_order_status_atomic(UUID, VARCHAR, VARCHAR, VARCHAR) FROM public, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.place_order_atomic(UUID, UUID, UUID, VARCHAR, VARCHAR, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_order_status_atomic(UUID, VARCHAR, VARCHAR, VARCHAR) TO service_role;
