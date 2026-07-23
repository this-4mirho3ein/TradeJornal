/**
 * Clean display names coming from MT4 (often mojibake for non-Latin names).
 */
export function displayAccountName(name: string, login: number): string {
  const cleaned = name
    .replace(/[^\p{L}\p{N}\s._'-]/gu, "")
    .replace(/\s+/g, " ")
    .trim();

  if (cleaned.length < 2) {
    return `Account ${login}`;
  }

  return cleaned;
}