/**
 * ReviewForm Component (Phase 3)
 * Shown to customer after booking is COMPLETED.
 * Prevents duplicate submission.
 */

import { useState } from 'react';
import axiosClient from '../api/axiosClient';
import { Star, Send, Loader2, AlertCircle, CheckCircle } from 'lucide-react';

const StarRating = ({ value, onChange }) => (
  <div className="flex gap-1">
    {[1, 2, 3, 4, 5].map((star) => (
      <button key={star} type="button" onClick={() => onChange(star)}>
        <Star
          className={`w-8 h-8 transition-colors ${star <= value ? 'text-amber-400 fill-amber-400' : 'text-gray-300 hover:text-amber-300'}`}
        />
      </button>
    ))}
  </div>
);

export default function ReviewForm({ booking, existingReview, onReviewSubmit }) {
  const [rating, setRating] = useState(existingReview?.rating || 0);
  const [comment, setComment] = useState(existingReview?.comment || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [submitted, setSubmitted] = useState(!!existingReview);

  if (booking?.status !== 'COMPLETED') return null;

  if (submitted || existingReview) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 space-y-2">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-amber-600" />
          <h3 className="font-bold text-amber-800">Your Review</h3>
        </div>
        <div className="flex gap-1">
          {[1,2,3,4,5].map((s) => (
            <Star key={s} className={`w-5 h-5 ${s <= (existingReview?.rating || rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`} />
          ))}
        </div>
        {(existingReview?.comment || comment) && (
          <p className="text-sm text-gray-600 italic">"{existingReview?.comment || comment}"</p>
        )}
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) { setError('Please select a rating'); return; }
    setLoading(true); setError(null);
    try {
      await axiosClient.post(`/bookings/${booking.id}/review`, { rating, comment });
      setSubmitted(true);
      if (onReviewSubmit) onReviewSubmit();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit review');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-amber-50 border border-amber-200 rounded-2xl p-5 space-y-4">
      <h3 className="font-bold text-amber-800 flex items-center gap-2">
        <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
        Rate Your Service
      </h3>
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-rose-700 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}
      <div>
        <p className="text-sm text-gray-600 mb-2">How was your experience?</p>
        <StarRating value={rating} onChange={setRating} />
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Tell us about your experience (optional)..."
        rows={3}
        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
      />
      <button type="submit" disabled={rating === 0 || loading}
        className="w-full bg-amber-500 text-white py-2.5 rounded-xl font-bold text-sm hover:bg-amber-600 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        {loading ? 'Submitting...' : 'Submit Review'}
      </button>
    </form>
  );
}
