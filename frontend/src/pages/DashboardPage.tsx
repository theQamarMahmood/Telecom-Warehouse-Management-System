import React, { useEffect, useState } from 'react';
import {
  Boxes, QrCode, DollarSign, AlertTriangle, ArrowUpRight,
  TrendingUp, Clock, ShieldCheck, RefreshCw, Send, CheckCircle2,
  PackageCheck, Truck, Wrench, Layers
} from 'lucide-react';
import { DashboardMetrics } from '../types';
import { apiRequest } from '../api';

interface DashboardPageProps {
  onNavigate: (page: string) => void;
  onTraceSerial: (serial: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate, onTraceSerial }) => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = () => {
    setLoading(true);
    apiRequest<DashboardMetrics>('/reports/dashboard-metrics')
      .then((data) => {
        setMetrics(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  if (loading && !metrics) {
    return (
      <div className="p-8 text-center text-slate-400 text-xs">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-cyan-400" />
        Connecting to Telecom Warehouse Real-time Ledger...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Refresh */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/60 border border-slate-800 p-5 rounded-2xl">
        <div>
          <h1 className="text-xl font-extrabold text-white tracking-tight">Enterprise Operations Command Center</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time multi-branch inventory, network rollout allocation, and serialized asset control.
          </p>
        </div>
        <div className="flex items-center space-x-2.5">
          <button
            onClick={fetchMetrics}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
            <span>Sync Live Figures</span>
          </button>
          <button
            onClick={() => onNavigate('receiving')}
            className="px-3.5 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg text-xs flex items-center space-x-1.5 transition-colors shadow-lg shadow-cyan-500/10"
          >
            <PackageCheck className="w-3.5 h-3.5" />
            <span>Receive Goods</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Active SKUs */}
        <div
          onClick={() => onNavigate('catalogue')}
          className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 p-4 rounded-xl cursor-pointer transition-all hover:scale-[1.01]"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Active Telecom SKUs</span>
            <Boxes className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-white">{metrics?.total_skus || 0}</div>
          <p className="text-[11px] text-slate-500 mt-1">Across 6 major categories</p>
        </div>

        {/* Units Tracked */}
        <div
          onClick={() => onNavigate('inventory-overview')}
          className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 p-4 rounded-xl cursor-pointer transition-all hover:scale-[1.01]"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Tracked Equipment Units</span>
            <QrCode className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-white">{metrics?.total_units_tracked || 0}</div>
          <p className="text-[11px] text-emerald-400 flex items-center space-x-1 mt-1 font-medium">
            <span>{metrics?.units_available || 0} Units Available for Issue</span>
          </p>
        </div>

        {/* Total Valuation (RBAC restricted) */}
        <div
          onClick={() => onNavigate('reports')}
          className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 p-4 rounded-xl cursor-pointer transition-all hover:scale-[1.01]"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Total Inventory Value</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white">
            {metrics?.total_inventory_value !== null && metrics?.total_inventory_value !== undefined
              ? `$${metrics.total_inventory_value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
              : 'Restricted (RBAC)'}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Standard cost valuation basis</p>
        </div>

        {/* Pending Approvals */}
        <div
          onClick={() => onNavigate('approvals')}
          className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 p-4 rounded-xl cursor-pointer transition-all hover:scale-[1.01]"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Pending Approvals</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400">{metrics?.pending_approvals_count || 0}</div>
          <p className="text-[11px] text-slate-500 mt-1">Transfers, Loans, Rollouts</p>
        </div>
      </div>

      {/* Stock Status Distribution Bar */}
      <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-xl space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Operational Stock Status Reconciled Distribution
          </h2>
          <span className="text-[11px] text-slate-400 font-mono">
            {metrics?.total_units_tracked || 0} Total Units Under Custody
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 pt-1 text-xs">
          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800/80">
            <div className="flex items-center space-x-1.5 text-emerald-400 font-semibold mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>Available</span>
            </div>
            <p className="text-lg font-black text-white">{metrics?.units_available || 0}</p>
          </div>

          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800/80">
            <div className="flex items-center space-x-1.5 text-blue-400 font-semibold mb-1">
              <span className="w-2 h-2 rounded-full bg-blue-400"></span>
              <span>Reserved</span>
            </div>
            <p className="text-lg font-black text-white">{metrics?.units_reserved || 0}</p>
          </div>

          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800/80">
            <div className="flex items-center space-x-1.5 text-purple-400 font-semibold mb-1">
              <span className="w-2 h-2 rounded-full bg-purple-400"></span>
              <span>Borrowed</span>
            </div>
            <p className="text-lg font-black text-white">{metrics?.units_borrowed || 0}</p>
          </div>

          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800/80">
            <div className="flex items-center space-x-1.5 text-cyan-400 font-semibold mb-1">
              <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
              <span>In Transit</span>
            </div>
            <p className="text-lg font-black text-white">{metrics?.units_in_transit || 0}</p>
          </div>

          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800/80">
            <div className="flex items-center space-x-1.5 text-rose-400 font-semibold mb-1">
              <span className="w-2 h-2 rounded-full bg-rose-400"></span>
              <span>Damaged</span>
            </div>
            <p className="text-lg font-black text-white">{metrics?.units_damaged || 0}</p>
          </div>

          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800/80">
            <div className="flex items-center space-x-1.5 text-amber-400 font-semibold mb-1">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              <span>Quarantined</span>
            </div>
            <p className="text-lg font-black text-white">{metrics?.units_quarantined || 0}</p>
          </div>
        </div>
      </div>

      {/* Two Column Section: Cluster Breakdown & Critical Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Regional Clusters Overview */}
        <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>Regional Cluster Inventory Allocation</span>
            </h2>
            <button onClick={() => onNavigate('hierarchy')} className="text-xs text-cyan-400 hover:underline">
              Manage Hierarchy &rarr;
            </button>
          </div>

          <div className="space-y-3">
            {metrics?.clusters_breakdown?.map((c) => (
              <div key={c.cluster_id} className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 text-xs">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="font-bold text-white text-sm">{c.cluster_name}</h3>
                    <span className="text-slate-400 text-[11px] font-mono">{c.cluster_code} • {c.branches_count} Assigned Branches</span>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-black text-white">{c.units_tracked} Units</span>
                    {c.valuation > 0 && (
                      <p className="text-[11px] text-emerald-400 font-semibold">${c.valuation.toLocaleString()}</p>
                    )}
                  </div>
                </div>

                {/* Progress bar visual */}
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-cyan-400 h-full rounded-full"
                    style={{ width: `${Math.min(100, Math.max(15, (c.units_tracked / (metrics.total_units_tracked || 1)) * 100))}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Shortage & Overdue Alerts */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4">
          <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>Operational Exceptions</span>
          </h2>

          <div className="space-y-3 text-xs">
            {/* Overdue Loans Warning */}
            <div
              onClick={() => onNavigate('loans')}
              className={`p-3 rounded-xl border cursor-pointer transition-colors ${
                (metrics?.overdue_loans_count || 0) > 0
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400'
              }`}
            >
              <div className="flex items-center justify-between font-bold">
                <span>Overdue Equipment Loans</span>
                <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 text-xs">
                  {metrics?.overdue_loans_count || 0} Overdue
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Requires immediate return escalation or extension</p>
            </div>

            {/* Low Stock Alerts */}
            <div
              onClick={() => onNavigate('inventory-overview')}
              className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 cursor-pointer"
            >
              <div className="flex items-center justify-between font-bold">
                <span>Low Stock & Reorder Alerts</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-xs">
                  {metrics?.low_stock_alerts_count || 0} SKUs
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Stock below minimum safety threshold</p>
            </div>

            {/* Open Repair Tickets */}
            <div
              onClick={() => onNavigate('repairs')}
              className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-300 cursor-pointer hover:border-slate-700"
            >
              <div className="flex items-center justify-between font-bold">
                <span>Quarantined & Repair Tickets</span>
                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-xs">
                  {metrics?.open_repairs_count || 0} Open
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Awaiting return-to-service inspection</p>
            </div>

            {/* Branch Shortage Comparison */}
            {metrics?.shortage_branches && metrics.shortage_branches.length > 0 && (
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Branch Shortages:</span>
                {metrics.shortage_branches.map((b, idx) => (
                  <div key={idx} className="flex justify-between text-[11px]">
                    <span className="text-white">{b.branch_name}</span>
                    <span className="text-rose-400 font-semibold">{b.shortage_items_count} items deficient</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Movements Audit Journal */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span>Immutable Stock Movement Journal (Live Audit Stream)</span>
          </h2>
          <button onClick={() => onNavigate('audit')} className="text-xs text-cyan-400 hover:underline">
            View All Ledger Entries &rarr;
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-[10px] uppercase tracking-wider">
                <th className="py-2.5 px-3">Movement Type</th>
                <th className="py-2.5 px-3">Equipment Item</th>
                <th className="py-2.5 px-3">Quantity</th>
                <th className="py-2.5 px-3">Reference Doc</th>
                <th className="py-2.5 px-3">Authorized By</th>
                <th className="py-2.5 px-3">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {metrics?.recent_movements?.map((m) => (
                <tr key={m.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-2.5 px-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      m.type === 'RECEIVE' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                      m.type === 'TRANSFER_OUT' || m.type === 'TRANSFER_IN' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                      m.type === 'LOAN' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                      'bg-slate-800 text-slate-300'
                    }`}>
                      {m.type}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-white">{m.item_name}</td>
                  <td className="py-2.5 px-3 text-cyan-400 font-bold">{m.quantity}</td>
                  <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">{m.ref || 'N/A'}</td>
                  <td className="py-2.5 px-3 text-slate-300">{m.user}</td>
                  <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">{m.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
