import { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';
import { Loader2, CheckCircle, XCircle, AlertCircle, BanIcon, Clock, Calendar, MapPin, User } from 'lucide-react';

const STATUS_STYLES = {
  PENDING:   { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   icon: AlertCircle, label: 'Pending' },
  CONFIRMED: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: CheckCircle, label: 'Confirmed' },
  REJECTED:  { bg: 'bg-rose-50',    text: 'text-rose-700',    border: 'border-rose-200',    icon: XCircle,     label: 'Rejected' },
  CANCELLED: { bg: 'bg-gray-50',    text: 'text-gray-500',    border: 'border-gray-200',    icon: BanIcon,     label: 'Cancelled' },
  COMPLETED: { bg: 'bg-sky-50',     text: 'text-sky-700',     border: 'border-sky-200',     icon: CheckCircle, label: 'Completed' },
};

export default function ProviderBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await axiosClient.get('/bookings/provider');
      setBookings(res.data.bookings);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (id, action) => {
    setActing(id + action);
    try {
      await axiosClient.patch(`/bookings/${id}/${action}`);
      setBookings((prev) => prev.map((b) => {
        if (b.id !== id) return b;
        const statusMap = { accept: 'CONFIRMED', reject: 'REJECTED', complete: 'COMPLETED' };
        return { ...b, status: statusMap[action] };
      }));
    } catch (err) {
      alert(err.message || 'Action failed');
    } finally {
      setActing(null);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-sky-600" /></div>;

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-extrabold text-gray-900 mb-6">Booking <span className="text-sky-600">Requests</span></h1>

      {bookings.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No booking requests yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((b) => {
            const s = STATUS_STYLES[b.status] || STATUS_STYLES.PENDING;
            const Icon = s.icon;
            return (
              <div key={b.id} className={`bg-white border ${s.border} rounded-2xl shadow-sm p-5 space-y-3`}>
                <div className="flex items-start justify-between flex-wrap gap-2">
                  <div>
                    <p className="font-bold text-gray-900">{b.serviceCategory?.name}</p>
                    <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5"><User className="w-3.5 h-3.5" />{b.customer?.name} {b.customer?.phone ? `• ${b.customer.phone}` : ''}</p>
                  </div>
                  <span className={`inline-flex items-center gap-1 text-xs font-bold ${s.text} ${s.bg} border ${s.border} px-3 py-1 rounded-full`}>
                    <Icon className="w-3.5 h-3.5" /> {s.label}
                  </span>
                </div>
                <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{new Date(b.bookingDate).toLocaleDateString()}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{b.startTime} – {b.endTime}</span>
                  <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{b.serviceAddress}</span>
                </div>
                {b.notes && <p className="text-xs text-gray-400 italic">"{b.notes}"</p>}
                {b.status === 'PENDING' && (
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => updateStatus(b.id, 'accept')} disabled={!!acting}
                      className="flex items-center gap-1 bg-emerald-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-emerald-700 disabled:opacity-50">
                      <CheckCircle className="w-3.5 h-3.5" /> {acting === b.id + 'accept' ? 'Accepting...' : 'Accept'}
                    </button>
                    <button onClick={() => updateStatus(b.id, 'reject')} disabled={!!acting}
                      className="flex items-center gap-1 bg-rose-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-rose-700 disabled:opacity-50">
                      <XCircle className="w-3.5 h-3.5" /> {acting === b.id + 'reject' ? 'Rejecting...' : 'Reject'}
                    </button>
                  </div>
                )}
                {b.status === 'CONFIRMED' && (
                  <button onClick={() => updateStatus(b.id, 'complete')} disabled={!!acting}
                    className="flex items-center gap-1 bg-sky-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-sky-700 disabled:opacity-50">
                    <CheckCircle className="w-3.5 h-3.5" /> {acting === b.id + 'complete' ? 'Marking...' : 'Mark Complete'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
