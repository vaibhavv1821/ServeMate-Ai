import { useAuth } from '../context/AuthContext';
import { UserCheck, ShieldCheck, Clock, Search, MapPin } from 'lucide-react';

export const CustomerDashboard = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Welcome Header */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-sky-600 font-bold text-xs">
              <UserCheck className="w-4 h-4" />
              <span>Customer Workspace</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
              Welcome back, {user?.name}!
            </h1>
            <p className="text-sm text-gray-600">{user?.email} • Account Status: Active</p>
          </div>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 self-start sm:self-auto">
            Role: {user?.role}
          </span>
        </div>

        {/* Phase 1 Completion Message */}
        <div className="bg-gradient-to-r from-sky-500 to-indigo-600 rounded-2xl p-6 text-white shadow-lg space-y-3">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-6 h-6 text-sky-200" />
            <h2 className="text-xl font-bold">Phase 1 Authentication Complete</h2>
          </div>
          <p className="text-sky-100 text-sm max-w-3xl">
            You are securely logged into ServMate using real PostgreSQL + Neon database credentials and verified JWT token authorization.
          </p>
        </div>

        {/* Navigation & Service Placeholders (Status: Planned) */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-gray-900">Services & Bookings</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-3 opacity-75">
              <div className="p-3 bg-sky-50 text-sky-600 rounded-xl w-fit">
                <Search className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-gray-900">Browse Local Services</h4>
              <p className="text-xs text-gray-500">Discover verified plumbers, electricians, and home mechanics near you.</p>
              <span className="inline-block text-[10px] uppercase font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-bold">STATUS: PLANNED (PHASE 2)</span>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-3 opacity-75">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl w-fit">
                <Clock className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-gray-900">Active Bookings</h4>
              <p className="text-xs text-gray-500">Track real-time service progress and OTP start verification.</p>
              <span className="inline-block text-[10px] uppercase font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-bold">STATUS: PLANNED (PHASE 3)</span>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-3 opacity-75">
              <div className="p-3 bg-purple-50 text-purple-600 rounded-xl w-fit">
                <MapPin className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-gray-900">Hyperlocal Provider Map</h4>
              <p className="text-xs text-gray-500">Smart geospatial provider matching based on distance and availability.</p>
              <span className="inline-block text-[10px] uppercase font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-bold">STATUS: PLANNED (PHASE 2)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerDashboard;
