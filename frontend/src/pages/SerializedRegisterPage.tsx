import React, { useEffect, useState } from 'react';
import {
  QrCode, Search, Filter, ShieldCheck, History, ArrowRight, RefreshCw, Smartphone
} from 'lucide-react';
import { SerializedAsset } from '../types';
import { apiRequest } from '../api';

interface SerializedRegisterPageProps {
  onTraceSerial: (serial: string) => void;
  onOpenScanner: () => void;
}

export const SerializedRegisterPage: React.FC<SerializedRegisterPageProps> = ({
  onTraceSerial,
  onOpenScanner,
}) => {
  const [assets, setAssets] = useState<SerializedAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const fetchAssets = () => {
    setLoading(true);
    let url = '/inventory/assets';
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (statusFilter !== 'ALL') params.append('status', statusFilter);
    if (params.toString()) url += `?${params.toString()}`;

    apiRequest<SerializedAsset[]>(url)
      .then((data) => {
        setAssets(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchAssets();
  }, [search, statusFilter]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">AVAILABLE</span>;
      case 'RESERVED':
      case 'ALLOCATED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">{status}</span>;
      case 'BORROWED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30">BORROWED</span>;
      case 'IN_TRANSIT':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">IN TRANSIT</span>;
      case 'DAMAGED':
      case 'QUARANTINED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">{status}</span>;
      case 'UNDER_REPAIR':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">UNDER REPAIR</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center space-x-2">
            <QrCode className="w-5 h-5 text-cyan-400" />
            <span>Serialized Asset Master Register</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Unit-level serialization, physical custody status, and lifetime audit trail.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={onOpenScanner}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors"
          >
            <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
            <span>Barcode Scanner</span>
          </button>
          <button
            onClick={fetchAssets}
            className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg text-xs flex items-center space-x-1.5 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Serial No, Barcode, Model..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center space-x-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {['ALL', 'AVAILABLE', 'RESERVED', 'BORROWED', 'IN_TRANSIT', 'DAMAGED', 'UNDER_REPAIR'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors ${
                statusFilter === st
                  ? 'bg-cyan-500 text-slate-950'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Assets Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 text-[10px] uppercase tracking-wider font-semibold">
                <th className="py-3 px-3.5">Serial Number & Barcode</th>
                <th className="py-3 px-3.5">Equipment Description</th>
                <th className="py-3 px-3.5">Current Warehouse Depot</th>
                <th className="py-3 px-3.5">Storage Bin</th>
                <th className="py-3 px-3.5">Lifecycle Status</th>
                <th className="py-3 px-3.5">Condition</th>
                <th className="py-3 px-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {assets.map((a) => (
                <tr key={a.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-3.5">
                    <p className="font-mono text-cyan-400 font-bold">{a.serial_number}</p>
                    <p className="font-mono text-slate-500 text-[11px]">{a.barcode || 'N/A'}</p>
                  </td>
                  <td className="py-3 px-3.5">
                    <p className="text-white font-bold">{a.item_name}</p>
                    <p className="text-[11px] text-slate-400 font-mono">
                      {a.sku} • {a.manufacturer} ({a.model_number})
                    </p>
                  </td>
                  <td className="py-3 px-3.5 text-slate-300">
                    {a.warehouse_name || <span className="text-slate-500 italic">Site / In Transit</span>}
                  </td>
                  <td className="py-3 px-3.5 text-slate-400 font-mono text-[11px]">
                    {a.location_code || 'Unassigned'}
                  </td>
                  <td className="py-3 px-3.5">
                    {getStatusBadge(a.status)}
                  </td>
                  <td className="py-3 px-3.5 text-slate-300 text-[11px]">
                    <span className="capitalize">{a.condition?.toLowerCase() || 'Good'}</span>
                  </td>
                  <td className="py-3 px-3.5 text-right">
                    <button
                      onClick={() => onTraceSerial(a.serial_number)}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-400 font-semibold rounded-lg text-[11px] transition-colors inline-flex items-center space-x-1"
                    >
                      <History className="w-3 h-3" />
                      <span>Trace History</span>
                    </button>
                  </td>
                </tr>
              ))}
              {assets.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No serialized assets found matching criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
