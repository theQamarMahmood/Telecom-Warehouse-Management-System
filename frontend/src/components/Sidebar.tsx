import React from 'react';
import {
  LayoutDashboard, Boxes, Tag, QrCode, UploadCloud,
  PackageCheck, CheckSquare, Send, RefreshCw, ArrowLeftRight,
  GitBranch, Warehouse, Rocket, ShoppingCart, Wrench,
  ClipboardList, CheckCircle, BarChart3, Bell, Users,
  History, Settings, Database
} from 'lucide-react';

interface SidebarProps {
  activePage: string;
  onSelectPage: (pageId: string) => void;
  pendingApprovalsCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activePage,
  onSelectPage,
  pendingApprovalsCount
}) => {
  const sections = [
    {
      title: 'COMMAND CENTER',
      items: [
        { id: 'dashboard', label: 'Executive Dashboard', icon: LayoutDashboard },
        { id: 'inventory-overview', label: 'Inventory Overview', icon: Boxes },
        { id: 'serial-register', label: 'Serialized Register', icon: QrCode },
      ]
    },
    {
      title: 'INBOUND & MATERIALS',
      items: [
        { id: 'catalogue', label: 'Equipment Catalogue', icon: Tag },
        { id: 'receiving', label: 'Goods Receiving (GRN)', icon: PackageCheck },
        { id: 'putaway', label: 'Inspection & Putaway', icon: CheckSquare },
        { id: 'bulk-import', label: 'Bulk Import Center', icon: UploadCloud },
      ]
    },
    {
      title: 'MOVEMENTS & LOGISTICS',
      items: [
        { id: 'dispatch', label: 'Issue & Dispatch', icon: Send },
        { id: 'loans', label: 'Borrowing & Loans', icon: RefreshCw },
        { id: 'transfers', label: 'Inter-Branch Transfers', icon: ArrowLeftRight },
      ]
    },
    {
      title: 'NETWORK ROLLOUT',
      items: [
        { id: 'projects', label: 'Expansion Projects (BOM)', icon: Rocket },
        { id: 'procurement', label: 'Procurement & Suppliers', icon: ShoppingCart },
        { id: 'repairs', label: 'Repairs & Missing Units', icon: Wrench },
      ]
    },
    {
      title: 'CONTROL & GOVERNANCE',
      items: [
        { id: 'stock-counts', label: 'Physical Stock Counts', icon: ClipboardList },
        {
          id: 'approvals',
          label: 'Approvals & Tasks',
          icon: CheckCircle,
          badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : undefined
        },
        { id: 'reports', label: 'Reports & Analytics', icon: BarChart3 },
      ]
    },
    {
      title: 'ADMINISTRATION',
      items: [
        { id: 'hierarchy', label: 'Regions, Clusters & Branches', icon: GitBranch },
        { id: 'locations', label: 'Warehouses & Bins', icon: Warehouse },
        { id: 'users', label: 'Users & Permissions', icon: Users },
        { id: 'audit', label: 'Audit Trail Journal', icon: History },
        { id: 'backup', label: 'Backup & Recovery', icon: Database },
        { id: 'settings', label: 'System Settings', icon: Settings },
      ]
    }
  ];

  return (
    <aside className="w-64 bg-slate-900/80 border-r border-slate-800 flex flex-col h-[calc(100vh-4rem)] sticky top-16 select-none overflow-y-auto">
      <div className="p-3 space-y-6">
        {sections.map((sec, sIdx) => (
          <div key={sIdx}>
            <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
              {sec.title}
            </p>
            <div className="space-y-0.5">
              {sec.items.map((it) => {
                const Icon = it.icon;
                const isActive = activePage === it.id;
                return (
                  <button
                    key={it.id}
                    onClick={() => onSelectPage(it.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 truncate">
                      <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
                      <span className="truncate">{it.label}</span>
                    </div>

                    {it.badge !== undefined && (
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        {it.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* System Status Footnote */}
      <div className="mt-auto p-4 border-t border-slate-800/80 bg-slate-950/40 text-[11px] text-slate-500 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Core DB Live (WAL)</span>
        </div>
        <span className="text-[10px] font-mono text-slate-600">v2.0.0</span>
      </div>
    </aside>
  );
};
