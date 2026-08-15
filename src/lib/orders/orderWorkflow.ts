import type { Order } from '@/types/database'

export type OrderStatus = Order['status']
export type PaymentStatus = Order['payment_status']

// Temporary Transition Map:
// 1. Shipped can only transition to Delivered.
// 2. Delivered has no next generic transition.
// 3. Returned can transition to Refunded (handled via direct admin actions).
//
// NOTE: Returns remain disabled in the generic selector until a dedicated 
// return-received/inspection workflow is implemented.
export const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['packed', 'cancelled'],
  packed: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  returned: ['refunded'],
  cancelled: [],
  refunded: []
}

/**
 * Validates whether a transition from currentStatus to newStatus is allowed
 * under the current paymentStatus.
 */
export function getAllowedTransitions(
  currentStatus: OrderStatus,
  paymentStatus: PaymentStatus
): OrderStatus[] {
  const allowed = VALID_TRANSITIONS[currentStatus] || []

  // If unpaid (anything other than exactly 'paid')
  const isPaid = paymentStatus === 'paid'
  if (!isPaid) {
    // block confirmed, processing, packed, shipped, delivered, refunded, returned
    // basically allow ONLY 'pending' and 'cancelled'
    return allowed.filter(
      (status) => status === 'pending' || status === 'cancelled'
    )
  }

  return allowed
}

export function isTransitionAllowed(
  currentStatus: OrderStatus,
  newStatus: OrderStatus,
  paymentStatus: PaymentStatus
): boolean {
  const allowed = getAllowedTransitions(currentStatus, paymentStatus)
  return allowed.includes(newStatus)
}
