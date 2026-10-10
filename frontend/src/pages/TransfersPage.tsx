import React, { useEffect, useState } from 'react';
import { ArrowLeftRight, Plus, Truck, AlertTriangle, CheckCircle2, X, AlertCircle, RefreshCw, Send, Check } from 'lucide-react';
import { InterBranchTransfer } from '../types';
import { apiRequest } from '../api';

export const TransfersPage: React.FC = () => {
  const [transfers, setTransfers] = useState<InterBranchTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [receiveModalTransfer, setReceiveModalTransfer] = useState<InterBranchTransfer | null>(null);

  // New Transfer Form
  const [fromWh, setFromWh] = useState<number>(1);
  const [toWh, setToWh] = useState<number>(3);
  const [selectedItemId, setSelectedItemId] = useState<number>(4); // Optical SFP 10G
  const [requestedQty, setRequestedQty] = useState('20');
  const [carrier, setCarrier] = useState('Apex Corporate Fleet #4');
  const [formMsg, setFormMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Receive Form
  const [receivedQty, setReceivedQty] = useState('18');
  const [damagedQty, setDamagedQty] = useState('0');
  const [rcvNotes, setRcvNotes] = useState('');
  const [rcvMsg, setRcvMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchTransfers = () => {
    setLoading(true);
    apiRequest<InterBranchTransfer[]>('/transfers')
      .then((data) => {
        setTransfers(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchTransfers();
  }, []);

  const handleCreateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormMsg(null);
    try {
      const res = await apiRequest<any>('/transfers', {
        method: 'POST',
        body: JSON.stringify({
          from_warehouse_id: fromWh,
          to_warehouse_id: toWh,
          carrier,
          items: [
            {
              item_id: selectedItemId,
              requested_quantity: parseFloat(requestedQty) || 0,
            }
          ]
        })
      });
      setFormMsg({ type: 'success', text: `Transfer ${res.transfer_number} created and submitted!` });
      setTimeout(() => {
        setShowNewModal(false);
        fetchTransfers();
      }, 1200);
    } catch (err: any) {
      setFormMsg({ type: 'error', text: err.message });
    }
  };

  const handleApprove = async (id: number) => {
    try {
      await apiRequest(`/transfers/${id}/approve`, { method: 'POST' });
      fetchTransfers();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleDispatch = async (id: number) => {
    try {
      await apiRequest(`/transfers/${id}/dispatch`, {
        method: 'POST',
        body: JSON.stringify({ carrier: 'Apex Logistics Hub Express' })
      });
      fetchTransfers();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleReceive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiveModalTransfer) return;
    setRcvMsg(null);

    const firstItem = receiveModalTransfer.items[0];
    const rcvNum = parseFloat(receivedQty) || 0;
    const dmgNum = parseFloat(damagedQty) || 0;

    try {
      const res = await apiRequest<any>(`/transfers/${receiveModalTransfer.id}/receive`, {
        method: 'POST',
        body: JSON.stringify({
          items: [
            {
              item_id: firstItem.item_id,
              received_quantity: rcvNum,
              damaged_quantity: dmgNum,
            }
          ],
          notes: rcvNotes
        })
      });

      if (res.total_discrepancy > 0) {
        setRcvMsg({
          type: 'success',
          text: `Transfer received with unresolved discrepancy: ${res.total_discrepancy} units missing. Exception ledger created.`
        });
      } else {
        setRcvMsg({ type: 'success', text: `Transfer received and reconciled completely!` });
      }

      setTimeout(() => {
        setReceiveModalTransfer(null);
        fetchTransfers();
      }, 1500);
    } catch (err: any) {
      setRcvMsg({ type: 'error', text: err.message });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center space-x-2">
            <ArrowLeftRight className="w-5 h-5 text-cyan-400" />
            <span>Inter-Branch & Inter-Warehouse Transfers</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Strict chain of custody, in-transit stock accounting, and zero-loss discrepancy tracking.
          </p>
        </div>

        <button
          onClick={() => {
            setFormMsg(null);
            setShowNewModal(true);
          }}
          className="px-3.5 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg text-xs flex items-center space-x-1.5 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Transfer Request</span>
        </button>
      </div>

      {/* Transfers List */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 text-[10px] uppercase tracking-wider font-semibold">
                <th className="py-3 px-3.5">Transfer No</th>
                <th className="py-3 px-3.5">Origin Warehouse</th>
                <th className="py-3 px-3.5">Destination Warehouse</th>
                <th className="py-3 px-3.5">Dispatched / Received</th>
                <th className="py-3 px-3.5">Discrepancy</th>
                <th className="py-3 px-3.5">Carrier / Vehicle</th>
                <th className="py-3 px-3.5">Transfer Status</th>
                <th className="py-3 px-3.5 text-right">Workflow Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {transfers.map((t) => {
                const it = t.items[0];
                return (
                  <tr key={t.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-3.5">
                      <span className="font-mono text-cyan-400 font-bold">{t.transfer_number}</span>
                      <p className="text-[10px] text-slate-500">By: {t.requester_name}</p>
                    </td>
                    <td className="py-3 px-3.5 text-slate-200">
                      <p className="font-semibold">{t.from_warehouse_name}</p>
                      <p className="text-[10px] text-slate-400">{t.from_branch_name}</p>
                    </td>
                    <td className="py-3 px-3.5 text-slate-200">
                      <p className="font-semibold">{t.to_warehouse_name}</p>
                      <p className="text-[10px] text-slate-400">{t.to_branch_name}</p>
                    </td>
                    <td className="py-3 px-3.5 font-mono text-[11px]">
                      {it ? (
                        <span>
                          <strong className="text-white">{it.dispatched_quantity}</strong> disp. /{' '}
                          <strong className="text-emerald-400">{it.received_quantity}</strong> rcvd
                        </span>
                      ) : 'N/A'}
                    </td>
                    <td className="py-3 px-3.5">
                      {it && it.discrepancy_quantity > 0 ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center space-x-1 w-max">
                          <AlertTriangle className="w-3 h-3 inline" />
                          <span>{it.discrepancy_quantity} Units Missing</span>
                        </span>
                      ) : (
                        <span className="text-slate-500 text-[11px]">None</span>
                      )}
                    </td>
                    <td className="py-3 px-3.5 text-slate-300 text-[11px]">{t.carrier || 'Standard Courier'}</td>
                    <td className="py-3 px-3.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        t.status === 'SUBMITTED' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                        t.status === 'APPROVED' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                        t.status === 'IN_TRANSIT' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 animate-pulse' :
                        t.status === 'PARTIALLY_RECEIVED' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                        'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      }`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 text-right space-x-1.5">
                      {t.status === 'SUBMITTED' && (
                        <button
                          onClick={() => handleApprove(t.id)}
                          className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-[11px] font-bold"
                        >
                          Approve
                        </button>
                      )}
                      {t.status === 'APPROVED' && (
                        <button
                          onClick={() => handleDispatch(t.id)}
                          className="px-2 py-1 bg-cyan-600 hover:bg-cyan-500 text-slate-950 rounded text-[11px] font-bold"
                        >
                          Dispatch
                        </button>
                      )}
                      {t.status === 'IN_TRANSIT' && (
                        <button
                          onClick={() => {
                            setRcvMsg(null);
                            setReceivedQty(String(it?.dispatched_quantity || 0));
                            setReceiveModalTransfer(t);
                          }}
                          className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-bold"
                        >
                          Receive Goods
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {transfers.length === 0 && !loading && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    No inter-branch transfers recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Receive Modal with Discrepancy Recording */}
      {receiveModalTransfer && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <h3 className="text-sm font-bold text-white">Destination Receipt & Discrepancy Verification</h3>
              <button onClick={() => setReceiveModalTransfer(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReceive} className="p-5 space-y-4 text-xs">
              {rcvMsg && (
                <div className={`p-3 rounded-xl flex items-center space-x-2 ${
                  rcvMsg.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                }`}>
                  {rcvMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  <span>{rcvMsg.text}</span>
                </div>
              )}

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                <p className="text-slate-400">Transfer: <strong className="text-white font-mono">{receiveModalTransfer.transfer_number}</strong></p>
                <p className="text-slate-400">Dispatched Qty: <strong className="text-cyan-400">{receiveModalTransfer.items[0]?.dispatched_quantity} Units</strong></p>
                <p className="text-slate-400">From: <strong className="text-white">{receiveModalTransfer.from_warehouse_name}</strong> &rarr; To: <strong className="text-white">{receiveModalTransfer.to_warehouse_name}</strong></p>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Confirmed Received Quantity</label>
                <input
                  type="number"
                  step="1"
                  required
                  value={receivedQty}
                  onChange={(e) => setReceivedQty(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white font-bold text-sm"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  If fewer units arrived than dispatched, system automatically flags an unresolved transfer discrepancy!
                </p>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Damaged Units Arrived (if any)</label>
                <input
                  type="number"
                  value={damagedQty}
                  onChange={(e) => setDamagedQty(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Discrepancy Notes / Seal Condition</label>
                <input
                  type="text"
                  value={rcvNotes}
                  onChange={(e) => setRcvNotes(e.target.value)}
                  placeholder="e.g. 2 units missing from pallet #3, seal broken during transit"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setReceiveModalTransfer(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg"
                >
                  Confirm Inbound & Reconcile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Transfer Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <h3 className="text-sm font-bold text-white">Create Inter-Branch Transfer Request</h3>
              <button onClick={() => setShowNewModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTransfer} className="p-5 space-y-4 text-xs">
              {formMsg && (
                <div className={`p-3 rounded-xl flex items-center space-x-2 ${
                  formMsg.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                }`}>
                  {formMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  <span>{formMsg.text}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Source Warehouse (From)</label>
                  <select
                    value={fromWh}
                    onChange={(e) => setFromWh(parseInt(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                  >
                    <option value={1}>Dubai Central RAN Depot (WH-DXB-01)</option>
                    <option value={3}>Abu Dhabi Primary Depot (WH-AUH-01)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Destination Warehouse (To)</label>
                  <select
                    value={toWh}
                    onChange={(e) => setToWh(parseInt(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                  >
                    <option value={3}>Abu Dhabi Primary Depot (WH-AUH-01)</option>
                    <option value={1}>Dubai Central RAN Depot (WH-DXB-01)</option>
                    <option value={4}>Sharjah Regional Warehouse (WH-SHJ-01)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Equipment Master</label>
                  <select
                    value={selectedItemId}
                    onChange={(e) => setSelectedItemId(parseInt(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                  >
                    <option value={4}>Finisar 10G SFP+ Transceiver [TX-SFP-10G-LR]</option>
                    <option value={1}>Ericsson Radio 4415 [RAN-RRU-4415]</option>
                    <option value={3}>CommScope 65° Massive MIMO Antenna</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Quantity to Transfer</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={requestedQty}
                    onChange={(e) => setRequestedQty(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Designated Carrier / Logistics Fleet</label>
                <input
                  type="text"
                  value={carrier}
                  onChange={(e) => setCarrier(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg"
                >
                  Submit Transfer Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
