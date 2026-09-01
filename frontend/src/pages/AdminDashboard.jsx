import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Users, Database, Activity, CheckCircle2 } from 'lucide-react';

export const AdminDashboard = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Welcome Header */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-rose-600 font-bold text-xs">
              <ShieldCheck className="w-4 h-4" />
              <span>Admin System Console</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
              Admin Portal: {user?.name}
            </h1>
            <p className="text-sm text-gray-600">{user?.email} • Account Status: Active Administrator</p>
          </div>
          <span className="inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-extrabold bg-rose-100 text-rose-800 self-start sm:self-auto">
            ADMIN PRIVILEGES
          </span>
        </div>

        {/* Phase 1 Completion Summary Card */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 text-sky-600 font-bold border-b border-gray-100 pb-3">
            <Activity className="w-5 h-5" />
            <h2 className="text-lg font-bold text-gray-900">Phase 1 Infrastructure & Security Status</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl space-y-1">
              <div className="flex items-center space-x-1.5 text-emerald-700 font-semibold text-xs">
                <CheckCircle2 className="w-4 h-4" />
                <span>PostgreSQL DB</span>
              </div>
              <p className="text-sm font-bold text-emerald-900">Neon Hosted PostgreSQL</p>
            </div>

            <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl space-y-1">
              <div className="flex items-center space-x-1.5 text-emerald-700 font-semibold text-xs">
                <CheckCircle2 className="w-4 h-4" />
                <span>Authentication</span>
              </div>
              <p className="text-sm font-bold text-emerald-900">JWT + bcryptjs Password Hash</p>
            </div>

            <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl space-y-1">
              <div className="flex items-center space-x-1.5 text-emerald-700 font-semibold text-xs">
                <CheckCircle2 className="w-4 h-4" />
                <span>Role Security</span>
              </div>
              <p className="text-sm font-bold text-emerald-900">CUSTOMER / PROVIDER / ADMIN</p>
            </div>
          </div>
        </div>

        {/* Future Admin Features (Status: Planned) */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-gray-900">Platform Management Modules</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-3 opacity-75">
              <div className="p-3 bg-sky-50 text-sky-600 rounded-xl w-fit">
                <Users className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-gray-900">Provider Document Verification</h4>
              <p className="text-xs text-gray-500">Approve or reject newly registered service providers.</p>
              <span className="inline-block text-[10px] uppercase font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-bold">STATUS: PLANNED (PHASE 2)</span>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-3 opacity-75">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl w-fit">
                <Database className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-gray-900">Marketplace Analytics</h4>
              <p className="text-xs text-gray-500">Monitor booking metrics, platform fees, and dispute resolution.</p>
              <span className="inline-block text-[10px] uppercase font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-bold">STATUS: PLANNED (PHASE 4)</span>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-3 opacity-75">
              <div className="p-3 bg-rose-50 text-rose-600 rounded-xl w-fit">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-gray-900">User Audit & Deactivation</h4>
              <p className="text-xs text-gray-500">Deactivate reported accounts and manage role authorizations.</p>
              <span className="inline-block text-[10px] uppercase font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-bold">STATUS: PLANNED (PHASE 2)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
