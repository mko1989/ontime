import { useEffect, useRef } from 'react';
import useCustomFields from '../hooks-query/useCustomFields';
import { useGlobalCustomFields } from './useSocket';

export const useTTS = () => {
  const { data: customFields } = useCustomFields();
  const globalCustomFields = useGlobalCustomFields();
  const previousValuesRef = useRef<Record<string, number>>({});

  useEffect(() => {
    if (!customFields || !globalCustomFields) return;

    Object.entries(customFields).forEach(([key, field]) => {
      if (field.isTTS) {
        const value = globalCustomFields[key];
        if (typeof value === 'string') {
          const seconds = parseToSeconds(value);
          const threshold = field.ttsThreshold ?? 10;

          if (seconds !== null) {
            const prevSeconds = previousValuesRef.current[key];

            // Check if within threshold and changed (integer check)
            // We also ensure we don't speak if the value jumps from null/undefined to initial value unless it is small
            // But main logic is tracking changes.
            if (seconds <= threshold && seconds !== prevSeconds) {
              // Cancel current speech if any to avoid queueing
              window.speechSynthesis.cancel();

              const utterance = new SpeechSynthesisUtterance(String(seconds));
              // Increase rate slightly to ensure it doesn't lag
              utterance.rate = 1.2;

              if (field.ttsVoice) {
                const voice = window.speechSynthesis.getVoices().find((v) => v.name === field.ttsVoice);
                if (voice) {
                  utterance.voice = voice;
                }
              }

              window.speechSynthesis.speak(utterance);
            }

            previousValuesRef.current[key] = seconds;
          }
        }
      }
    });
  }, [globalCustomFields, customFields]);
};

function parseToSeconds(val: string): number | null {
  const cleanVal = val.trim();
  if (!cleanVal) return null;

  // Check if it looks like time or number
  // Allow format: HH:mm:ss:ff, HH:mm:ss, mm:ss, ss
  const parts = cleanVal.split(':').map((part) => {
    const num = Number(part);
    return isNaN(num) ? null : num;
  });

  if (parts.includes(null)) return null;

  // TypeScript check for non-null numbers
  const safeParts = parts as number[];

  let totalSeconds = 0;

  if (safeParts.length === 1) {
    totalSeconds = safeParts[0];
  } else if (safeParts.length === 2) {
    totalSeconds = safeParts[0] * 60 + safeParts[1];
  } else if (safeParts.length === 3) {
    totalSeconds = safeParts[0] * 3600 + safeParts[1] * 60 + safeParts[2];
  } else if (safeParts.length === 4) {
    // Ignore frames (parts[3]) for total seconds calculation
    totalSeconds = safeParts[0] * 3600 + safeParts[1] * 60 + safeParts[2];
  } else {
    return null;
  }

  return Math.floor(totalSeconds);
}

