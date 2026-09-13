"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Browser-native speech for the voice interview:
 *  - SpeechRecognition  → speech-to-text (Indian English, lang="en-IN")
 *  - speechSynthesis     → natural interviewer voice (male/female selectable)
 *
 * Runs fully client-side with no API keys. Degrades gracefully: if the browser
 * has no support, `supported` is false and the UI falls back to text mode.
 */
export interface SpeechVoice {
  name: string;
  lang: string;
}

// minimal structural types (Web Speech API isn't in the TS DOM lib)
type AnyRec = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: any) => void) | null;
  onerror: ((e: any) => void) | null;
  onend: (() => void) | null;
};

export function useSpeech() {
  const [supported, setSupported] = useState(false);
  const [ttsSupported, setTtsSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [voices, setVoices] = useState<SpeechVoice[]>([]);

  const recRef = useRef<AnyRec | null>(null);
  const finalRef = useRef("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const w = window as any;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    setSupported(!!SR);
    setTtsSupported(!!w.speechSynthesis);

    if (w.speechSynthesis) {
      const load = () => {
        const list = w.speechSynthesis.getVoices() as SpeechSynthesisVoice[];
        // prefer English voices, Indian English first
        const en = list
          .filter((v) => v.lang?.toLowerCase().startsWith("en"))
          .sort((a, b) => (a.lang === "en-IN" ? -1 : 0) - (b.lang === "en-IN" ? -1 : 0));
        setVoices((en.length ? en : list).map((v) => ({ name: v.name, lang: v.lang })));
      };
      load();
      w.speechSynthesis.onvoiceschanged = load;
    }
  }, []);

  const speak = useCallback(
    (text: string, voiceName?: string, onEnd?: () => void) => {
      const w = window as any;
      if (!w.speechSynthesis) {
        onEnd?.();
        return;
      }
      w.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "en-IN";
      u.rate = 0.98;
      const all = w.speechSynthesis.getVoices() as SpeechSynthesisVoice[];
      const picked = voiceName ? all.find((v) => v.name === voiceName) : all.find((v) => v.lang === "en-IN");
      if (picked) u.voice = picked;
      u.onstart = () => setSpeaking(true);
      u.onend = () => {
        setSpeaking(false);
        onEnd?.();
      };
      w.speechSynthesis.speak(u);
    },
    [],
  );

  const cancelSpeak = useCallback(() => {
    const w = window as any;
    w.speechSynthesis?.cancel();
    setSpeaking(false);
  }, []);

  const startListening = useCallback(() => {
    if (typeof window === "undefined") return;
    const w = window as any;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) return;
    const rec: AnyRec = new SR();
    rec.lang = "en-IN";
    rec.continuous = true;
    rec.interimResults = true;
    finalRef.current = "";
    setTranscript("");
    rec.onresult = (e: any) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const chunk = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalRef.current += chunk + " ";
        else interim += chunk;
      }
      setTranscript((finalRef.current + interim).trim());
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
  }, []);

  const stopListening = useCallback(() => {
    recRef.current?.stop();
    setListening(false);
  }, []);

  return {
    supported,
    ttsSupported,
    listening,
    speaking,
    transcript,
    setTranscript,
    voices,
    speak,
    cancelSpeak,
    startListening,
    stopListening,
  };
}

/** Count common interview filler words in a transcript. */
export function countFillers(text: string): number {
  const fillers = ["umm", "um", "uh", "like", "basically", "you know", "actually", "literally"];
  const lower = ` ${text.toLowerCase()} `;
  return fillers.reduce((n, f) => {
    const matches = lower.match(new RegExp(`\\b${f.replace(/ /g, "\\s+")}\\b`, "g"));
    return n + (matches ? matches.length : 0);
  }, 0);
}
