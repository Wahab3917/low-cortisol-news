// Words that strongly signal positive news
export const POSITIVE_KEYWORDS = new Set([
  'breakthrough', 'milestone', 'discovery', 'cured', 'saved', 'restored',
  'record', 'first time', 'achieved', 'launched', 'improved', 'solution',
  'progress', 'success', 'hope', 'recovery', 'awarded', 'celebrated',
  'innovation', 'invented', 'protected', 'cleaned', 'rewilded', 'rebuilt',
  'peace', 'agreement', 'collaboration', 'grant', 'funded', 'expanded',
  'grew', 'increased access', 'free', 'open', 'affordable', 'reduced poverty',
  'vaccination', 'eradicated', 'renewable', 'solar', 'habitat', 'species',
  'children', 'education', 'school', 'scholarship', 'literacy', 'empowerment',
]);

// Words that immediately disqualify a story
export const NEGATIVE_BLOCKLIST = new Set([
  'killed', 'dead', 'death', 'murder', 'attack', 'blast', 'explosion',
  'war', 'conflict', 'clash', 'violence', 'riot', 'protest', 'arrest',
  'crash', 'flood', 'earthquake', 'disaster', 'crisis', 'collapse',
  'fraud', 'scam', 'corruption', 'scandal', 'fired', 'bankrupt',
]);

/**
 * Fast O(1) keyword check.
 * Returns true  → passes (positive keyword hit, no blocklist hit)
 * Returns false → fails (blocklist hit, or neither list matched)
 */
export function passesKeywordFilter(text: string): boolean {
  const lower = text.toLowerCase();
  for (const word of NEGATIVE_BLOCKLIST) {
    if (lower.includes(word)) return false;
  }
  for (const word of POSITIVE_KEYWORDS) {
    if (lower.includes(word)) return true;
  }
  return false; // ambiguous — caller can optionally send to LLM
}
