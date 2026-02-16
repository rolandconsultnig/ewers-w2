import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type SpeechRecognitionType = typeof window extends { SpeechRecognition: infer T }
  ? T
  : typeof window extends { webkitSpeechRecognition: infer WT }
    ? WT
    : any;

type SpeechRecognitionEventType = any;

type UseSpeechRecognitionOptions = {
  lang?: string;
  continuous?: boolean;
  interimResults?: boolean;
  onFinalResult?: (text: string) => void;
};

export function useSpeechRecognition(options: UseSpeechRecognitionOptions = {}) {
  const { lang = "en-NG", continuous = true, interimResults = true, onFinalResult } = options;

  const recognitionRef = useRef<any>(null);
  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [finalTranscript, setFinalTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const SpeechRecognitionCtor: SpeechRecognitionType =
      (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      setIsSupported(false);
      return;
    }

    setIsSupported(true);

    const recognition = new (SpeechRecognitionCtor as any)();
    recognitionRef.current = recognition;

    recognition.continuous = continuous;
    recognition.interimResults = interimResults;
    recognition.lang = lang;

    recognition.onstart = () => {
      setError(null);
      setIsListening(true);
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimTranscript("");
    };

    recognition.onerror = (e: any) => {
      setError(e?.error ?? "speech_recognition_error");
      setIsListening(false);
      setInterimTranscript("");
    };

    recognition.onresult = (event: SpeechRecognitionEventType) => {
      let interim = "";
      let finalText = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result?.[0]?.transcript ?? "";
        if (result.isFinal) finalText += transcript;
        else interim += transcript;
      }

      if (interim) setInterimTranscript(interim.trim());

      if (finalText) {
        const cleaned = finalText.trim();
        setFinalTranscript((prev) => (prev ? `${prev} ${cleaned}` : cleaned));
        setInterimTranscript("");
        onFinalResult?.(cleaned);
      }
    };

    return () => {
      try {
        recognition.onstart = null;
        recognition.onend = null;
        recognition.onerror = null;
        recognition.onresult = null;
        recognition.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    };
  }, [continuous, interimResults, lang, onFinalResult]);

  const start = useCallback(() => {
    setError(null);
    setInterimTranscript("");
    try {
      recognitionRef.current?.start();
    } catch (e: any) {
      setError(e?.message ?? "speech_recognition_start_failed");
    }
  }, []);

  const stop = useCallback(() => {
    try {
      recognitionRef.current?.stop();
    } catch {
      // ignore
    }
  }, []);

  const reset = useCallback(() => {
    setError(null);
    setInterimTranscript("");
    setFinalTranscript("");
  }, []);

  const value = useMemo(
    () => ({
      isSupported,
      isListening,
      interimTranscript,
      finalTranscript,
      error,
      start,
      stop,
      reset,
    }),
    [error, finalTranscript, interimTranscript, isListening, isSupported, reset, start, stop]
  );

  return value;
}
