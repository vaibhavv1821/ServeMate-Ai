import { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';
import { User, MapPin, DollarSign, Briefcase, Loader2, Save, AlertCircle } from 'lucide-react';

export default function ProviderProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ bio: '', experienceYears: '', hourlyRate: '', city: '', state: '', latitude: '', longitude: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    axiosClient.get('/providers/profile/me')
      .then((res) => {
        const p = res.data.provider;
        setProfile(p);
        setForm({ bio: p.bio || '', experienceYears: p.experienceYears, hourlyRate: p.hourlyRate, city: p.city || '', state: p.state || '', latitude: p.latitude || '', longitude: p.longitude || '' });
      })
      .catch((err) => {
        if (err.status === 404) setIsCreating(true);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true); setError(null); setSuccess(false);
    try {
      const payload = {
        ...form,
        experienceYears: Number(form.experienceYears) || 0,
        hourlyRate: Number(form.hourlyRate) || 0,
        latitude: form.latitude !== '' ? Number(form.latitude) : undefined,
        longitude: form.longitude !== '' ? Number(form.longitude) : undefined,
      };
      if (isCreating) {
        const res = await axiosClient.post('/providers/profile', payload);
        setProfile(res.data.provider);
        setIsCreating(false);
      } else {
        const res = await axiosClient.put('/providers/profile/me', payload);
        setProfile(res.data.provider);
      }
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-sky-600" /></div>;

  const statusColors = { PENDING: 'bg-amber-50 text-amber-700 border-amber-200', APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200', REJECTED: 'bg-rose-50 text-rose-700 border-rose-200' };
  const status = profile?.verificationStatus || 'PENDING';

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <h1 className="text-2xl font-extrabold text-gray-900">{isCreating ? 'Create' : 'Edit'} <span className="text-sky-600">Provider Profile</span></h1>
        {!isCreating && (
          <span className={`text-xs font-bold px-3 py-1 rounded-full border ${statusColors[status]}`}>
            Verification: {status}
          </span>
        )}
      </div>

      {isCreating && (
        <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 mb-5 text-sm text-sky-800">
          <strong>First time?</strong> Create your provider profile below. After submission, an admin will review and verify your account.
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl text-sm flex items-start gap-2 mb-4">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
        </div>
      )}
      {success && <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-xl text-sm mb-4">✅ Profile saved successfully!</div>}

      <form onSubmit={handleSubmit} className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Bio</label>
          <textarea rows={3} value={form.bio} onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
            placeholder="Tell customers about your expertise and experience..."
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Experience (years)</label>
            <input type="number" min="0" max="50" value={form.experienceYears} onChange={(e) => setForm((f) => ({ ...f, experienceYears: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Hourly Rate (₹)</label>
            <input type="number" min="0" value={form.hourlyRate} onChange={(e) => setForm((f) => ({ ...f, hourlyRate: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">City</label>
            <input value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} placeholder="Mumbai"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">State</label>
            <input value={form.state} onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))} placeholder="Maharashtra"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Latitude (optional)</label>
            <input type="number" step="any" value={form.latitude} onChange={(e) => setForm((f) => ({ ...f, latitude: e.target.value }))} placeholder="19.0760"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Longitude (optional)</label>
            <input type="number" step="any" value={form.longitude} onChange={(e) => setForm((f) => ({ ...f, longitude: e.target.value }))} placeholder="72.8777"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
          </div>
        </div>
        <button type="submit" disabled={saving}
          className="w-full flex items-center justify-center gap-2 bg-sky-600 text-white py-3 rounded-xl font-semibold hover:bg-sky-700 transition-colors disabled:opacity-50">
          <Save className="w-4 h-4" /> {saving ? 'Saving...' : (isCreating ? 'Create Profile' : 'Save Changes')}
        </button>
      </form>
    </div>
  );
}
