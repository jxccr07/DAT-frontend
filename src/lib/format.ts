/** Honorifics that are not part of a person's name ("د. محمد" → "محمد"). */
const TITLES = new Set(["د.", "د", "أ.", "أ.د.", "م.", "Dr.", "Dr", "Prof.", "Mr.", "Ms.", "Mrs."]);

/** Name parts without leading titles. */
function nameParts(name: string) {
  const parts = name.split(/\s+/).filter(Boolean);
  while (parts.length > 1 && TITLES.has(parts[0])) parts.shift();
  return parts;
}

/** Two initials for an avatar, e.g. "سارة علي" → "س ع", "د. محمد القحطاني" → "م ق". */
export function initials(name: string) {
  return nameParts(name)
    .slice(0, 2)
    .map((part) => part[0])
    .join(" ");
}

/** First name for greetings and the header, skipping titles: "د. محمد القحطاني" → "محمد". */
export function firstName(name: string) {
  return nameParts(name)[0] ?? name;
}

/**
 * Laravel stores timestamps as "YYYY-MM-DD HH:MM:SS" in UTC (no zone marker).
 * Parse them as UTC so the browser shows the viewer's local time.
 */
export function parseApiDate(value: string) {
  return new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(value) ? value : `${value.replace(" ", "T")}Z`);
}
