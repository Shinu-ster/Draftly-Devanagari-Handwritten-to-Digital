// Core consonants for v1 — extend this table later with retroflex
// (ट ठ ड ढ ण), nasals (ङ ञ), and conjuncts (क्ष त्र ज्ञ श्र) as needed.
type Entry = [roman: string, deva: string];

const CONSONANTS: Entry[] = [
  ["kh", "ख"], ["gh", "घ"], ["chh", "छ"], ["ch", "च"], ["jh", "झ"],
  ["th", "थ"], ["dh", "ध"], ["ph", "फ"], ["bh", "भ"], ["sh", "श"],
  ["k", "क"], ["g", "ग"], ["j", "ज"], ["t", "त"], ["d", "द"],
  ["n", "न"], ["p", "प"], ["b", "ब"], ["m", "म"], ["y", "य"],
  ["r", "र"], ["l", "ल"], ["v", "व"], ["w", "व"], ["s", "स"], ["h", "ह"],
];

const VOWELS: Entry[] = [
  ["aa", "आ"], ["ee", "ई"], ["ii", "ई"], ["oo", "ऊ"], ["uu", "ऊ"],
  ["ai", "ऐ"], ["au", "औ"],
  ["a", "अ"], ["i", "इ"], ["u", "उ"], ["e", "ए"], ["o", "ओ"],
];

const MATRAS: Record<string, string> = {
  aa: "ा", ee: "ी", ii: "ी", oo: "ू", uu: "ू",
  ai: "ै", au: "ौ",
  a: "", // inherent vowel — consonant alone already carries "a"
  i: "ि", u: "ु", e: "े", o: "ो",
};

const HALANT = "्";

type Candidate = { roman: string; deva: string; kind: "consonant" | "vowel" };

const CANDIDATES: Candidate[] = [
  ...CONSONANTS.map(([roman, deva]): Candidate => ({ roman, deva, kind: "consonant" })),
  ...VOWELS.map(([roman, deva]): Candidate => ({ roman, deva, kind: "vowel" })),
].sort((a, b) => b.roman.length - a.roman.length); // longest match first

function matchAt(buffer: string, pos: number): Candidate | null {
  for (const cand of CANDIDATES) {
    const chunk = buffer.slice(pos, pos + cand.roman.length).toLowerCase();
    if (chunk === cand.roman) return cand;
  }
  return null;
}

const DEVANAGARI_RANGE = /[\u0900-\u097F]/;

export function isDevanagari(ch: string): boolean {
  return DEVANAGARI_RANGE.test(ch);
}

export function isLatinLetter(ch: string): boolean {
  return /^[a-zA-Z]$/.test(ch);
}

/**
 * Converts a buffer of Roman letters into Devanagari, applying:
 * - consonant + vowel -> matra attachment
 * - consonant + consonant -> halant insertion (conjunct)
 * - bare trailing consonant -> inherent vowel (no halant)
 */
export function transliterateWord(buffer: string): string {
  let i = 0;
  let output = "";
  let pendingConsonant: string | null = null;
  const n = buffer.length;

  while (i < n) {
    const match = matchAt(buffer, i);

    if (!match) {
      // unmatched char (number, symbol, etc.) — flush pending consonant bare, pass char through
      if (pendingConsonant) {
        output += pendingConsonant;
        pendingConsonant = null;
      }
      output += buffer[i];
      i += 1;
      continue;
    }

    if (match.kind === "consonant") {
      if (pendingConsonant) {
        // two consonants in a row with no vowel between -> conjunct
        output += pendingConsonant + HALANT;
      }
      pendingConsonant = match.deva;
    } else {
      // vowel
      if (pendingConsonant) {
        output += pendingConsonant + MATRAS[match.roman];
        pendingConsonant = null;
      } else {
        output += match.deva; // standalone independent vowel
      }
    }

    i += match.roman.length;
  }

  if (pendingConsonant) {
    output += pendingConsonant; // trailing bare consonant, inherent "a"
  }

  return output;
}
