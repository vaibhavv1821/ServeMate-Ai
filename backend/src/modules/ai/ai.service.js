/**
 * AI Service Module (Phase 4)
 *
 * Responsibilities:
 * 1. Categorize user description into EXISTING database ServiceCategories.
 * 2. Suggest preliminary issue summary, urgency, and refined description.
 * 3. Never claim diagnostic certainty; returns non-diagnostic disclaimer.
 * 4. Fallback heuristics if AI API key is missing, network fails, or timeout occurs.
 * 5. Strictly backend-only; no client secrets.
 */

import { env } from '../../config/env.js';
import { aiOutputSchema } from './ai.validators.js';

// Heuristic keyword fallback mapping based on common home service terminology
const KEYWORD_MAP = [
  {
    keywords: ['ac', 'air condition', 'cooling', 'compressor', 'freon', 'filter', 'blower', 'thermostat', 'chilling'],
    categoryMatch: ['ac repair', 'ac', 'appliance repair'],
    issue: 'Possible cooling cycle or compressor irregularity',
    urgency: 'MEDIUM', // maps to NORMAL/URGENT depending on keywords
  },
  {
    keywords: ['leak', 'pipe', 'clog', 'drain', 'toilet', 'faucet', 'sink', 'plumb', 'tap', 'sewage', 'flush', 'water leak'],
    categoryMatch: ['plumbing', 'plumber'],
    issue: 'Possible water pipeline or drainage blockage',
    urgency: 'URGENT',
  },
  {
    keywords: ['spark', 'shock', 'short circuit', 'wire', 'switch', 'fuse', 'breaker', 'power cut', 'electric', 'voltage', 'socket'],
    categoryMatch: ['electrical', 'electrician'],
    issue: 'Possible electrical circuit or wiring fault',
    urgency: 'EMERGENCY',
  },
  {
    keywords: ['clean', 'dust', 'mop', 'sanitize', 'stain', 'deep clean', 'sofa clean', 'kitchen clean', 'bathroom clean'],
    categoryMatch: ['cleaning', 'deep cleaning'],
    issue: 'Standard domestic sanitation and cleaning requirement',
    urgency: 'NORMAL',
  },
  {
    keywords: ['fridge', 'refrigerator', 'washing machine', 'microwave', 'oven', 'dishwasher', 'dryer', 'geyser'],
    categoryMatch: ['appliance repair', 'ac repair'],
    issue: 'Possible household appliance mechanical or electrical fault',
    urgency: 'NORMAL',
  },
  {
    keywords: ['door', 'hinge', 'lock', 'wood', 'furniture', 'cabinet', 'chair', 'table', 'carpenter'],
    categoryMatch: ['carpentry'],
    issue: 'Possible woodwork, cabinetry, or fixture repair',
    urgency: 'NORMAL',
  },
  {
    keywords: ['paint', 'wall', 'primer', 'color', 'whitewash', 'distemper', 'waterproofing'],
    categoryMatch: ['painting'],
    issue: 'Interior or exterior wall surface treatment and painting',
    urgency: 'NORMAL',
  },
];

/**
 * Keyword heuristic fallback analyzer
 */
