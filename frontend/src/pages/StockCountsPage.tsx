import React, { useEffect, useState } from 'react';
import { ClipboardList, Plus, CheckCircle2, AlertCircle, X, Check, ArrowUpDown } from 'lucide-react';
import { StockCount } from '../types';
import { apiRequest } from '../api';

export const StockCountsPage: React.FC = () => {
  const [counts, setCounts] = useState<StockCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCount, setActiveCount] = useState<StockCount | null>(null);

  // Reconcile modal
  const [approvalNotes, setApprovalNotes] = useState('Reconciled and signed off by Warehouse Manager');
  const [reconMsg, setReconMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchCounts = () => {
    setLoading(true);
    apiRequest<StockCount[]>('/stock-counts')
      .then((data) => {
        setCounts(data);
        if (data.length > 0 && !activeCount) {
          setActiveCount(data[0]);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchCounts();
  }, []);

  const handleStartCount = async () => {
    try {
      const res = await apiRequest<any>('/stock-counts', {
        method: 'POST',
        body: JSON.stringify({ warehouse_id: 1, count_type: 'CYCLE_COUNT' })
      });
      fetchCounts();
      setActiveCount(res);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleUpdateItemCount = async (countId: number, itemId: number, countedVal: number) => {
    try {
      await apiRequest(`/stock-counts/${countId}/record-item`, {
        method: 'POST',
        body: JSON.stringify({
          item_id: itemId,
          counted_quantity: countedVal,
          discrepancy_reason: 'Physical count verified on shelf'
        })
      });
      fetchCounts();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleReconcile = async () => {
    if (!activeCount) return;
    setReconMsg(null);
    try {
      await apiRequest(`/stock-counts/${activeCount.id}/reconcile`, {
        method: 'POST',
        body: JSON.stringify({ approval_notes: approvalNotes })
      });
      setReconMsg({
        type: 'success',
        text: `Count ${activeCount.count_number} reconciled with supervisory signoff. Audit adjustments posted atomically.`
      });
      setTimeout(() => {
        fetchCounts();
      }, 1200);
    } catch (err: any) {
      setReconMsg({ type: 'error', text: err.message });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center space-x-2">
            <ClipboardList className="w-5 h-5 text-cyan-400" />
            <span>Physical Stock Counts & Audit Reconciliation</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Periodic cycle counts, expected vs counted variance analysis, and authorized supervisor reconciliation.
          </p>
        </div>

        <button
          onClick={handleStartCount}
          className="px-3.5 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg text-xs flex items-center space-x-1.5 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Initiate Cycle Count Session</span>
        </button>
      </div>

      {/* Count Sessions Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {counts.map((c) => (
          <div
            key={c.id}
            onClick={() => setActiveCount(c)}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              activeCount?.id === c.id
                ? 'bg-slate-900 border-cyan-500 shadow-lg shadow-cyan-500/10'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex justify-between items-start">
              <div>
                <span className="font-mono text-cyan-400 font-bold text-xs">{c.count_number}</span>
                <h3 className="font-bold text-white text-sm mt-0.5">{c.warehouse_name}</h3>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                c.status === 'APPROVED_RECONCILED'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              }`}>
                {c.status}
              </span>
            </div>
            <div className="mt-3 flex justify-between text-[11px] text-slate-400">
              <span>Type: <strong>{c.count_type}</strong></span>
              <span>{c.items?.length || 0} Line Items</span>
            </div>
          </div>
        ))}
      </div>

      {/* Active Session Detail & Variance Reconciliation Table */}
      {activeCount && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-mono text-cyan-400 font-bold">{activeCount.count_number}</span>
                <span className="text-slate-400">•</span>
                <span className="text-white font-bold">{activeCount.warehouse_name}</span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Physical Count Audit Sheet • Initiated by: {activeCount.initiated_by_name}
              </p>
            </div>

            {activeCount.status !== 'APPROVED_RECONCILED' && (
              <button
                onClick={handleReconcile}
                className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-xs flex items-center space-x-1.5 transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Reconcile & Post Discrepancy Adjustments</span>
              </button>
            )}
          </div>

          {reconMsg && (
            <div className={`p-3 rounded-xl flex items-center space-x-2 text-xs ${
              reconMsg.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
            }`}>
              {reconMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <span>{reconMsg.text}</span>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-[10px] uppercase font-semibold">
                  <th className="py-2.5 px-3">Equipment Item</th>
                  <th className="py-2.5 px-3 font-mono">SKU</th>
                  <th className="py-2.5 px-3 text-right">System Recorded</th>
                  <th className="py-2.5 px-3 text-right">Physical Counted</th>
                  <th className="py-2.5 px-3 text-right">Variance</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {activeCount.items?.map((it, idx) => {
                  const hasDiscrepancy = it.variance !== 0;
                  return (
                    <tr key={idx} className="hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 text-white font-medium">{it.item_name}</td>
                      <td className="py-2.5 px-3 text-cyan-400 font-mono text-[11px]">{it.sku}</td>
                      <td className="py-2.5 px-3 text-right text-slate-300 font-mono">{it.system_quantity}</td>
                      <td className="py-2.5 px-3 text-right font-mono">
                        {activeCount.status === 'APPROVED_RECONCILED' ? (
                          <span className="text-white font-bold">{it.counted_quantity}</span>
                        ) : (
                          <input
                            type="number"
                            defaultValue={it.counted_quantity}
                            onBlur={(e) => handleUpdateItemCount(activeCount.id, it.item_id, parseFloat(e.target.value) || 0)}
                            className="w-16 bg-slate-950 border border-slate-800 rounded px-2 py-0.5 text-right text-white font-bold text-xs"
                          />
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold">
                        {it.variance > 0 ? (
                          <span className="text-emerald-400">+{it.variance}</span>
                        ) : it.variance < 0 ? (
                          <span className="text-rose-400">{it.variance}</span>
                        ) : (
                          <span className="text-slate-500">0</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        {hasDiscrepancy ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                            Variance Detected
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            Exact Match
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
