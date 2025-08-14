// src/lib/useSpeech.ts
import { useCallback, useEffect, useRef } from "react";

type ResultHandler = (text: string) => void | Promise<void>;

export default function useSpeechRecognition(onResult: ResultHandler) {
  const recRef = useRef<any>(null);
  const supported =
    typeof window !== "undefined" &&
    ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  useEffect(() => {
    if (!supported) return;
    const Ctor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const rec = new Ctor();
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = async (e: any) => {
      try {
        const txt = e.results && e.results[0] && e.results[0][0] && e.results[0][0].transcript;
        if (txt) await onResult(txt);
      } catch {
        // ignore handler errors
      } finally {
        try { rec.stop(); } catch {}
      }
    };
    rec.onerror = () => {};
    recRef.current = rec;
    return () => {
      try { rec.stop(); } catch {}
      recRef.current = null;
    };
  }, [onResult, supported]);

  const start = useCallback(() => {
    try { recRef.current && recRef.current.start(); } catch {}
  }, []);

  const stop = useCallback(() => {
    try { recRef.current && recRef.current.stop(); } catch {}
  }, []);

  return { start, stop, supported: !!supported };
}
