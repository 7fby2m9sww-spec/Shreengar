'use client';

import React, { useState, useRef } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Upload, AlertTriangle, CheckCircle, Info, Database } from 'lucide-react';
import { validatePincode } from '@/lib/validation/shipping';

interface PincodeCSVImportProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: () => void;
  importAction: (pincodes: any[], sourceReference: string, replaceExisting?: boolean) => Promise<{ success: boolean; data?: any; error?: string; insertedCount?: number; updatedCount?: number; duplicateCount?: number; rejectedCount?: number }>;
}

export default function PincodeCSVImport({
  isOpen,
  onClose,
  onImportSuccess,
  importAction
}: PincodeCSVImportProps) {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [sourceReference, setSourceReference] = useState('Official India Post Pincode Directory');
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [validationSummary, setValidationSummary] = useState<{
    total: number;
    valid: number;
    invalid: number;
  }>({ total: 0, valid: 0, invalid: 0 });
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setCsvFile(null);
    setPreviewRows([]);
    setValidationSummary({ total: 0, valid: 0, invalid: 0 });
    setReplaceExisting(false);
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
            continue;
          }

          const record: any = {};
          headers.forEach((h, index) => {
            record[h] = cols[index] !== undefined ? cols[index].trim() : '';
          });

          // Ensure blanks remain NULL
          const pincodeStr = record.pincode || '';
          const officeName = record.office_name || null;
          const district = record.district || null;
          const state = record.state || null;
          const region = record.region || null;
          const circle = record.circle || null;
          const postalZoneCode = record.postal_zone_code || null;
          
          let isRemote: boolean | null = null;
          if (record.is_remote && record.is_remote !== '') {
            isRemote = record.is_remote.toLowerCase() === 'true';
          }

          let isServiceable: boolean | null = null;
          if (record.is_serviceable && record.is_serviceable !== '') {
            isServiceable = record.is_serviceable.toLowerCase() === 'true';
          }

          const formattedRow = {
            pincode: pincodeStr,
            office_name: officeName,
            district: district,
            state: state,
            region: region,
            circle: circle,
            postal_zone_code: postalZoneCode,
            is_remote: isRemote,
            is_serviceable: isServiceable,
            source_reference: sourceReference
          };

          const validation = validatePincode(formattedRow);
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

        setPreviewRows(rows);
        setValidationSummary({
          total: rows.length,
          valid: validCount,
          invalid: invalidCount
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

  const handleImport = async () => {
    if (!sourceReference.trim()) {
      setErrorMessage('Please enter a source reference for verified imports.');
      return;
    }
    if (validationSummary.invalid > 0) {
      setErrorMessage('Please fix all validation errors before importing.');
      return;
    }

    setIsImporting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const pincodesData = previewRows.map(r => ({
      ...r.data,
      source_reference: sourceReference
    }));

    const res = await importAction(pincodesData, sourceReference, replaceExisting);

    setIsImporting(false);

    if (res.success) {
      setSuccessMessage(
        `Successfully imported pincode directory! Inserted: ${res.insertedCount || 0}, Updated: ${res.updatedCount || 0}, duplicates skipped: ${res.duplicateCount || 0}, validation rejected: ${res.rejectedCount || 0}.`
      );
      setTimeout(() => {
        onImportSuccess();
        onClose();
        resetState();
      }, 3000);
    } else {
      setErrorMessage(res.error || 'Failed to complete pincodes import.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        onClose();
        resetState();
      }}
      title="Import Pincode Directory (CSV)"
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

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 space-y-3">
          <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Verified Source Reference (Mandatory)
          </label>
          <input
            type="text"
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-zinc-100 text-sm focus:outline-none focus:border-yellow-500"
            value={sourceReference}
            onChange={(e) => setSourceReference(e.target.value)}
            placeholder="e.g. Official India Post Pincode Directory 2026"
            required
            disabled={isImporting}
          />
        </div>

        {!csvFile ? (
          <div className="border-2 border-dashed border-zinc-800 rounded-xl p-8 text-center flex flex-col items-center justify-center bg-zinc-900/10">
            <Upload className="w-10 h-10 text-zinc-500 mb-3" />
            <p className="text-zinc-300 font-medium mb-1">Upload Pincode Directory CSV File</p>
            <p className="text-xs text-zinc-500 mb-4 max-w-md leading-relaxed">
              Upload a verified pincodes list. Blanks will remain NULL in the database with no automatic assumptions for remote or serviceability flags.
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
              <span className="font-semibold text-zinc-300 block mb-1">Supported CSV Columns (Optional Fields Can Be Left Blank):</span>
              <code className="text-yellow-500 font-mono block bg-zinc-950/80 p-2 rounded border border-zinc-800 overflow-x-auto whitespace-nowrap">
                pincode,office_name,district,state,region,circle,postal_zone_code,is_remote,is_serviceable
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
                  Total Pincodes: {validationSummary.total}
                </span>
                <span className="px-2.5 py-1 bg-emerald-950/30 border border-emerald-500/30 text-emerald-400 rounded-md font-medium">
                  Valid Rows: {validationSummary.valid}
                </span>
                {validationSummary.invalid > 0 && (
                  <span className="px-2.5 py-1 bg-red-950/30 border border-red-500/30 text-red-400 rounded-md font-medium">
                    Errors: {validationSummary.invalid}
                  </span>
                )}
              </div>
            </div>

            <div className="max-h-[300px] overflow-auto border border-zinc-800 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-zinc-900 text-zinc-400 sticky top-0 uppercase tracking-wider font-semibold border-b border-zinc-800">
                  <tr>
                    <th className="p-3">Pincode</th>
                    <th className="p-3">Office Name</th>
                    <th className="p-3">District</th>
                    <th className="p-3">State</th>
                    <th className="p-3">Zone Code</th>
                    <th className="p-3">Remote / Serviceable</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 bg-zinc-950/20">
                  {previewRows.slice(0, 100).map((r, i) => (
                    <tr key={i} className={r.isValid ? 'hover:bg-zinc-900/20' : 'bg-red-950/10 border-l-4 border-l-red-500'}>
                      <td className="p-3 font-medium text-zinc-200">
                        <code>{r.data.pincode}</code>
                      </td>
                      <td className="p-3 text-zinc-300">
                        {r.data.office_name || <span className="text-zinc-600">NULL</span>}
                      </td>
                      <td className="p-3 text-zinc-300">
                        {r.data.district || <span className="text-zinc-600">NULL</span>}
                      </td>
                      <td className="p-3 text-zinc-300">
                        {r.data.state || <span className="text-zinc-600">NULL</span>}
                      </td>
                      <td className="p-3 text-zinc-400">
                        {r.data.postal_zone_code || <span className="text-zinc-600">NULL</span>}
                      </td>
                      <td className="p-3 text-zinc-400">
                        Remote: {r.data.is_remote !== null ? String(r.data.is_remote) : 'NULL'}, Serviceable: {r.data.is_serviceable !== null ? String(r.data.is_serviceable) : 'NULL'}
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
              {previewRows.length > 100 && (
                <div className="p-3 text-center text-xs text-zinc-500 bg-zinc-900/30 border-t border-zinc-800">
                  Showing first 100 of {previewRows.length} rows for performance.
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2 bg-zinc-900/40 border border-zinc-800 rounded-xl p-3">
              <input
                type="checkbox"
                id="replaceExisting"
                checked={replaceExisting}
                onChange={(e) => setReplaceExisting(e.target.checked)}
                className="w-4 h-4 text-yellow-500 border-zinc-800 bg-zinc-950 rounded focus:ring-yellow-500"
                disabled={isImporting}
              />
              <label htmlFor="replaceExisting" className="text-xs font-medium text-zinc-300 cursor-pointer">
                Replace existing pincodes if duplicated (Default is to keep/skip duplicates)
              </label>
            </div>

            <div className="p-3 bg-zinc-900/80 border border-zinc-800 rounded-xl space-y-2 text-xs text-zinc-300">
              <span className="font-bold text-yellow-500 block">Read-only Pincode Source Verification Checklist:</span>
              <ul className="space-y-1 list-disc pl-4 text-[11px] text-zinc-400">
                <li>Official pincode directory source recorded</li>
                <li>Every mapped zone independently verified from origin 110092</li>
                <li>Blank fields remain NULL</li>
                <li>No automatic serviceability assumed</li>
                <li>No automatic remote status assumed</li>
                <li>No coordinates imported</li>
                <li>Imported coverage warning acknowledged</li>
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
                  disabled={isImporting || isParsing || validationSummary.invalid > 0 || !sourceReference.trim()}
                  onClick={handleImport}
                >
                  {isImporting ? 'Importing Directory...' : 'Confirm Pincodes Import'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
