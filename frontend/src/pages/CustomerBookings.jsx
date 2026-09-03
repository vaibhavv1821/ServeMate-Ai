import { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';
import { Calendar, MapPin, Clock, CheckCircle, XCircle, AlertCircle, Loader2, BanIcon, RefreshCw, Star, ShieldCheck, X } from 'lucide-react';

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

  // Backup Provider state
  const [backupBookingId, setBackupBookingId] = useState(null);
  const [backupCandidates, setBackupCandidates] = useState([]);
  const [loadingBackup, setLoadingBackup] = useState(false);
  const [reassigning, setReassigning] = useState(false);
  const [backupError, setBackupError] = useState('');

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

  const handleFindBackup = async (bookingId) => {
    setBackupBookingId(bookingId);
    setLoadingBackup(true);
    setBackupError('');
    try {
      const res = await axiosClient.get(`/bookings/${bookingId}/backup-candidates`);
      setBackupCandidates(res.data.data.candidates || []);
    } catch (err) {
      setBackupError(err.response?.data?.message || err.message || 'Failed to search for backup providers.');
    } finally {
      setLoadingBackup(false);
    }
  };

  const handleSelectBackup = async (providerId) => {
    if (!backupBookingId) return;
    setReassigning(true);
    setBackupError('');
    try {
      const res = await axiosClient.post(`/bookings/${backupBookingId}/reassign-backup`, {
        backupProviderId: providerId,
      });
      alert('Booking successfully reassigned to backup provider!');
      setBackupBookingId(null);
      setBackupCandidates([]);
      load();
    } catch (err) {
      setBackupError(err.response?.data?.message || err.message || 'Failed to reassign backup provider.');
    } finally {
      setReassigning(false);
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
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-gray-900">{b.serviceCategory?.name}</p>
                      {b.urgency === 'EMERGENCY' && (
                        <span className="text-[10px] uppercase font-extrabold bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full border border-rose-200">
                          🚨 Emergency
                        </span>
                      )}
                      {b.urgency === 'URGENT' && (
                        <span className="text-[10px] uppercase font-extrabold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200">
                          ⚡ Urgent
                        </span>
                      )}
                    </div>
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

                <div className="flex items-center justify-between pt-1 border-t border-gray-100 flex-wrap gap-2">
                  {b.status === 'REJECTED' && (
                    <button
                      onClick={() => handleFindBackup(b.id)}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-700 bg-sky-50 border border-sky-200 px-3.5 py-1.5 rounded-xl hover:bg-sky-100 transition-colors shadow-sm"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Find Backup Provider
                    </button>
                  )}

                  {['PENDING', 'CONFIRMED'].includes(b.status) && (
                    <button onClick={() => handleCancel(b.id)} disabled={cancelling === b.id}
                      className="text-xs font-semibold text-rose-600 hover:underline disabled:opacity-50">
                      {cancelling === b.id ? 'Cancelling...' : 'Cancel Booking'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Backup Provider Discovery Modal */}
      {backupBookingId && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-sky-600" />
                <h3 className="font-bold text-gray-900 text-lg">Eligible Backup Providers</h3>
              </div>
              <button onClick={() => setBackupBookingId(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-500">
              Ranked using ServMate Smart Matching. Providers must be verified, offer this exact service, and have no schedule conflicts.
            </p>

            {backupError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">
                {backupError}
              </div>
            )}

            {loadingBackup ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-gray-400">
                <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
                <span className="text-xs font-medium">Scanning verified providers...</span>
              </div>
            ) : backupCandidates.length === 0 ? (
              <div className="py-8 text-center text-gray-400 text-xs">
                No alternative verified providers currently available for this exact time slot.
              </div>
            ) : (
              <div className="space-y-3">
                {backupCandidates.map(({ provider, matchScore, matchReasons }) => (
                  <div key={provider.id} className="border border-gray-200 rounded-2xl p-4 flex flex-col gap-3 hover:border-sky-300 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold text-gray-900 text-sm">{provider.user?.name}</p>
                        <p className="text-xs text-gray-500">{provider.city} • ₹{provider.hourlyRate}/hr</p>
                      </div>
                      <div className="text-right">
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-sky-100 text-sky-800">
                          {matchScore}% Match
                        </span>
                        <div className="flex items-center gap-1 text-xs text-amber-500 mt-1 justify-end">
                          <Star className="w-3 h-3 fill-current" />
                          <span>{provider.averageRating?.toFixed(1) || '0.0'}</span>
                        </div>
                      </div>
                    </div>

                    {matchReasons?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {matchReasons.slice(0, 2).map((r, i) => (
                          <span key={i} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md">
                            {r}
                          </span>
                        ))}
                      </div>
                    )}

                    <button
                      type="button"
                      disabled={reassigning}
                      onClick={() => handleSelectBackup(provider.id)}
                      className="w-full py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shadow transition-colors disabled:opacity-50"
                    >
                      {reassigning ? 'Reassigning...' : 'Select This Backup Provider'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

