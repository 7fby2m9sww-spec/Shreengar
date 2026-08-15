export interface DeliveryEstimateOptions {
  minDays?: number | null
  maxDays?: number | null
  deliveryAvailable?: boolean
  freeDelivery?: boolean
  codAvailable?: boolean
  expressAvailable?: boolean
  deliveryMessage?: string | null
  orderDate?: Date
}

export interface DeliveryEstimateResult {
  isAvailable: boolean
  minDays: number
  maxDays: number
  minDate: Date
  maxDate: Date
  minDateFormatted: string
  maxDateFormatted: string
  dateRangeText: string
  humanSummaryText: string
  isFreeDelivery: boolean
  isCodAvailable: boolean
  isExpressAvailable: boolean
  deliveryMessage: string | null
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-IN', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  })
}

function addBusinessDays(startDate: Date, days: number): Date {
  const result = new Date(startDate)
  let added = 0
  while (added < days) {
    result.setDate(result.getDate() + 1)
    if (result.getDay() !== 0) { // 0 represents Sunday
      added++
    }
  }
  return result
}

export function calculateDeliveryEstimate(options?: DeliveryEstimateOptions): DeliveryEstimateResult {
  const isAvailable = options?.deliveryAvailable !== false
  const minDays = Math.max(1, Number(options?.minDays) || 3)
  const maxDays = Math.max(minDays, Number(options?.maxDays) || 7)

  // Convert current server time to Indian Standard Time (UTC+5:30)
  const utcTime = new Date().getTime() + new Date().getTimezoneOffset() * 60000
  const istOffset = 5.5 * 3600000
  const baseDate = options?.orderDate ? new Date(options.orderDate) : new Date(utcTime + istOffset)
  
  // Calculate delivery date range using business-day rules (excluding Sundays)
  const minDate = addBusinessDays(baseDate, minDays)
  const maxDate = addBusinessDays(baseDate, maxDays)

  const minDateFormatted = formatDate(minDate)
  const maxDateFormatted = formatDate(maxDate)
  const dateRangeText = `${minDateFormatted} – ${maxDateFormatted}`

  const isFreeDelivery = !!options?.freeDelivery
  const isCodAvailable = !!options?.codAvailable
  const isExpressAvailable = !!options?.expressAvailable
  const deliveryMessage = options?.deliveryMessage?.trim() || null

  const humanSummaryText = isAvailable
    ? `Delivered between ${dateRangeText} (${minDays}–${maxDays} business days). Public holidays and courier delays may affect delivery.`
    : 'Delivery currently unavailable for this item'

  return {
    isAvailable,
    minDays,
    maxDays,
    minDate,
    maxDate,
    minDateFormatted,
    maxDateFormatted,
    dateRangeText,
    humanSummaryText,
    isFreeDelivery,
    isCodAvailable,
    isExpressAvailable,
    deliveryMessage
  }
}
