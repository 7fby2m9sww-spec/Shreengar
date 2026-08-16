export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface UserProfile {
  id: string
  email: string
  full_name: string | null
  phone: string | null
  gender?: string | null
  avatar_url?: string | null
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  image_url: string | null
  parent_id: string | null
  display_order?: number
  is_active?: boolean
  created_at: string
  updated_at: string
}

export interface Collection {
  id: string
  name: string
  slug: string
  description: string | null
  image_url: string | null
  is_featured: boolean
  status: 'draft' | 'published' | 'archived'
  sort_order: number
  seo_title: string | null
  seo_description: string | null
  created_at: string
  updated_at?: string
  published_at?: string | null
  product_count?: number
}

export interface Product {
  id: string
  title: string
  slug: string
  sku: string
  price: number
  compare_at_price: number | null
  category_id: string | null
  collection_id: string | null
  category?: { name: string }
  collection?: { name: string }
  fabric: string | null
  occasion: string | null
  care_instructions: string | null
  description: string
  details: string[] | null
  short_description?: string | null
  material?: string | null
  fit?: string | null
  sleeve_type?: string | null
  neck_type?: string | null
  pattern?: string | null
  color_name?: string | null
  rating: number
  reviews_count: number
  images: string[]
  is_bestseller: boolean
  is_new_arrival: boolean
  is_active: boolean
  show_storefront_stock_message?: boolean
  storefront_stock_message_quantity?: number
  is_returnable?: boolean
  delivery_available?: boolean
  show_delivery_estimate?: boolean
  showroom_collection_only?: boolean
  pickup_available?: boolean
  free_delivery?: boolean
  delivery_min_days?: number | null
  delivery_max_days?: number | null
  delivery_message?: string | null
  status?: string | null
  cod_available?: boolean
  express_delivery_available?: boolean
  return_window_days?: number | null
  return_policy_message?: string | null
  exchange_allowed?: boolean
  show_color_option?: boolean
  storefront_default_color_id?: string | null
  product_family_id?: string | null
  primary_color_id?: string | null
  primary_color_name?: string | null
  primary_color_hex?: string | null
  colorway_sort_order?: number
  family_name?: string | null
  linked_colourways?: LinkedColourway[]
  shipping_weight_grams?: number | null
  parcel_length_cm?: number | null
  parcel_width_cm?: number | null
  parcel_height_cm?: number | null
  created_at: string
  updated_at: string
}

export interface ProductFamily {
  id: string
  name: string
  category_id?: string | null
  categoryId?: string | null
  categoryName?: string | null
  internal_reference?: string | null
  internalReference?: string | null
  is_active: boolean
  isActive?: boolean
  created_at: string
  createdAt?: string
  updated_at: string
  updatedAt?: string
}

export interface ProductFamilyOption {
  id: string
  name: string
  categoryId: string | null
  categoryName: string | null
  isActive: boolean
}

export type ProductFamilyFormState = {
  productFamilyId: string | null;
  primaryColorId: string | null;
  colorwaySortOrder: number;
  showColorOption: boolean;
};

export interface LinkedColourway {
  id: string
  title: string
  slug: string
  price: number
  mrp: number
  primary_image: string
  primary_color_id?: string | null
  color_name?: string | null
  color_code?: string | null
  colorway_sort_order: number
  is_active: boolean
  stock_summary?: number
}

export interface AdminProduct {
  id: string
  title: string
  slug: string
  sku: string
  sellingPrice: number
  mrp: number
  category_id: string | null
  categoryName: string
  collection_id: string | null
  fabric: string | null
  occasion: string | null
  care_instructions: string | null
  description: string
  details: string[] | null
  short_description?: string | null
  material?: string | null
  fit?: string | null
  sleeve_type?: string | null
  neck_type?: string | null
  pattern?: string | null
  color_name?: string | null
  images: ProductImageState[]
  rating: number
  reviews_count: number
  is_bestseller: boolean
  is_new_arrival: boolean
  featured: boolean
  trending: boolean
  is_active: boolean
  show_storefront_stock_message?: boolean
  storefront_stock_message_quantity?: number
  status?: string | null
  is_returnable?: boolean
  delivery_available?: boolean
  show_delivery_estimate?: boolean
  showroom_collection_only?: boolean
  pickup_available?: boolean
  free_delivery?: boolean
  delivery_min_days?: number | null
  delivery_max_days?: number | null
  delivery_message?: string | null
  cod_available?: boolean
  express_delivery_available?: boolean
  return_window_days?: number | null
  return_policy_message?: string | null
  exchange_allowed?: boolean
  show_color_option?: boolean
  storefront_default_color_id?: string | null
  product_family_id?: string | null
  primary_color_id?: string | null
  primary_color_name?: string | null
  primary_color_hex?: string | null
  colorway_sort_order?: number
  family_name?: string | null
  linked_colourways?: LinkedColourway[]
  stock_quantity?: number
  variants?: AdminProductVariant[]
  shipping_weight_grams?: number | null
  parcel_length_cm?: number | null
  parcel_width_cm?: number | null
  parcel_height_cm?: number | null
  created_at: string
  updated_at: string
}

