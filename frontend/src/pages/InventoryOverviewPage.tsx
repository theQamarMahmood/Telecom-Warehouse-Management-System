import React, { useEffect, useState } from 'react';
import {
  Boxes, Search, Filter, Download, AlertTriangle, ArrowUpDown, RefreshCw, CheckCircle2, Eye, Radio
} from 'lucide-react';
import { InventoryBalance, EquipmentItem } from '../types';
import { apiRequest } from '../api';
import { EquipmentDetailModal } from '../components/EquipmentDetailModal';

export const InventoryOverviewPage: React.FC = () => {
  const [balances, setBalances] = useState<InventoryBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCluster, setSelectedCluster] = useState<string>('all');
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('all');
  const [selectedDetailItem, setSelectedDetailItem] = useState<EquipmentItem | null>(null);

  const fetchBalances = () => {
    setLoading(true);
    let url = '/inventory/balances';
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (params.toString()) url += `?${params.toString()}`;

    apiRequest<InventoryBalance[]>(url)
      .then((data) => {
        setBalances(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchBalances();
  }, [search]);

  // Unique clusters & warehouses for filter dropdowns
  const clusters = Array.from(new Set(balances.map(b => b.cluster_name).filter(Boolean)));
  const warehouses = Array.from(new Set(balances.map(b => b.warehouse_name).filter(Boolean)));

  const filteredBalances = balances.filter(b => {
    if (selectedCluster !== 'all' && b.cluster_name !== selectedCluster) return false;
    if (selectedWarehouse !== 'all' && b.warehouse_name !== selectedWarehouse) return false;
    return true;
  });

  const handleInspect = async (itemId: number) => {
    try {
      const it = await apiRequest<EquipmentItem>(`/catalogue/items/${itemId}`);
      setSelectedDetailItem(it);
    } catch (err) {
      console.error(err);
    }
  };

  const exportCSV = () => {
    const headers = ["SKU", "Item Name", "Category", "Manufacturer", "Warehouse", "Branch", "Location", "On Hand", "Available", "Reserved", "Borrowed", "In Transit", "Damaged", "Quarantined"];
    const rows = filteredBalances.map(b => [
      b.sku,
      `"${b.item_name}"`,
      b.category_name,
      b.manufacturer,
      b.warehouse_name,
      b.branch_name,
      b.location_code || '',
      b.quantity_on_hand,
      b.quantity_available,
      b.quantity_reserved,
      b.quantity_borrowed,
      b.quantity_in_transit,
      b.quantity_damaged,
      b.quantity_quarantined
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `TWMS_Inventory_Balances_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center space-x-2">
            <Boxes className="w-5 h-5 text-cyan-400" />
            <span>Central Inventory Overview & Balances</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time stock ledger across all warehouses, staging depots, and regional clusters.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={exportCSV}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={fetchBalances}
            className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg text-xs flex items-center space-x-1.5 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by SKU, equipment name, model..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex items-center space-x-3 w-full md:w-auto">
          {/* Cluster filter */}
          <select
            value={selectedCluster}
            onChange={(e) => setSelectedCluster(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="all">All Regional Clusters</option>
            {clusters.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {/* Warehouse filter */}
          <select
            value={selectedWarehouse}
            onChange={(e) => setSelectedWarehouse(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="all">All Warehouses / Depots</option>
            {warehouses.map((w) => (
              <option key={w} value={w}>{w}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Inventory Balances Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 text-[10px] uppercase tracking-wider font-semibold">
                <th className="py-3 px-3.5">SKU & Item Details</th>
                <th className="py-3 px-3.5">Category</th>
                <th className="py-3 px-3.5">Warehouse Location</th>
                <th className="py-3 px-3 text-right">On Hand</th>
                <th className="py-3 px-3 text-right">Available</th>
                <th className="py-3 px-3 text-right">Reserved</th>
                <th className="py-3 px-3 text-right">Borrowed</th>
                <th className="py-3 px-3 text-right">In Transit</th>
                <th className="py-3 px-3 text-right">Damaged</th>
                <th className="py-3 px-3.5">Status</th>
                <th className="py-3 px-3 text-center">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {filteredBalances.map((b) => (
                <tr key={b.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-3.5">
                    <div className="flex items-center space-x-2.5">
                      <div
                        onClick={() => handleInspect(b.item_id)}
                        className="w-9 h-9 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0 cursor-pointer hover:border-cyan-500 transition-colors"
                      >
                        <Radio className="w-4 h-4 text-cyan-400" />
                      </div>
                      <div>
                        <p
                          onClick={() => handleInspect(b.item_id)}
                          className="text-white font-bold hover:text-cyan-400 cursor-pointer transition-colors"
                        >
                          {b.item_name}
                        </p>
                        <div className="flex items-center space-x-2 text-[11px] text-slate-400 mt-0.5">
                          <span className="font-mono text-cyan-400">{b.sku}</span>
                          <span>•</span>
                          <span>{b.manufacturer}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3.5 text-slate-300">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-[11px] font-medium text-slate-300">
                      {b.category_name}
                    </span>
                  </td>
                  <td className="py-3 px-3.5">
                    <p className="text-slate-200 font-medium">{b.warehouse_name}</p>
                    <p className="text-[11px] text-slate-500 font-mono">{b.location_code || 'General Staging'}</p>
                  </td>
                  <td className="py-3 px-3 text-right font-black text-white">{b.quantity_on_hand}</td>
                  <td className="py-3 px-3 text-right font-black text-emerald-400">{b.quantity_available}</td>
                  <td className="py-3 px-3 text-right font-semibold text-blue-400">{b.quantity_reserved}</td>
                  <td className="py-3 px-3 text-right font-semibold text-purple-400">{b.quantity_borrowed}</td>
                  <td className="py-3 px-3 text-right font-semibold text-cyan-400">{b.quantity_in_transit}</td>
                  <td className="py-3 px-3 text-right font-semibold text-rose-400">{b.quantity_damaged}</td>
                  <td className="py-3 px-3.5">
                    {b.quantity_available === 0 ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                        Out of Stock
                      </span>
                    ) : b.quantity_available <= 5 ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        Low Stock
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        Healthy
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <button
                      onClick={() => handleInspect(b.item_id)}
                      className="p-1.5 bg-slate-800 hover:bg-cyan-500 hover:text-slate-950 text-slate-300 rounded-lg transition-colors"
                      title="Inspect Specs & Picture"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredBalances.length === 0 && !loading && (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-slate-500">
                    No matching equipment balances found for the selected criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Equipment Detail Modal */}
      {selectedDetailItem && (
        <EquipmentDetailModal
          item={selectedDetailItem}
          onClose={() => setSelectedDetailItem(null)}
          onItemUpdated={() => {
            fetchBalances();
            apiRequest<EquipmentItem>(`/catalogue/items/${selectedDetailItem.id}`).then((updated) => {
              setSelectedDetailItem(updated);
            });
          }}
        />
      )}
    </div>
  );
};
