import React, { useEffect, useState } from 'react';
import { X, ShieldCheck, Clock, MapPin, User, ArrowRight, Radio } from 'lucide-react';
import { apiRequest } from '../api';

interface ChainOfCustodyModalProps {
  serialNumber: string | null;
  onClose: () => void;
}

export const ChainOfCustodyModal: React.FC<ChainOfCustodyModalProps> = ({ serialNumber, onClose }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!serialNumber) return;
    setLoading(true);
    setError(null);
    apiRequest<any>(`/reports/chain-of-custody/${encodeURIComponent(serialNumber)}`)
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [serialNumber]);

  if (!serialNumber) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Serialized Chain of Custody & Traceability</h3>
              <p className="text-xs font-mono text-cyan-400">{serialNumber}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {loading && (
            <div className="py-12 text-center text-slate-400 text-xs">Loading complete asset custody trail...</div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
              {error}
            </div>
          )}

          {data && (
            <>
              {/* Asset Snapshot Card */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 text-[10px] uppercase font-semibold">Equipment Item</span>
                  <p className="text-white font-medium mt-0.5 truncate">{data.item_name}</p>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] uppercase font-semibold">SKU / Model</span>
                  <p className="text-slate-300 font-mono mt-0.5 truncate">{data.sku}</p>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] uppercase font-semibold">Current Status</span>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                    {data.current_status}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] uppercase font-semibold">Current Depot</span>
                  <p className="text-slate-300 mt-0.5 truncate">{data.current_warehouse || 'Field Site'}</p>
                </div>
              </div>

              {/* Immutable Movement Ledger Timeline */}
              <div>
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-4">
                  Immutable Movement Timeline ({data.movement_history?.length || 0} events)
                </h4>

                <div className="relative pl-6 space-y-6 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
                  {data.movement_history?.map((evt: any, idx: number) => (
                    <div key={idx} className="relative group">
                      {/* Node Dot */}
                      <div className="absolute -left-6 top-1 w-4 h-4 rounded-full bg-slate-900 border-2 border-cyan-500 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-400"></div>
                      </div>

                      <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-3 text-xs space-y-1.5 hover:border-slate-700 transition-colors">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white uppercase text-[11px] tracking-wide text-cyan-400">
                            {evt.action}
                          </span>
                          <span className="text-slate-500 text-[10px] font-mono">
                            {new Date(evt.timestamp).toLocaleString()}
                          </span>
                        </div>

                        <div className="flex items-center text-slate-300 text-[11px] space-x-2">
                          <span>{evt.from_warehouse}</span>
                          <ArrowRight className="w-3 h-3 text-slate-500" />
                          <span className="text-white font-medium">{evt.to_warehouse}</span>
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-800/60">
                          <span className="flex items-center space-x-1">
                            <User className="w-3 h-3" />
                            <span>Authorized By: <strong className="text-slate-400">{evt.performed_by}</strong></span>
                          </span>
                          <span className="font-mono text-slate-400">Ref: {evt.reference || 'N/A'}</span>
                        </div>

                        {evt.notes && (
                          <p className="text-[11px] text-slate-400 italic bg-slate-900/60 p-1.5 rounded border border-slate-800/50">
                            "{evt.notes}"
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
