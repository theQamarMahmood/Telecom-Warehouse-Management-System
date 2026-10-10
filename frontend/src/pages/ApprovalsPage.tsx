import React, { useEffect, useState } from 'react';
import { CheckCircle, Check, X, AlertCircle, Clock, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { ApprovalRequest } from '../types';
import { apiRequest } from '../api';

export const ApprovalsPage: React.FC = () => {
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchApprovals = () => {
    setLoading(true);
    let url = '/approvals';
    if (filter !== 'ALL') url += `?status_filter=${filter}`;
    apiRequest<ApprovalRequest[]>(url)
      .then((data) => {
        setApprovals(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchApprovals();
  }, [filter]);

  const handleDecision = async (id: number, decision: 'APPROVED' | 'REJECTED') => {
    setMsg(null);
    try {
      await apiRequest(`/approvals/${id}/decide`, {
        method: 'POST',
        body: JSON.stringify({ decision, comment: `Decision recorded via Approvals Queue` })
      });
      setMsg({ type: 'success', text: `Approval request marked as ${decision}!` });
      fetchApprovals();
    } catch (e: any) {
      setMsg({ type: 'error', text: e.message });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-cyan-400" />
            <span>Operational Approvals & Workflow Queue</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Segregation of duties enforcement: Managers approve transfers, asset write-offs, and project allocations.
          </p>
        </div>

        {/* Status Filters */}
        <div className="flex items-center space-x-2">
          {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map((st) => (
            <button
              key={st}
              onClick={() => setFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filter === st
                  ? 'bg-cyan-500 text-slate-950'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {msg && (
        <div className={`p-3.5 rounded-xl flex items-center space-x-2 text-xs ${
          msg.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
        }`}>
          {msg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{msg.text}</span>
        </div>
      )}

      {/* Approvals Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 text-[10px] uppercase tracking-wider font-semibold">
                <th className="py-3 px-3.5">Request Type</th>
                <th className="py-3 px-3.5">Reference ID</th>
                <th className="py-3 px-3.5">Request Title & Summary</th>
                <th className="py-3 px-3.5">Requester</th>
                <th className="py-3 px-3.5">Approver</th>
                <th className="py-3 px-3.5">Status</th>
                <th className="py-3 px-3.5 text-right">Decision</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {approvals.map((a) => (
                <tr key={a.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-3.5">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-bold text-cyan-400">
                      {a.request_type}
                    </span>
                  </td>
                  <td className="py-3 px-3.5 font-mono text-white font-bold">{a.reference_id}</td>
                  <td className="py-3 px-3.5">
                    <p className="text-white font-semibold">{a.title}</p>
                    <p className="text-[11px] text-slate-400">{a.details || 'Standard verification requested'}</p>
                  </td>
                  <td className="py-3 px-3.5 text-slate-300">{a.requester_name}</td>
                  <td className="py-3 px-3.5 text-slate-400">{a.approver_name || 'Pending Signoff'}</td>
                  <td className="py-3 px-3.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      a.status === 'PENDING' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                      a.status === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                      'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    }`}>
                      {a.status}
                    </span>
                  </td>
                  <td className="py-3 px-3.5 text-right space-x-1.5">
                    {a.status === 'PENDING' ? (
                      <>
                        <button
                          onClick={() => handleDecision(a.id, 'APPROVED')}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-bold inline-flex items-center space-x-1"
                        >
                          <Check className="w-3 h-3" />
                          <span>Approve</span>
                        </button>
                        <button
                          onClick={() => handleDecision(a.id, 'REJECTED')}
                          className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded text-[11px] font-bold inline-flex items-center space-x-1"
                        >
                          <X className="w-3 h-3" />
                          <span>Reject</span>
                        </button>
                      </>
                    ) : (
                      <span className="text-[11px] text-slate-500 italic">Concluded</span>
                    )}
                  </td>
                </tr>
              ))}
              {approvals.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No approval requests found in queue.
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