export interface InventoryRelation {
  id?: string
  quantity?: number | null
  reserved_quantity?: number | null
  reserved_stock?: number | null
  reorder_level?: number | null
}

export interface DbVariant {
  id: string
  product_id: string
  size: string
  color_name?: string | null
  color_code?: string | null
  size_id?: string | null
  color_id?: string | null
  sku: string
  price_override?: number | null
  is_active?: boolean | null
  is_default?: boolean | null
  inventory?: InventoryRelation[] | InventoryRelation | null
  sizes?: any
  colors?: any
  shipping_weight_grams?: number | null
}

export interface AdminProductVariant {
  id: string
  product_id: string
  size: string
  size_id?: string | null
  color_id?: string | null
  color_name?: string | null
  color_code?: string | null
  sku: string
  stock_quantity: number
  reserved_quantity: number
  available_quantity: number
  is_active: boolean
  is_default?: boolean
  inventory_id?: string | null
  shipping_weight_grams?: number | null
}

export interface ProductFormVariant {
  variantId: string | null
  inventoryId: string | null
  sizeId: string
  sizeCode: string
  colorId: string | null
  sku: string
  quantity: number
  originalQuantity: number
  reservedQuantity: number
  availableQuantity: number
  isActive: boolean
  isNew: boolean
  isSizeRemoved: boolean
  isQuantityEdited: boolean

  // Aliases for compatibility
  id?: string | null
  sizeName?: string
  size?: string
  size_id?: string | null
  color_id?: string | null
  colorName?: string | null
  color_name?: string | null
  color_code?: string | null
  price_override?: number | null
  stock_quantity?: number
  reserved_quantity?: number
  available_quantity?: number
  is_active?: boolean
  lowStockThreshold?: number
  stockStatus?: string
  reorderLevel?: number
  shipping_weight_grams?: number | null
}

export interface ProductVariant {
  id: string
  product_id: string
  size: string
  color_name: string
  color_code: string
  size_id?: string
  color_id?: string
  sku: string
  price_override: number | null
  stock_quantity: number
  reserved_quantity?: number
  is_default?: boolean
  is_active?: boolean
  created_at: string
  sizeSortOrder?: number
  availableQuantity?: number
}

export interface InventoryItem {
  id: string
  product_id: string
  variant_id: string | null
  sku: string
  stock: number
  reserved_stock: number
  reorder_level: number
  warehouse_location: string | null
  updated_at: string
}

export interface CartItem {
  id: string
  user_id: string | null
  session_id: string | null
  variant_id: string | null
  unit_price: number | null
  quantity: number
  created_at: string
  variant?: ProductVariant & { product?: Product }
}

// Enriched cart item for display (UI layer)
export interface CartDisplayItem {
  id: string
  variantId: string
  productId: string
  title: string
  sku: string
  size: string
  colorName: string
  colorCode: string
  price: number
  quantity: number
  stockQuantity: number
  image: string | null
  showColorOption?: boolean
}

// Guest cart item stored in LocalStorage
export interface LocalCartItem {
  id: string
  variantId: string
  productId: string
  title: string
  sku: string
  size: string
  colorName: string
  colorCode: string
  price: number
  quantity: number
  image: string | null
  showColorOption?: boolean
}

export interface WishlistItem {
  id: string
  user_id: string
  product_id: string
  created_at: string
  product?: Product
}

export interface ShippingAddress {
  id: string
  user_id: string
  full_name: string
  phone: string
  address_line1: string
  address_line2?: string | null
  city: string
  state: string
  postal_code: string
  country: string
  is_default: boolean
  created_at: string
}

export interface Coupon {
  id: string
  code: string
  title: string
  type: 'percentage' | 'fixed'
  value: number
  min_spend: number
  max_discount: number | null
  start_date: string
  end_date: string
  usage_limit: number | null
  used_count: number
  is_active: boolean
  
  // Targeted Rules
  target_type?: 'all' | 'products' | 'categories' | 'selected_customers' | 'first_time_buyers'
  target_product_ids?: string[]
  target_category_ids?: string[]
  target_customer_ids?: string[]
  target_customer_emails?: string[]
  first_time_only?: boolean
  created_at: string
}