export const analyzeWithFallback = (description, availableCategories) => {
  const lower = description.toLowerCase();
  let matchedGroup = null;

  for (const group of KEYWORD_MAP) {
    if (group.keywords.some((k) => lower.includes(k))) {
      matchedGroup = group;
      break;
    }
  }

  // Find corresponding database category
  let matchedCategory = null;
  if (matchedGroup) {
    for (const catName of matchedGroup.categoryMatch) {
      matchedCategory = availableCategories.find(
        (c) => c.name.toLowerCase().includes(catName) || catName.includes(c.name.toLowerCase())
      );
      if (matchedCategory) break;
    }
  }

  // If still not matched, pick first active category
  if (!matchedCategory) {
    matchedCategory = availableCategories[0] || { name: 'General Maintenance' };
  }

  // Detect emergency triggers in text
  let detectedUrgency = 'NORMAL';
  if (
    lower.includes('emergency') ||
    lower.includes('spark') ||
    lower.includes('fire') ||
    lower.includes('smoke') ||
    lower.includes('flood') ||
    lower.includes('burst')
  ) {
    detectedUrgency = 'EMERGENCY';
  } else if (
    lower.includes('urgent') ||
    lower.includes('asap') ||
    lower.includes('immediately') ||
    lower.includes('overflow') ||
    lower.includes('not working')
  ) {
    detectedUrgency = 'URGENT';
  } else if (matchedGroup?.urgency === 'EMERGENCY' || matchedGroup?.urgency === 'URGENT') {
    detectedUrgency = matchedGroup.urgency;
  }

  return {
    category: matchedCategory.name,
    issue: matchedGroup ? matchedGroup.issue : 'General service assessment',
    urgency: detectedUrgency,
    suggestedDescription: `Customer reports: ${description.trim()}. Suggested service under ${matchedCategory.name}.`,
    confidence: matchedGroup ? 0.78 : 0.65,
    isFallback: true,
  };
};

/**
 * Call Gemini AI Model to classify service description
 */
export const analyzeServiceWithAI = async (description, availableCategories) => {
  const apiKey = env.GEMINI_API_KEY;
  const categoryNames = availableCategories.map((c) => c.name);

  // If no API key configured, use intelligent rule fallback
  if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY') {
    return analyzeWithFallback(description, availableCategories);
  }

  const prompt = `You are an AI-assisted service intake assistant for ServMate, a local home services marketplace.
Analyze the customer's reported problem description and classify it into one of the EXACT service categories provided below.

Strict Constraints:
1. "category" MUST be EXACTLY one of these available categories: ${JSON.stringify(categoryNames)}.
2. "urgency" MUST be EXACTLY one of: "NORMAL", "URGENT", "EMERGENCY".
   - Use EMERGENCY only for dangerous/damaging scenarios (gas smell, water burst flooding, electrical sparking, active fires).
   - Use URGENT for severe disruption (major appliance completely dead, clogged only toilet, no cooling in heatwave).
   - Use NORMAL for scheduled or non-critical maintenance.
3. "issue" MUST be phrased cautiously as a possibility (e.g. "Possible cooling cycle or capacitor issue"), NEVER as professional diagnostic certainty.
4. "suggestedDescription" should be a clear, polished 1-2 sentence summary of the customer's request.
5. "confidence" must be a float between 0.0 and 1.0.

Customer Problem Description:
"${description}"

Respond ONLY with a valid JSON object matching this schema:
{
  "category": string,
  "issue": string,
  "urgency": "NORMAL" | "URGENT" | "EMERGENCY",
  "suggestedDescription": string,
  "confidence": number
}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000); // 7s timeout

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json',
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`[AI Service] Gemini API returned HTTP ${response.status}. Using fallback analyzer.`);
      return analyzeWithFallback(description, availableCategories);
    }

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      return analyzeWithFallback(description, availableCategories);
    }

    // Parse JSON
    const parsedJson = JSON.parse(rawText);

    // Validate with Zod
    const validated = aiOutputSchema.safeParse(parsedJson);
    if (!validated.success) {
      console.warn('[AI Service] AI response failed Zod schema validation. Using fallback analyzer.');
      return analyzeWithFallback(description, availableCategories);
    }

    // Verify category exists in availableCategories
    const matchedCategory = availableCategories.find(
      (c) => c.name.toLowerCase() === validated.data.category.toLowerCase()
    );

    if (!matchedCategory) {
      console.warn(`[AI Service] AI returned unrecognized category "${validated.data.category}". Falling back.`);
      return analyzeWithFallback(description, availableCategories);
    }

    return {
      category: matchedCategory.name,
      issue: validated.data.issue,
      urgency: validated.data.urgency,
      suggestedDescription: validated.data.suggestedDescription,
      confidence: Math.round(validated.data.confidence * 100) / 100,
      isFallback: false,
    };
  } catch (err) {
    console.warn(`[AI Service] Exception during AI analysis (${err.message}). Using fallback analyzer.`);
    return analyzeWithFallback(description, availableCategories);
  }
};
