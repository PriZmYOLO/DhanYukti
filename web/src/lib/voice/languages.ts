/**
 * Languages DhanYukti can read cards aloud in through Bhashini (Government
 * of India's language DPI). The card text is translated from English into
 * the language, then spoken. Which of these actually work depends on the
 * services Bhashini's pipeline offers for the language that day: the server
 * asks Bhashini, and a language without speech or translation is reported
 * as unavailable (the app then says so and uses the phone's voice).
 *
 * Codes are the ones Bhashini/ULCA pipelines use.
 */
export interface VoiceLanguage {
  code: string;
  /** Name in its own script. */
  name: string;
  en: string;
  hi: string;
}

export const VOICE_LANGUAGES: VoiceLanguage[] = [
  { code: "hi", name: "हिंदी", en: "Hindi", hi: "Hindi" },
  { code: "en", name: "English", en: "English", hi: "English" },
  { code: "bn", name: "বাংলা", en: "Bengali", hi: "Bangla" },
  { code: "mr", name: "मराठी", en: "Marathi", hi: "Marathi" },
  { code: "te", name: "తెలుగు", en: "Telugu", hi: "Telugu" },
  { code: "ta", name: "தமிழ்", en: "Tamil", hi: "Tamil" },
  { code: "gu", name: "ગુજરાતી", en: "Gujarati", hi: "Gujarati" },
  { code: "ur", name: "اردو", en: "Urdu", hi: "Urdu" },
  { code: "kn", name: "ಕನ್ನಡ", en: "Kannada", hi: "Kannada" },
  { code: "or", name: "ଓଡ଼ିଆ", en: "Odia", hi: "Odia" },
  { code: "ml", name: "മലയാളം", en: "Malayalam", hi: "Malayalam" },
  { code: "pa", name: "ਪੰਜਾਬੀ", en: "Punjabi", hi: "Punjabi" },
  { code: "as", name: "অসমীয়া", en: "Assamese", hi: "Asamiya" },
  { code: "mai", name: "मैथिली", en: "Maithili", hi: "Maithili" },
  { code: "sat", name: "ᱥᱟᱱᱛᱟᱲᱤ", en: "Santali", hi: "Santali" },
  { code: "ks", name: "کٲشُر", en: "Kashmiri", hi: "Kashmiri" },
  { code: "ne", name: "नेपाली", en: "Nepali", hi: "Nepali" },
  { code: "gom", name: "कोंकणी", en: "Konkani", hi: "Konkani" },
  { code: "sd", name: "سنڌي", en: "Sindhi", hi: "Sindhi" },
  { code: "doi", name: "डोगरी", en: "Dogri", hi: "Dogri" },
  { code: "mni", name: "ꯃꯩꯇꯩꯂꯣꯟ", en: "Manipuri", hi: "Manipuri" },
  { code: "brx", name: "बड़ो", en: "Bodo", hi: "Bodo" },
  { code: "sa", name: "संस्कृतम्", en: "Sanskrit", hi: "Sanskrit" },
];

export const VOICE_CODES = new Set(VOICE_LANGUAGES.map((l) => l.code));

export function voiceLanguage(code: string): VoiceLanguage | undefined {
  return VOICE_LANGUAGES.find((l) => l.code === code);
}
