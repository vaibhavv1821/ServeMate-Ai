import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axiosClient from '../api/axiosClient';
import { ShieldCheck, Users, CheckCircle, XCircle, Clock, Loader2, AlertCircle } from 'lucide-react';

export const AdminDashboard = () => {
  const { user } = useAuth();
  const [pending, setPending] = useState([]);
  const [all, setAll] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [pendRes, allRes] = await Promise.all([
        axiosClient.get('/providers/pending'),
        axiosClient.get('/providers/all'),
      ]);
      setPending(pendRes.data.providers);
      setAll(allRes.data.providers);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleVerify = async (id, action) => {
    setActing(id + action);
    try {
      await axiosClient.patch(`/providers/${id}/${action}`);
      await load();
    } catch (err) {
      alert(err.message || 'Action failed');
    } finally {
      setActing(null);
    }
  };

  const statusStats = all.reduce((acc, p) => { acc[p.verificationStatus] = (acc[p.verificationStatus] || 0) + 1; return acc; }, {});

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <ShieldCheck className="w-8 h-8 text-rose-600" />
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Admin <span className="text-rose-600">Console</span></h1>
          <p className="text-sm text-gray-500">Logged in as <span className="font-semibold">{user?.name}</span></p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Providers', value: all.length, color: 'text-gray-700', bg: 'bg-gray-50', border: 'border-gray-200' },
          { label: 'Approved', value: statusStats.APPROVED || 0, color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
          { label: 'Pending Review', value: statusStats.PENDING || 0, color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
        ].map((stat) => (
          <div key={stat.label} className={`${stat.bg} border ${stat.border} rounded-2xl p-4 text-center`}>
            <p className={`text-3xl font-extrabold ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-gray-500 mt-1 font-medium">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Pending Approvals */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-amber-500" /> Pending Provider Approvals
          {pending.length > 0 && <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">{pending.length}</span>}
        </h2>

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-sky-600" /></div>
        ) : pending.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 text-center text-gray-400 text-sm">
            ✅ No pending provider approvals.
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map((p) => (
              <div key={p.id} className="bg-white border border-amber-100 rounded-2xl shadow-sm p-5 flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <p className="font-bold text-gray-900">{p.user.name}</p>
                  <p className="text-sm text-gray-500">{p.user.email} {p.user.phone ? `• ${p.user.phone}` : ''}</p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {p.services.map((ps, i) => (
                      <span key={i} className="text-xs bg-sky-50 text-sky-700 border border-sky-100 px-2 py-0.5 rounded-full">{ps.serviceCategory.name}</span>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Registered {new Date(p.user.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => handleVerify(p.id, 'approve')} disabled={!!acting}
                    className="flex items-center gap-1 bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-emerald-700 disabled:opacity-50">
                    <CheckCircle className="w-4 h-4" /> {acting === p.id + 'approve' ? '...' : 'Approve'}
                  </button>
                  <button onClick={() => handleVerify(p.id, 'reject')} disabled={!!acting}
                    className="flex items-center gap-1 bg-rose-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-rose-700 disabled:opacity-50">
                    <XCircle className="w-4 h-4" /> {acting === p.id + 'reject' ? '...' : 'Reject'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* All Providers */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-sky-500" /> All Providers
        </h2>
        <div className="overflow-x-auto rounded-2xl border border-gray-100 shadow-sm">
          <table className="min-w-full bg-white text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
              <tr>
                <th className="px-4 py-3 text-left">Provider</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Services</th>
                <th className="px-4 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {all.map((p) => {
                const statusCls = { APPROVED: 'text-emerald-600 bg-emerald-50', PENDING: 'text-amber-600 bg-amber-50', REJECTED: 'text-rose-600 bg-rose-50' };
                return (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-gray-900">{p.user.name}</td>
                    <td className="px-4 py-3 text-gray-500">{p.user.email}</td>
                    <td className="px-4 py-3 text-gray-500">{p.services.map((ps) => ps.serviceCategory.name).join(', ') || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${statusCls[p.verificationStatus]}`}>{p.verificationStatus}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {all.length === 0 && !loading && <p className="text-center py-6 text-gray-400 text-sm">No providers registered yet.</p>}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
