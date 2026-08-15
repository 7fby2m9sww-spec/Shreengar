export interface InventoryHealthInput {
  quantity: number;
  reservedQuantity: number;
  threshold: number;
  stockStatus: string;
}

export interface InventoryHealthResult {
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
  hasMismatch: boolean;
  dbStatus: string;
  calculatedStatus: 'in_stock' | 'low_stock' | 'out_of_stock';
}

/**
 * Resolves authoritative inventory health status and warns about database inconsistencies.
 */
export function resolveInventoryHealth({
  quantity,
  reservedQuantity,
  threshold,
  stockStatus
}: InventoryHealthInput): InventoryHealthResult {
  const availableQuantity = Math.max(quantity - reservedQuantity, 0);
  
  let calculatedStatus: 'in_stock' | 'low_stock' | 'out_of_stock' = 'in_stock';
  if (availableQuantity <= 0) {
    calculatedStatus = 'out_of_stock';
  } else if (availableQuantity <= threshold) {
    calculatedStatus = 'low_stock';
  }

  // Normalise DB stockStatus if needed
  let dbStatusNormalised = String(stockStatus || '').toLowerCase().replace('-', '_').trim();
  if (dbStatusNormalised === 'instock') dbStatusNormalised = 'in_stock';
  if (dbStatusNormalised === 'outstock') dbStatusNormalised = 'out_of_stock';
  if (dbStatusNormalised === 'lowstock') dbStatusNormalised = 'low_stock';

  const hasMismatch = dbStatusNormalised !== calculatedStatus;

  if (hasMismatch) {
    console.warn(
      `[INVENTORY-HEALTH-MISMATCH] Quantity=${quantity}, Reserved=${reservedQuantity}, Threshold=${threshold}. DB Stock Status is '${stockStatus}', but calculated status is '${calculatedStatus}'.`
    );
  }

  return {
    status: calculatedStatus, // show calculated operational status consistently
    hasMismatch,
    dbStatus: stockStatus,
    calculatedStatus
  };
}
