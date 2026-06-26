"use client";

import Image from "next/image";
import { X } from "lucide-react";
import { useCallback, useEffect, useId, useRef } from "react";

export type LandingLightboxImage = {
  src: string;
  alt: string;
  caption?: string;
};

type LandingImageLightboxProps = {
  image: LandingLightboxImage | null;
  onClose: () => void;
  closeLabel: string;
};

export function LandingImageLightbox({
  image,
  onClose,
  closeLabel,
}: LandingImageLightboxProps) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (!image) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [image, handleKeyDown]);

  if (!image) return null;

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 sm:p-6"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative flex max-h-full max-w-full flex-col items-center gap-3 outline-none"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label={closeLabel}
          className="absolute -top-2 right-0 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:-right-2 sm:-top-2"
        >
          <X className="h-6 w-6" aria-hidden />
        </button>

        <p id={titleId} className="sr-only">
          {image.alt}
        </p>

        <div className="overflow-hidden rounded-lg shadow-2xl ring-1 ring-white/10">
          <Image
            src={image.src}
            alt={image.alt}
            width={1600}
            height={1000}
            sizes="(max-width: 768px) 95vw, 1200px"
            className="h-auto max-h-[80vh] w-auto max-w-[min(95vw,1200px)] object-contain"
            priority
          />
        </div>

        {image.caption ? (
          <p className="max-w-[min(95vw,1200px)] text-center text-sm text-white/80">
            {image.caption}
          </p>
        ) : null}
      </div>
    </div>
  );
}
