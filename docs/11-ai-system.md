# 11 – AI System: AI-Assisted Service Classification

## Overview

ServMate's AI module (Phase 4) allows customers to describe a home service problem in plain English. The system uses **Google Gemini 1.5 Flash** to classify the issue, suggest a service category, detect urgency, and recommend a description — while **never acting as a professional diagnostician**.

> **⚠️ Disclaimer**: AI-provided category and urgency suggestions are for convenience only. ServMate does not provide professional engineering, electrical, plumbing, or medical diagnoses. Always consult a licensed professional.

---

## Architecture

```
Customer Input (plain text description)
         │
         ▼
POST /api/v1/ai/analyze-service
         │
    ┌────┴─────────────────────────────────────┐
    │  1. Auth check (JWT required)            │
    │  2. Rate limit: max 5 req/min (Redis)    │
    │  3. Zod input validation (5-1000 chars)  │
    └────┬─────────────────────────────────────┘
         │
    ┌────▼────────────────────────────────┐
    │       AI Service Layer              │
    │  - Gemini 1.5 Flash REST call       │
    │  - 7-second AbortController timeout │
    │  - Zod validation of AI response    │
    │  - Map category → ServiceCategory   │
    │  - Graceful heuristic fallback      │
    └────┬────────────────────────────────┘
         │
         ▼
    Structured JSON Response
```

---

## Gemini Integration

The AI service calls the Gemini REST API directly without an SDK:

```
POST https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}
```

A structured system prompt instructs Gemini to return a JSON object with:

| Field | Type | Description |
|-------|------|-------------|
| `category` | `string` | Matched service category name from ServMate DB |
| `serviceCategoryId` | `string` | UUID of the matched DB record |
| `issue` | `string` | Short plain-English issue summary |
| `urgency` | `NORMAL \| URGENT \| EMERGENCY` | Recommended urgency level |
| `confidence` | `number` | Confidence score between 0.0 and 1.0 |
| `suggestedDescription` | `string` | Clean service request description |
| `disclaimer` | `string` | Non-diagnostic legal disclaimer |

---

## Heuristic Fallback

When `GEMINI_API_KEY` is absent or the API call fails (network error, timeout, rate limit), the system automatically falls back to keyword-based classification using regular expressions:

| Keywords | Mapped Category |
|----------|----------------|
| plumb, pipe, leak, drain, water | Plumbing |
| electric, wiring, circuit, power | Electrical |
| AC, air condition, cool, compressor | AC Repair |
| carpenter, wood, furniture, door | Carpentry |
| paint, wall, ceiling | Painting |

This ensures **the AI never blocks the core marketplace flow**.

---

## Rate Limiting

Redis (Upstash) is used to enforce cost control:

- **Key**: `ai:ratelimit:<userId>`
- **Limit**: 5 requests per 60 seconds per user
- **Response on limit exceeded**: `429 Too Many Requests`

---

## Urgency Detection

The AI classifies issues as:

| Urgency | Trigger conditions |
|---------|-------------------|
| `NORMAL` | Routine maintenance, minor issues |
| `URGENT` | Service disruption, broken appliance, water supply off |
| `EMERGENCY` | Fire risk, gas leak, structural hazard, electrical sparking, flooding |

When `urgency: 'EMERGENCY'` is used in a booking:
- `isEmergency: true` stored in DB
- Smart Matching applies Emergency Priority Modifiers
- Provider receives real-time `emergency_booking_received` Socket.io event

---

## Frontend UX — ServiceIssueAnalyzer Component

The `<ServiceIssueAnalyzer />` component is embedded on:
- `/services` (Services page) — before category grid
- `/dashboard` (Customer Dashboard) — quick access

It provides:
1. Multi-line text area for issue description
2. **"Analyze My Issue"** button (only calls AI on explicit click — cost control)
3. AI recommendation card with:
   - Suggested service category
   - Possible issue summary
   - Urgency badge (colour-coded: green/amber/red)
   - Confidence percentage
   - Editable urgency level selector
4. **"Use Recommendation & Find Providers"** button → navigates to `/providers?service=<slug>&urgency=<level>`
5. Non-diagnostic disclaimer

---

## API Reference

### `POST /api/v1/ai/analyze-service`

**Auth**: Required (JWT Bearer token)  
**Rate Limit**: 5 requests per 60 seconds

**Request Body**:
```json
{
  "description": "My kitchen sink is completely clogged and water is backing up"
}
```

**Success Response** (`200 OK`):
```json
{
  "status": "success",
  "data": {
    "category": "Plumbing",
    "categorySlug": "plumbing",
    "serviceCategoryId": "<uuid>",
    "issue": "Blocked kitchen drain causing water backup",
    "urgency": "URGENT",
    "confidence": 0.91,
    "suggestedDescription": "Kitchen sink drain is completely blocked...",
    "disclaimer": "AI-assisted recommendation only. Not a professional diagnostic opinion.",
    "aiPowered": true
  }
}
```

**Error Responses**:
- `400 Bad Request` — description too short (< 5 chars)
- `401 Unauthorized` — missing/invalid JWT
- `429 Too Many Requests` — rate limit exceeded
