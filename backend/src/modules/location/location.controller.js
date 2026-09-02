import { catchAsync } from '../../utils/catchAsync.js';
import { AppError } from '../../utils/AppError.js';

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';
const USER_AGENT = 'ServMate-AI/1.0 (contact: support@servmate.ai)';

/**
 * GET /api/v1/location/search?q=Mumbai
 * Explicit user-triggered forward geocoding.
 * Uses Nominatim with a compliant application User-Agent.
 */
export const searchLocation = catchAsync(async (req, res, next) => {
  const query = req.query.q?.trim();
  if (!query || query.length < 2) {
    throw new AppError('Search query must be at least 2 characters long', 400);
  }

  const url = `${NOMINATIM_BASE_URL}/search?format=json&q=${encodeURIComponent(query)}&limit=1&addressdetails=1`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'application/json',
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return res.status(502).json({
        status: 'fail',
        message: 'Location lookup service is currently unavailable. Please click directly on the map.',
      });
    }

    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) {
      return res.status(404).json({
        status: 'fail',
        message: 'Location not found. Please try another search term or click directly on the map.',
      });
    }

    const first = data[0];
    const latitude = parseFloat(first.lat);
    const longitude = parseFloat(first.lon);

    res.status(200).json({
      status: 'success',
      data: {
        latitude,
        longitude,
        displayName: first.display_name,
        city: first.address?.city || first.address?.town || first.address?.village || first.address?.suburb || '',
        state: first.address?.state || '',
      },
    });
  } catch (err) {
    return res.status(502).json({
      status: 'fail',
      message: 'Failed to reach location search service. You can still pick your location directly on the map.',
    });
  }
});

/**
 * GET /api/v1/location/reverse?lat=19.076&lon=72.877
 * Reverse geocodes coordinates to display human-readable locality name.
 */
export const reverseGeocode = catchAsync(async (req, res, next) => {
  const lat = parseFloat(req.query.lat);
  const lon = parseFloat(req.query.lon);

  if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    throw new AppError('Valid latitude (-90 to 90) and longitude (-180 to 180) are required', 400);
  }

  const url = `${NOMINATIM_BASE_URL}/reverse?format=json&lat=${lat}&lon=${lon}&zoom=14&addressdetails=1`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'application/json',
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return res.status(200).json({
        status: 'success',
        data: { displayName: '', city: '', state: '' },
      });
    }

    const data = await response.json();
    res.status(200).json({
      status: 'success',
      data: {
        displayName: data.display_name || '',
        city: data.address?.city || data.address?.town || data.address?.village || data.address?.suburb || '',
        state: data.address?.state || '',
      },
    });
  } catch (err) {
    // Graceful degradation: never block coordinate selection
    res.status(200).json({
      status: 'success',
      data: { displayName: '', city: '', state: '' },
    });
  }
});
