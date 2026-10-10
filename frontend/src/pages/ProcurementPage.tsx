import React, { useEffect, useState } from 'react';
import { ShoppingCart, Plus, CheckCircle2, AlertCircle, X, Building, DollarSign } from 'lucide-react';
import { apiRequest } from '../api';

export const ProcurementPage: React.FC = () => {
  const [pos, setPos] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form State
  const [supplierId, setSupplierId] = useState<number>(1);
  const [targetWh, setTargetWh] = useState<number>(1);
  const [itemId, setItemId] = useState<number>(1);
  const [qty, setQty] = useState('10');
  const [price, setPrice] = useState('3450');
  const [notes, setNotes] = useState('');
  const [formMsg, setFormMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      apiRequest<any[]>('/procurement/purchase-orders'),
      apiRequest<any[]>('/procurement/suppliers')
    ]).then(([orders, sups]) => {
      setPos(orders);
      setSuppliers(sups);
      if (sups.length > 0) setSupplierId(sups[0].id);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreatePO = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormMsg(null);
    try {
      const res = await apiRequest<any>('/procurement/purchase-orders', {
        method: 'POST',
        body: JSON.stringify({
          supplier_id: supplierId,
          target_warehouse_id: targetWh,
          notes,
          items: [
            {
              item_id: itemId,
              ordered_quantity: parseFloat(qty) || 0,
              unit_price: parseFloat(price) || 0,
            }
          ]
        })
      });
      setFormMsg({ type: 'success', text: `Purchase Order ${res.po_number} submitted!` });
      setTimeout(() => {
        setShowModal(false);
        fetchData();
      }, 1200);
    } catch (err: any) {
      setFormMsg({ type: 'error', text: err.message });
    }
  };

  const handleApprovePO = async (id: number) => {
    try {
      await apiRequest(`/procurement/purchase-orders/${id}/approve`, { method: 'POST' });
      fetchData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center space-x-2">
            <ShoppingCart className="w-5 h-5 text-cyan-400" />
            <span>Procurement, Suppliers & Purchase Orders</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Approved vendor management, purchase orders, approval limits, and goods receipt reconciliation.
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
          <span>New Purchase Order</span>
        </button>
      </div>

      {/* Supplier Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {suppliers.map((s) => (
          <div key={s.id} className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-2">
            <div className="flex justify-between items-start">
              <div>
                <span className="font-mono text-cyan-400 text-[10px] font-bold">{s.code}</span>
                <h3 className="font-bold text-white text-sm mt-0.5">{s.name}</h3>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                APPROVED
              </span>
            </div>
            <p className="text-slate-400 text-[11px]">Contact: {s.contact_person || 'Supply Chain Team'}</p>
            <p className="text-slate-500 text-[11px] font-mono">{s.email || 'supply@vendor.com'}</p>
          </div>
        ))}
      </div>

      {/* Purchase Orders Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 text-[10px] uppercase tracking-wider font-semibold">
                <th className="py-3 px-3.5">PO Number</th>
                <th className="py-3 px-3.5">Supplier Name</th>
                <th className="py-3 px-3.5">Target Warehouse</th>
                <th className="py-3 px-3.5">Line Items Summary</th>
                <th className="py-3 px-3.5 text-right">Total Amount</th>
                <th className="py-3 px-3.5">Status</th>
                <th className="py-3 px-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {pos.map((p) => (
                <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-3.5">
                    <span className="font-mono text-cyan-400 font-bold">{p.po_number}</span>
                    <p className="text-[10px] text-slate-500">{new Date(p.order_date).toLocaleDateString()}</p>
                  </td>
                  <td className="py-3 px-3.5 text-white font-medium">{p.supplier_name}</td>
                  <td className="py-3 px-3.5 text-slate-300">{p.target_warehouse_name}</td>
                  <td className="py-3 px-3.5 text-slate-300">
                    {p.items?.map((it: any, idx: number) => (
                      <span key={idx} className="block text-[11px]">
                        {it.item_name} ({it.ordered_quantity} ordered, {it.received_quantity} rcvd)
                      </span>
                    ))}
                  </td>
                  <td className="py-3 px-3.5 text-right font-black text-emerald-400">
                    ${p.total_amount?.toLocaleString() || 0}
                  </td>
                  <td className="py-3 px-3.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      p.status === 'SUBMITTED' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                      p.status === 'APPROVED' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                      p.status === 'RECEIVED' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                      'bg-slate-800 text-slate-300'
                    }`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="py-3 px-3.5 text-right">
                    {p.status === 'SUBMITTED' && (
                      <button
                        onClick={() => handleApprovePO(p.id)}
                        className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-[11px] font-bold"
                      >
                        Approve PO
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {pos.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No purchase orders recorded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New PO Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <h3 className="text-sm font-bold text-white">Issue Procurement Purchase Order</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePO} className="p-5 space-y-4 text-xs">
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
                  <label className="block text-slate-400 mb-1">Approved Supplier</label>
                  <select
                    value={supplierId}
                    onChange={(e) => setSupplierId(parseInt(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Target Receiving Warehouse</label>
                  <select
                    value={targetWh}
                    onChange={(e) => setTargetWh(parseInt(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                  >
                    <option value={1}>Dubai Central RAN Depot (WH-DXB-01)</option>
                    <option value={3}>Abu Dhabi Primary Depot (WH-AUH-01)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Equipment Master Item</label>
                <select
                  value={itemId}
                  onChange={(e) => setItemId(parseInt(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                >
                  <option value={1}>Ericsson Radio 4415 B1/B3 (RRU)</option>
                  <option value={2}>Ericsson Baseband 6630 (BBU)</option>
                  <option value={4}>Finisar 10G SFP+ Transceiver (Optical)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Ordered Quantity</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={qty}
                    onChange={(e) => setQty(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Agreed Unit Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Purchase Justification Notes</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Q4 5G Dense Rollout replenishment"
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
                  Submit Purchase Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
