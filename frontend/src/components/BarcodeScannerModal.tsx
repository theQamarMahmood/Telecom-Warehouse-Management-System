import React, { useState } from 'react';
import { X, Smartphone, QrCode, Search, CheckCircle2, AlertCircle } from 'lucide-react';
import { apiRequest } from '../api';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssetFound: (serialNumber: string) => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({ isOpen, onClose, onAssetFound }) => {
  const [inputCode, setInputCode] = useState('');
  const [assetDetails, setAssetDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  if (!isOpen) return null;

  const quickCodes = [
    'RRU-DXB-1001',
    'RRU-DXB-1018',
    'ANR-DXB-9002',
    'BC-RAN-4415',
    'BC-TX-SFP10',
  ];

  const handleLookup = async (code: string) => {
    setError(null);
    setAssetDetails(null);
    setScanning(true);

    try {
      const res = await apiRequest<any[]>(`/inventory/assets?serial_number=${encodeURIComponent(code)}`);
      if (res && res.length > 0) {
        setAssetDetails(res[0]);
      } else {
        // Try looking up item barcode
        setError(`No active serialized equipment found with code '${code}'.`);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Barcode & QR Code Scanner</h3>
              <p className="text-[11px] text-slate-400">Warehouse Optical Reader Simulation</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Simulated Optical Viewfinder */}
          <div className="relative h-44 bg-slate-950 rounded-xl border border-slate-800 overflow-hidden flex items-center justify-center">
            {/* Laser Line Animation */}
            <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-0.5 bg-rose-500 shadow-[0_0_12px_#f43f5e] animate-pulse"></div>

            {/* Viewfinder brackets */}
            <div className="w-36 h-28 border-2 border-dashed border-cyan-500/50 rounded-lg flex items-center justify-center text-center p-2">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                Align 1D / 2D Barcode in Frame
              </span>
            </div>
          </div>

          {/* Manual / Scan Input */}
          <div className="flex space-x-2">
            <input
              type="text"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value)}
              placeholder="Scan or type Serial No / Barcode..."
              className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
            <button
              onClick={() => handleLookup(inputCode)}
              disabled={!inputCode || scanning}
              className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 rounded-lg text-xs font-bold transition-colors flex items-center space-x-1"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Lookup</span>
            </button>
          </div>

          {/* Quick Test Barcodes */}
          <div>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Sample Telecom Asset Tags:</span>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {quickCodes.map((code) => (
                <button
                  key={code}
                  onClick={() => {
                    setInputCode(code);
                    handleLookup(code);
                  }}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-mono border border-slate-700 transition-colors"
                >
                  {code}
                </button>
              ))}
            </div>
          </div>

          {/* Result Card */}
          {assetDetails && (
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-sm">{assetDetails.item_name}</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                  {assetDetails.status}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400">
                <div>Serial: <strong className="text-white font-mono">{assetDetails.serial_number}</strong></div>
                <div>SKU: <strong className="text-white font-mono">{assetDetails.sku}</strong></div>
                <div>Depot: <strong className="text-white">{assetDetails.warehouse_name || 'N/A'}</strong></div>
                <div>Bin: <strong className="text-white">{assetDetails.location_code || 'Unassigned'}</strong></div>
              </div>

              <button
                onClick={() => {
                  onAssetFound(assetDetails.serial_number);
                  onClose();
                }}
                className="w-full mt-2 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-400 font-semibold rounded-lg text-xs transition-colors flex items-center justify-center space-x-1"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>View Full Chain of Custody</span>
              </button>
            </div>
          )}

          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
