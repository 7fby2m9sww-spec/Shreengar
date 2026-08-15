export function calculateDiscount(mrp: number, sellingPrice: number): number {
  if (!mrp || !sellingPrice || sellingPrice >= mrp) return 0;
  const discount = ((mrp - sellingPrice) / mrp) * 100;
  return Math.round(discount);
}

export function formatPrice(amount: number, currency: string = 'INR'): string {
  if (isNaN(amount)) return '';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
