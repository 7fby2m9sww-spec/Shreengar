export const CANONICAL_ZONES = [
  'local',
  'up_to_200_km',
  '201_to_1000_km',
  '1001_to_2000_km',
  'above_2000_km'
] as const;

export const CANONICAL_SERVICE_CODE = 'speed_post_parcel_domestic';

export function isValidISODateString(dateStr: string): boolean {
  if (!dateStr || typeof dateStr !== 'string') return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;

  const [yearStr, monthStr, dayStr] = dateStr.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);

  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  const daysInMonth = [31, (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day <= daysInMonth[month - 1];
}

export interface TariffVersionInput {
  name: string;
  source_reference?: string | null;
  source_document_date?: string | null;
  effective_from?: string | null;
  effective_to?: string | null;
  notes?: string | null;
}

export interface TariffRateInput {
  destination_zone_code: string;
  service_code: string;
  min_weight_grams: number;
  max_weight_grams: number;
  base_weight_grams: number;
  base_rate_paise: number;
  additional_slab_grams: number;
  additional_slab_rate_paise: number;
  tax_rate_basis_points?: number | null;
  remote_surcharge_paise?: number | null;
  estimated_min_days?: number | null;
  estimated_max_days?: number | null;
  is_serviceable?: boolean | null;
}

export interface PincodeInput {
  pincode: string;
  office_name?: string | null;
  district?: string | null;
  state?: string | null;
  region?: string | null;
  circle?: string | null;
  postal_zone_code?: string | null;
  is_remote?: boolean | null;
  is_serviceable?: boolean | null;
  source_reference: string;
}

export function validateTariffVersion(v: TariffVersionInput, isVerifying = false, isActivating = false) {
  const errors: string[] = [];

  if (!v.name || !v.name.trim()) {
    errors.push('Tariff name is required.');
  }

  if (isVerifying) {
    if (!v.source_reference || !v.source_reference.trim()) {
      errors.push('Source reference is required before verification.');
    }
    if (!v.source_document_date) {
      errors.push('Source document date is required before verification.');
    } else if (!isValidISODateString(v.source_document_date)) {
      errors.push('Source document publication date must be a valid ISO YYYY-MM-DD date.');
    }
  }

  if (isActivating) {
    if (!v.effective_from) {
      errors.push('Effective from date is required before activation.');
    } else {
      const fromDate = new Date(v.effective_from);
      if (isNaN(fromDate.getTime())) {
        errors.push('Invalid effective from date format.');
      }
    }

    if (v.effective_to && v.effective_from) {
      const fromDate = new Date(v.effective_from);
      const toDate = new Date(v.effective_to);
      if (!isNaN(fromDate.getTime()) && !isNaN(toDate.getTime()) && toDate <= fromDate) {
        errors.push('Effective to date must be after the effective from date.');
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export function validateTariffRate(r: TariffRateInput) {
  const errors: string[] = [];

  if (!CANONICAL_ZONES.includes(r.destination_zone_code as any)) {
    errors.push(`Destination zone code must be one of: ${CANONICAL_ZONES.join(', ')}.`);
  }

  if (r.service_code !== CANONICAL_SERVICE_CODE) {
    errors.push(`Service code must be exactly "${CANONICAL_SERVICE_CODE}".`);
  }

  if (r.min_weight_grams < 0) {
    errors.push('Minimum weight cannot be negative.');
  }

  if (r.max_weight_grams < r.min_weight_grams) {
    errors.push('Maximum weight cannot be below minimum weight.');
  }

  if (r.base_weight_grams < 0) {
    errors.push('Base weight cannot be negative.');
  }

  if (r.base_rate_paise < 0) {
    errors.push('Base rate cannot be negative.');
  }

  if (r.additional_slab_grams < 0) {
    errors.push('Additional slab grams cannot be negative.');
  }

  if (r.additional_slab_rate_paise < 0) {
    errors.push('Additional slab rate cannot be negative.');
  }

  if (r.tax_rate_basis_points !== undefined && r.tax_rate_basis_points !== null) {
    if (r.tax_rate_basis_points < 0 || r.tax_rate_basis_points > 10000) {
      errors.push('Tax rate basis points must be between 0 and 10000 (0% to 100%).');
    }
  }

  if (r.remote_surcharge_paise !== undefined && r.remote_surcharge_paise !== null) {
    if (r.remote_surcharge_paise < 0) {
      errors.push('Remote surcharge cannot be negative.');
    }
  }

  if (r.estimated_min_days !== undefined && r.estimated_min_days !== null) {
    if (r.estimated_min_days < 0) {
      errors.push('Estimated minimum days cannot be negative.');
    }
  }

  if (r.estimated_max_days !== undefined && r.estimated_max_days !== null) {
    if (r.estimated_min_days !== undefined && r.estimated_min_days !== null && r.estimated_max_days < r.estimated_min_days) {
      errors.push('Estimated maximum days cannot be below minimum days.');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export function validatePincode(p: PincodeInput) {
  const errors: string[] = [];

  const pincode = String(p.pincode).trim();
  if (!/^\d{6}$/.test(pincode)) {
    errors.push('Pincode must be exactly 6 digits.');
  }

  if (!p.source_reference || !p.source_reference.trim()) {
    errors.push('Source reference is required.');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
