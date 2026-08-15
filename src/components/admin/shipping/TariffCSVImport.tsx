'use client';

import React, { useState, useRef } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Upload, AlertTriangle, CheckCircle, Info, Database } from 'lucide-react';
import { validateTariffRate, CANONICAL_ZONES, CANONICAL_SERVICE_CODE } from '@/lib/validation/shipping';

interface TariffCSVImportProps {
  isOpen: boolean;
  onClose: () => void;
  versionId: string;
  onImportSuccess: () => void;
  importAction: (versionId: string, rates: any[]) => Promise<{ success: boolean; data?: any; error?: string; insertedCount?: number; duplicateCount?: number; rejectedCount?: number }>;
}

export default function TariffCSVImport({
  isOpen,
  onClose,
  versionId,
  onImportSuccess,
  importAction
}: TariffCSVImportProps) {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [validationSummary, setValidationSummary] = useState<{
    total: number;
    valid: number;
    invalid: number;
    duplicate: number;
  }>({ total: 0, valid: 0, invalid: 0, duplicate: 0 });
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setCsvFile(null);
    setPreviewRows([]);
    setValidationSummary({ total: 0, valid: 0, invalid: 0, duplicate: 0 });
    setErrorMessage(null);
    setSuccessMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCsvFile(file);
      parseCSVFile(file);
    }
  };

  const parseCSVFile = (file: File) => {
    setIsParsing(true);
    setErrorMessage(null);
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const rawLines = parseCSV(text);

        if (rawLines.length < 2) {
          throw new Error('CSV file is empty or missing headers.');
        }

        const headers = rawLines[0].map(h => h.trim().toLowerCase());
        const rows: any[] = [];
        let validCount = 0;
        let invalidCount = 0;

        for (let i = 1; i < rawLines.length; i++) {
          const cols = rawLines[i];
          if (cols.length === 0 || (cols.length === 1 && cols[0].trim() === '')) {
            continue; // Skip empty rows
          }

          // Build row record
          const record: any = {};
          headers.forEach((h, index) => {
            record[h] = cols[index] !== undefined ? cols[index].trim() : '';
          });

          // Standardize fields
          const minWeight = record.min_weight_grams ? Number(record.min_weight_grams) : 0;
          const maxWeight = record.max_weight_grams ? Number(record.max_weight_grams) : 0;
          const baseWeight = record.base_weight_grams ? Number(record.base_weight_grams) : 0;
          
          // Rupees to paise conversions
          const baseRupees = record.base_rate_rupees ? Number(record.base_rate_rupees) : 0;
          const addSlabRupees = record.additional_slab_rate_rupees ? Number(record.additional_slab_rate_rupees) : 0;
          const remoteRupees = record.remote_surcharge_rupees && record.remote_surcharge_rupees !== '' ? Number(record.remote_surcharge_rupees) : null;
          
          const basePaise = Math.round(baseRupees * 100);
          const addSlabPaise = Math.round(addSlabRupees * 100);
          const remotePaise = remoteRupees !== null ? Math.round(remoteRupees * 100) : null;

          const taxBp = record.tax_rate_basis_points && record.tax_rate_basis_points !== '' ? Number(record.tax_rate_basis_points) : null;
          const estMin = record.estimated_min_days && record.estimated_min_days !== '' ? Number(record.estimated_min_days) : null;
          const estMax = record.estimated_max_days && record.estimated_max_days !== '' ? Number(record.estimated_max_days) : null;
          const isServiceable = record.is_serviceable && record.is_serviceable.toLowerCase() === 'false' ? false : true;

          const formattedRow = {
            destination_zone_code: record.destination_zone_code || '',
            service_code: record.service_code || CANONICAL_SERVICE_CODE,
            min_weight_grams: minWeight,
            max_weight_grams: maxWeight,
            base_weight_grams: baseWeight,
            base_rate_paise: basePaise,
            additional_slab_grams: record.additional_slab_grams ? Number(record.additional_slab_grams) : 0,
            additional_slab_rate_paise: addSlabPaise,
            tax_rate_basis_points: taxBp,
            remote_surcharge_paise: remotePaise,
            estimated_min_days: estMin,
            estimated_max_days: estMax,
            is_serviceable: isServiceable,
            // Original inputs for preview display
            display_base_rupees: record.base_rate_rupees || '0',
            display_add_rupees: record.additional_slab_rate_rupees || '0',
            display_remote_rupees: record.remote_surcharge_rupees || ''
          };

          const validation = validateTariffRate(formattedRow);
          const rowErrors = validation.errors;

          if (rowErrors.length > 0) {
            invalidCount++;
          } else {
            validCount++;
          }

          rows.push({
            data: formattedRow,
            errors: rowErrors,
            isValid: rowErrors.length === 0
          });
        }

        // Validate overlaps in preview
        const overlapResult = detectOverlaps(rows);
        let finalInvalid = 0;
        let finalValid = 0;

        overlapResult.forEach((r) => {
          if (r.errors.length > 0) {
            r.isValid = false;
            finalInvalid++;
          } else {
            finalValid++;
          }
        });

        setPreviewRows(overlapResult);
        setValidationSummary({
          total: overlapResult.length,
          valid: finalValid,
          invalid: finalInvalid,
          duplicate: 0
        });
      } catch (err: any) {
        setErrorMessage(err.message || 'Failed to parse CSV file.');
      } finally {
        setIsParsing(false);
      }
    };

    reader.onerror = () => {
      setErrorMessage('Failed to read file.');
      setIsParsing(false);
    };

    reader.readAsText(file);
  };

  const parseCSV = (text: string): string[][] => {
    const lines: string[][] = [];
    let row: string[] = [];
    let inQuotes = false;
    let currentVal = '';

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          currentVal += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        row.push(currentVal);
        currentVal = '';
      } else if ((char === '\r' || char === '\n') && !inQuotes) {
        if (char === '\r' && nextChar === '\n') {
          i++;
        }
        row.push(currentVal);
        lines.push(row);
        row = [];
        currentVal = '';
      } else {
        currentVal += char;
      }
    }
    if (currentVal || row.length > 0) {
      row.push(currentVal);
      lines.push(row);
    }
    return lines;
  };

  const detectOverlaps = (rows: any[]): any[] => {
    // Group by zone
    const groups: { [zone: string]: any[] } = {};
    rows.forEach((r) => {
      const z = r.data.destination_zone_code;
      if (!groups[z]) groups[z] = [];
      groups[z].push(r);
    });

    // Check overlaps in each group
    Object.keys(groups).forEach((z) => {
      const items = groups[z];
      // Sort by min weight
      items.sort((a, b) => a.data.min_weight_grams - b.data.min_weight_grams);

      for (let i = 0; i < items.length; i++) {
        const current = items[i];
        
        // Compare with next items
        for (let j = i + 1; j < items.length; j++) {
          const next = items[j];
          if (current.data.max_weight_grams >= next.data.min_weight_grams) {
            const overlapError = `Overlap detected in zone "${z}": Weight slab ${current.data.min_weight_grams}-${current.data.max_weight_grams}g overlaps with ${next.data.min_weight_grams}-${next.data.max_weight_grams}g.`;
            if (!current.errors.includes(overlapError)) current.errors.push(overlapError);
            if (!next.errors.includes(overlapError)) next.errors.push(overlapError);
          }
        }
      }
    });

    return rows;
  };

  const handleImport = async () => {
    if (validationSummary.invalid > 0) {
      setErrorMessage('Please fix all validation and overlap errors before importing.');
      return;
    }

    setIsImporting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const ratesData = previewRows.map(r => r.data);
    const res = await importAction(versionId, ratesData);

    setIsImporting(false);

    if (res.success) {
      setSuccessMessage(
        `Successfully imported rates sheet! Slabs inserted: ${res.insertedCount || 0}, duplicates skipped: ${res.duplicateCount || 0}, validation rejected: ${res.rejectedCount || 0}.`
      );
      setTimeout(() => {
        onImportSuccess();
        onClose();
        resetState();
      }, 3000);
    } else {
      setErrorMessage(res.error || 'Failed to complete rates sheet import.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        onClose();
        resetState();
      }}
      title="Import Tariff Rates (CSV)"
      className="max-w-4xl"
    >
      <div className="space-y-4">
        {errorMessage && (
          <div className="p-3 bg-red-950/40 border border-red-500/50 rounded-lg flex items-start gap-2 text-red-200 text-sm">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3 bg-emerald-950/40 border border-emerald-500/50 rounded-lg flex items-start gap-2 text-emerald-200 text-sm">
            <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {!csvFile ? (
          <div className="border-2 border-dashed border-zinc-800 rounded-xl p-8 text-center flex flex-col items-center justify-center bg-zinc-900/10">
            <Upload className="w-10 h-10 text-zinc-500 mb-3" />
            <p className="text-zinc-300 font-medium mb-1">Upload Tariff Rate CSV File</p>
            <p className="text-xs text-zinc-500 mb-4 max-w-md leading-relaxed">
              Upload an India Post Speed Post rates sheet. All rate amounts must be in Rupees (R.s) columns, which will be converted automatically to Paise inside the database.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <Button
              type="button"
              className="bg-yellow-500 hover:bg-yellow-600 text-zinc-950 font-semibold"
              onClick={() => fileInputRef.current?.click()}
            >
              Select CSV File
            </Button>

            <div className="mt-6 text-left w-full max-w-xl bg-zinc-900/50 border border-zinc-800 rounded-lg p-3 space-y-1.5 text-xs text-zinc-400">
              <span className="font-semibold text-zinc-300 block mb-1">Required CSV Columns:</span>
              <code className="text-yellow-500 font-mono block bg-zinc-950/80 p-2 rounded border border-zinc-800 overflow-x-auto whitespace-nowrap">
                destination_zone_code,service_code,min_weight_grams,max_weight_grams,base_weight_grams,base_rate_rupees,additional_slab_grams,additional_slab_rate_rupees,tax_rate_basis_points,remote_surcharge_rupees,estimated_min_days,estimated_max_days,is_serviceable
              </code>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-900/60 border border-zinc-800 rounded-xl p-3">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-yellow-500" />
                <div>
                  <span className="text-sm font-semibold text-zinc-200 block">{csvFile.name}</span>
                  <span className="text-xs text-zinc-500">{(csvFile.size / 1024).toFixed(2)} KB</span>
                </div>
              </div>

              <div className="flex gap-2 text-xs">
                <span className="px-2.5 py-1 bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-md font-medium">
                  Total Slabs: {validationSummary.total}
                </span>
                <span className="px-2.5 py-1 bg-emerald-950/30 border border-emerald-500/30 text-emerald-400 rounded-md font-medium">
                  Valid Slabs: {validationSummary.valid}
                </span>
                {validationSummary.invalid > 0 && (
                  <span className="px-2.5 py-1 bg-red-950/30 border border-red-500/30 text-red-400 rounded-md font-medium">
                    Errors: {validationSummary.invalid}
                  </span>
                )}
              </div>
            </div>

            <div className="bg-amber-950/20 border border-amber-500/30 rounded-lg p-3 flex items-start gap-2 text-amber-200 text-xs">
              <Info className="w-4 h-4 mt-0.5 shrink-0 text-amber-500" />
              <div>
                <span className="font-semibold block mb-0.5">Rupee-to-Paise Automatic Conversion:</span>
                Rate values in columns <code className="font-mono text-yellow-500">base_rate_rupees</code>, <code className="font-mono text-yellow-500">additional_slab_rate_rupees</code>, and <code className="font-mono text-yellow-500">remote_surcharge_rupees</code> will be multiplied by 100 and rounded to store as integer Paise values.
              </div>
            </div>

            <div className="max-h-[300px] overflow-auto border border-zinc-800 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-zinc-900 text-zinc-400 sticky top-0 uppercase tracking-wider font-semibold border-b border-zinc-800">
                  <tr>
                    <th className="p-3">Zone Code</th>
                    <th className="p-3">Weight Slab (g)</th>
                    <th className="p-3">Base (g/₹)</th>
                    <th className="p-3">Add Slab (g/₹)</th>
                    <th className="p-3">Tax (bp)</th>
                    <th className="p-3">Remote (₹)</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 bg-zinc-950/20">
                  {previewRows.map((r, i) => (
                    <tr key={i} className={r.isValid ? 'hover:bg-zinc-900/20' : 'bg-red-950/10 border-l-4 border-l-red-500'}>
                      <td className="p-3 font-medium text-zinc-200">
                        <code>{r.data.destination_zone_code}</code>
                      </td>
                      <td className="p-3 text-zinc-300">
                        {r.data.min_weight_grams} - {r.data.max_weight_grams}g
                      </td>
                      <td className="p-3 text-zinc-300">
                        {r.data.base_weight_grams}g / ₹{r.display_base_rupees}
                      </td>
                      <td className="p-3 text-zinc-300">
                        {r.data.additional_slab_grams}g / ₹{r.display_add_rupees}
                      </td>
                      <td className="p-3 text-zinc-400">
                        {r.data.tax_rate_basis_points !== null ? `${r.data.tax_rate_basis_points} bp` : 'NULL'}
                      </td>
                      <td className="p-3 text-zinc-400">
                        {r.display_remote_rupees ? `₹${r.display_remote_rupees}` : 'NULL'}
                      </td>
                      <td className="p-3">
                        {r.isValid ? (
                          <span className="text-emerald-400 font-semibold">✓ Valid</span>
                        ) : (
                          <div className="space-y-1">
                            <span className="text-red-400 font-semibold block">⚠️ Error</span>
                            {r.errors.map((e: string, idx: number) => (
                              <span key={idx} className="text-[10px] text-red-300 block max-w-[200px] leading-relaxed">
                                {e}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-3 bg-red-950/40 border border-red-500/50 rounded-xl text-red-200 text-xs leading-relaxed space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-red-400">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Tax Verification Blocker</span>
              </div>
              <p>
                India Post publishes tariff amounts exclusive of applicable taxes. A verified official tax notification and effective date are required before this tariff version can be verified or activated.
              </p>
            </div>

            <div className="p-3 bg-zinc-900/80 border border-zinc-800 rounded-xl space-y-2 text-xs text-zinc-300">
              <span className="font-bold text-yellow-500 block">Read-only Tariff Source Verification Checklist:</span>
              <ul className="space-y-1 list-disc pl-4 text-[11px] text-zinc-400">
                <li>Official India Post source attached or referenced</li>
                <li>Tariff access date entered</li>
                <li>Tariff values manually cross-checked</li>
                <li>Tax notification verified separately</li>
                <li>No discount applied</li>
                <li>No COD charge included</li>
                <li>No Proof of Delivery charge unless explicitly selected</li>
                <li>No packaging fee included</li>
                <li>Tariff version remains draft until verified</li>
              </ul>
            </div>

            <div className="p-3 bg-zinc-900/50 border border-zinc-800 rounded-xl text-zinc-400 text-xs leading-relaxed">
              <span className="font-semibold text-zinc-300 block mb-0.5">⚠️ Transactional Import:</span>
              <span>The import will be applied as one transaction. If any row fails, no rows will be saved.</span>
            </div>

            <div className="flex justify-between items-center pt-2">
              <Button type="button" variant="ghost" onClick={resetState} disabled={isImporting}>
                Reset Upload
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={onClose} disabled={isImporting}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="bg-yellow-500 hover:bg-yellow-600 text-zinc-950 font-semibold"
                  disabled={isImporting || isParsing || validationSummary.invalid > 0}
                  onClick={handleImport}
                >
                  {isImporting ? 'Importing Slabs...' : 'Confirm Rates Import'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
