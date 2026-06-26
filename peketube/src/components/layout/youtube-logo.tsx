import { cn } from "@/lib/utils";

/** Rojo PekeTube (distinto del #FF0000 de YouTube). */
const PEKETUBE_RED = "#E62117";

type YoutubeLogoProps = {
  className?: string;
};

/** Logo horizontal estilo YouTube: icono rojo + «PekeTube» + «ES». */
export function YoutubeLogo({ className }: YoutubeLogoProps) {
  return (
    <svg
      className={cn("h-5 w-auto text-[var(--yt-text-primary)] sm:h-6", className)}
      viewBox="0 0 112 24"
      aria-hidden
    >
      <rect x="0" y="4" width="32" height="16" rx="3.5" fill={PEKETUBE_RED} />
      <polygon points="11.5,8 11.5,16 19.5,12" fill="#FFFFFF" />
      <text
        x="38"
        y="17"
        fill="currentColor"
        fontSize="13"
        fontWeight="700"
        fontFamily="var(--font-sans), Roboto, Arial, sans-serif"
        letterSpacing="-0.04em"
      >
        PekeTube
        <tspan
          fontSize="7"
          fontWeight="600"
          dx="2"
          dy="-8"
          fill="var(--yt-text-secondary)"
        >
          ES
        </tspan>
      </text>
    </svg>
  );
}
