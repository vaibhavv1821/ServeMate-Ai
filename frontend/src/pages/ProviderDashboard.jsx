import { useAuth } from '../context/AuthContext';
import { Briefcase, AlertTriangle, ShieldCheck, Calendar, Star } from 'lucide-react';

export const ProviderDashboard = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Welcome Header */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-sky-600 font-bold text-xs">
              <Briefcase className="w-4 h-4" />
              <span>Service Provider Portal</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
              Welcome, {user?.name}!
            </h1>
            <p className="text-sm text-gray-600">{user?.email} • Role: {user?.role}</p>
          </div>

          <div className="flex items-center space-x-2 bg-amber-50 border border-amber-200 text-amber-800 px-4 py-2 rounded-xl text-xs font-bold">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>Verification Status: Pending (Phase 2)</span>
          </div>
        </div>

        {/* Phase 1 Verification Message */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-3">
          <div className="flex items-center space-x-2 text-sky-600 font-bold">
            <ShieldCheck className="w-5 h-5" />
            <h2>Provider Account Status</h2>
          </div>
          <p className="text-sm text-gray-600">
            Your Service Provider account is registered in PostgreSQL. Provider profile verification and admin document approval flows will be activated in Phase 2.
          </p>
        </div>

        {/* Future Feature Placeholders (Status: Planned) */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-gray-900">Provider Features</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-3 opacity-75">
              <div className="p-3 bg-sky-50 text-sky-600 rounded-xl w-fit">
                <Briefcase className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-gray-900">Service Profile Management</h4>
              <p className="text-xs text-gray-500">Configure skills, hourly rates, and service radius.</p>
              <span className="inline-block text-[10px] uppercase font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-bold">STATUS: PLANNED (PHASE 2)</span>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-3 opacity-75">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl w-fit">
                <Calendar className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-gray-900">Weekly Availability Slot Matrix</h4>
              <p className="text-xs text-gray-500">Set real-time booking availability schedules.</p>
              <span className="inline-block text-[10px] uppercase font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-bold">STATUS: PLANNED (PHASE 2)</span>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-3 opacity-75">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-xl w-fit">
                <Star className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-gray-900">Ratings & Proof Reviews</h4>
              <p className="text-xs text-gray-500">View customer reviews and upload before/after service photos.</p>
              <span className="inline-block text-[10px] uppercase font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-bold">STATUS: PLANNED (PHASE 3)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProviderDashboard;
