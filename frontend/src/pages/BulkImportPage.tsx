import React, { useState } from 'react';
import { UploadCloud, Download, CheckCircle2, AlertTriangle, AlertCircle, FileText, RefreshCw } from 'lucide-react';
import { apiRequest } from '../api';

export const BulkImportPage: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importType, setImportType] = useState<'items' | 'receiving'>('receiving');
  const [previewData, setPreviewData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const downloadTemplate = (type: 'items' | 'receiving') => {
    window.open(`/api/bulk-import/template/${type}`, '_blank');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setResult(null);
      setError(null);

      // Trigger preview
      const formData = new FormData();
      formData.append('file', file);
      try {
        const preview = await apiRequest<any>('/bulk-import/preview', {
          method: 'POST',
          body: formData,
        });
        setPreviewData(preview);
      } catch (err: any) {
        setError(err.message);
      }
    }
  };

  const handleCommitImport = async () => {
    if (!selectedFile) return;
    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append('file', selectedFile);

    const endpoint = importType === 'items' ? '/bulk-import/items' : '/bulk-import/receiving';

    try {
      const res = await apiRequest<any>(endpoint, {
        method: 'POST',
        body: formData,
      });
      setResult(res);
      setLoading(false);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center space-x-2">
            <UploadCloud className="w-5 h-5 text-cyan-400" />
            <span>Bulk Equipment Import & Batch Data Entry Center</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Bulk-receive hundreds of antennas, radio units, or cable reels at once with validation, preview, and safe rollbacks.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => downloadTemplate('receiving')}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 rounded-lg text-xs font-semibold flex items-center space-x-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Receiving Template CSV</span>
          </button>
          <button
            onClick={() => downloadTemplate('items')}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-xs font-semibold flex items-center space-x-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Items Master Template</span>
          </button>
        </div>
      </div>

      {/* Import Mode Selector & Upload Dropzone */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-5">
        <div className="flex items-center space-x-3">
          <span className="text-xs font-bold text-slate-300">Import Mode:</span>
          <button
            onClick={() => { setImportType('receiving'); setSelectedFile(null); setPreviewData(null); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              importType === 'receiving' ? 'bg-cyan-500 text-slate-950' : 'bg-slate-950 text-slate-400 border border-slate-800'
            }`}
          >
            Bulk Receiving against Delivery Note (Stock Ledger)
          </button>
          <button
            onClick={() => { setImportType('items'); setSelectedFile(null); setPreviewData(null); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              importType === 'items' ? 'bg-cyan-500 text-slate-950' : 'bg-slate-950 text-slate-400 border border-slate-800'
            }`}
          >
            Bulk Equipment Master Creation (New SKUs)
          </button>
        </div>

        {/* Upload Zone */}
        <div className="border-2 border-dashed border-slate-800 hover:border-cyan-500/50 rounded-xl p-8 text-center bg-slate-950/40 transition-colors">
          <UploadCloud className="w-10 h-10 text-cyan-400 mx-auto mb-3" />
          <p className="text-sm font-bold text-white">Choose CSV or Excel Spreadsheet to Import</p>
          <p className="text-xs text-slate-400 mt-1">UTF-8 Encoded CSV with comma or semicolon delimiter</p>

          <input
            type="file"
            accept=".csv,.txt"
            onChange={handleFileChange}
            className="mt-4 text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-slate-800 file:text-cyan-400 hover:file:bg-slate-700 cursor-pointer"
          />
        </div>
      </div>

      {/* Preview Section */}
      {previewData && (
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-4 shadow-xl">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-white">Import Preview ({previewData.total_rows} rows detected)</h3>
              <p className="text-xs text-slate-400">File: {previewData.filename}</p>
            </div>
            <button
              onClick={handleCommitImport}
              disabled={loading}
              className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-extrabold rounded-lg text-xs flex items-center space-x-1.5 transition-colors"
            >
              {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              <span>Commit & Execute Bulk Import</span>
            </button>
          </div>

          <div className="overflow-x-auto border border-slate-800 rounded-lg">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-950 text-slate-400 font-semibold text-[10px] uppercase">
                  {previewData.headers?.map((h: string, idx: number) => (
                    <th key={idx} className="py-2 px-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                {previewData.preview_sample?.map((row: any, rIdx: number) => (
                  <tr key={rIdx} className="hover:bg-slate-800/30">
                    {previewData.headers?.map((h: string, cIdx: number) => (
                      <td key={cIdx} className="py-2 px-3 text-slate-300 truncate max-w-xs">{row[h]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Result & Validation Report */}
      {result && (
        <div className={`p-5 rounded-xl border space-y-3 ${
          result.status === 'SUCCESS' || result.status === 'COMPLETED'
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
        }`}>
          <div className="flex items-center space-x-2 font-bold text-sm">
            {result.status === 'SUCCESS' || result.status === 'COMPLETED' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-400" />
            )}
            <span>{result.message || `Bulk Import Completed: ${result.accepted || result.accepted_count} rows accepted`}</span>
          </div>

          {result.grn_number && (
            <p className="text-xs text-white">
              Generated Receipt Note: <strong className="font-mono text-cyan-400">{result.grn_number}</strong>
            </p>
          )}

          {/* Row-by-row Error Log */}
          {result.errors && result.errors.length > 0 && (
            <div className="bg-slate-950 p-3 rounded-lg border border-rose-500/20 space-y-1 text-xs">
              <span className="font-bold text-rose-400">Row-by-Row Error Log:</span>
              <div className="max-h-40 overflow-y-auto space-y-1 mt-1 font-mono text-[11px]">
                {result.errors.map((e: any, idx: number) => (
                  <div key={idx} className="text-rose-300">
                    Row {e.row}: {e.sku || 'Item'} &rarr; <span className="text-white">{e.error}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
