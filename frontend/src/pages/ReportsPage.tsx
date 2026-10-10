import React, { useEffect, useState } from 'react';
import { BarChart3, Download, Search, RefreshCw, Layers, DollarSign, Building2, ShieldCheck, History } from 'lucide-react';
import { apiRequest } from '../api';

interface ReportsPageProps {
  onTraceSerial: (sn: string) => void;
}

export const ReportsPage: React.FC<ReportsPageProps> = ({ onTraceSerial }) => {
  const [branchComparison, setBranchComparison] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchSerial, setSearchSerial] = useState('');

  const fetchReports = () => {
    setLoading(true);
    apiRequest<any[]>('/reports/branch-comparison')
      .then((data) => {
        setBranchComparison(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const exportBranchCSV = () => {
    const headers = ["Branch Name", "Branch Code", "Cluster", "Total Units", "Available Units", "Damaged Units", "Valuation"];
    const rows = branchComparison.map(b => [
      `"${b.branch_name}"`,
      b.branch_code,
      b.cluster_name,
      b.total_units,
      b.available_units,
      b.damaged_units,
      b.valuation
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `TWMS_Branch_Comparison_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-cyan-400" />
            <span>Executive Inventory Reports & Branch Stock Analytics</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Consolidated company stock positions, multi-branch shortage/excess balance comparison, and asset valuation.
          </p>
        </div>

        <button
          onClick={exportBranchCSV}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Comparison CSV</span>
        </button>
      </div>

      {/* Serial Chain-of-Custody Quick Trace Bar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col md:flex-row gap-3 items-center justify-between shadow-lg">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white">Serialized Asset Chain-of-Custody Tracing</h3>
            <p className="text-[11px] text-slate-400">Trace any RRU, router or instrument from initial goods receipt to field site</p>
          </div>
        </div>

        <div className="flex items-center space-x-2 w-full md:w-auto">
          <input
            type="text"
            value={searchSerial}
            onChange={(e) => setSearchSerial(e.target.value)}
            placeholder="e.g. RRU-DXB-1001"
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white font-mono placeholder-slate-500 w-full md:w-48 focus:outline-none focus:border-cyan-500"
          />
          <button
            onClick={() => searchSerial && onTraceSerial(searchSerial)}
            className="px-3.5 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg text-xs whitespace-nowrap"
          >
            Trace Serial
          </button>
        </div>
      </div>

      {/* Branch Stock Comparison Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="px-5 py-3 border-b border-slate-800 flex justify-between items-center bg-slate-950/70">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-2">
            <Building2 className="w-4 h-4 text-cyan-400" />
            <span>Branch-to-Branch Stock Positions & Valuation Comparison</span>
          </h3>
          <span className="text-[11px] text-slate-400 font-mono">{branchComparison.length} Operating Branches</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 text-[10px] uppercase tracking-wider font-semibold">
                <th className="py-3 px-3.5">Branch Depot Name</th>
                <th className="py-3 px-3.5">Assigned Cluster</th>
                <th className="py-3 px-3.5 text-right">Total Units</th>
                <th className="py-3 px-3.5 text-right">Available for Issue</th>
                <th className="py-3 px-3.5 text-right">Damaged / Quarantine</th>
                <th className="py-3 px-3.5 text-right">Total Inventory Valuation</th>
                <th className="py-3 px-3.5">Stock Position Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {branchComparison.map((b) => (
                <tr key={b.branch_id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-3.5">
                    <p className="text-white font-bold">{b.branch_name}</p>
                    <span className="font-mono text-cyan-400 text-[11px]">{b.branch_code}</span>
                  </td>
                  <td className="py-3 px-3.5 text-slate-300 font-medium">{b.cluster_name}</td>
                  <td className="py-3 px-3.5 text-right font-black text-white">{b.total_units}</td>
                  <td className="py-3 px-3.5 text-right font-black text-emerald-400">{b.available_units}</td>
                  <td className="py-3 px-3.5 text-right font-semibold text-rose-400">{b.damaged_units}</td>
                  <td className="py-3 px-3.5 text-right font-black text-emerald-400">
                    ${b.valuation?.toLocaleString() || 0}
                  </td>
                  <td className="py-3 px-3.5">
                    {b.available_units > 100 ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                        Adequate / Excess
                      </span>
                    ) : b.available_units < 20 ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        Deficient / Transfer Target
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        Optimal
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
