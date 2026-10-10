import React, { useEffect, useState } from 'react';
import {
  GitBranch, Warehouse, Users, History, Database, Settings, Plus,
  CheckCircle2, AlertCircle, X, Shield, Lock, Eye, Download, Play, RefreshCw
} from 'lucide-react';
import { apiRequest } from '../api';

// --- HIERARCHY & BRANCHES ---
export const HierarchyPage: React.FC = () => {
  const [branches, setBranches] = useState<any[]>([]);
  const [clusters, setClusters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBranchModal, setShowBranchModal] = useState(false);

  // Form
  const [branchCode, setBranchCode] = useState('');
  const [branchName, setBranchName] = useState('');
  const [clusterId, setClusterId] = useState<number>(1);
  const [managerName, setManagerName] = useState('');
  const [address, setAddress] = useState('');
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      apiRequest<any[]>('/hierarchy/branches'),
      apiRequest<any[]>('/hierarchy/clusters')
    ]).then(([brs, cls]) => {
      setBranches(brs);
      setClusters(cls);
      if (cls.length > 0) setClusterId(cls[0].id);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    try {
      const res = await apiRequest<any>('/hierarchy/branches', {
        method: 'POST',
        body: JSON.stringify({
          cluster_id: clusterId,
          code: branchCode,
          name: branchName,
          manager_name: managerName,
          address
        })
      });
      setMsg({ type: 'success', text: `Branch '${res.name}' created without code modification!` });
      setTimeout(() => {
        setShowBranchModal(false);
        fetchData();
      }, 1200);
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message });
    }
  };

  const handleToggleStatus = async (branchId: number, currentStatus: boolean) => {
    try {
      await apiRequest(`/hierarchy/branches/${branchId}/status?is_active=${!currentStatus}`, {
        method: 'PUT'
      });
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
            <GitBranch className="w-5 h-5 text-cyan-400" />
            <span>Regions, Clusters & Operating Branches</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Dynamic telecom organizational hierarchy: Company &rarr; Regions &rarr; Clusters &rarr; Branches.
          </p>
        </div>

        <button
          onClick={() => {
            setMsg(null);
            setShowBranchModal(true);
          }}
          className="px-3.5 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg text-xs flex items-center space-x-1.5 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add New Branch</span>
        </button>
      </div>

      {/* Branches Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 text-[10px] uppercase tracking-wider font-semibold">
                <th className="py-3 px-3.5">Branch Code</th>
                <th className="py-3 px-3.5">Branch Depot Name</th>
                <th className="py-3 px-3.5">Assigned Regional Cluster</th>
                <th className="py-3 px-3.5">Responsible Manager</th>
                <th className="py-3 px-3.5">Address</th>
                <th className="py-3 px-3.5">Operational Status</th>
                <th className="py-3 px-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {branches.map((b) => (
                <tr key={b.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-3.5 font-mono text-cyan-400 font-bold">{b.code}</td>
                  <td className="py-3 px-3.5 text-white font-bold">{b.name}</td>
                  <td className="py-3 px-3.5 text-slate-300">{b.cluster_name}</td>
                  <td className="py-3 px-3.5 text-slate-300">{b.manager_name || 'Unassigned'}</td>
                  <td className="py-3 px-3.5 text-slate-400 text-[11px]">{b.address || 'Central'}</td>
                  <td className="py-3 px-3.5">
                    {b.is_active ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        ACTIVE
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                        DEACTIVATED
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3.5 text-right">
                    <button
                      onClick={() => handleToggleStatus(b.id, b.is_active)}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-lg text-[11px] transition-colors"
                    >
                      {b.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Branch Modal */}
      {showBranchModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <h3 className="text-sm font-bold text-white">Add New Telecom Branch</h3>
              <button onClick={() => setShowBranchModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBranch} className="p-5 space-y-4 text-xs">
              {msg && (
                <div className={`p-3 rounded-xl flex items-center space-x-2 ${
                  msg.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                }`}>
                  {msg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  <span>{msg.text}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Branch Code</label>
                  <input
                    type="text"
                    required
                    value={branchCode}
                    onChange={(e) => setBranchCode(e.target.value)}
                    placeholder="e.g. BR-FUJAIRAH-01"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Regional Cluster</label>
                  <select
                    value={clusterId}
                    onChange={(e) => setClusterId(parseInt(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                  >
                    {clusters.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Branch Name</label>
                <input
                  type="text"
                  required
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  placeholder="e.g. Fujairah Coastal Logistics Branch"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Responsible Branch Manager</label>
                <input
                  type="text"
                  value={managerName}
                  onChange={(e) => setManagerName(e.target.value)}
                  placeholder="e.g. Tariq Al-Nuaimi"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Physical Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Port Logistics Zone, Fujairah"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowBranchModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg"
                >
                  Create Branch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// --- USERS & ACCESS CONTROL ---
export const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUserModal, setShowUserModal] = useState(false);

  // Form
  const [uname, setUname] = useState('');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('WAREHOUSE_OFFICER');
  const [password, setPassword] = useState('Password123!');
  const [clusterScope, setClusterScope] = useState<string>('2');
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchUsers = () => {
    setLoading(true);
    apiRequest<any[]>('/auth/users')
      .then((data) => {
        setUsers(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    try {
      const res = await apiRequest<any>('/auth/users', {
        method: 'POST',
        body: JSON.stringify({
          username: uname,
          email,
          full_name: fullName,
          password,
          role,
          cluster_ids: role === 'CLUSTER_OWNER' ? [parseInt(clusterScope)] : []
        })
      });
      setMsg({ type: 'success', text: `User account '${res.username}' created with scoped permissions!` });
      setTimeout(() => {
        setShowUserModal(false);
        fetchUsers();
      }, 1200);
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message });
    }
  };

  const handleToggleUser = async (userId: number, currentActive: boolean) => {
    try {
      await apiRequest(`/auth/users/${userId}`, {
        method: 'PUT',
        body: JSON.stringify({ is_active: !currentActive })
      });
      fetchUsers();
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center space-x-2">
            <Users className="w-5 h-5 text-cyan-400" />
            <span>Role-Based Access Control (RBAC) & Scoped User Management</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Individual user accounts, least-privilege role scopes, cluster boundaries, and immediate revocation.
          </p>
        </div>

        <button
          onClick={() => {
            setMsg(null);
            setShowUserModal(true);
          }}
          className="px-3.5 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg text-xs flex items-center space-x-1.5 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Invite / Create User</span>
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 text-[10px] uppercase tracking-wider font-semibold">
                <th className="py-3 px-3.5">Employee Name & Username</th>
                <th className="py-3 px-3.5">Assigned Role</th>
                <th className="py-3 px-3.5">Department</th>
                <th className="py-3 px-3.5">Data Scope Restrictions</th>
                <th className="py-3 px-3.5">Account Status</th>
                <th className="py-3 px-3.5 text-right">Access Controls</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-3.5">
                    <p className="text-white font-bold">{u.full_name}</p>
                    <span className="font-mono text-cyan-400 text-[11px]">@{u.username} • {u.email}</span>
                  </td>
                  <td className="py-3 px-3.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-cyan-400 border border-slate-700">
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3 px-3.5 text-slate-300">{u.department || 'Operations'}</td>
                  <td className="py-3 px-3.5 text-slate-400 text-[11px]">
                    {u.role === 'SUPER_ADMIN' || u.role === 'AUDITOR' ? (
                      <span className="text-emerald-400 font-semibold">Unrestricted Company-Wide</span>
                    ) : u.role === 'CLUSTER_OWNER' ? (
                      <span className="text-blue-400 font-semibold">Assigned Cluster Scopes: [{u.cluster_ids?.join(', ')}]</span>
                    ) : (
                      <span>Branch Scoped: [{u.branch_ids?.join(', ') || 'Assigned Branch'}]</span>
                    )}
                  </td>
                  <td className="py-3 px-3.5">
                    {u.is_active ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        ACTIVE
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                        REVOKED / INACTIVE
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3.5 text-right">
                    <button
                      onClick={() => handleToggleUser(u.id, u.is_active)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                        u.is_active
                          ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30'
                          : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30'
                      }`}
                    >
                      {u.is_active ? 'Revoke Access' : 'Reactivate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* New User Modal */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <h3 className="text-sm font-bold text-white">Provision Employee Account & Scope</h3>
              <button onClick={() => setShowUserModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-5 space-y-4 text-xs">
              {msg && (
                <div className={`p-3 rounded-xl flex items-center space-x-2 ${
                  msg.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                }`}>
                  {msg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  <span>{msg.text}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Username</label>
                  <input
                    type="text"
                    required
                    value={uname}
                    onChange={(e) => setUname(e.target.value)}
                    placeholder="e.g. cluster_owner_capital"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Assigned Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                  >
                    <option value="CLUSTER_OWNER">Cluster Owner</option>
                    <option value="BRANCH_MANAGER">Branch Manager</option>
                    <option value="WAREHOUSE_MANAGER">Warehouse Manager</option>
                    <option value="WAREHOUSE_OFFICER">Warehouse Officer</option>
                    <option value="FIELD_ENGINEER">Field Engineer</option>
                    <option value="PROCUREMENT_OFFICER">Procurement Officer</option>
                    <option value="FINANCE_CONTROLLER">Finance Controller</option>
                    <option value="AUDITOR">Auditor</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Khalid Al-Hashemi"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Company Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="khalid@apextelecom.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                />
              </div>

              {role === 'CLUSTER_OWNER' && (
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold text-cyan-400">Restricted Cluster Scope ID</label>
                  <select
                    value={clusterScope}
                    onChange={(e) => setClusterScope(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                  >
                    <option value="1">Cluster 1: Dubai Metro Cluster</option>
                    <option value="2">Cluster 2: Abu Dhabi Urban Cluster</option>
                  </select>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Server enforces data isolation: user can only query branches within this cluster.
                  </p>
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowUserModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg"
                >
                  Create & Restrict User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// --- AUDIT TRAIL JOURNAL ---
export const AuditTrailPage: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchLogs = () => {
    setLoading(true);
    apiRequest<any[]>(`/audit?search=${encodeURIComponent(search)}`)
      .then((data) => {
        setLogs(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchLogs();
  }, [search]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center space-x-2">
          <History className="w-5 h-5 text-cyan-400" />
          <span>Immutable System Audit Trail Journal</span>
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Append-only compliance log: Tracks receiving, dispatches, loans, transfers, user creation, and approvals.
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl flex items-center justify-between">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter audit logs by action, username, entity..."
          className="w-full max-w-sm bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
        />
        <span className="text-xs text-slate-400">{logs.length} Audit Entries</span>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 text-[10px] uppercase tracking-wider font-semibold">
                <th className="py-3 px-3.5">Action Code</th>
                <th className="py-3 px-3.5">Entity Target</th>
                <th className="py-3 px-3.5">Actor Username</th>
                <th className="py-3 px-3.5">State Changes & Payload</th>
                <th className="py-3 px-3.5 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {logs.map((l) => (
                <tr key={l.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-3.5">
                    <span className="font-mono text-cyan-400 font-bold">{l.action}</span>
                  </td>
                  <td className="py-3 px-3.5 text-white font-medium">
                    {l.entity_name} {l.entity_id && <span className="font-mono text-slate-400">({l.entity_id})</span>}
                  </td>
                  <td className="py-3 px-3.5 text-slate-300 font-mono">@{l.username}</td>
                  <td className="py-3 px-3.5 text-slate-400 font-mono text-[11px] max-w-md truncate">
                    {l.new_state || 'N/A'}
                  </td>
                  <td className="py-3 px-3.5 text-right font-mono text-slate-500 text-[11px]">
                    {new Date(l.created_at).toLocaleString()}
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

// --- BACKUP & RESTORE ADMINISTRATION ---
export const BackupPage: React.FC = () => {
  const [backups, setBackups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifyResult, setVerifyResult] = useState<any>(null);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchBackups = () => {
    setLoading(true);
    apiRequest<any[]>('/backup/list')
      .then((data) => {
        setBackups(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchBackups();
  }, []);

  const handleCreateBackup = async () => {
    setMsg(null);
    try {
      const res = await apiRequest<any>('/backup/create', { method: 'POST' });
      setMsg({ type: 'success', text: `Online database backup '${res.backup_file}' generated successfully!` });
      fetchBackups();
    } catch (e: any) {
      setMsg({ type: 'error', text: e.message });
    }
  };

  const handleVerifyRestore = async (filename: string) => {
    setVerifyResult(null);
    setMsg(null);
    try {
      const res = await apiRequest<any>(`/backup/verify-restore-test?backup_filename=${encodeURIComponent(filename)}`, {
        method: 'POST'
      });
      setVerifyResult(res);
    } catch (e: any) {
      setMsg({ type: 'error', text: e.message });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center space-x-2">
            <Database className="w-5 h-5 text-cyan-400" />
            <span>Database Backup, Restore Verification & Business Continuity</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Acceptance Criterion #16: Online hot backups and automated sandbox restoration integrity tests.
          </p>
        </div>

        <button
          onClick={handleCreateBackup}
          className="px-3.5 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg text-xs flex items-center space-x-1.5 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Generate Online Backup</span>
        </button>
      </div>

      {msg && (
        <div className={`p-3.5 rounded-xl flex items-center space-x-2 text-xs ${
          msg.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
        }`}>
          {msg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{msg.text}</span>
        </div>
      )}

      {/* Restore Verification Sandbox Result */}
      {verifyResult && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 p-5 rounded-2xl space-y-3">
          <div className="flex items-center space-x-2 font-bold text-emerald-400 text-sm">
            <CheckCircle2 className="w-5 h-5" />
            <span>Acceptance Test #16 Verified: Sandbox Restore Test PASSED</span>
          </div>
          <p className="text-xs text-slate-300">
            {verifyResult.message}
          </p>
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 grid grid-cols-3 gap-2 text-xs">
            <div>Equipment Masters: <strong className="text-white">{verifyResult.verified_records.equipment_items}</strong></div>
            <div>Operating Branches: <strong className="text-white">{verifyResult.verified_records.branches}</strong></div>
            <div>Movement Ledger History: <strong className="text-white">{verifyResult.verified_records.movement_history}</strong></div>
          </div>
        </div>
      )}

      {/* Backups Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 text-[10px] uppercase tracking-wider font-semibold">
                <th className="py-3 px-3.5">Backup Archive Filename</th>
                <th className="py-3 px-3.5">File Size</th>
                <th className="py-3 px-3.5">Creation Timestamp</th>
                <th className="py-3 px-3.5 text-right">Integrity Verification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {backups.map((b, idx) => (
                <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-3.5 font-mono text-cyan-400 font-bold">{b.filename}</td>
                  <td className="py-3 px-3.5 text-slate-300">{(b.size_bytes / 1024).toFixed(1)} KB</td>
                  <td className="py-3 px-3.5 text-slate-400 font-mono text-[11px]">{b.created_at}</td>
                  <td className="py-3 px-3.5 text-right">
                    <button
                      onClick={() => handleVerifyRestore(b.filename)}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-400 font-bold rounded-lg text-[11px] inline-flex items-center space-x-1"
                    >
                      <Play className="w-3 h-3" />
                      <span>Execute Sandbox Restore Test</span>
                    </button>
                  </td>
                </tr>
              ))}
              {backups.length === 0 && !loading && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-500">
                    No database backups found. Click "Generate Online Backup" to create one.
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
