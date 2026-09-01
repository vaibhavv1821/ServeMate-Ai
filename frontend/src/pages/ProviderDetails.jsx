import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { useAuth } from '../context/AuthContext';
import { Star, MapPin, Briefcase, Clock, CheckCircle, Loader2, Calendar, DollarSign } from 'lucide-react';

const DAY_ORDER = ['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY'];

export default function ProviderDetails() {
  const { id } = useParams();
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  const [provider, setProvider] = useState(null);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState({ serviceCategoryId: '', availabilityId: '', bookingDate: '', startTime: '', endTime: '', serviceAddress: '', city: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState(null);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  useEffect(() => {
    Promise.all([
      axiosClient.get(`/providers/${id}`),
      axiosClient.get('/services'),
    ])
      .then(([provRes, svcRes]) => {
        setProvider(provRes.data.provider);
        setServices(svcRes.data.services);
      })
      .catch(() => navigate('/providers'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleBook = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) { navigate('/login'); return; }
    setSubmitting(true); setBookingError(null);
    try {
      const slot = provider.availability.find((s) => s.id === booking.availabilityId);
      await axiosClient.post('/bookings', {
        providerId: provider.id,
        serviceCategoryId: booking.serviceCategoryId,
        availabilityId: booking.availabilityId || undefined,
        bookingDate: booking.bookingDate,
        startTime: slot ? slot.startTime : booking.startTime,
        endTime: slot ? slot.endTime : booking.endTime,
        serviceAddress: booking.serviceAddress,
        city: booking.city || provider.city,
        notes: booking.notes,
      });
      setBookingSuccess(true);
    } catch (err) {
      setBookingError(err.message || 'Booking failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-sky-600" /></div>;
  if (!provider) return null;

  const groupedSlots = provider.availability.reduce((acc, slot) => {
    if (!acc[slot.dayOfWeek]) acc[slot.dayOfWeek] = [];
    acc[slot.dayOfWeek].push(slot);
    return acc;
  }, {});

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Profile Header */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex gap-6 items-start">
        <div className="w-20 h-20 rounded-2xl bg-sky-100 flex items-center justify-center text-sky-700 font-extrabold text-3xl shrink-0">
          {provider.user.name?.[0]?.toUpperCase()}
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h1 className="text-2xl font-extrabold text-gray-900">{provider.user.name}</h1>
            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full">
              <CheckCircle className="w-3.5 h-3.5" /> Verified
            </span>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1"><Star className="w-4 h-4 text-amber-400 fill-current" /> {provider.averageRating.toFixed(1)} ({provider.totalReviews} reviews)</span>
            <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {provider.city}{provider.state ? `, ${provider.state}` : ''}</span>
            <span className="flex items-center gap-1"><Briefcase className="w-4 h-4" /> {provider.experienceYears} years experience</span>
            <span className="flex items-center gap-1"><DollarSign className="w-4 h-4" /> ₹{provider.hourlyRate}/hr</span>
            <span className="flex items-center gap-1"><CheckCircle className="w-4 h-4 text-sky-500" /> {provider.completedJobs} jobs completed</span>
          </div>
          {provider.bio && <p className="text-sm text-gray-600 mt-2">{provider.bio}</p>}
        </div>
      </div>

      {/* Services */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="font-bold text-gray-900 mb-3">Services Offered</h2>
        <div className="flex flex-wrap gap-2">
          {provider.services.map((ps) => (
            <span key={ps.serviceCategory.id} className="bg-sky-50 border border-sky-100 text-sky-700 text-sm font-semibold px-3 py-1 rounded-full">
              {ps.serviceCategory.name}
            </span>
          ))}
        </div>
      </div>

      {/* Availability */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2"><Calendar className="w-5 h-5 text-sky-600" />Available Slots</h2>
        {provider.availability.length === 0 ? (
          <p className="text-sm text-gray-400">No available slots at this time.</p>
        ) : (
          <div className="space-y-3">
            {DAY_ORDER.filter((d) => groupedSlots[d]).map((day) => (
              <div key={day}>
                <p className="text-xs font-bold text-gray-500 uppercase mb-1">{day}</p>
                <div className="flex flex-wrap gap-2">
                  {groupedSlots[day].map((slot) => (
                    <span key={slot.id} className="flex items-center gap-1 bg-gray-50 border border-gray-200 text-gray-700 text-xs font-medium px-3 py-1 rounded-lg">
                      <Clock className="w-3 h-3" /> {slot.startTime} – {slot.endTime}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Booking Form */}
      {user?.role === 'CUSTOMER' && (
        <div className="bg-white rounded-2xl border border-sky-100 shadow-sm p-6">
          <h2 className="font-bold text-gray-900 mb-4">Book this Provider</h2>
          {bookingSuccess ? (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl p-4 text-sm font-semibold">
              ✅ Booking submitted! Your booking is pending provider confirmation. View it in <a href="/customer/bookings" className="underline">My Bookings</a>.
            </div>
          ) : (
            <form onSubmit={handleBook} className="space-y-4">
              {bookingError && <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-sm">{bookingError}</div>}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Service Category</label>
                  <select required value={booking.serviceCategoryId} onChange={(e) => setBooking((b) => ({ ...b, serviceCategoryId: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500">
                    <option value="">Select service...</option>
                    {provider.services.map((ps) => (
                      <option key={ps.serviceCategory.id} value={ps.serviceCategory.id}>{ps.serviceCategory.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Booking Date</label>
                  <input required type="date" min={new Date().toISOString().split('T')[0]} value={booking.bookingDate}
                    onChange={(e) => setBooking((b) => ({ ...b, bookingDate: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Start Time</label>
                  <input required type="time" value={booking.startTime} onChange={(e) => setBooking((b) => ({ ...b, startTime: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">End Time</label>
                  <input required type="time" value={booking.endTime} onChange={(e) => setBooking((b) => ({ ...b, endTime: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Service Address</label>
                <input required value={booking.serviceAddress} onChange={(e) => setBooking((b) => ({ ...b, serviceAddress: e.target.value }))}
                  placeholder="Full address where service is needed" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Notes (optional)</label>
                <textarea rows={2} value={booking.notes} onChange={(e) => setBooking((b) => ({ ...b, notes: e.target.value }))}
                  placeholder="Any special instructions..." className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
              </div>
              <button type="submit" disabled={submitting}
                className="w-full bg-sky-600 text-white py-3 rounded-xl font-semibold hover:bg-sky-700 transition-colors disabled:opacity-50">
                {submitting ? 'Submitting...' : 'Confirm Booking'}
              </button>
            </form>
          )}
        </div>
      )}
      {!isAuthenticated && (
        <div className="bg-sky-50 border border-sky-200 rounded-2xl p-5 text-center">
          <p className="text-sky-800 font-semibold mb-3">Login as a Customer to book this provider</p>
          <a href="/login" className="bg-sky-600 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-sky-700 transition-colors">Login</a>
        </div>
      )}
    </div>
  );
}
