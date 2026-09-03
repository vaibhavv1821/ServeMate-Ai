import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { Sparkles, AlertTriangle, ShieldCheck, ArrowRight, Edit3, Loader2, Check } from 'lucide-react';

export default function ServiceIssueAnalyzer({ onSelectRecommendation }) {
  const navigate = useNavigate();
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedUrgency, setSelectedUrgency] = useState('NORMAL');

  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (description.trim().length < 5) {
      setError('Please provide at least 5 characters describing the issue.');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await axiosClient.post('/ai/analyze-service', { description });
      const data = res.data.data;
      setResult(data);
      setSelectedUrgency(data.urgency || 'NORMAL');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'AI assessment failed. Please select your service category manually.');
    } finally {
      setLoading(false);
    }
  };

  const handleUseRecommendation = () => {
    if (!result) return;
    if (onSelectRecommendation) {
      onSelectRecommendation({
        ...result,
        urgency: selectedUrgency,
      });
    } else {
      // Navigate to Providers list pre-filtered by the recommended service
      navigate(`/providers?service=${result.categorySlug}&urgency=${selectedUrgency}`);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-sky-100 shadow-sm p-6 sm:p-8 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-gradient-to-tr from-sky-500 to-indigo-600 rounded-xl text-white shadow-md">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-extrabold text-gray-900">AI-Assisted Issue Analyzer</h2>
          <p className="text-xs text-gray-500">Describe your home repair or service problem in plain English</p>
        </div>
      </div>

      <form onSubmit={handleAnalyze} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">What problem are you experiencing?</label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. My AC compressor is running loudly but the room is not cooling at all, and it smells slightly damp..."
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex justify-between items-center flex-wrap gap-3">
          <span className="text-[11px] text-gray-400">Strictly confidential intake • Powered by ServMate AI</span>
          <button
            type="submit"
            disabled={loading || description.trim().length < 5}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white font-semibold text-sm px-5 py-2.5 rounded-xl shadow transition-all disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Analyzing problem...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Analyze My Issue</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* AI Assessment Card */}
      {result && (
        <div className="border border-sky-200 bg-sky-50/50 rounded-2xl p-5 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center justify-between flex-wrap gap-2 border-b border-sky-100 pb-3">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-800 bg-sky-100 px-3 py-1 rounded-full">
              <ShieldCheck className="w-3.5 h-3.5 text-sky-600" />
              AI-Assisted Assessment
            </span>
            <span className="text-xs font-semibold text-gray-500">
              Confidence: <strong className="text-gray-900">{Math.round((result.confidence || 0.8) * 100)}%</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-xs text-gray-500 font-medium">Suggested Service</p>
              <p className="font-bold text-gray-900 text-base">{result.category}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Possible Issue</p>
              <p className="font-semibold text-gray-800">{result.issue}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Recommended Urgency</p>
              <span
                className={`inline-block mt-0.5 px-2.5 py-0.5 text-xs font-bold rounded-full ${
                  selectedUrgency === 'EMERGENCY'
                    ? 'bg-rose-100 text-rose-800 border border-rose-200'
                    : selectedUrgency === 'URGENT'
                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                }`}
              >
                {selectedUrgency}
              </span>
            </div>
          </div>

          <div>
            <p className="text-xs text-gray-500 font-medium mb-1">Suggested Description</p>
            <p className="text-xs text-gray-700 italic bg-white/70 p-3 rounded-xl border border-sky-100">
              "{result.suggestedDescription}"
            </p>
          </div>

          {/* Urgency Selector / Editor */}
          <div className="pt-2 border-t border-sky-100">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-gray-700">Confirm or Modify Urgency Level:</label>
              <button
                type="button"
                onClick={() => setIsEditing(!isEditing)}
                className="text-xs text-sky-600 font-medium hover:underline inline-flex items-center gap-1"
              >
                <Edit3 className="w-3 h-3" />
                {isEditing ? 'Done Editing' : 'Edit Level'}
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {['NORMAL', 'URGENT', 'EMERGENCY'].map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setSelectedUrgency(lvl)}
                  className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all flex items-center justify-center gap-1.5 ${
                    selectedUrgency === lvl
                      ? lvl === 'EMERGENCY'
                        ? 'bg-rose-600 border-rose-600 text-white shadow'
                        : lvl === 'URGENT'
                        ? 'bg-amber-500 border-amber-500 text-white shadow'
                        : 'bg-emerald-600 border-emerald-600 text-white shadow'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {selectedUrgency === lvl && <Check className="w-3.5 h-3.5" />}
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-3 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setResult(null)}
              className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 border border-gray-200 bg-white rounded-xl hover:bg-gray-50 transition-colors"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={handleUseRecommendation}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-xl shadow transition-colors"
            >
              <span>Use Recommendation & Find Providers</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Disclaimer */}
          <p className="text-[11px] text-gray-500 border-t border-sky-100 pt-2 leading-relaxed">
            <span className="font-semibold text-gray-700">Disclaimer:</span> {result.disclaimer}
          </p>
        </div>
      )}
    </div>
  );
}
