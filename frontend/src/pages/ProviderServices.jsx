import { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';
import { Loader2, CheckSquare, Square, Save } from 'lucide-react';

export default function ProviderServices() {
  const [categories, setCategories] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    Promise.all([
      axiosClient.get('/services'),
      axiosClient.get('/providers/profile/me'),
    ])
      .then(([svcRes, profileRes]) => {
        setCategories(svcRes.data.services);
        const myIds = profileRes.data.provider.services.map((ps) => ps.serviceCategory.id);
        setSelected(new Set(myIds));
      })
      .catch(() => axiosClient.get('/services').then((res) => setCategories(res.data.services)))
      .finally(() => setLoading(false));
  }, []);

  const toggle = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSave = async () => {
    if (selected.size === 0) { setError('Select at least one service'); return; }
    setSaving(true); setError(null); setSuccess(false);
    try {
      await axiosClient.put('/providers/services', { serviceCategoryIds: [...selected] });
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Failed to save services');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-sky-600" /></div>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-extrabold text-gray-900 mb-2">My <span className="text-sky-600">Services</span></h1>
      <p className="text-sm text-gray-500 mb-6">Select the service categories you offer. Customers will find you through these.</p>

      {error && <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-sm mb-4">{error}</div>}
      {success && <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-3 rounded-xl text-sm mb-4">✅ Services updated successfully!</div>}

      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 space-y-3 mb-6">
        {categories.map((cat) => {
          const isSelected = selected.has(cat.id);
          return (
            <button key={cat.id} type="button" onClick={() => toggle(cat.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${isSelected ? 'border-sky-500 bg-sky-50' : 'border-gray-200 bg-white hover:bg-gray-50'}`}>
              {isSelected ? <CheckSquare className="w-5 h-5 text-sky-600 shrink-0" /> : <Square className="w-5 h-5 text-gray-300 shrink-0" />}
              <div>
                <p className={`font-semibold text-sm ${isSelected ? 'text-sky-700' : 'text-gray-700'}`}>{cat.name}</p>
                <p className="text-xs text-gray-400">{cat.description}</p>
              </div>
            </button>
          );
        })}
      </div>

      <button onClick={handleSave} disabled={saving}
        className="w-full flex items-center justify-center gap-2 bg-sky-600 text-white py-3 rounded-xl font-semibold hover:bg-sky-700 transition-colors disabled:opacity-50">
        <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Service Selection'}
      </button>
    </div>
  );
}
