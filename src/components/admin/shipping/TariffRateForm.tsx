'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { AlertTriangle, Info } from 'lucide-react';
import { CANONICAL_ZONES, CANONICAL_SERVICE_CODE } from '@/lib/validation/shipping';

interface TariffRateFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (rateData: any) => Promise<boolean>;
  editingRate: any | null;
  versionId: string;
}

export default function TariffRateForm({
  isOpen,
  onClose,
  onSave,
  editingRate,
  versionId
}: TariffRateFormProps) {
  const [zone, setZone] = useState('local');
  const [minWeight, setMinWeight] = useState('0');
  const [maxWeight, setMaxWeight] = useState('50');
  const [baseWeight, setBaseWeight] = useState('50');
  const [baseRateRupees, setBaseRateRupees] = useState('19.00');
  const [addSlabGrams, setAddSlabGrams] = useState('0');
  const [addSlabRateRupees, setAddSlabRateRupees] = useState('0.00');
  const [taxBasisPoints, setTaxBasisPoints] = useState('');
  const [remoteSurchargeRupees, setRemoteSurchargeRupees] = useState('');
  const [estMinDays, setEstMinDays] = useState('');
  const [estMaxDays, setEstMaxDays] = useState('');
  const [isServiceable, setIsServiceable] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (editingRate) {
      setZone(editingRate.destination_zone_code || 'local');
      setMinWeight(String(editingRate.min_weight_grams));
      setMaxWeight(String(editingRate.max_weight_grams));
      setBaseWeight(String(editingRate.base_weight_grams));
      setBaseRateRupees(String((editingRate.base_rate_paise / 100).toFixed(2)));
      setAddSlabGrams(String(editingRate.additional_slab_grams || 0));
      setAddSlabRateRupees(String(((editingRate.additional_slab_rate_paise || 0) / 100).toFixed(2)));
      setTaxBasisPoints(editingRate.tax_rate_basis_points !== null && editingRate.tax_rate_basis_points !== undefined ? String(editingRate.tax_rate_basis_points) : '');
      setRemoteSurchargeRupees(editingRate.remote_surcharge_paise !== null && editingRate.remote_surcharge_paise !== undefined ? String((editingRate.remote_surcharge_paise / 100).toFixed(2)) : '');
      setEstMinDays(editingRate.estimated_min_days !== null && editingRate.estimated_min_days !== undefined ? String(editingRate.estimated_min_days) : '');
      setEstMaxDays(editingRate.estimated_max_days !== null && editingRate.estimated_max_days !== undefined ? String(editingRate.estimated_max_days) : '');
      setIsServiceable(editingRate.is_serviceable !== false);
    } else {
      setZone('local');
      setMinWeight('0');
      setMaxWeight('50');
      setBaseWeight('50');
      setBaseRateRupees('19.00');
      setAddSlabGrams('0');
      setAddSlabRateRupees('0.00');
      setTaxBasisPoints('');
      setRemoteSurchargeRupees('');
      setEstMinDays('');
      setEstMaxDays('');
      setIsServiceable(true);
    }
    setErrorMsg(null);
  }, [editingRate, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    // Form inputs parse and warn conversion
    const basePaise = Math.round(Number(baseRateRupees) * 100);
    const addSlabPaise = Math.round(Number(addSlabRateRupees) * 100);
    const remotePaise = remoteSurchargeRupees ? Math.round(Number(remoteSurchargeRupees) * 100) : null;
    const taxBp = taxBasisPoints ? Number(taxBasisPoints) : null;

    if (isNaN(basePaise) || basePaise < 0) {
      setErrorMsg('Invalid base rate value.');
      setIsSubmitting(false);
      return;
    }

    const payload = {
      id: editingRate?.id,
      tariff_version_id: versionId,
      destination_zone_code: zone,
      service_code: CANONICAL_SERVICE_CODE,
      min_weight_grams: Number(minWeight),
      max_weight_grams: Number(maxWeight),
      base_weight_grams: Number(baseWeight),
      base_rate_paise: basePaise,
      additional_slab_grams: Number(addSlabGrams),
      additional_slab_rate_paise: addSlabPaise,
      tax_rate_basis_points: taxBp,
      remote_surcharge_paise: remotePaise,
      estimated_min_days: estMinDays ? Number(estMinDays) : null,
      estimated_max_days: estMaxDays ? Number(estMaxDays) : null,
      is_serviceable: isServiceable
    };

    const success = await onSave(payload);
    setIsSubmitting(false);
    if (success) {
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingRate ? 'Edit Tariff Slabs' : 'Add Tariff Slab'}
      className="max-w-3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="p-3 bg-red-950/40 border border-red-500/50 rounded-lg flex items-start gap-2 text-red-200 text-sm">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">
              Destination Zone Band
            </label>
            <select
              value={zone}
              onChange={(e) => setZone(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-zinc-100 focus:outline-none focus:border-yellow-500"
            >
              {CANONICAL_ZONES.map((z) => (
                <option key={z} value={z}>
                  {z.toUpperCase().replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">
              Serviceability
            </label>
            <select
              value={isServiceable ? 'true' : 'false'}
              onChange={(e) => setIsServiceable(e.target.value === 'true')}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-zinc-100 focus:outline-none focus:border-yellow-500"
            >
              <option value="true">Serviceable</option>
              <option value="false">Unserviceable</option>
            </select>
          </div>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-1.5">
            <Info className="w-4 h-4 text-yellow-500" />
            Weight Slab Constraints (Grams)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Min Weight (g)</label>
              <Input
                type="number"
                value={minWeight}
                onChange={(e) => setMinWeight(e.target.value)}
                min="0"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Max Weight (g)</label>
              <Input
                type="number"
                value={maxWeight}
                onChange={(e) => setMaxWeight(e.target.value)}
                min="0"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Base Calculation Weight (g)</label>
              <Input
                type="number"
                value={baseWeight}
                onChange={(e) => setBaseWeight(e.target.value)}
                min="0"
                required
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-semibold text-zinc-200">Base Slabs Configuration</h3>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Base Rate (₹ Rupees)</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-zinc-500 text-sm">₹</span>
                <Input
                  type="number"
                  step="0.01"
                  value={baseRateRupees}
                  onChange={(e) => setBaseRateRupees(e.target.value)}
                  className="pl-7"
                  min="0"
                  required
                />
              </div>
              <span className="text-[10px] text-zinc-500 mt-1 block">
                Will be stored securely as {Math.round(Number(baseRateRupees || 0) * 100)} Paise.
              </span>
            </div>
          </div>

          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-semibold text-zinc-200">Additional Slab Extension</h3>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Slab Size (g)</label>
                <Input
                  type="number"
                  value={addSlabGrams}
                  onChange={(e) => setAddSlabGrams(e.target.value)}
                  min="0"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Rate (₹ Rupees)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-zinc-500 text-sm">₹</span>
                  <Input
                    type="number"
                    step="0.01"
                    value={addSlabRateRupees}
                    onChange={(e) => setAddSlabRateRupees(e.target.value)}
                    className="pl-7"
                    min="0"
                    required
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-semibold text-zinc-200">Tax, Remote Area Surcharge & Delivery Time Slabs</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Tax Basis Points (e.g. 18% = 1800)</label>
              <Input
                type="number"
                placeholder="Optional (Null)"
                value={taxBasisPoints}
                onChange={(e) => setTaxBasisPoints(e.target.value)}
                min="0"
                max="10000"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Remote Surcharge (₹ Rupees)</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-zinc-500 text-sm">₹</span>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Optional (Null)"
                  value={remoteSurchargeRupees}
                  onChange={(e) => setRemoteSurchargeRupees(e.target.value)}
                  className="pl-7"
                  min="0"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Delivery Window (Days: Min-Max)</label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Min"
                  value={estMinDays}
                  onChange={(e) => setEstMinDays(e.target.value)}
                  min="0"
                />
                <Input
                  type="number"
                  placeholder="Max"
                  value={estMaxDays}
                  onChange={(e) => setEstMaxDays(e.target.value)}
                  min="0"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" className="bg-yellow-500 hover:bg-yellow-600 text-zinc-950 font-semibold" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Slab'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
