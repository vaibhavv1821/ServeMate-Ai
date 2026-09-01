import { haversineDistanceKm } from './haversine.js';

/**
 * Smart Provider Matching Algorithm
 *
 * Calculates a match score (0–100) for each provider based on:
 *
 * Component          Weight    Description
 * ─────────────────────────────────────────────────────────────────
 * Service match        30%     Provider offers the requested service
 * Distance / Location  20%     Haversine km distance (or city match fallback)
 * Availability         20%     Provider has a slot on requested day/time
 * Rating               15%     averageRating (0–5 → normalised to 0–1)
 * Experience           10%     experienceYears (capped at 20yr → normalised)
 * Price                 5%     Lower hourlyRate relative to local average
 *
 * Total = sum of weighted sub-scores × 100
 */

const WEIGHTS = {
  service: 0.30,
  distance: 0.20,
  availability: 0.20,
  rating: 0.15,
  experience: 0.10,
  price: 0.05,
};

const MAX_DISTANCE_KM = 50; // distances beyond 50 km score 0
const MAX_EXPERIENCE_YRS = 20;

/**
 * Score a single provider against the request criteria.
 *
 * @param {object} provider   - Prisma Provider with relations
 * @param {object} criteria   - { serviceCategoryId, latitude, longitude, city, dayOfWeek, startTime }
 * @param {number} avgPrice   - Average hourlyRate of all candidates (for relative pricing score)
 * @returns {{ score: number, reasons: string[] }}
 */
export const scoreProvider = (provider, criteria, avgPrice) => {
  let score = 0;
  const reasons = [];

  // ── 1. SERVICE MATCH ──────────────────────────────────────────
  let serviceScore = 0;
  if (criteria.serviceCategoryId) {
    const hasService = provider.services.some(
      (ps) => ps.serviceCategoryId === criteria.serviceCategoryId
    );
    if (hasService) {
      serviceScore = 1;
      reasons.push('Offers the requested service category');
    }
  } else {
    // No filter → everyone gets base credit
    serviceScore = 0.5;
  }
  score += WEIGHTS.service * serviceScore;

  // ── 2. DISTANCE / LOCATION ───────────────────────────────────
  let distanceScore = 0;
  if (
    criteria.latitude != null && criteria.longitude != null &&
    provider.latitude != null && provider.longitude != null
  ) {
    const distKm = haversineDistanceKm(
      criteria.latitude, criteria.longitude,
      provider.latitude, provider.longitude
    );
    // Linear decay: 0 km → 1.0, 50 km → 0.0
    distanceScore = Math.max(0, 1 - distKm / MAX_DISTANCE_KM);
    if (distKm < 5) reasons.push('Very nearby provider (< 5 km)');
    else if (distKm < 15) reasons.push('Nearby provider (< 15 km)');
    else if (distKm < MAX_DISTANCE_KM) reasons.push('Provider within reasonable distance');
  } else if (
    criteria.city &&
    provider.city &&
    provider.city.toLowerCase() === criteria.city.toLowerCase()
  ) {
    // Fallback: city name match
    distanceScore = 0.6;
    reasons.push('Provider is in the same city');
  }
  score += WEIGHTS.distance * distanceScore;

  // ── 3. AVAILABILITY ──────────────────────────────────────────
  let availabilityScore = 0;
  if (criteria.dayOfWeek) {
    const hasSlot = provider.availability.some(
      (slot) =>
        slot.dayOfWeek === criteria.dayOfWeek &&
        !slot.isBooked &&
        (!criteria.startTime || slot.startTime <= criteria.startTime)
    );
    if (hasSlot) {
      availabilityScore = 1;
      reasons.push('Available at requested time');
    }
  } else if (provider.availability.some((s) => !s.isBooked)) {
    availabilityScore = 0.5;
    reasons.push('Has open availability slots');
  }
  score += WEIGHTS.availability * availabilityScore;

  // ── 4. RATING ────────────────────────────────────────────────
  const ratingScore = provider.averageRating / 5;
  score += WEIGHTS.rating * ratingScore;
  if (provider.averageRating >= 4.5) reasons.push('Excellent customer rating (≥ 4.5 ★)');
  else if (provider.averageRating >= 4.0) reasons.push('High customer rating (≥ 4.0 ★)');

  // ── 5. EXPERIENCE ────────────────────────────────────────────
  const expScore = Math.min(provider.experienceYears, MAX_EXPERIENCE_YRS) / MAX_EXPERIENCE_YRS;
  score += WEIGHTS.experience * expScore;
  if (provider.experienceYears >= 5) reasons.push(`${provider.experienceYears} years of experience`);

  // ── 6. PRICE ─────────────────────────────────────────────────
  let priceScore = 0;
  if (avgPrice > 0 && provider.hourlyRate > 0) {
    // Lower price relative to average → higher score (capped at 2× avg)
    priceScore = Math.min(1, (avgPrice * 2 - provider.hourlyRate) / (avgPrice * 2));
    priceScore = Math.max(0, priceScore);
    if (provider.hourlyRate < avgPrice) reasons.push('Competitive pricing');
  } else {
    priceScore = 0.5;
  }
  score += WEIGHTS.price * priceScore;

  return {
    score: Math.round(score * 100),
    reasons,
  };
};

/**
 * Run the matching algorithm against a list of providers.
 *
 * @param {object[]} providers - Prisma Provider array with services & availability
 * @param {object}   criteria  - Matching criteria from query
 * @returns {object[]} Providers sorted by matchScore descending, with score + reasons attached
 */
export const matchProviders = (providers, criteria) => {
  if (!providers.length) return [];

  const avgPrice =
    providers.reduce((sum, p) => sum + (p.hourlyRate || 0), 0) / providers.length;

  return providers
    .map((provider) => {
      const { score, reasons } = scoreProvider(provider, criteria, avgPrice);
      return { provider, matchScore: score, matchReasons: reasons };
    })
    .sort((a, b) => b.matchScore - a.matchScore);
};
