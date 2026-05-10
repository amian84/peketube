import { cn } from "@/lib/utils";

type YoutubeLogoProps = {
  className?: string;
};

/** Logo estilo YouTube (OQ-03-001 B) — variación mínima; icono final en prompt 09. */
export function YoutubeLogo({ className }: YoutubeLogoProps) {
  return (
    <svg
      className={cn("h-5 w-[4.5rem] sm:h-6 sm:w-[5.25rem]", className)}
      viewBox="0 0 86 20"
      aria-hidden
    >
      <rect x="0" y="0" width="86" height="20" rx="4" fill="#E60000" />
      <polygon points="26,5 26,15 34,10" fill="white" />
      <text
        x="40"
        y="14"
        fill="white"
        fontSize="10"
        fontFamily="system-ui, sans-serif"
        fontWeight="600"
        letterSpacing="-0.02em"
      >
        YouTube
      </text>
    </svg>
  );
}
