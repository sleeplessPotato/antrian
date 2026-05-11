"use client";

export type VoiceType = "tts" | "audio" | "both";

let _audioCtx: AudioContext | null = null;
let _preferredURI: string | null = null;

function getAudioCtx(): AudioContext {
  if (!_audioCtx) _audioCtx = new AudioContext();
  return _audioCtx;
}

function getPreferredURI(): string | null {
  if (_preferredURI !== null) return _preferredURI || null;
  _preferredURI = (typeof window !== "undefined" && localStorage.getItem("antrian_voice_uri")) || "";
  return _preferredURI || null;
}

export function setPreferredVoice(uri: string): void {
  _preferredURI = uri;
  localStorage.setItem("antrian_voice_uri", uri);
}

export function getPreferredVoiceURI(): string | null {
  return getPreferredURI();
}

export function awaitVoices(): Promise<SpeechSynthesisVoice[]> {
  const list = window.speechSynthesis.getVoices();
  if (list.length > 0) return Promise.resolve(list);
  return new Promise((resolve) => {
    const handler = () => resolve(window.speechSynthesis.getVoices());
    window.speechSynthesis.addEventListener("voiceschanged", handler, { once: true });
    setTimeout(() => {
      window.speechSynthesis.removeEventListener("voiceschanged", handler);
      resolve(window.speechSynthesis.getVoices());
    }, 3000);
  });
}

function pickVoice(voices: SpeechSynthesisVoice[], lang: string): SpeechSynthesisVoice | null {
  const prefix = lang.split("-")[0]; // "id-ID" → "id"
  const isId   = prefix === "id";

  // Preferred voice only applies when it matches the language family
  const uri = getPreferredURI();
  if (uri) {
    const chosen = voices.find((v) => v.voiceURI === uri);
    if (chosen && chosen.lang.startsWith(prefix)) return chosen;
  }

  return (
    // Indonesian: prefer Ardi (natural male) by default
    (isId ? voices.find((v) => /ardi/i.test(v.name))  : null)                   ??
    voices.find((v) => /google/i.test(v.name)    && v.lang.startsWith(prefix))   ??
    (isId ? voices.find((v) => /gadis/i.test(v.name)) : null)                    ??
    voices.find((v) => /microsoft/i.test(v.name) && v.lang.startsWith(prefix))   ??
    voices.find((v) => v.lang.startsWith(prefix))                                 ??
    null
  );
}

export function unlockAudio(): void {
  getAudioCtx().resume().catch(() => {});
  if ("speechSynthesis" in window) {
    const u = new SpeechSynthesisUtterance(".");
    u.volume = 0;
    u.rate   = 10;
    window.speechSynthesis.speak(u);
  }
}

// Per-digit pronunciation tables
const DIGIT_ID: Record<string, string> = {
  "0": "Nol", "1": "Satu", "2": "Dua",   "3": "Tiga", "4": "Empat",
  "5": "Lima","6": "Enam", "7": "Tujuh", "8": "Delapan", "9": "Sembilan",
};
const DIGIT_EN: Record<string, string> = {
  "0": "Zero","1": "One",  "2": "Two",   "3": "Three", "4": "Four",
  "5": "Five","6": "Six",  "7": "Seven", "8": "Eight", "9": "Nine",
};

// Spell "006" → "Nol, Nol, Enam" (ID) or "Zero, Zero, Six" (EN)
function spellDigits(digits: string, locale: "id" | "en"): string {
  const table = locale === "id" ? DIGIT_ID : DIGIT_EN;
  return digits.split("").map((c) => table[c] ?? c).join(", ");
}

// Play two utterances back-to-back with appropriate voices
function speakSequence(items: Array<{ text: string; lang: string }>, voices: SpeechSynthesisVoice[]) {
  if (window.speechSynthesis.paused) window.speechSynthesis.resume();
  for (const { text, lang } of items) {
    const utt   = new SpeechSynthesisUtterance(text);
    const voice = pickVoice(voices, lang);
    if (voice) { utt.voice = voice; utt.lang = voice.lang; }
    else          utt.lang = lang;
    utt.rate   = 0.88;
    utt.pitch  = 1.0;
    utt.volume = 1;
    console.log("[TTS]", voice?.name ?? "(default)", "|", text.slice(0, 70));
    window.speechSynthesis.speak(utt);
  }
}

export function speakTTS(text: string, lang = "id-ID") {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  awaitVoices().then((voices) => {
    setTimeout(() => speakSequence([{ text, lang }], voices), 200);
  });
}

export function playDing() {
  const ctx = getAudioCtx();
  if (ctx.state !== "running") return;
  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = "sine";
  osc.frequency.setValueAtTime(880, ctx.currentTime);
  osc.frequency.setValueAtTime(660, ctx.currentTime + 0.2);
  gain.gain.setValueAtTime(0.5, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.8);
}

export function announceQueue(
  formattedNumber: string,
  counterName: string,
  voiceType: VoiceType = "tts",
  _locale: "id" | "en" = "id"   // kept for API compatibility; announcement is always bilingual
) {
  if (!formattedNumber) return;
  playDing();

  setTimeout(() => {
    if (voiceType === "tts" || voiceType === "both") {
      const m      = formattedNumber.match(/^([A-Za-z]*)(\d+)$/);
      const prefix = m ? m[1] : "";
      const digits = m ? m[2] : formattedNumber;

      // e.g. B006 → "B, Nol, Nol, Enam" / "B, Zero, Zero, Six"
      const spelledId = spellDigits(digits, "id");
      const spelledEn = spellDigits(digits, "en");

      const idText = `Nomor antrian ${prefix}, ${spelledId}, silakan menuju ${counterName}.`;
      const enText = `Queue number ${prefix}, ${spelledEn}, please proceed to ${counterName}.`;

      window.speechSynthesis.cancel();
      awaitVoices().then((voices) => {
        setTimeout(() => speakSequence(
          [{ text: idText, lang: "id-ID" }, { text: enText, lang: "en-US" }],
          voices
        ), 200);
      });
    }

    if (voiceType === "audio" || voiceType === "both") {
      new Audio("/audio/ding.mp3").play().catch(() => {});
    }
  }, 500);
}
