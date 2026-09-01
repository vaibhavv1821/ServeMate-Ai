import { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';
import { Loader2, Plus, Trash2, Clock, AlertCircle } from 'lucide-react';

const DAYS = ['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY'];

export default function ProviderAvailability() {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ dayOfWeek: 'MONDAY', startTime: '09:00', endTime: '10:00' });
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await axiosClient.get('/availability/my');
      setSlots(res.data.slots);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setAdding(true); setError(null);
    try {
      await axiosClient.post('/availability', form);
      await load();
      setForm((f) => ({ ...f, startTime: '09:00', endTime: '10:00' }));
    } catch (err) {
      setError(err.message || 'Failed to add slot');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id) => {
    setDeleting(id);
    try {
      await axiosClient.delete(`/availability/${id}`);
      setSlots((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      alert(err.message || 'Failed to delete slot');
    } finally {
      setDeleting(null);
    }
  };

  const grouped = DAYS.reduce((acc, day) => {
    acc[day] = slots.filter((s) => s.dayOfWeek === day);
    return acc;
  }, {});

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-sky-600" /></div>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-extrabold text-gray-900 mb-6">Manage <span className="text-sky-600">Availability</span></h1>

      {/* Add Slot Form */}
      <form onSubmit={handleAdd} className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 mb-6 space-y-4">
        <h2 className="font-semibold text-gray-800">Add New Time Slot</h2>
        {error && <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</div>}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Day</label>
            <select value={form.dayOfWeek} onChange={(e) => setForm((f) => ({ ...f, dayOfWeek: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500">
              {DAYS.map((d) => <option key={d} value={d}>{d.charAt(0) + d.slice(1).toLowerCase()}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Start Time</label>
            <input type="time" value={form.startTime} onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">End Time</label>
            <input type="time" value={form.endTime} onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
          </div>
        </div>
        <button type="submit" disabled={adding}
          className="flex items-center gap-2 bg-sky-600 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-sky-700 transition-colors disabled:opacity-50">
          <Plus className="w-4 h-4" /> {adding ? 'Adding...' : 'Add Slot'}
        </button>
      </form>

      {/* Slots by Day */}
      <div className="space-y-4">
        {DAYS.filter((d) => grouped[d].length > 0).map((day) => (
          <div key={day} className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4">
            <p className="text-xs font-bold text-gray-500 uppercase mb-3">{day}</p>
            <div className="space-y-2">
              {grouped[day].map((slot) => (
                <div key={slot.id} className={`flex items-center justify-between px-3 py-2 rounded-xl ${slot.isBooked ? 'bg-amber-50 border border-amber-100' : 'bg-gray-50 border border-gray-200'}`}>
                  <span className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                    <Clock className="w-3.5 h-3.5 text-gray-400" /> {slot.startTime} – {slot.endTime}
                    {slot.isBooked && <span className="text-xs text-amber-600 font-semibold ml-2">(Booked)</span>}
                  </span>
                  {!slot.isBooked && (
                    <button onClick={() => handleDelete(slot.id)} disabled={deleting === slot.id}
                      className="text-rose-500 hover:text-rose-700 disabled:opacity-40">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
        {slots.length === 0 && (
          <div className="text-center py-10 text-gray-400">
            <Clock className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No availability slots added yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