export interface Order {
  id: string
  order_number: string
  user_id: string | null
  shipping_address_id: string | null
  billing_address_id: string | null
  coupon_id: string | null
  customer_name: string | null
  customer_email: string | null
  customer_phone: string | null
  shipping_name: string | null
  shipping_phone: string | null
  shipping_address_line1: string | null
  shipping_address_line2: string | null
  shipping_landmark: string | null
  shipping_city: string | null
  shipping_state: string | null
  shipping_country: string | null
  shipping_postal_code: string | null
  billing_name: string | null
  billing_phone: string | null
  billing_address_line1: string | null
  billing_address_line2: string | null
  billing_landmark: string | null
  billing_city: string | null
  billing_state: string | null
  billing_country: string | null
  billing_postal_code: string | null
  subtotal: number
  discount_amount: number
  shipping_charge: number
  tax_amount: number
  total_amount: number
  status: 'pending' | 'confirmed' | 'processing' | 'packed' | 'shipped' | 'delivered' | 'cancelled' | 'returned' | 'refunded'
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded'
  payment_method: string | null
  razorpay_order_id: string | null
  razorpay_payment_id: string | null
  stripe_payment_intent: string | null
  transaction_reference: string | null
  courier_name: string | null
  tracking_number: string | null
  estimated_delivery: string | null
  shipped_at: string | null
  delivered_at: string | null
  cancelled_at: string | null
  cancellation_reason: string | null
  refunded_amount: number | null
  refunded_at: string | null
  customer_note: string | null
  admin_note: string | null
  created_at: string
  updated_at: string
  items?: OrderItem[]
  payments?: Payment[]
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  variant_id: string | null
  product_name: string | null
  product_slug: string | null
  sku: string | null
  size_name: string | null
  color_name: string | null
  image_url: string | null
  quantity: number
  mrp: number
  selling_price: number
  discount_amount: number
  tax_amount: number
  total_amount: number
  created_at: string
  updated_at: string
}

export interface Payment {
  id: string
  order_id: string
  payment_method: 'upi' | 'card' | 'netbanking' | 'cod'
  transaction_id: string | null
  status: 'pending' | 'completed' | 'failed' | 'refunded'
  amount: number
  paid_at: string | null
  created_at: string
}

export interface Review {
  id: string
  product_id: string
  user_id: string
  user_name: string
  user_avatar?: string | null
  rating: number
  title: string | null
  comment: string
  status: 'approved' | 'pending' | 'rejected'
  created_at: string
}

export interface Blog {
  id: string
  title: string
  slug: string
  excerpt: string | null
  content: string
  author: string
  cover_image: string | null
  tags: string[]
  published_at: string | null
  is_published: boolean
  created_at: string
  updated_at?: string
}

export interface FooterLinkItem {
  id: string
  label: string
  href: string
  enabled: boolean
  sortOrder: number
}

export interface FooterConfig {
  brand: {
    name: string
    description: string
    supportEmailLabel: string
    supportEmail: string
    businessAddressLabel: string
    businessAddress: string
    enabled: boolean
  }
  quickLinks: {
    heading: string
    enabled: boolean
    items: FooterLinkItem[]
  }
  policies: {
    heading: string
    enabled: boolean
    items: FooterLinkItem[]
  }
  newsletter: {
    heading: string
    description: string
    placeholder: string
    buttonLabel: string
    enabled: boolean
  }
  bottomBar: {
    copyrightText: string
    automaticYear: boolean
    manualYear?: string
    authenticityText: string
    craftedWithText: string
    enabled: boolean
  }
}

export interface HomepageBanner {
  id: string
  title: string
  subtitle: string | null
  image_url: string
  cta_text: string
  cta_link: string
  display_order: number
  is_active: boolean
  created_at: string
}

export interface Notification {
  id: string
  user_id: string | null
  title: string
  message: string
  type: 'order' | 'promo' | 'system'
  is_read: boolean
  link: string | null
  created_at: string
}

export interface AnalyticsMetric {
  id: string
  metric_date: string
  total_sales: number
  total_orders: number
  average_order_value: number
  new_customers: number
  visitors_count: number
  created_at: string
}

export interface AdminUser {
  id: string
  user_id: string
  email: string
  full_name: string
  avatar_url: string | null
  role_id: string
  is_active: boolean
  last_login_at: string | null
  created_at: string
  role?: Role
}

export interface Role {
  id: string
  name: string
  code: string
  description: string | null
  is_system: boolean
  created_at: string
  permissions?: Permission[]
}

export interface Permission {
  id: string
  name: string
  module: string
  description: string | null
}

export interface RolePermission {
  id: string
  role_id: string
  permission_id: string
}

export interface ActivityLog {
  id: string
  user_id: string | null
  user_email: string | null
  action: string
  module: string
  details: Json | null
  ip_address: string | null
  created_at: string
}

export interface ProductImage {
  id: string
  product_id: string
  image_url: string
  storage_path: string | null
  display_order: number
  is_primary: boolean
  alt_text: string | null
  created_at: string
  updated_at: string
}

export type ExistingProductImage = {
  id: string
  product_id: string
  image_url: string
  storage_path: string | null
  display_order: number
  is_primary: boolean
  alt_text: string | null
}

export type NewUploadedImage = {
  image_url: string
  storage_path: string
  alt_text?: string
}

export type ProductImageState = 
  | (ExistingProductImage & { type: 'existing' })
  | (NewUploadedImage & { type: 'new' })

export interface StorefrontVariantOption {
  variantId: string
  sizeId: string
  sizeCode: string
  sizeName: string
  sizeSortOrder: number
  colorId: string | null
  quantity: number
  reservedQuantity: number
  availableQuantity: number
  isActive: boolean

  // Legacy fields for backward compatibility in storefront components
  id: string
  size: string
  size_id: string
  color_id: string | null
  color_name: string
  color_code: string
  sku: string
  stock_quantity: number
  reserved_quantity: number
  available_quantity: number
  is_active: boolean
  product_id: string
  price_override: number | null
  created_at: string
}
