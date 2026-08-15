import 'server-only';

export async function getCustomerOrderById(
  supabase: any,
  customerId: string,
  identifier: string
): Promise<{
  success: boolean;
  data?: {
    order_number: string;
    total_amount: number;
    status: string;
    courier_name: string | null;
    tracking_number: string | null;
    items: Array<{
      id: string;
      product_name: string;
      selling_price: number;
      image_url: string | null;
    }>;
  };
  error?: string;
}> {
  try {
    const trimmed = (identifier || '').trim();
    if (!trimmed) {
      return { success: false, error: 'Order not found' };
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const orderNumberRegex = /^SHR-\d{8}$/i;

    let query = supabase
      .from('orders')
      .select('order_number, total_amount, status, courier_name, tracking_number, items:order_items(id, product_name, selling_price, image_url)')
      .eq('user_id', customerId);

    if (uuidRegex.test(trimmed)) {
      query = query.eq('id', trimmed);
    } else if (orderNumberRegex.test(trimmed)) {
      query = query.eq('order_number', trimmed.toUpperCase());
    } else {
      return { success: false, error: 'Order not found' };
    }

    const { data: order, error } = await query.maybeSingle();

    if (error || !order) {
      return { success: false, error: 'Order not found' };
    }

    return {
      success: true,
      data: {
        order_number: order.order_number,
        total_amount: Number(order.total_amount || 0),
        status: order.status,
        courier_name: order.courier_name,
        tracking_number: order.tracking_number,
        items: (order.items || []).map((item: any) => ({
          id: item.id,
          product_name: item.product_name,
          selling_price: Number(item.selling_price || 0),
          image_url: item.image_url
        }))
      }
    };
  } catch {
    return { success: false, error: 'Order not found' };
  }
}
