import * as React from "react";

type SpeechRecognitionResultLike = {
  isFinal: boolean;
  0?: { transcript?: string };
};
type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
};
type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getSpeechRecognition(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function useLiveTranscription(active: boolean, lang = "th-TH") {
  const [finalText, setFinalText] = React.useState("");
  const [interimText, setInterimText] = React.useState("");
  const [supported, setSupported] = React.useState(false);

  React.useEffect(() => {
    setSupported(!!getSpeechRecognition());
  }, []);

  React.useEffect(() => {
    if (!active) {
      setInterimText("");
      return;
    }

    const SR = getSpeechRecognition();
    if (!SR) return;

    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = lang;

    rec.onresult = (event: SpeechRecognitionEventLike) => {
      let interim = "";
      let finals = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const chunk = event.results[i]?.[0]?.transcript ?? "";
        if (event.results[i]?.isFinal) finals += chunk;
        else interim += chunk;
      }
      if (finals) {
        setFinalText((prev) => `${prev}${finals}`.trim());
      }
      setInterimText(interim);
    };

    rec.onerror = () => {
      // Ignore transient mic-busy errors while MediaRecorder holds the stream
    };

    rec.onend = () => {
      if (active) {
        try {
          rec.start();
        } catch {
          // restart loop when browser auto-stops
        }
      }
    };

    try {
      rec.start();
    } catch {
      // Speech + MediaRecorder may conflict on some devices
    }

    return () => {
      try {
        rec.stop();
      } catch {
        // ignore
      }
    };
  }, [active, lang]);

  const fullText = [finalText, interimText].filter(Boolean).join(" ").trim();

  const reset = React.useCallback(() => {
    setFinalText("");
    setInterimText("");
  }, []);

  const setManualText = React.useCallback((text: string) => {
    setFinalText(text);
    setInterimText("");
  }, []);

  return { finalText, interimText, fullText, supported, reset, setManualText };
}
