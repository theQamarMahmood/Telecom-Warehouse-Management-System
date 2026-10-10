import React, { useEffect, useState } from 'react';
import { Rocket, Plus, CheckCircle2, AlertCircle, X, Layers, Boxes, ShieldCheck, AlertTriangle } from 'lucide-react';
import { ExpansionProject } from '../types';
import { apiRequest } from '../api';

export const ProjectsPage: React.FC = () => {
  const [projects, setProjects] = useState<ExpansionProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [allocateProject, setAllocateProject] = useState<ExpansionProject | null>(null);

  // New Project Form
  const [projCode, setProjCode] = useState('');
  const [projName, setProjName] = useState('');
  const [siteId, setSiteId] = useState('');
  const [budget, setBudget] = useState('125000');
  const [clusterId, setClusterId] = useState<number>(1);
  const [formMsg, setFormMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Allocate Form
  const [allocWhId, setAllocWhId] = useState<number>(1);
  const [allocQty, setAllocQty] = useState('4');
  const [allocItemId, setAllocItemId] = useState<number>(1);
  const [allocMsg, setAllocMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchProjects = () => {
    setLoading(true);
    apiRequest<ExpansionProject[]>('/projects')
      .then((data) => {
        setProjects(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormMsg(null);
    try {
      const res = await apiRequest<any>('/projects', {
        method: 'POST',
        body: JSON.stringify({
          project_code: projCode,
          name: projName,
          target_cluster_id: clusterId,
          site_id: siteId,
          budget: parseFloat(budget) || 0,
          bom_items: [
            { item_id: 1, required_quantity: 6.0 },
            { item_id: 3, required_quantity: 6.0 },
            { item_id: 4, required_quantity: 24.0 },
            { item_id: 8, required_quantity: 2.0 }
          ]
        })
      });
      setFormMsg({ type: 'success', text: `Project ${res.project_code} created with Bill of Materials!` });
      setTimeout(() => {
        setShowNewModal(false);
        fetchProjects();
      }, 1200);
    } catch (err: any) {
      setFormMsg({ type: 'error', text: err.message });
    }
  };

  const handleApprove = async (id: number) => {
    try {
      await apiRequest(`/projects/${id}/approve`, { method: 'POST' });
      fetchProjects();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleAllocate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allocateProject) return;
    setAllocMsg(null);

    try {
      await apiRequest(`/projects/${allocateProject.id}/allocate`, {
        method: 'POST',
        body: JSON.stringify({
          warehouse_id: allocWhId,
          allocations: [
            {
              item_id: allocItemId,
              quantity: parseFloat(allocQty) || 0,
              serial_numbers: []
            }
          ]
        })
      });
      setAllocMsg({ type: 'success', text: `Equipment allocated successfully without double-reservation!` });
      setTimeout(() => {
        setAllocateProject(null);
        fetchProjects();
      }, 1200);
    } catch (err: any) {
      setAllocMsg({ type: 'error', text: err.message });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center space-x-2">
            <Rocket className="w-5 h-5 text-cyan-400" />
            <span>Network Expansion Projects & Site BOM Planning</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Telecom site rollouts, Bill of Materials (BOM), and race-condition-safe equipment allocation.
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
          <span>New Expansion Project</span>
        </button>
      </div>

      {/* Projects List */}
      <div className="space-y-4">
        {projects.map((p) => (
          <div key={p.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <div className="flex items-center space-x-2.5">
                  <span className="font-mono text-cyan-400 font-extrabold text-sm">{p.project_code}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    p.status === 'PLANNING' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                    p.status === 'APPROVED' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                    p.status === 'ALLOCATED' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                    'bg-slate-800 text-slate-300'
                  }`}>
                    {p.status}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                    {p.project_type}
                  </span>
                </div>
                <h3 className="font-bold text-white text-base mt-1">{p.name}</h3>
                <p className="text-xs text-slate-400">
                  Target: <strong className="text-slate-300">{p.cluster_name}</strong> | Site ID: <strong className="text-cyan-400 font-mono">{p.site_id || 'N/A'}</strong> | Budget: <strong className="text-emerald-400">${p.budget.toLocaleString()}</strong>
                </p>
              </div>

              <div className="flex items-center space-x-2">
                {p.status === 'PLANNING' && (
                  <button
                    onClick={() => handleApprove(p.id)}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs transition-colors"
                  >
                    Approve Project
                  </button>
                )}
                {p.status === 'APPROVED' && (
                  <button
                    onClick={() => {
                      setAllocMsg(null);
                      setAllocateProject(p);
                    }}
                    className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg text-xs transition-colors"
                  >
                    Allocate Warehouse Stock
                  </button>
                )}
              </div>
            </div>

            {/* Bill of Materials (BOM) Table */}
            <div className="bg-slate-950/80 rounded-xl border border-slate-800 overflow-hidden">
              <div className="px-4 py-2 bg-slate-950 border-b border-slate-800 flex justify-between items-center text-xs font-semibold text-slate-400">
                <span>Bill of Materials (BOM) Components</span>
                <span>{p.bom_items?.length || 0} Line Items</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-500 text-[10px] uppercase font-semibold">
                      <th className="py-2.5 px-4">Component Item</th>
                      <th className="py-2.5 px-4">SKU / Mode</th>
                      <th className="py-2.5 px-4 text-right">Required</th>
                      <th className="py-2.5 px-4 text-right">Allocated</th>
                      <th className="py-2.5 px-4 text-right">Remaining Shortage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {p.bom_items?.map((b, idx) => {
                      const shortage = Math.max(0, b.required_quantity - b.allocated_quantity);
                      return (
                        <tr key={idx} className="hover:bg-slate-900/40">
                          <td className="py-2.5 px-4 text-white">{b.item_name}</td>
                          <td className="py-2.5 px-4 text-slate-400 font-mono text-[11px]">{b.sku}</td>
                          <td className="py-2.5 px-4 text-right text-slate-300">{b.required_quantity}</td>
                          <td className="py-2.5 px-4 text-right text-cyan-400 font-bold">{b.allocated_quantity}</td>
                          <td className="py-2.5 px-4 text-right">
                            {shortage === 0 ? (
                              <span className="text-emerald-400 font-bold text-[11px]">Fully Allocated</span>
                            ) : (
                              <span className="text-amber-400 font-bold text-[11px]">{shortage} Units Needed</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ))}

        {projects.length === 0 && !loading && (
          <div className="p-8 text-center text-slate-500 bg-slate-900 rounded-xl border border-slate-800">
            No expansion projects registered.
          </div>
        )}
      </div>

      {/* Stock Allocation Modal */}
      {allocateProject && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <h3 className="text-sm font-bold text-white">Allocate Warehouse Inventory to Project</h3>
              <button onClick={() => setAllocateProject(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAllocate} className="p-5 space-y-4 text-xs">
              {allocMsg && (
                <div className={`p-3 rounded-xl flex items-center space-x-2 ${
                  allocMsg.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                }`}>
                  {allocMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  <span>{allocMsg.text}</span>
                </div>
              )}

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                <p className="text-slate-400">Project: <strong className="text-white">{allocateProject.name}</strong></p>
                <p className="text-slate-400">Code: <strong className="text-cyan-400 font-mono">{allocateProject.project_code}</strong></p>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Source Depot / Warehouse</label>
                <select
                  value={allocWhId}
                  onChange={(e) => setAllocWhId(parseInt(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                >
                  <option value={1}>Dubai Central RAN Depot (WH-DXB-01)</option>
                  <option value={3}>Abu Dhabi Primary Depot (WH-AUH-01)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">BOM Item to Allocate</label>
                <select
                  value={allocItemId}
                  onChange={(e) => setAllocItemId(parseInt(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                >
                  {allocateProject.bom_items?.map((it, idx) => (
                    <option key={idx} value={it.item_id}>
                      {it.item_name} (Need: {it.required_quantity}, Allocated: {it.allocated_quantity})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Allocation Quantity</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={allocQty}
                  onChange={(e) => setAllocQty(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white font-bold"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Validated atomically at commit time to prevent conflict or double-reservation.
                </p>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setAllocateProject(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg"
                >
                  Commit Allocation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Project Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <h3 className="text-sm font-bold text-white">Create Telecom Expansion Project</h3>
              <button onClick={() => setShowNewModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="p-5 space-y-4 text-xs">
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
                  <label className="block text-slate-400 mb-1">Project Code</label>
                  <input
                    type="text"
                    required
                    value={projCode}
                    onChange={(e) => setProjCode(e.target.value)}
                    placeholder="e.g. PRJ-5G-DOWNTOWN-04"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Target Cluster</label>
                  <select
                    value={clusterId}
                    onChange={(e) => setClusterId(parseInt(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                  >
                    <option value={1}>Dubai Metro Cluster</option>
                    <option value={2}>Abu Dhabi Urban Cluster</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Project Title</label>
                <input
                  type="text"
                  required
                  value={projName}
                  onChange={(e) => setProjName(e.target.value)}
                  placeholder="e.g. Downtown 5G Massive MIMO Capacity Densification"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Site ID</label>
                  <input
                    type="text"
                    value={siteId}
                    onChange={(e) => setSiteId(e.target.value)}
                    placeholder="e.g. SITE-DXB-902"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Estimated Budget ($)</label>
                  <input
                    type="number"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                  />
                </div>
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
                  Create Project & BOM
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
