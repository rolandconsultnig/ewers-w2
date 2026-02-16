import { useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { useVoiceA11y } from "@/contexts/VoiceA11yContext";

function extractReadableText(root: Element | null) {
  if (!root) return "";
  const text = root.textContent ?? "";
  return text
    .replace(/\s+/g, " ")
    .replace(/\u00a0/g, " ")
    .trim();
}

function normalizeCommand(text: string) {
  return text
    .toLowerCase()
    .replace(/[.,!?]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export default function VoiceAssistant({ pageTitle }: { pageTitle: string }) {
  const [, navigate] = useLocation();
  const { logoutMutation } = useAuth();
  const {
    isVoiceControlEnabled,
    isReadAloudEnabled,
    setLastCommand,
    speak,
    stopSpeaking,
  } = useVoiceA11y();

  const readCurrentPage = () => {
    const main = typeof document !== "undefined" ? document.querySelector("main") : null;
    const content = extractReadableText(main);
    if (content) {
      speak(`${pageTitle}. ${content}`);
    } else {
      speak(pageTitle);
    }
  };

  const routeCommands = useMemo(
    () =>
      [
        { match: ["dashboard", "home"], path: "/dashboard" },
        { match: ["executive"], path: "/executive" },
        { match: ["situation room", "internal"], path: "/internal" },
        { match: ["conflict management", "crisis management", "crises"], path: "/crises" },
        { match: ["map", "nigeria map"], path: "/map" },
        { match: ["ai analysis", "analysis ai"], path: "/ai-analysis" },
        { match: ["predictive models", "ai prediction"], path: "/ai-prediction" },
        { match: ["response advisor", "ai advisor"], path: "/ai-advisor" },
        { match: ["alerts"], path: "/alerts" },
        { match: ["settings"], path: "/settings" },
      ],
    []
  );

  const recognition = useSpeechRecognition({
    lang: "en-NG",
    continuous: true,
    interimResults: true,
    onFinalResult: (raw) => {
      const command = normalizeCommand(raw);
      setLastCommand(command);

      if (!command) return;

      if (command === "stop" || command === "stop reading" || command === "silence") {
        stopSpeaking();
        return;
      }

      if (command === "read" || command === "read page" || command === "read screen") {
        readCurrentPage();
        return;
      }

      if (command === "logout" || command === "log out" || command === "sign out") {
        logoutMutation.mutate();
        speak("Logging out");
        return;
      }

      if (command.startsWith("go to ") || command.startsWith("open ") || command.startsWith("navigate to ")) {
        const target = command
          .replace(/^go to /, "")
          .replace(/^open /, "")
          .replace(/^navigate to /, "")
          .trim();

        const matched = routeCommands.find((c) => c.match.some((m) => target.includes(m)));
        if (matched) {
          navigate(matched.path);
          speak(`Opening ${target}`);
        } else {
          speak("Sorry, I did not recognize that destination.");
        }
        return;
      }

      if (command === "help" || command === "voice help" || command === "commands") {
        speak(
          "You can say: go to dashboard, open map, open AI analysis, open conflict management, settings, read page, stop reading, or logout."
        );
      }
    },
  });

  useEffect(() => {
    if (!isVoiceControlEnabled) {
      recognition.stop();
      return;
    }

    if (!recognition.isSupported) return;
    recognition.start();
    return () => recognition.stop();
  }, [isVoiceControlEnabled, recognition]);

  useEffect(() => {
    if (!isReadAloudEnabled) return;
    readCurrentPage();
  }, [isReadAloudEnabled, pageTitle]);

  useEffect(() => {
    return () => {
      recognition.stop();
      stopSpeaking();
    };
  }, [recognition, stopSpeaking]);

  return null;
}
