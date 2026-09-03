import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { UserCheck, ShieldCheck, Clock, Search, MapPin, Sparkles } from 'lucide-react';
import ServiceIssueAnalyzer from '../components/ServiceIssueAnalyzer';

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

        {/* Phase 4 AI Issue Analyzer */}
        <ServiceIssueAnalyzer />

        {/* Quick Navigation Cards */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-gray-900">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link to="/services" className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow space-y-3 block">
              <div className="p-3 bg-sky-50 text-sky-600 rounded-xl w-fit">
                <Search className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-gray-900">Browse Local Services</h4>
              <p className="text-xs text-gray-500">Discover verified plumbers, electricians, and home mechanics near you.</p>
              <span className="inline-block text-[10px] uppercase font-mono bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-bold">ACTIVE MARKETPLACE</span>
            </Link>

            <Link to="/customer/bookings" className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow space-y-3 block">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl w-fit">
                <Clock className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-gray-900">My Bookings</h4>
              <p className="text-xs text-gray-500">Track real-time service progress, OTP start verification, and backup options.</p>
              <span className="inline-block text-[10px] uppercase font-mono bg-sky-100 text-sky-700 px-2 py-0.5 rounded font-bold">REALTIME TRACKING</span>
            </Link>

            <Link to="/providers" className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow space-y-3 block">
              <div className="p-3 bg-purple-50 text-purple-600 rounded-xl w-fit">
                <MapPin className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-gray-900">Find Providers</h4>
              <p className="text-xs text-gray-500">Smart geospatial provider matching based on distance and availability.</p>
              <span className="inline-block text-[10px] uppercase font-mono bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-bold">SMART MATCHING</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};


export default CustomerDashboard;
