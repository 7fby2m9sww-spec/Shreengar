/**
 * Helper functions for generating category and colour codes for SKUs
 */

const CATEGORY_CODE_MAP: Record<string, string> = {
  kurti: 'KUR',
  kurtis: 'KUR',
  saree: 'SAR',
  sarees: 'SAR',
  lehenga: 'LEH',
  lehengas: 'LEH',
  anarkali: 'ANA',
  anarkalis: 'ANA',
  dupatta: 'DUP',
  dupattas: 'DUP',
  gown: 'GWN',
  gowns: 'GWN',
  suit: 'SUT',
  suits: 'SUT',
  top: 'TOP',
  tops: 'TOP',
  bottom: 'BTM',
  bottoms: 'BTM'
}

const COLOUR_CODE_MAP: Record<string, string> = {
  maroon: 'MRN',
  blue: 'BLU',
  green: 'GRN',
  orange: 'ORG',
  red: 'RED',
  yellow: 'YLW',
  pink: 'PNK',
  purple: 'PRP',
  black: 'BLK',
  white: 'WHT',
  grey: 'GRY',
  gray: 'GRY',
  gold: 'GLD',
  silver: 'SLV',
  beige: 'BGE',
  brown: 'BRN',
  navy: 'NVY',
  teal: 'TEL',
  magenta: 'MGT',
  peach: 'PCH',
  'wine red': 'WNR',
  'royal blue': 'RBL',
  'sky blue': 'SBL',
  'bottle green': 'BGR',
  'emerald green': 'EGR',
  'mustard yellow': 'MYL'
}

export function getCategoryCode(categoryName: string, categorySlug?: string | null): string {
  const cleanName = (categoryName || '').trim().toLowerCase()
  const cleanSlug = (categorySlug || '').trim().toLowerCase()

  if (CATEGORY_CODE_MAP[cleanName]) return CATEGORY_CODE_MAP[cleanName]
  if (cleanSlug && CATEGORY_CODE_MAP[cleanSlug]) return CATEGORY_CODE_MAP[cleanSlug]

  // Fallback: Normalized 3-letter uppercase abbreviation
  const stripped = (categoryName || 'CAT').replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
  return (stripped.slice(0, 3) || 'CAT').padEnd(3, 'X')
}

export function getColourCode(colourName: string): string {
  const cleanName = (colourName || '').trim().toLowerCase()

  if (COLOUR_CODE_MAP[cleanName]) return COLOUR_CODE_MAP[cleanName]

  // Handle multi-word color names e.g. "Wine Red" -> "WNR"
  const words = cleanName.split(/\s+/).filter(Boolean)
  if (words.length >= 2) {
    const code = words.map(w => w[0]).join('').toUpperCase()
    if (code.length >= 3) return code.slice(0, 3)
    return code.padEnd(3, 'X')
  }

  // Remove vowels for single word colors if length > 3
  const uppercase = (colourName || 'CLR').replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
  if (uppercase.length <= 3) return uppercase.padEnd(3, 'X')

  // Keep first char + consonants
  const first = uppercase[0]
  const rest = uppercase.slice(1).replace(/[AEIOU]/g, '')
  const result = (first + rest).slice(0, 3)
  return result.length >= 3 ? result : uppercase.slice(0, 3)
}

export function formatProductSku(categoryCode: string, colourCode: string, sequence: number): string {
  const cat = (categoryCode || 'GEN').toUpperCase().padEnd(3, 'X')
  const col = (colourCode || 'CLR').toUpperCase().padEnd(3, 'X')
  const seq = String(sequence).padStart(3, '0')
  return `SHR-${cat}-${col}-${seq}`
}

export function formatVariantSku(productSku: string, sizeCode: string): string {
  const pSku = (productSku || 'SHR-GEN-CLR-001').toUpperCase().trim()
  const sCode = (sizeCode || 'M').toUpperCase().trim()
  return `${pSku}-${sCode}`
}

export function validateSkuFormat(sku: string): { isValid: boolean; error?: string } {
  if (!sku || !sku.trim()) {
    return { isValid: false, error: 'SKU cannot be empty.' }
  }

  const normalized = sku.trim().toUpperCase()

  if (normalized.length < 3 || normalized.length > 50) {
    return { isValid: false, error: 'SKU must be between 3 and 50 characters long.' }
  }

  if (!/^[A-Z0-9-]+$/.test(normalized)) {
    return { isValid: false, error: 'SKU can only contain uppercase letters (A-Z), numbers (0-9), and hyphens (-).' }
  }

  return { isValid: true }
}
