import React, { useEffect, useState } from 'react';
import { RefreshCw, Plus, Search, AlertTriangle, CheckCircle2, X, AlertCircle, Clock } from 'lucide-react';
import { EquipmentLoan } from '../types';
import { apiRequest } from '../api';

export const BorrowingPage: React.FC = () => {
  const [loans, setLoans] = useState<EquipmentLoan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLoanModal, setShowLoanModal] = useState(false);
  const [selectedLoanForReturn, setSelectedLoanForReturn] = useState<EquipmentLoan | null>(null);

  // Issue Loan Form
  const [borrowerName, setBorrowerName] = useState('');
  const [department, setDepartment] = useState('Network Rollout Team');
  const [selectedItem, setSelectedItem] = useState<number>(11); // Tool Anritsu analyzer
  const [serialNumber, setSerialNumber] = useState('');
  const [warehouseId, setWarehouseId] = useState<number>(1);
  const [purpose, setPurpose] = useState('');
  const [returnDays, setReturnDays] = useState('7');
  const [loanMsg, setLoanMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Return Form
  const [returnCondition, setReturnCondition] = useState('GOOD');
  const [damageNotes, setDamageNotes] = useState('');
  const [returnMsg, setReturnMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchLoans = () => {
    setLoading(true);
    apiRequest<EquipmentLoan[]>('/loans')
      .then((data) => {
        setLoans(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchLoans();
  }, []);

  const handleCreateLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoanMsg(null);
    const returnDate = new Date();
    returnDate.setDate(returnDate.getDate() + parseInt(returnDays));

    try {
      const res = await apiRequest<any>('/loans', {
        method: 'POST',
        body: JSON.stringify({
          borrower_name: borrowerName,
          borrower_department: department,
          issuing_warehouse_id: warehouseId,
          item_id: selectedItem,
          serial_number: serialNumber || null,
          quantity: 1.0,
          purpose,
          expected_return_date: returnDate.toISOString()
        })
      });
      setLoanMsg({ type: 'success', text: `Loan ${res.loan_number} issued successfully!` });
      setTimeout(() => {
        setShowLoanModal(false);
        fetchLoans();
      }, 1200);
    } catch (err: any) {
      setLoanMsg({ type: 'error', text: err.message });
    }
  };

  const handleReturnLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoanForReturn) return;
    setReturnMsg(null);

    const isDamaged = returnCondition === 'DAMAGED' || returnCondition === 'FAULTY';

    try {
      const res = await apiRequest<any>(`/loans/${selectedLoanForReturn.id}/return`, {
        method: 'POST',
        body: JSON.stringify({
          condition_on_return: returnCondition,
          is_damaged: isDamaged,
          damage_notes: damageNotes
        })
      });

      if (isDamaged) {
        setReturnMsg({
          type: 'success',
          text: `Equipment return processed. DAMAGED status recorded: Unit quarantined and ticket opened. Stock is NOT restored to available.`
        });
      } else {
        setReturnMsg({
          type: 'success',
          text: `Equipment returned in good condition. Stock restored to available balance.`
        });
      }

      setTimeout(() => {
        setSelectedLoanForReturn(null);
        fetchLoans();
      }, 1500);
    } catch (err: any) {
      setReturnMsg({ type: 'error', text: err.message });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center space-x-2">
            <RefreshCw className="w-5 h-5 text-cyan-400" />
            <span>Equipment Borrowing, Temporary Loans & Returns</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Internal loans to departments, contractors, and field teams with overdue tracking and return damage quarantine.
          </p>
        </div>

        <button
          onClick={() => {
            setLoanMsg(null);
            setShowLoanModal(true);
          }}
          className="px-3.5 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg text-xs flex items-center space-x-1.5 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Issue New Loan</span>
        </button>
      </div>

      {/* Loans Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 text-[10px] uppercase tracking-wider font-semibold">
                <th className="py-3 px-3.5">Loan Number</th>
                <th className="py-3 px-3.5">Borrower & Dept</th>
                <th className="py-3 px-3.5">Equipment / Serial</th>
                <th className="py-3 px-3.5">Issuing Warehouse</th>
                <th className="py-3 px-3.5">Purpose</th>
                <th className="py-3 px-3.5">Expected Return</th>
                <th className="py-3 px-3.5">Status</th>
                <th className="py-3 px-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {loans.map((l) => (
                <tr key={l.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-3.5">
                    <span className="font-mono text-cyan-400 font-bold">{l.loan_number}</span>
                  </td>
                  <td className="py-3 px-3.5">
                    <p className="text-white font-bold">{l.borrower_name}</p>
                    <p className="text-[11px] text-slate-400">{l.borrower_department}</p>
                  </td>
                  <td className="py-3 px-3.5">
                    <p className="text-slate-200 font-medium">{l.item_name}</p>
                    {l.serial_number && (
                      <span className="text-[11px] font-mono text-cyan-400 font-semibold">{l.serial_number}</span>
                    )}
                  </td>
                  <td className="py-3 px-3.5 text-slate-300">{l.warehouse_name}</td>
                  <td className="py-3 px-3.5 text-slate-400 text-[11px] max-w-xs truncate">{l.purpose}</td>
                  <td className="py-3 px-3.5 font-mono text-[11px]">
                    <span className={l.is_overdue ? 'text-rose-400 font-bold flex items-center space-x-1' : 'text-slate-300'}>
                      {l.is_overdue && <AlertTriangle className="w-3 h-3 text-rose-400 inline mr-1" />}
                      {new Date(l.expected_return_date).toLocaleDateString()}
                    </span>
                  </td>
                  <td className="py-3 px-3.5">
                    {l.status === 'ISSUED' ? (
                      l.is_overdue ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                          OVERDUE
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30">
                          ON LOAN
                        </span>
                      )
                    ) : l.status === 'RETURNED_DAMAGED' ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                        DAMAGED QUARANTINE
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        CLOSED
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3.5 text-right">
                    {l.status === 'ISSUED' && (
                      <button
                        onClick={() => {
                          setReturnMsg(null);
                          setSelectedLoanForReturn(l);
                        }}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-400 font-bold rounded-lg text-[11px] transition-colors"
                      >
                        Inspect & Return
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {loans.length === 0 && !loading && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    No equipment loans recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Return Modal with Damage Inspection */}
      {selectedLoanForReturn && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <h3 className="text-sm font-bold text-white">Process Equipment Return & Inspection</h3>
              <button onClick={() => setSelectedLoanForReturn(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReturnLoan} className="p-5 space-y-4 text-xs">
              {returnMsg && (
                <div className={`p-3 rounded-xl flex items-center space-x-2 ${
                  returnMsg.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                }`}>
                  {returnMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  <span>{returnMsg.text}</span>
                </div>
              )}

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                <p className="text-slate-400">Loan: <strong className="text-white font-mono">{selectedLoanForReturn.loan_number}</strong></p>
                <p className="text-slate-400">Item: <strong className="text-white">{selectedLoanForReturn.item_name}</strong></p>
                {selectedLoanForReturn.serial_number && (
                  <p className="text-slate-400">Serial: <strong className="text-cyan-400 font-mono">{selectedLoanForReturn.serial_number}</strong></p>
                )}
                <p className="text-slate-400">Borrower: <strong className="text-white">{selectedLoanForReturn.borrower_name}</strong></p>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Inspected Condition on Return</label>
                <select
                  value={returnCondition}
                  onChange={(e) => setReturnCondition(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white font-medium"
                >
                  <option value="GOOD">GOOD (Ready for immediate reuse)</option>
                  <option value="DAMAGED">DAMAGED (Hardware damage / Cracked / Broken)</option>
                  <option value="FAULTY">FAULTY (Electronic / Calibration failure)</option>
                  <option value="ACCESSORIES_MISSING">ACCESSORIES_MISSING (Missing cables or adapters)</option>
                </select>
              </div>

              {returnCondition !== 'GOOD' && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl space-y-2">
                  <div className="flex items-center space-x-1.5 text-rose-400 font-bold text-xs">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Auto-Quarantine Security Policy Triggered</span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    This unit will <strong>NOT</strong> be restored to available stock. It will be immediately transferred to Quarantine, and a maintenance investigation ticket will be created.
                  </p>
                  <div>
                    <label className="block text-slate-400 mb-1">Damage Description & Root Cause Notes</label>
                    <textarea
                      required
                      rows={2}
                      value={damageNotes}
                      onChange={(e) => setDamageNotes(e.target.value)}
                      placeholder="Specify damaged component, missing accessories, or observed fault..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white text-xs"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedLoanForReturn(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg"
                >
                  Confirm Return & Post Ledger
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Issue Loan Modal */}
      {showLoanModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <h3 className="text-sm font-bold text-white">Issue Equipment Temporary Loan</h3>
              <button onClick={() => setShowLoanModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLoan} className="p-5 space-y-4 text-xs">
              {loanMsg && (
                <div className={`p-3 rounded-xl flex items-center space-x-2 ${
                  loanMsg.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                }`}>
                  {loanMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  <span>{loanMsg.text}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Borrower Full Name</label>
                  <input
                    type="text"
                    required
                    value={borrowerName}
                    onChange={(e) => setBorrowerName(e.target.value)}
                    placeholder="e.g. Omar Al-Rashed"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Borrower Department</label>
                  <input
                    type="text"
                    required
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Issuing Warehouse Depot</label>
                  <select
                    value={warehouseId}
                    onChange={(e) => setWarehouseId(parseInt(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                  >
                    <option value={1}>Dubai Central RAN Depot (WH-DXB-01)</option>
                    <option value={3}>Abu Dhabi Primary Depot (WH-AUH-01)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Loan Duration (Days)</label>
                  <input
                    type="number"
                    min="1"
                    value={returnDays}
                    onChange={(e) => setReturnDays(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Equipment Master</label>
                  <select
                    value={selectedItem}
                    onChange={(e) => setSelectedItem(parseInt(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                  >
                    <option value={11}>Anritsu Site Master S331E (Tool)</option>
                    <option value={1}>Ericsson Radio 4415 (RRU)</option>
                    <option value={2}>Ericsson Baseband 6630 (BBU)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Serial Number</label>
                  <input
                    type="text"
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value)}
                    placeholder="e.g. ANR-DXB-9001"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Purpose / Work Order Reference</label>
                <input
                  type="text"
                  required
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="e.g. Marina Site 501 RF Sweep & VSWR testing"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowLoanModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg"
                >
                  Issue Loan & Reserve Unit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
