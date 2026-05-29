"use client";

import type { MouseEvent } from "react";
import { useCallback, useRef } from "react";

export type UseLongPressOptions = {
  /** Duración total para disparar `onLongPress` (ms). */
  ms: number;
  /** Si se define, intenta `navigator.vibrate` una vez al llegar a este tiempo (ms). */
  vibrateAtMs?: number;
  onLongPress: () => void;
};

/**
 * Long-press para pointer (mouse/touch). Cancela al soltar, salir o cancelar pointer.
 */
export function useLongPress(options: UseLongPressOptions) {
  const { ms, vibrateAtMs, onLongPress } = options;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const vibrateRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = useCallback(() => {
    if (timerRef.current != null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (vibrateRef.current != null) {
      clearTimeout(vibrateRef.current);
      vibrateRef.current = null;
    }
  }, []);

  const onPointerDown = useCallback(() => {
    clear();
    if (
      vibrateAtMs != null &&
      typeof navigator !== "undefined" &&
      typeof navigator.vibrate === "function"
    ) {
      vibrateRef.current = setTimeout(() => {
        try {
          navigator.vibrate(40);
        } catch {
          /* noop */
        }
      }, vibrateAtMs);
    }
    timerRef.current = setTimeout(() => {
      clear();
      onLongPress();
    }, ms);
  }, [clear, ms, onLongPress, vibrateAtMs]);

  const onPointerEnd = useCallback(() => {
    clear();
  }, [clear]);

  return {
    onPointerDown,
    onPointerUp: onPointerEnd,
    onPointerLeave: onPointerEnd,
    onPointerCancel: onPointerEnd,
    onContextMenu: (e: MouseEvent) => e.preventDefault(),
  };
}
