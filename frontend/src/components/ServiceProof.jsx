/**
 * ServiceProof Component (Phase 3)
 * Displays before/after proof images and provides upload UI.
 * Sends multipart/form-data to backend → Cloudinary.
 */

import { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';
import { Camera, Upload, Loader2, AlertCircle, ImageIcon } from 'lucide-react';

const ProofSection = ({ label, proofs, bookingId, type, canUpload, onUpload }) => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true); setError(null);
    const fd = new FormData();
    fd.append('proof', file);
    fd.append('type', type);
    try {
      await axiosClient.post(`/bookings/${bookingId}/proof`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setFile(null);
      onUpload();
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      <h4 className="font-semibold text-gray-700 text-sm">{label}</h4>
      {proofs.length > 0 ? (
        <div className="grid grid-cols-2 gap-2">
          {proofs.map((p) => (
            <div key={p.id} className="relative rounded-xl overflow-hidden border border-gray-200">
              <img src={p.fileUrl} alt={label} className="w-full h-32 object-cover" />
              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1.5 truncate">
                {p.uploader.name} ({p.uploader.role.toLowerCase()})
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center text-gray-400 text-sm">
          <ImageIcon className="w-6 h-6 mx-auto mb-1 opacity-50" />
          No {label.toLowerCase()} uploaded
        </div>
      )}

      {canUpload && (
        <div className="space-y-2">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => setFile(e.target.files[0])}
            className="block w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-sky-50 file:text-sky-700 file:font-semibold hover:file:bg-sky-100"
          />
          {error && <p className="text-xs text-rose-600 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{error}</p>}
          {file && (
            <button onClick={handleUpload} disabled={uploading}
              className="flex items-center gap-1.5 bg-sky-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-sky-700 disabled:opacity-50 transition-colors">
              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              {uploading ? 'Uploading...' : `Upload ${label}`}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default function ServiceProof({ booking }) {
  const [proofs, setProofs] = useState({ beforeService: [], afterService: [] });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!booking?.id) return;
    setLoading(true);
    try {
      const res = await axiosClient.get(`/bookings/${booking.id}/proof`);
      setProofs(res.data.data.proofs);
    } catch {
      // Non-critical
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [booking?.id]);

  const canUpload = ['CONFIRMED', 'SERVICE_STARTED', 'COMPLETED'].includes(booking?.status);
  const canUploadAfter = ['SERVICE_STARTED', 'COMPLETED'].includes(booking?.status);

  if (loading) return <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-sky-500" /></div>;

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 space-y-5">
      <h3 className="font-bold text-gray-900 flex items-center gap-2">
        <Camera className="w-5 h-5 text-sky-600" /> Service Proof
      </h3>
      <ProofSection
        label="Before Service"
        proofs={proofs.beforeService}
        bookingId={booking.id}
        type="BEFORE_SERVICE"
        canUpload={canUpload}
        onUpload={load}
      />
      <hr className="border-gray-100" />
      <ProofSection
        label="After Service"
        proofs={proofs.afterService}
        bookingId={booking.id}
        type="AFTER_SERVICE"
        canUpload={canUploadAfter}
        onUpload={load}
      />
    </div>
  );
}
