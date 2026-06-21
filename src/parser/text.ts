// Bulgarian OCR text cleanup. Tesseract on small mobile text produces noise:
// stray newlines, latin look-alikes for cyrillic glyphs, leftover bullet chars.

// Common latin→cyrillic confusions when OCR misreads Bulgarian glyphs.
const LATIN_TO_CYR: Record<string, string> = {
  A: "А",
  B: "В",
  E: "Е",
  K: "К",
  M: "М",
  H: "Н",
  O: "О",
  P: "Р",
  C: "С",
  T: "Т",
  X: "Х",
  a: "а",
  e: "е",
  o: "о",
  p: "р",
  c: "с",
  y: "у",
  x: "х",
};

export function normalizeBulgarianText(raw: string): string {
  if (!raw) return "";
  let t = raw.replace(/\r/g, "\n");
  // Collapse internal newlines into spaces (a region is one logical line/block).
  t = t.replace(/\n+/g, " ");
  // Strip leading list markers / icon artefacts.
  t = t.replace(/^[\s•●✓✗xX×✓✔✗•·\-–—|]+/, "");
  // Drop control chars and odd symbols Tesseract sometimes emits.
  t = t.replace(/[^\p{L}\p{N}\s.,:;!?()«»"'%/+°-]/gu, " ");
  // Convert isolated latin look-alikes that appear inside cyrillic words.
  t = convertMixedLatin(t);
  // Collapse whitespace.
  t = t.replace(/\s+/g, " ").trim();
  return t;
}

/**
 * If a token is mostly cyrillic but has a few latin look-alikes, swap them.
 * Pure-latin tokens (real abbreviations / numbers units) are left alone.
 */
function convertMixedLatin(t: string): string {
  return t
    .split(/(\s+)/)
    .map((tok) => {
      if (/\s/.test(tok) || tok.length === 0) return tok;
      const cyr = (tok.match(/[Ѐ-ӿ]/g) || []).length;
      const lat = (tok.match(/[A-Za-z]/g) || []).length;
      if (cyr > 0 && lat > 0 && cyr >= lat) {
        return tok.replace(/[A-Za-z]/g, (ch) => LATIN_TO_CYR[ch] ?? ch);
      }
      return tok;
    })
    .join("");
}

/** Heuristic: is this OCR output plausibly a real answer/title (not noise)? */
export function looksMeaningful(text: string): boolean {
  const letters = (text.match(/\p{L}/gu) || []).length;
  return letters >= 3;
}
