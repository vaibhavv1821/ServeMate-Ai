# 07 — Provider System & Interactive Map Location Picker

## 1. Overview
The ServMate Provider System empowers verified local professionals to showcase their trade capabilities, experience, hourly rates, service categories, availability schedules, and precise service location.

A crucial component of hyperlocal service delivery is geographical proximity. Providers must specify where they operate so the ServMate Smart Matching Engine can calculate distance, compute proximity scores, and match them with nearby customers.

---

## 2. Interactive Map Location Picker

### Why Leaflet & OpenStreetMap Were Selected
1. **Open Source & Cost-Effective**: Eliminates dependency on proprietary, paid mapping SDKs (e.g. Google Maps Platform) and avoids credit card requirements, billing surprises, or API key restrictions.
2. **Lightweight & High Performance**: Leaflet is a compact JavaScript mapping library (~42 KB gzip) that performs exceptionally well across mobile and desktop devices.
3. **No Secret Keys in Frontend**: Tile requests are made via standard HTTPS OpenStreetMap endpoints (`https://tile.openstreetmap.org/{z}/{x}/{y}.png`), eliminating the risk of client-side credential exposure.
4. **Reliable Community Data**: OpenStreetMap provides global, crowd-verified geographic map coverage with regular updates.

---

## 3. Map Coordinates & User Interaction

The `LocationPicker` component (`frontend/src/components/LocationPicker.jsx`) provides an intuitive visual interface:

```
Provider opens Profile
         ↓
Map renders centered on saved location (or Mumbai default [19.0760, 72.8777])
         ↓
Provider can:
  a) Click anywhere on the map to place a pin
  b) Drag the existing pin to fine-tune exact location
  c) Click "Use My Current Location" (Browser Geolocation API)
  d) Search area or landmark via explicit search bar
         ↓
Marker coordinates captured: { latitude, longitude }
         ↓
Read-only transparency preview displayed below map
         ↓
Form submits latitude & longitude to backend API
```

### How Coordinates Reach the Backend & Database
1. **Capture**: React state in `LocationPicker` captures `latlng.lat` and `latlng.lng` (rounded to 6 decimal places).
2. **Transmission**: When the provider saves their profile, the frontend issues an authenticated `POST /api/v1/providers/profile` or `PUT /api/v1/providers/profile/me` payload with JSON fields:
   ```json
   {
     "bio": "Certified residential electrician",
     "experienceYears": 7,
     "hourlyRate": 450,
     "city": "Mumbai",
     "state": "Maharashtra",
     "latitude": 19.0760,
     "longitude": 72.8777
   }
   ```
3. **Zod Validation**: The backend validates coordinate ranges:
   - Latitude: `-90 <= latitude <= 90`
   - Longitude: `-180 <= longitude <= 180`
4. **PostgreSQL Persistence**: Stored directly in the `Provider` table under `latitude Float?` and `longitude Float?`.

---

## 4. Browser Geolocation Flow
When the provider clicks **"Use My Current Location"**:
1. Invokes the standard W3C `navigator.geolocation.getCurrentPosition()`.
2. The browser requests one-time permission from the user.
3. If granted, coordinates `{ coords: { latitude, longitude } }` are retrieved with high accuracy.
4. The Leaflet map smoothly animates (`map.setView([lat, lon], 15)`), places the marker, and updates the form state.
5. If denied, timed out, or unavailable, clear localized error messages guide the user to click the map manually without breaking application state.

---

## 5. How Coordinates Are Used in Haversine Smart Matching

ServMate's Smart Matching algorithm uses the **Haversine formula** to calculate great-circle distance between the customer's requested service location and the provider's coordinates:

$$\text{distance} = 2 R \arcsin\left(\sqrt{\sin^2\left(\frac{\Delta \text{lat}}{2}\right) + \cos(\text{lat}_1)\cos(\text{lat}_2)\sin^2\left(\frac{\Delta \text{lon}}{2}\right)}\right)$$

- **Weight in Matching Score**: 20%
- **Decay Curve**: Linear decay from 1.0 (0 km) down to 0.0 at 50 km (`Math.max(0, 1 - distKm / 50)`).
- **Fallback**: If coordinates are missing on either side, the system gracefully falls back to city name matching (10% score).

---

## 6. OpenStreetMap Attribution & Nominatim Usage Policy

- **Tile Attribution**: Under the OpenStreetMap copyright policy, the map displays attribution:
  `© OpenStreetMap contributors`
- **Nominatim Geocoding Policy**:
  - Maximum 1 request per second.
  - No autocomplete or search-as-you-type querying.
  - Geocoding requests are only performed on explicit user button clicks.
  - Proxied via the ServMate backend with a compliant `User-Agent: ServMate-AI/1.0 (contact: support@servmate.ai)` header.
  - Non-blocking: If Nominatim is unavailable, coordinate selection and profile saving continue unaffected.
