import { createContext, ReactNode, useContext, useMemo, useState } from "react";

type VoiceA11yContextValue = {
  isVoiceControlEnabled: boolean;
  setIsVoiceControlEnabled: (enabled: boolean) => void;
  isReadAloudEnabled: boolean;
  setIsReadAloudEnabled: (enabled: boolean) => void;
  lastCommand: string | null;
  setLastCommand: (text: string | null) => void;
  speak: (text: string) => void;
  stopSpeaking: () => void;
};

const VoiceA11yContext = createContext<VoiceA11yContextValue | null>(null);

export function VoiceA11yProvider({ children }: { children: ReactNode }) {
  const [isVoiceControlEnabled, setIsVoiceControlEnabled] = useState(false);
  const [isReadAloudEnabled, setIsReadAloudEnabled] = useState(false);
  const [lastCommand, setLastCommand] = useState<string | null>(null);

  const speak = (text: string) => {
    if (typeof window === "undefined") return;
    if (!("speechSynthesis" in window)) return;
    if (!text.trim()) return;

    try {
      window.speechSynthesis.cancel();
      const cleaned = text
        .replace(/\s+/g, " ")
        .replace(/\u00a0/g, " ")
        .trim();

      const chunkSize = 220;
      const chunks: string[] = [];
      for (let i = 0; i < cleaned.length; i += chunkSize) {
        chunks.push(cleaned.slice(i, i + chunkSize));
      }

      let idx = 0;
      const speakNext = () => {
        if (idx >= chunks.length) return;
        const u = new SpeechSynthesisUtterance(chunks[idx]);
        u.lang = "en-NG";
        u.rate = 1;
        u.pitch = 1;
        u.onend = () => {
          idx += 1;
          speakNext();
        };
        window.speechSynthesis.speak(u);
      };

      speakNext();
    } catch {
      // ignore
    }
  };

  const stopSpeaking = () => {
    if (typeof window === "undefined") return;
    if (!("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
    } catch {
      // ignore
    }
  };

  const value = useMemo(
    () => ({
      isVoiceControlEnabled,
      setIsVoiceControlEnabled,
      isReadAloudEnabled,
      setIsReadAloudEnabled,
      lastCommand,
      setLastCommand,
      speak,
      stopSpeaking,
    }),
    [isReadAloudEnabled, isVoiceControlEnabled, lastCommand]
  );

  return <VoiceA11yContext.Provider value={value}>{children}</VoiceA11yContext.Provider>;
}

export function useVoiceA11y() {
  const ctx = useContext(VoiceA11yContext);
  if (!ctx) {
    throw new Error("useVoiceA11y must be used within a VoiceA11yProvider");
  }
  return ctx;
}
