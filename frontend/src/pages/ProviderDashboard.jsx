import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { Briefcase, User, Clock, Calendar, Settings, ArrowRight } from 'lucide-react';

export const ProviderDashboard = () => {
  const { user } = useAuth();

  const quickLinks = [
    { to: '/provider/profile', icon: User, label: 'My Profile', desc: 'Update your bio, rates & location', color: 'text-sky-600 bg-sky-50' },
    { to: '/provider/services', icon: Settings, label: 'My Services', desc: 'Select services you offer', color: 'text-emerald-600 bg-emerald-50' },
    { to: '/provider/availability', icon: Clock, label: 'Availability', desc: 'Set your weekly time slots', color: 'text-violet-600 bg-violet-50' },
    { to: '/provider/bookings', icon: Calendar, label: 'Bookings', desc: 'View and manage booking requests', color: 'text-amber-600 bg-amber-50' },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-14 h-14 rounded-2xl bg-sky-100 flex items-center justify-center text-sky-700 font-extrabold text-2xl">
          {user?.name?.[0]?.toUpperCase()}
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Welcome back, <span className="text-sky-600">{user?.name}</span></h1>
          <p className="text-gray-500 text-sm">Provider Dashboard</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {quickLinks.map((ql) => {
          const Icon = ql.icon;
          return (
            <Link key={ql.to} to={ql.to}
              className="group bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-all p-5 flex items-center gap-4">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${ql.color} group-hover:scale-110 transition-transform`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900">{ql.label}</p>
                <p className="text-xs text-gray-500 truncate">{ql.desc}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-sky-500 shrink-0 transition-colors" />
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default ProviderDashboard;
