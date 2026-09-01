import { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';
import { Calendar, MapPin, Clock, CheckCircle, XCircle, AlertCircle, Loader2, BanIcon } from 'lucide-react';

const STATUS_STYLES = {
  PENDING:   { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   icon: AlertCircle, label: 'Pending' },
  CONFIRMED: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: CheckCircle, label: 'Confirmed' },
  REJECTED:  { bg: 'bg-rose-50',    text: 'text-rose-700',    border: 'border-rose-200',    icon: XCircle,     label: 'Rejected' },
  CANCELLED: { bg: 'bg-gray-50',    text: 'text-gray-500',    border: 'border-gray-200',    icon: BanIcon,     label: 'Cancelled' },
  COMPLETED: { bg: 'bg-sky-50',     text: 'text-sky-700',     border: 'border-sky-200',     icon: CheckCircle, label: 'Completed' },
};

export default function CustomerBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await axiosClient.get('/bookings/my');
      setBookings(res.data.bookings);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCancel = async (id) => {
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    setCancelling(id);
    try {
      await axiosClient.patch(`/bookings/${id}/cancel`);
      setBookings((prev) => prev.map((b) => b.id === id ? { ...b, status: 'CANCELLED' } : b));
    } catch (err) {
      alert(err.message || 'Cancellation failed');
    } finally {
      setCancelling(null);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-sky-600" /></div>;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-2xl font-extrabold text-gray-900 mb-6">My <span className="text-sky-600">Bookings</span></h1>

      {bookings.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="font-semibold">No bookings yet. <a href="/providers" className="text-sky-600 hover:underline">Find a provider</a></p>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((b) => {
            const s = STATUS_STYLES[b.status] || STATUS_STYLES.PENDING;
            const Icon = s.icon;
            return (
              <div key={b.id} className={`bg-white border ${s.border} rounded-2xl shadow-sm p-5 space-y-3`}>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <p className="font-bold text-gray-900">{b.serviceCategory?.name}</p>
                    <p className="text-sm text-gray-500">with <span className="font-semibold text-gray-700">{b.provider?.user?.name}</span></p>
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
                {['PENDING', 'CONFIRMED'].includes(b.status) && (
                  <button onClick={() => handleCancel(b.id)} disabled={cancelling === b.id}
                    className="text-xs font-semibold text-rose-600 hover:underline disabled:opacity-50">
                    {cancelling === b.id ? 'Cancelling...' : 'Cancel Booking'}
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
