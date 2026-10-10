import React, { useEffect, useState } from 'react';
import { Wrench, Plus, CheckCircle2, AlertCircle, X, ShieldAlert, Check } from 'lucide-react';
import { MaintenanceTicket } from '../types';
import { apiRequest } from '../api';

export const RepairsPage: React.FC = () => {
  const [tickets, setTickets] = useState<MaintenanceTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<MaintenanceTicket | null>(null);

  // Form State
  const [faultType, setFaultType] = useState('HARDWARE_FAILURE');
  const [severity, setSeverity] = useState('HIGH');
  const [desc, setDesc] = useState('');
  const [repairVendor, setRepairVendor] = useState('Ericsson Service Lab');
  const [formMsg, setFormMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Inspect Return-to-service Form
  const [actionDecision, setActionDecision] = useState('INSPECTED_PASSED'); // or WRITTEN_OFF
  const [resNotes, setResNotes] = useState('Passed RF sweep and calibration verification. Ready for service.');
  const [repairCost, setRepairCost] = useState('350');
  const [inspectMsg, setInspectMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchTickets = () => {
    setLoading(true);
    apiRequest<MaintenanceTicket[]>('/maintenance/tickets')
      .then((data) => {
        setTickets(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormMsg(null);
    try {
      const res = await apiRequest<any>('/maintenance/tickets', {
        method: 'POST',
        body: JSON.stringify({
          item_id: 1, // Radio 4415
          warehouse_id: 1,
          fault_type: faultType,
          severity,
          description: desc,
          repair_vendor: repairVendor
        })
      });
      setFormMsg({ type: 'success', text: `Ticket ${res.ticket_number} created and unit moved to quarantine!` });
      setTimeout(() => {
        setShowModal(false);
        fetchTickets();
      }, 1200);
    } catch (err: any) {
      setFormMsg({ type: 'error', text: err.message });
    }
  };

  const handleInspectResolution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;
    setInspectMsg(null);

    try {
      await apiRequest(`/maintenance/tickets/${selectedTicket.id}/status`, {
        method: 'PUT',
        body: JSON.stringify({
          status: actionDecision,
          resolution_notes: resNotes,
          repair_cost: parseFloat(repairCost) || 0
        })
      });

      if (actionDecision === 'INSPECTED_PASSED') {
        setInspectMsg({
          type: 'success',
          text: `Inspection PASSED: Equipment returned to service and restored to available inventory!`
        });
      } else {
        setInspectMsg({
          type: 'success',
          text: `Equipment marked as WRITTEN_OFF and decremented from total on-hand balances.`
        });
      }

      setTimeout(() => {
        setSelectedTicket(null);
        fetchTickets();
      }, 1500);
    } catch (err: any) {
      setInspectMsg({ type: 'error', text: err.message });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center space-x-2">
            <Wrench className="w-5 h-5 text-cyan-400" />
            <span>Repairs, Damaged, Faulty & Quarantined Equipment</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Hardware lifecycle management, warranty claims, laboratory repair, and return-to-service inspection.
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
          <span>Report Fault / Damage</span>
        </button>
      </div>

      {/* Tickets Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 text-[10px] uppercase tracking-wider font-semibold">
                <th className="py-3 px-3.5">Ticket No</th>
                <th className="py-3 px-3.5">Equipment / Serial</th>
                <th className="py-3 px-3.5">Fault Type</th>
                <th className="py-3 px-3.5">Severity</th>
                <th className="py-3 px-3.5">Repair Vendor</th>
                <th className="py-3 px-3.5">Ticket Status</th>
                <th className="py-3 px-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {tickets.map((t) => (
                <tr key={t.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-3.5">
                    <span className="font-mono text-cyan-400 font-bold">{t.ticket_number}</span>
                    <p className="text-[10px] text-slate-500">By: {t.reported_by_name}</p>
                  </td>
                  <td className="py-3 px-3.5">
                    <p className="text-white font-bold">{t.item_name}</p>
                    {t.serial_number && (
                      <span className="text-[11px] font-mono text-cyan-400">{t.serial_number}</span>
                    )}
                  </td>
                  <td className="py-3 px-3.5 text-slate-200">{t.fault_type}</td>
                  <td className="py-3 px-3.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      t.severity === 'CRITICAL' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                      t.severity === 'HIGH' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                      'bg-slate-800 text-slate-300'
                    }`}>
                      {t.severity}
                    </span>
                  </td>
                  <td className="py-3 px-3.5 text-slate-300">{t.repair_vendor || 'Internal Workshop'}</td>
                  <td className="py-3 px-3.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      t.status === 'REPORTED' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                      t.status === 'IN_REPAIR' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                      t.status === 'INSPECTED_PASSED' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                      'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    }`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="py-3 px-3.5 text-right">
                    {t.status !== 'INSPECTED_PASSED' && t.status !== 'WRITTEN_OFF' && (
                      <button
                        onClick={() => {
                          setInspectMsg(null);
                          setSelectedTicket(t);
                        }}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-400 font-bold rounded-lg text-[11px] transition-colors"
                      >
                        Inspect & Release
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {tickets.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No active maintenance tickets or damaged equipment reported.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inspect & Release Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <h3 className="text-sm font-bold text-white">Return-to-Service Inspection & Release</h3>
              <button onClick={() => setSelectedTicket(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleInspectResolution} className="p-5 space-y-4 text-xs">
              {inspectMsg && (
                <div className={`p-3 rounded-xl flex items-center space-x-2 ${
                  inspectMsg.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                }`}>
                  {inspectMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  <span>{inspectMsg.text}</span>
                </div>
              )}

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                <p className="text-slate-400">Ticket: <strong className="text-white font-mono">{selectedTicket.ticket_number}</strong></p>
                <p className="text-slate-400">Item: <strong className="text-white">{selectedTicket.item_name}</strong></p>
                <p className="text-slate-400">Reported Fault: <strong className="text-rose-400">{selectedTicket.fault_type}</strong></p>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Inspection Quality Decision</label>
                <select
                  value={actionDecision}
                  onChange={(e) => setActionDecision(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white font-semibold"
                >
                  <option value="INSPECTED_PASSED">
                    INSPECTED_PASSED (Release from Quarantine & Restore to Available)
                  </option>
                  <option value="WRITTEN_OFF">
                    WRITTEN_OFF (Beyond repair - Dispose & adjust financial ledger)
                  </option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Repair Cost ($)</label>
                  <input
                    type="number"
                    value={repairCost}
                    onChange={(e) => setRepairCost(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Service Vendor</label>
                  <input
                    type="text"
                    disabled
                    value={selectedTicket.repair_vendor || 'Authorized Lab'}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-lg p-2 text-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Technical Quality Certificate / Verification Notes</label>
                <textarea
                  rows={2}
                  required
                  value={resNotes}
                  onChange={(e) => setResNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedTicket(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg"
                >
                  Post Quality Resolution
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Fault Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <h3 className="text-sm font-bold text-white">Report Faulty or Damaged Equipment</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="p-5 space-y-4 text-xs">
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
                  <label className="block text-slate-400 mb-1">Fault Category</label>
                  <select
                    value={faultType}
                    onChange={(e) => setFaultType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                  >
                    <option value="HARDWARE_FAILURE">Hardware / Component Failure</option>
                    <option value="TRANSIT_DAMAGE">Transit / Handling Damage</option>
                    <option value="LIGHTNING_SURGE">Lightning / Surge Protection Blown</option>
                    <option value="WATER_INGRESS">Water Ingress / Corrosion</option>
                    <option value="CALIBRATION_EXPIRED">Calibration Expired</option>
                    <option value="MISSING">Missing / Theft Investigation</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Severity Level</label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                  >
                    <option value="CRITICAL">CRITICAL</option>
                    <option value="HIGH">HIGH</option>
                    <option value="MEDIUM">MEDIUM</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Equipment Master / Model</label>
                <select className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white">
                  <option>Ericsson Radio 4415 B1/B3 (RRU) [RAN-RRU-4415]</option>
                  <option>Cisco ASR 903 Router [CORE-RTR-ASR903]</option>
                  <option>Anritsu Site Master S331E [TOOL-ANRITSU-S331E]</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Fault Description & Diagnostic Observations</label>
                <textarea
                  rows={2}
                  required
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="e.g. TRX Synthesizer error code 441, VSWR alarm triggered"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Authorized Repair Vendor / Lab</label>
                <input
                  type="text"
                  value={repairVendor}
                  onChange={(e) => setRepairVendor(e.target.value)}
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
                  Open Ticket & Quarantine
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
