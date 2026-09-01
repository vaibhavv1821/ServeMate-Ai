import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { Droplets, Zap, Sparkles, Hammer, Settings, Paintbrush, BookOpen, ArrowRight, Loader2 } from 'lucide-react';

const iconMap = {
  Droplets: Droplets, Zap: Zap, Sparkles: Sparkles, Hammer: Hammer,
  Settings: Settings, Paintbrush: Paintbrush, BookOpen: BookOpen,
};

const categoryColors = [
  'from-sky-500 to-blue-600', 'from-yellow-400 to-orange-500',
  'from-emerald-400 to-teal-500', 'from-amber-500 to-yellow-600',
  'from-purple-500 to-violet-600', 'from-pink-500 to-rose-600',
  'from-indigo-400 to-blue-500',
];

export default function Services() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    axiosClient.get('/services')
      .then((res) => setServices(res.data.services))
      .catch(() => setError('Failed to load services. Please try again.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-sky-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-rose-600 font-semibold">{error}</div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
          Our <span className="text-sky-600">Services</span>
        </h1>
        <p className="mt-3 text-lg text-gray-500">Choose a service category to find verified local professionals</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.map((svc, idx) => {
          const Icon = iconMap[svc.iconName] || Settings;
          const gradient = categoryColors[idx % categoryColors.length];
          return (
            <Link
              key={svc.id}
              to={`/providers?service=${svc.slug}`}
              className="group relative bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden"
            >
              <div className={`h-2 w-full bg-gradient-to-r ${gradient}`} />
              <div className="p-6">
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} text-white mb-4 shadow-md group-hover:scale-110 transition-transform`}>
                  <Icon className="w-6 h-6" />
                </div>
                <h2 className="text-lg font-bold text-gray-900 mb-1">{svc.name}</h2>
                <p className="text-sm text-gray-500 line-clamp-2">{svc.description}</p>
                <div className="mt-4 flex items-center text-sky-600 text-sm font-semibold group-hover:gap-2 transition-all">
                  <span>Find Providers</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
