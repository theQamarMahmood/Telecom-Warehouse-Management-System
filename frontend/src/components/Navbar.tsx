import React, { useState } from 'react';
import {
  Radio, Search, Bell, Shield, User, ChevronDown, CheckCircle2,
  AlertTriangle, RefreshCw, Smartphone, LogOut
} from 'lucide-react';
import { User as UserType } from '../types';

interface NavbarProps {
  currentUser: UserType | null;
  onSwitchUser: (username: string) => void;
  onOpenScanner: () => void;
  onGlobalSearchSelect: (type: string, id: number | string) => void;
  notificationsCount: number;
  onOpenNotifications: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onSwitchUser,
  onOpenScanner,
  notificationsCount,
  onOpenNotifications,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ items: any[]; serials: any[]; branches: any[] } | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [showRoleMenu, setShowRoleMenu] = useState(false);

  const demoRoles = [
    { username: 'admin', label: 'Sarah Jenkins', role: 'Super Admin', scope: 'Company-Wide' },
    { username: 'wh_manager_dxb', label: 'Mansoor Farooq', role: 'Warehouse Manager', scope: 'Dubai Hub' },
    { username: 'cluster_owner_north', label: 'Tariq Mansoor', role: 'Cluster Owner', scope: 'Dubai Metro Cluster' },
    { username: 'branch_mgr_auh', label: 'Salem Al-Ketbi', role: 'Branch Manager', scope: 'Abu Dhabi Branch' },
    { username: 'officer_ran', label: 'Hamad Bilal', role: 'Warehouse Officer', scope: 'Dubai RAN Depot' },
    { username: 'field_eng_omar', label: 'Omar Al-Rashed', role: 'Field Engineer', scope: '5G Rollout Team' },
    { username: 'fin_controller', label: 'David Chen', role: 'Finance Controller', scope: 'Inventory Valuation' },
    { username: 'auditor_jane', label: 'Jane Doe', role: 'Auditor', scope: 'Read-Only Audit' },
  ];

  const handleSearch = async (val: string) => {
    setSearchQuery(val);
    if (val.trim().length >= 2) {
      try {
        const res = await fetch(`/api/inventory/global-search?q=${encodeURIComponent(val)}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('twms_token') || ''}` }
        });
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data);
          setShowResults(true);
        }
      } catch {
        // ignore
      }
    } else {
      setSearchResults(null);
      setShowResults(false);
    }
  };

  return (
    <header className="h-16 bg-slate-900/95 backdrop-blur border-b border-slate-800 px-6 flex items-center justify-between sticky top-0 z-40">
      {/* Brand & Telecom Indicator */}
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
          <Radio className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-bold text-lg text-white tracking-tight">TWMS</span>
            <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
              Telecom Enterprise
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-medium">Apex Telecom Network Operations</p>
        </div>
      </div>

      {/* Global Real-time Search */}
      <div className="relative w-96 hidden md:block">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => searchResults && setShowResults(true)}
            placeholder="Search SKU, Serial No, Antenna, Branch..."
            className="w-full bg-slate-950/80 border border-slate-800 rounded-lg pl-9 pr-4 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
          />
        </div>

        {/* Autocomplete Dropdown */}
        {showResults && searchResults && (
          <div className="absolute left-0 right-0 top-full mt-2 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-2 z-50 max-h-80 overflow-y-auto">
            {searchResults.items?.length > 0 && (
              <div className="mb-2">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-2">Equipment Catalogue</span>
                {searchResults.items.map((i) => (
                  <div
                    key={i.id}
                    onClick={() => { setShowResults(false); }}
                    className="p-2 rounded-lg hover:bg-slate-800 cursor-pointer flex justify-between items-center text-xs"
                  >
                    <div>
                      <p className="text-white font-medium">{i.name}</p>
                      <p className="text-slate-400 text-[11px]">SKU: {i.sku} | Model: {i.model}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {searchResults.serials?.length > 0 && (
              <div className="mb-2">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-2">Tracked Serial Numbers</span>
                {searchResults.serials.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => { setShowResults(false); }}
                    className="p-2 rounded-lg hover:bg-slate-800 cursor-pointer flex justify-between items-center text-xs"
                  >
                    <div>
                      <p className="text-cyan-400 font-mono font-medium">{s.serial_number}</p>
                      <p className="text-slate-400 text-[11px]">{s.item}</p>
                    </div>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300">
                      {s.status}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {searchResults.items?.length === 0 && searchResults.serials?.length === 0 && (
              <div className="p-4 text-center text-slate-400 text-xs">No matching records found.</div>
            )}
          </div>
        )}
      </div>

      {/* Action Buttons & Persona Switcher */}
      <div className="flex items-center space-x-3">
        {/* Quick Barcode Scanner Trigger */}
        <button
          onClick={onOpenScanner}
          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-colors"
          title="Scan barcode or serial number"
        >
          <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden sm:inline">Scan Code</span>
        </button>

        {/* Notifications */}
        <button
          onClick={onOpenNotifications}
          className="relative p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
        >
          <Bell className="w-4 h-4" />
          {notificationsCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center">
              {notificationsCount}
            </span>
          )}
        </button>

        {/* Role Persona Switcher (Crucial for testing all 18 requirements live!) */}
        <div className="relative">
          <button
            onClick={() => setShowRoleMenu(!showRoleMenu)}
            className="flex items-center space-x-2.5 bg-slate-950/70 border border-slate-800 hover:border-slate-700 rounded-xl px-3 py-1.5 text-left transition-all"
          >
            <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-semibold text-xs border border-blue-500/30">
              {currentUser?.full_name?.charAt(0) || 'U'}
            </div>
            <div className="hidden sm:block">
              <p className="text-xs font-semibold text-white leading-tight">{currentUser?.full_name || 'Guest'}</p>
              <div className="flex items-center space-x-1">
                <span className="text-[10px] text-cyan-400 font-medium">{currentUser?.role || 'User'}</span>
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
          </button>

          {showRoleMenu && (
            <div className="absolute right-0 top-full mt-2 w-72 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-2 z-50">
              <div className="px-3 py-2 border-b border-slate-800/80 mb-1">
                <p className="text-[11px] font-semibold text-slate-300">Switch Role Persona (Live Demo)</p>
                <p className="text-[10px] text-slate-500">Test server-side data scoping & permission enforcement</p>
              </div>

              <div className="max-h-64 overflow-y-auto space-y-0.5">
                {demoRoles.map((r) => {
                  const isActive = currentUser?.username === r.username;
                  return (
                    <button
                      key={r.username}
                      onClick={() => {
                        onSwitchUser(r.username);
                        setShowRoleMenu(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors ${
                        isActive ? 'bg-cyan-950/70 text-cyan-300 border border-cyan-800/60' : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <div>
                        <p className="font-medium text-white">{r.label}</p>
                        <p className="text-[10px] text-slate-400">{r.role} • {r.scope}</p>
                      </div>
                      {isActive && <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
