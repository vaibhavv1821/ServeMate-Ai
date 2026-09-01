import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { Star, MapPin, Briefcase, DollarSign, Search, SlidersHorizontal, Loader2, UserCheck } from 'lucide-react';

export default function Providers() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  const [filters, setFilters] = useState({
    service: searchParams.get('service') || '',
    city: searchParams.get('city') || '',
    minRating: searchParams.get('minRating') || '',
    maxPrice: searchParams.get('maxPrice') || '',
  });

  const fetchProviders = async (f = filters) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (f.service) params.set('service', f.service);
      if (f.city) params.set('city', f.city);
      if (f.minRating) params.set('minRating', f.minRating);
      if (f.maxPrice) params.set('maxPrice', f.maxPrice);
      const res = await axiosClient.get(`/providers?${params.toString()}`);
      setProviders(res.data.providers);
      setTotal(res.data.total || 0);
    } catch {
      setProviders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProviders(); }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearchParams(filters);
    fetchProviders();
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900">Find <span className="text-sky-600">Verified Providers</span></h1>
        <p className="text-gray-500 mt-1">Browse and filter from our network of approved local professionals</p>
      </div>

      {/* Filter Bar */}
      <form onSubmit={handleSearch} className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4 mb-8 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[140px]">
          <label className="block text-xs font-semibold text-gray-500 mb-1">Service</label>
          <input value={filters.service} onChange={(e) => setFilters((f) => ({ ...f, service: e.target.value }))}
            placeholder="e.g. plumbing" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
        </div>
        <div className="flex-1 min-w-[140px]">
          <label className="block text-xs font-semibold text-gray-500 mb-1">City</label>
          <input value={filters.city} onChange={(e) => setFilters((f) => ({ ...f, city: e.target.value }))}
            placeholder="e.g. Mumbai" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
        </div>
        <div className="w-28">
          <label className="block text-xs font-semibold text-gray-500 mb-1">Min Rating</label>
          <input type="number" min="0" max="5" step="0.5" value={filters.minRating} onChange={(e) => setFilters((f) => ({ ...f, minRating: e.target.value }))}
            placeholder="4.0" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
        </div>
        <div className="w-28">
          <label className="block text-xs font-semibold text-gray-500 mb-1">Max Price ₹/hr</label>
          <input type="number" min="0" value={filters.maxPrice} onChange={(e) => setFilters((f) => ({ ...f, maxPrice: e.target.value }))}
            placeholder="1000" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
        </div>
        <button type="submit" className="flex items-center gap-2 bg-sky-600 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-sky-700 transition-colors">
          <Search className="w-4 h-4" /> Search
        </button>
      </form>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-sky-600" /></div>
      ) : providers.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <SlidersHorizontal className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="font-semibold">No providers found matching your criteria.</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-500 mb-4">{total} provider{total !== 1 ? 's' : ''} found</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {providers.map((p) => (
              <Link key={p.id} to={`/providers/${p.id}`}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 p-5 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-sky-100 flex items-center justify-center text-sky-700 font-bold text-lg">
                    {p.user.name?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{p.user.name}</p>
                    <div className="flex items-center gap-1 text-amber-500">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      <span className="text-xs font-semibold">{p.averageRating.toFixed(1)}</span>
                      <span className="text-xs text-gray-400">({p.totalReviews} reviews)</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {p.services.slice(0, 3).map((ps) => (
                    <span key={ps.serviceCategory.id} className="text-xs bg-sky-50 text-sky-700 border border-sky-100 px-2 py-0.5 rounded-full font-medium">
                      {ps.serviceCategory.name}
                    </span>
                  ))}
                </div>
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{p.city || 'India'}</span>
                  <span className="flex items-center gap-1"><Briefcase className="w-3.5 h-3.5" />{p.experienceYears}yr exp</span>
                  <span className="flex items-center gap-1 font-semibold text-gray-700"><DollarSign className="w-3.5 h-3.5" />₹{p.hourlyRate}/hr</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-emerald-600 font-semibold mt-auto">
                  <UserCheck className="w-3.5 h-3.5" /> Verified Provider
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
