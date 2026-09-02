import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import axiosClient from '../api/axiosClient';
import { MapPin, Search, Navigation, X, AlertCircle, Loader2 } from 'lucide-react';

// Default fallback location: Mumbai, Maharashtra, India
const DEFAULT_CENTER = [19.0760, 72.8777];
const DEFAULT_ZOOM = 12;

// Custom SVG Pin Icon for Leaflet
const createCustomIcon = () => {
  return L.divIcon({
    className: 'custom-map-marker',
    html: `
      <div style="
        position: relative;
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        transform: translate(-50%, -100%);
      ">
        <svg viewBox="0 0 24 24" width="36" height="36" fill="#0284c7" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0 3px 5px rgba(0,0,0,0.35));">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
          <circle cx="12" cy="10" r="3" fill="#ffffff"></circle>
        </svg>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
};

// Component to handle map clicks
function MapClickHandler({ onSelectLocation }) {
  useMapEvents({
    click(e) {
      onSelectLocation(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Component to programmatically re-center map when coordinates change externally
function MapCenterController({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, zoom || map.getZoom(), { animate: true });
    }
  }, [center, zoom, map]);
  return null;
}

export default function LocationPicker({
  latitude,
  longitude,
  onLocationChange,
}) {
  const markerIcon = useMemo(() => createCustomIcon(), []);
  const markerRef = useRef(null);

  const hasCoords = typeof latitude === 'number' && typeof longitude === 'number' && !isNaN(latitude) && !isNaN(longitude);

  const [mapCenter, setMapCenter] = useState(hasCoords ? [latitude, longitude] : DEFAULT_CENTER);
  const [mapZoom, setMapZoom] = useState(hasCoords ? 14 : DEFAULT_ZOOM);

  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationName, setLocationName] = useState('');
  const [errorMsg, setErrorMsg] = useState(null);

  // Sync center when initial/existing latitude and longitude change externally
  useEffect(() => {
    if (hasCoords) {
      setMapCenter([latitude, longitude]);
    }
  }, [latitude, longitude]);

  // Attempt reverse geocode to give the user a friendly location preview
  const fetchAddressHint = async (lat, lon) => {
    try {
      const res = await axiosClient.get(`/location/reverse?lat=${lat}&lon=${lon}`);
      if (res.data?.data?.displayName) {
        setLocationName(res.data.data.displayName);
        return res.data.data;
      }
    } catch {
      // Reverse geocoding failure is non-blocking
    }
    return null;
  };

  // When marker is placed or moved
  const handleSelectLocation = async (lat, lon) => {
    setErrorMsg(null);
    const roundedLat = parseFloat(Number(lat).toFixed(6));
    const roundedLon = parseFloat(Number(lon).toFixed(6));

    setMapCenter([roundedLat, roundedLon]);
    onLocationChange({ latitude: roundedLat, longitude: roundedLon });

    const addrData = await fetchAddressHint(roundedLat, roundedLon);
    if (addrData && onLocationChange) {
      onLocationChange({
        latitude: roundedLat,
        longitude: roundedLon,
        city: addrData.city,
        state: addrData.state,
        displayName: addrData.displayName,
      });
    }
  };

  // Marker drag end handler
  const handleMarkerDragEnd = () => {
    const marker = markerRef.current;
    if (marker != null) {
      const latlng = marker.getLatLng();
      handleSelectLocation(latlng.lat, latlng.lng);
    }
  };

  // Explicit Search (one request on submit, no auto-complete)
  const handleSearch = async (e) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    setSearching(true);
    setErrorMsg(null);

    try {
      const res = await axiosClient.get(`/location/search?q=${encodeURIComponent(query)}`);
      const data = res.data?.data;
      if (data && typeof data.latitude === 'number' && typeof data.longitude === 'number') {
        setMapCenter([data.latitude, data.longitude]);
        setMapZoom(14);
        setLocationName(data.displayName || query);
        onLocationChange({
          latitude: data.latitude,
          longitude: data.longitude,
          city: data.city,
          state: data.state,
          displayName: data.displayName,
        });
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || 'Location not found');
    } finally {
      setSearching(false);
    }
  };

  // Geolocation API (Browser "Use My Current Location")
  const handleCurrentLocation = () => {
    setErrorMsg(null);
    if (!navigator.geolocation) {
      setErrorMsg('Geolocation is not supported by your browser');
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setLocating(false);
        const { latitude: lat, longitude: lon } = pos.coords;
        setMapCenter([lat, lon]);
        setMapZoom(15);
        await handleSelectLocation(lat, lon);
      },
      (err) => {
        setLocating(false);
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setErrorMsg('Location permission was denied. Please allow location access or click on the map.');
            break;
          case err.POSITION_UNAVAILABLE:
            setErrorMsg('Location information is currently unavailable.');
            break;
          case err.TIMEOUT:
            setErrorMsg('Request to get your location timed out. Please try again or click on the map.');
            break;
          default:
            setErrorMsg('Could not determine current location. Please pick location on the map.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  // Clear selected location
  const handleClearLocation = () => {
    setLocationName('');
    setErrorMsg(null);
    onLocationChange({ latitude: null, longitude: null });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-semibold text-gray-800 flex items-center gap-1.5">
          <MapPin className="w-4 h-4 text-sky-600" />
          Service Location
        </label>
        <div className="flex items-center gap-2">
          {hasCoords && (
            <button
              type="button"
              onClick={handleClearLocation}
              className="text-xs text-gray-500 hover:text-rose-600 transition-colors flex items-center gap-1"
            >
              <X className="w-3 h-3" /> Clear Pin
            </button>
          )}
          <button
            type="button"
            onClick={handleCurrentLocation}
            disabled={locating}
            className="text-xs bg-sky-50 text-sky-700 hover:bg-sky-100 px-2.5 py-1 rounded-lg font-medium transition-colors flex items-center gap-1.5 border border-sky-200 disabled:opacity-60"
          >
            {locating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Navigation className="w-3 h-3 text-sky-600" />}
            {locating ? 'Locating...' : 'Use My Current Location'}
          </button>
        </div>
      </div>

      <p className="text-xs text-gray-500">
        Search for your area or click directly on the map to place your service pin. You can drag the marker to adjust.
      </p>

      {/* Explicit Location Search Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSearch(e);
              }
            }}
            placeholder="Search city, area, or landmark (e.g. Bandra, Mumbai)..."
            className="w-full border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
        </div>
        <button
          type="button"
          onClick={handleSearch}
          disabled={searching || !searchQuery.trim()}
          className="bg-sky-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-sky-700 transition-colors disabled:opacity-50 flex items-center gap-1.5"
        >
          {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          {searching ? 'Searching...' : 'Search'}
        </button>
      </div>

      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-3 py-2 rounded-xl text-xs flex items-center gap-1.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Interactive Map Container */}
      <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-inner relative z-0 h-64 sm:h-72">
        <MapContainer
          center={mapCenter}
          zoom={mapZoom}
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />
          <MapClickHandler onSelectLocation={handleSelectLocation} />
          <MapCenterController center={mapCenter} zoom={mapZoom} />

          {hasCoords && (
            <Marker
              position={[latitude, longitude]}
              icon={markerIcon}
              draggable={true}
              eventHandlers={{
                dragend: handleMarkerDragEnd,
              }}
              ref={markerRef}
            />
          )}
        </MapContainer>
      </div>

      {/* Read-only Location Transparency Info */}
      <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 text-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <span className="font-semibold text-gray-700">Selected Location: </span>
          {hasCoords ? (
            <span className="text-gray-900 font-medium">
              {locationName ? locationName : `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`}
            </span>
          ) : (
            <span className="text-gray-400 italic">No location selected yet. Click on the map to drop a pin.</span>
          )}
        </div>
        {hasCoords && (
          <div className="text-gray-500 font-mono shrink-0">
            Lat: <span className="text-sky-700 font-semibold">{latitude.toFixed(6)}</span> | Lon: <span className="text-sky-700 font-semibold">{longitude.toFixed(6)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
