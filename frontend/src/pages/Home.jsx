import { useState, useEffect } from 'react';
import { ShieldCheck, Activity, Database, CheckCircle2 } from 'lucide-react';
import axiosClient from '../api/axiosClient';

export const Home = () => {
  const [healthStatus, setHealthStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    axiosClient
      .get('/health')
      .then((data) => {
        setHealthStatus(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-sky-50/50 to-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center space-x-2 bg-sky-100 text-sky-800 px-4 py-1.5 rounded-full text-xs font-semibold">
            <ShieldCheck className="w-4 h-4 text-sky-600" />
            <span>Placement-Ready Hyperlocal Marketplace</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight">
            Serv<span className="text-sky-600">Mate</span> Foundation Setup
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            AI-Assisted hyperlocal service platform connecting verified local service professionals with customers.
          </p>
        </div>

        {/* System Health Card */}
        <div className="bg-white rounded-2xl p-6 shadow-xl border border-gray-100 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div className="flex items-center space-x-3">
              <Activity className="w-6 h-6 text-sky-600" />
              <h2 className="text-xl font-bold text-gray-900">API Health Status</h2>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold ${
                loading
                  ? 'bg-amber-100 text-amber-800'
                  : error
                  ? 'bg-rose-100 text-rose-800'
                  : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {loading ? 'Connecting...' : error ? 'Error' : 'Operational 200 OK'}
            </span>
          </div>

          {loading && <p className="text-gray-500 text-sm">Testing connection to backend service...</p>}

          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl text-sm">
              Failed to connect to backend server: {error}
            </div>
          )}

          {healthStatus && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-1">
                <span className="text-xs font-medium text-gray-500">Status</span>
                <p className="font-semibold text-emerald-600 text-sm flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> {healthStatus.status}
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-1">
                <span className="text-xs font-medium text-gray-500">Environment</span>
                <p className="font-semibold text-gray-800 text-sm">{healthStatus.environment}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-1">
                <span className="text-xs font-medium text-gray-500">Timestamp</span>
                <p className="font-mono text-gray-700 text-xs truncate">{healthStatus.timestamp}</p>
              </div>
            </div>
          )}
        </div>

        {/* Phase 1 Verification Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-3">
            <div className="flex items-center space-x-2 text-sky-600 font-bold">
              <Database className="w-5 h-5" />
              <h3>Backend Stack</h3>
            </div>
            <ul className="text-sm text-gray-600 space-y-2">
              <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Node.js + Express (ES Modules)</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Prisma ORM + PostgreSQL</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Centralized Zod Validation & Error Handling</li>
            </ul>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-3">
            <div className="flex items-center space-x-2 text-sky-600 font-bold">
              <ShieldCheck className="w-5 h-5" />
              <h3>Frontend Stack</h3>
            </div>
            <ul className="text-sm text-gray-600 space-y-2">
              <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> React 18 + Vite</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Tailwind CSS Utility Styling</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Axios Interceptors & React Router</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
