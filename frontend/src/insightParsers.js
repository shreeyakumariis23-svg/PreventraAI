const SECTION_KEYS = ["Headline", "Wins", "Focus Areas", "Watchouts", "Tomorrow Plan"];

function cleanLine(line) {
  return String(line || "")
    .replace(/\*\*/g, "")
    .replace(/__/g, "")
    .replace(/`+/g, "")
    .replace(/^\s*(?:[-*•]+|\d+[.)])\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function splitLines(text) {
  return String(text || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function firstSentence(text, fallback) {
  const normalized = cleanLine(String(text || "").replace(/\s+/g, " "));
  if (!normalized) return fallback;
  const match = normalized.match(/^.*?[.!?](?:\s|$)/);
  return (match ? match[0] : normalized).trim();
}

function sanitizePayload(payload) {
  if (!payload) return null;
  return {
    ...payload,
    raw: cleanLine(payload.raw || ""),
    headline: cleanLine(payload.headline || ""),
    wins: (payload.wins || []).map(cleanLine).filter(Boolean),
    focus_areas: (payload.focus_areas || []).map(cleanLine).filter(Boolean),
    watchouts: (payload.watchouts || []).map(cleanLine).filter(Boolean),
    tomorrow_plan: (payload.tomorrow_plan || []).map(cleanLine).filter(Boolean),
    suggestions: (payload.suggestions || []).map(cleanLine).filter(Boolean),
  };
}

function parseSectionMap(text, sectionKeys) {
  const map = Object.fromEntries(sectionKeys.map((key) => [key, []]));
  let current = null;

  splitLines(text).forEach((rawLine) => {
    const plain = rawLine.replace(/:$/, "").trim().toLowerCase();
    const matched = sectionKeys.find((key) => key.toLowerCase() === plain);
    if (matched) {
      current = matched;
      return;
    }
    if (current) {
      const cleaned = cleanLine(rawLine);
      if (cleaned) map[current].push(cleaned);
    }
  });

  return map;
}

export function parseFeedbackInsight(rawText, parsedPayload) {
  if (parsedPayload?.headline) {
    const cleanPayload = sanitizePayload(parsedPayload);
    return {
      ...cleanPayload,
      headline: cleanPayload.headline.replace(/^(Headline|Wins|Focus Areas|Watchouts|Tomorrow Plan)\s*[:.-]?\s*/i, ""),
    };
  }

  const sections = parseSectionMap(rawText, SECTION_KEYS);
  const lines = splitLines(rawText).map(cleanLine);

  return {
    raw: rawText,
    headline: sections["Headline"][0] || firstSentence(rawText, "Your daily report is ready."),
    wins: sections["Wins"].length ? sections["Wins"].slice(0, 4) : lines.slice(0, 2),
    focus_areas: sections["Focus Areas"].length ? sections["Focus Areas"].slice(0, 4) : lines.slice(0, 4),
    watchouts: sections["Watchouts"].slice(0, 3),
    tomorrow_plan: sections["Tomorrow Plan"].length ? sections["Tomorrow Plan"].slice(0, 4) : lines.slice(0, 3),
  };
}

export function parseAlertsInsight(rawText, parsedPayload) {
  if (parsedPayload?.suggestions?.length) return sanitizePayload(parsedPayload);

  const suggestions = splitLines(rawText).map(cleanLine).filter((line) => line.length > 4).slice(0, 5);
  return {
    raw: rawText,
    headline: firstSentence(rawText, "Tomorrow's suggestions are ready."),
    suggestions,
  };
}
