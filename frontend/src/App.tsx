import React, { useEffect, useState } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { ChainOfCustodyModal } from './components/ChainOfCustodyModal';
import { BarcodeScannerModal } from './components/BarcodeScannerModal';
import { DashboardPage } from './pages/DashboardPage';
import { InventoryOverviewPage } from './pages/InventoryOverviewPage';
import { SerializedRegisterPage } from './pages/SerializedRegisterPage';
import { CataloguePage } from './pages/CataloguePage';
import { GoodsReceivingPage } from './pages/GoodsReceivingPage';
import { BorrowingPage } from './pages/BorrowingPage';
import { TransfersPage } from './pages/TransfersPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { ProcurementPage } from './pages/ProcurementPage';
import { RepairsPage } from './pages/RepairsPage';
import { StockCountsPage } from './pages/StockCountsPage';
import { ApprovalsPage } from './pages/ApprovalsPage';
import { ReportsPage } from './pages/ReportsPage';
import { BulkImportPage } from './pages/BulkImportPage';
import { HierarchyPage, UsersPage, AuditTrailPage, BackupPage } from './pages/AdministrationPages';
import { User } from './types';
import { apiRequest, setToken } from './api';
import { Bell, X, CheckCircle2, AlertTriangle, ShieldCheck, Warehouse } from 'lucide-react';

export function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activePage, setActivePage] = useState<string>('dashboard');
  const [traceSerial, setTraceSerial] = useState<string | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  // Authenticate initially as Super Admin 'admin' or saved token
  const loginAsUser = async (username: string) => {
    try {
      const res = await apiRequest<any>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password: 'Password123!' })
      });
      setToken(res.access_token);
      setCurrentUser(res.user);
      fetchNotifications();
    } catch (e: any) {
      console.error("Login failed:", e);
    }
  };

  const fetchNotifications = async () => {
    try {
      const notes = await apiRequest<any[]>('/notifications');
      setNotifications(notes);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    // Initial login as admin
    loginAsUser('admin');
  }, []);

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <Navbar
        currentUser={currentUser}
        onSwitchUser={(uname) => loginAsUser(uname)}
        onOpenScanner={() => setScannerOpen(true)}
        onGlobalSearchSelect={(type, id) => {
          if (type === 'serial') setTraceSerial(String(id));
        }}
        notificationsCount={notifications.filter(n => !n.is_read).length}
        onOpenNotifications={() => setNotificationsOpen(true)}
      />

      {/* Main Workspace: Sidebar + Dynamic Page Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar
          activePage={activePage}
          onSelectPage={(pageId) => setActivePage(pageId)}
          pendingApprovalsCount={3}
        />

        {/* Content Area */}
        <main className="flex-1 p-6 overflow-y-auto max-h-[calc(100vh-4rem)]">
          <div className="max-w-7xl mx-auto">
            {activePage === 'dashboard' && (
              <DashboardPage
                onNavigate={(page) => setActivePage(page)}
                onTraceSerial={(sn) => setTraceSerial(sn)}
              />
            )}
            {activePage === 'inventory-overview' && <InventoryOverviewPage />}
            {activePage === 'serial-register' && (
              <SerializedRegisterPage
                onTraceSerial={(sn) => setTraceSerial(sn)}
                onOpenScanner={() => setScannerOpen(true)}
              />
            )}
            {activePage === 'catalogue' && <CataloguePage />}
            {activePage === 'receiving' && <GoodsReceivingPage />}
            {activePage === 'putaway' && <GoodsReceivingPage />}
            {activePage === 'bulk-import' && <BulkImportPage />}
            {activePage === 'dispatch' && <TransfersPage />}
            {activePage === 'loans' && <BorrowingPage />}
            {activePage === 'transfers' && <TransfersPage />}
            {activePage === 'projects' && <ProjectsPage />}
            {activePage === 'procurement' && <ProcurementPage />}
            {activePage === 'repairs' && <RepairsPage />}
            {activePage === 'stock-counts' && <StockCountsPage />}
            {activePage === 'approvals' && <ApprovalsPage />}
            {activePage === 'reports' && (
              <ReportsPage onTraceSerial={(sn) => setTraceSerial(sn)} />
            )}
            {activePage === 'hierarchy' && <HierarchyPage />}
            {activePage === 'locations' && <HierarchyPage />}
            {activePage === 'users' && <UsersPage />}
            {activePage === 'audit' && <AuditTrailPage />}
            {activePage === 'backup' && <BackupPage />}
            {activePage === 'settings' && <BackupPage />}
          </div>
        </main>
      </div>

      {/* Chain of Custody Timeline Drawer Modal */}
      <ChainOfCustodyModal
        serialNumber={traceSerial}
        onClose={() => setTraceSerial(null)}
      />

      {/* Barcode & QR Code Scanner Modal */}
      <BarcodeScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onAssetFound={(sn) => setTraceSerial(sn)}
      />

      {/* Notifications Drawer */}
      {notificationsOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-end z-50">
          <div className="bg-slate-900 border-l border-slate-800 w-full max-w-sm h-full p-6 shadow-2xl flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Bell className="w-5 h-5 text-cyan-400" />
                <h3 className="font-bold text-white text-sm">System Alerts & Notifications</h3>
              </div>
              <button onClick={() => setNotificationsOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs space-y-1">
                <div className="flex items-center space-x-1.5 text-amber-400 font-bold">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Transfer Discrepancy Alert</span>
                </div>
                <p className="text-slate-300">
                  Transfer TRF-202610-001 confirmed by Abu Dhabi depot with 2 units discrepancy missing in transit.
                </p>
                <span className="text-[10px] text-slate-500 font-mono">10 mins ago</span>
              </div>

              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs space-y-1">
                <div className="flex items-center space-x-1.5 text-rose-400 font-bold">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Overdue Equipment Loan</span>
                </div>
                <p className="text-slate-300">
                  Loan LN-202610-001 for Anritsu Site Master is past expected return date.
                </p>
                <span className="text-[10px] text-slate-500 font-mono">1 hour ago</span>
              </div>

              <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl text-xs space-y-1">
                <div className="flex items-center space-x-1.5 text-blue-400 font-bold">
                  <ShieldCheck className="w-4 h-4" />
                  <span>5G Expansion BOM Approval</span>
                </div>
                <p className="text-slate-300">
                  Project PRJ-5G-DXB-ROLLOUT approved for massive MIMO allocation.
                </p>
                <span className="text-[10px] text-slate-500 font-mono">2 hours ago</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
