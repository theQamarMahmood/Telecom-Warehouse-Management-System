import React, { useEffect, useState } from 'react';
import { PackageCheck, Plus, Search, CheckCircle2, AlertCircle, X, Shield, RefreshCw } from 'lucide-react';
import { apiRequest } from '../api';

export const GoodsReceivingPage: React.FC = () => {
  const [receipts, setReceipts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [itemsList, setItemsList] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);

  // Form State
  const [targetWh, setTargetWh] = useState<number>(1);
  const [deliveryNote, setDeliveryNote] = useState('');
  const [selectedItemId, setSelectedItemId] = useState<number>(1);
  const [quantity, setQuantity] = useState('2');
  const [serialsText, setSerialsText] = useState('');
  const [damagedQty, setDamagedQty] = useState('0');
  const [notes, setNotes] = useState('');
  const [formMsg, setFormMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      apiRequest<any[]>('/receiving/receipts'),
      apiRequest<any[]>('/catalogue/items'),
      apiRequest<any[]>('/hierarchy/warehouses')
    ]).then(([rcpts, its, whs]) => {
      setReceipts(rcpts);
      setItemsList(its);
      setWarehouses(whs);
      if (whs.length > 0) setTargetWh(whs[0].id);
      if (its.length > 0) setSelectedItemId(its[0].id);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const selectedItem = itemsList.find((i) => i.id === selectedItemId);
  const isSerialized = selectedItem?.tracking_mode === 'SERIALIZED';

  const handleCreateReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormMsg(null);

    const qtyNum = parseFloat(quantity) || 0;
    const dmgNum = parseFloat(damagedQty) || 0;
    const serials = serialsText
      .split(/[\n,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (isSerialized && serials.length !== int(qtyNum)) {
      setFormMsg({
        type: 'error',
        text: `Item is SERIALIZED: You must provide exactly ${int(qtyNum)} serial numbers (provided: ${serials.length}).`
      });
      return;
    }

    try {
      const res = await apiRequest<any>('/receiving/receipts', {
        method: 'POST',
        body: JSON.stringify({
          receiving_warehouse_id: targetWh,
          delivery_note_ref: deliveryNote || 'DN-DIRECT-RECEIPT',
          notes,
          items: [
            {
              item_id: selectedItemId,
              expected_quantity: qtyNum,
              received_quantity: qtyNum,
              damaged_quantity: dmgNum,
              serial_numbers: isSerialized ? serials : [],
              condition: dmgNum > 0 ? 'DAMAGED' : 'NEW'
            }
          ]
        })
      });

      setFormMsg({ type: 'success', text: `Receipt ${res.grn_number} created and inventory ledger updated!` });
      setTimeout(() => {
        setShowModal(false);
        fetchData();
      }, 1200);
    } catch (err: any) {
      setFormMsg({ type: 'error', text: err.message });
    }
  };

  const int = (val: number) => Math.floor(val);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center space-x-2">
            <PackageCheck className="w-5 h-5 text-cyan-400" />
            <span>Goods Receiving & Putaway (Inbound GRN)</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Capture supplier deliveries, verify serial numbers, inspect physical condition, and update stock ledger.
          </p>
        </div>

        <button
          onClick={() => {
            setFormMsg(null);
            setShowModal(true);
          }}
          className="px-3.5 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg text-xs flex items-center space-x-1.5 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Goods Receipt Note</span>
        </button>
      </div>

      {/* Receipts Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 text-[10px] uppercase tracking-wider font-semibold">
                <th className="py-3 px-3.5">GRN Number</th>
                <th className="py-3 px-3.5">Source Type</th>
                <th className="py-3 px-3.5">Receiving Warehouse</th>
                <th className="py-3 px-3.5">Delivery Note Ref</th>
                <th className="py-3 px-3.5">Inspection Status</th>
                <th className="py-3 px-3.5">Received By</th>
                <th className="py-3 px-3.5 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {receipts.map((r) => (
                <tr key={r.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-3.5">
                    <span className="font-mono text-cyan-400 font-bold">{r.grn_number}</span>
                  </td>
                  <td className="py-3 px-3.5 text-slate-300">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-semibold">
                      {r.source_type}
                    </span>
                  </td>
                  <td className="py-3 px-3.5 text-white font-medium">{r.receiving_warehouse_name}</td>
                  <td className="py-3 px-3.5 text-slate-300 font-mono text-[11px]">{r.delivery_note_ref || 'N/A'}</td>
                  <td className="py-3 px-3.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      {r.status}
                    </span>
                  </td>
                  <td className="py-3 px-3.5 text-slate-300">{r.received_by_name}</td>
                  <td className="py-3 px-3.5 text-right text-slate-500 font-mono text-[11px]">
                    {new Date(r.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
              {receipts.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No Goods Receipt Notes registered yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Receipt Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <h3 className="text-sm font-bold text-white">Record Inbound Goods Receipt (GRN)</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateReceipt} className="p-5 space-y-4 text-xs">
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
                  <label className="block text-slate-400 mb-1">Receiving Warehouse</label>
                  <select
                    value={targetWh}
                    onChange={(e) => setTargetWh(parseInt(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                  >
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Delivery Note Ref</label>
                  <input
                    type="text"
                    required
                    value={deliveryNote}
                    onChange={(e) => setDeliveryNote(e.target.value)}
                    placeholder="e.g. DN-ERICSSON-8821"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Equipment Item to Receive</label>
                <select
                  value={selectedItemId}
                  onChange={(e) => setSelectedItemId(parseInt(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                >
                  {itemsList.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name} [{i.sku}] - Mode: {i.tracking_mode}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Quantity Received</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Damaged Count (if any)</label>
                  <input
                    type="number"
                    min="0"
                    value={damagedQty}
                    onChange={(e) => setDamagedQty(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                  />
                </div>
              </div>

              {isSerialized && (
                <div>
                  <label className="block text-slate-400 mb-1">
                    Serial Numbers (One per line or comma-separated - Exactly {quantity} required)
                  </label>
                  <textarea
                    rows={3}
                    value={serialsText}
                    onChange={(e) => setSerialsText(e.target.value)}
                    placeholder="SN-5G-1001&#10;SN-5G-1002"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white font-mono text-[11px]"
                  />
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    System verifies serial numbers and immediately rejects duplicates.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-slate-400 mb-1">Receiving Remarks / Notes</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Inbound verification passed, stored in Zone A rack 1"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg"
                >
                  Post Goods Receipt & Commit Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
