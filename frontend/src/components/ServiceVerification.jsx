/**
 * OTP Service Verification Widget (Phase 3)
 * Shows different UI depending on user role:
 *   - CUSTOMER: "Generate OTP" button → displays OTP
 *   - PROVIDER: "Enter OTP" input → submits for verification
 */

import { useState } from 'react';
import axiosClient from '../api/axiosClient';
import { useAuth } from '../context/AuthContext';
import { Shield, ShieldCheck, Loader2, AlertCircle, CheckCircle, KeyRound } from 'lucide-react';

export default function ServiceVerification({ booking, onStatusChange }) {
  const { user } = useAuth();
  const [otp, setOtp] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  if (!booking) return null;

  // Already started or beyond
  if (['SERVICE_STARTED', 'COMPLETED'].includes(booking.status)) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex items-center gap-3">
        <ShieldCheck className="w-6 h-6 text-emerald-600" />
        <div>
          <p className="font-bold text-emerald-800">Service Verified ✓</p>
          <p className="text-sm text-emerald-600">
            {booking.status === 'COMPLETED' ? 'Service has been completed.' : 'Service is currently in progress.'}
          </p>
        </div>
      </div>
    );
  }

  if (booking.status !== 'CONFIRMED') return null;

  // ── CUSTOMER: Generate OTP ────────────────────────────────────────
  if (user.role === 'CUSTOMER') {
    const handleGenerate = async () => {
      setLoading(true); setError(null); setGeneratedOtp(null);
      try {
        const res = await axiosClient.post(`/bookings/${booking.id}/otp/generate`);
        setGeneratedOtp(res.data.data.otp);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to generate OTP');
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="bg-sky-50 border border-sky-200 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-sky-600" />
          <h3 className="font-bold text-sky-800">Service Verification</h3>
        </div>
        <p className="text-sm text-sky-700">
          When your provider arrives, generate an OTP and share it verbally. The provider will enter it to start the service.
        </p>
        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-rose-700 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        )}
        {generatedOtp ? (
          <div className="bg-white border-2 border-sky-400 rounded-xl p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">Your Service OTP (valid 5 minutes)</p>
            <p className="text-4xl font-mono font-extrabold text-sky-700 tracking-widest">{generatedOtp}</p>
            <p className="text-xs text-amber-600 mt-2 font-medium">
              ⚠️ Dev/Demo mode — share verbally with provider only
            </p>
          </div>
        ) : (
          <button onClick={handleGenerate} disabled={loading}
            className="w-full bg-sky-600 text-white py-2.5 rounded-xl font-bold text-sm hover:bg-sky-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
            {loading ? 'Generating...' : 'Generate Service OTP'}
          </button>
        )}
      </div>
    );
  }

  // ── PROVIDER: Verify OTP ──────────────────────────────────────────
  if (user.role === 'PROVIDER') {
    const handleVerify = async (e) => {
      e.preventDefault();
      if (otp.length !== 6) { setError('Enter the 6-digit OTP from the customer'); return; }
      setLoading(true); setError(null); setSuccess(null);
      try {
        await axiosClient.post(`/bookings/${booking.id}/otp/verify`, { otp });
        setSuccess('OTP verified! Service has started.');
        if (onStatusChange) onStatusChange('SERVICE_STARTED');
      } catch (err) {
        setError(err.response?.data?.message || 'OTP verification failed');
      } finally {
        setLoading(false);
      }
    };

    if (success) {
      return (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex items-center gap-3">
          <CheckCircle className="w-6 h-6 text-emerald-600" />
          <div>
            <p className="font-bold text-emerald-800">Service Started ✓</p>
            <p className="text-sm text-emerald-600">{success}</p>
          </div>
        </div>
      );
    }

    return (
      <form onSubmit={handleVerify} className="bg-violet-50 border border-violet-200 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <KeyRound className="w-5 h-5 text-violet-600" />
          <h3 className="font-bold text-violet-800">Start Service</h3>
        </div>
        <p className="text-sm text-violet-700">Enter the 6-digit OTP provided by the customer to start service.</p>
        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-rose-700 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        )}
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="_ _ _ _ _ _"
          className="w-full border-2 border-violet-300 rounded-xl px-4 py-3 text-2xl font-mono text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
        <button type="submit" disabled={otp.length !== 6 || loading}
          className="w-full bg-violet-600 text-white py-2.5 rounded-xl font-bold text-sm hover:bg-violet-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
          {loading ? 'Verifying...' : 'Verify OTP & Start Service'}
        </button>
      </form>
    );
  }

  return null;
}
