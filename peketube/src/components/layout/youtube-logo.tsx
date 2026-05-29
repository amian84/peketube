import { cn } from "@/lib/utils";

type YoutubeLogoProps = {
  className?: string;
};

/** Logo estilo YouTube (OQ-03-001 B) — variación mínima; icono final en prompt 09. */
export function YoutubeLogo({ className }: YoutubeLogoProps) {
  return (
    <svg
      className={cn("h-5 w-20 sm:h-6 sm:w-24", className)}
      viewBox="0 0 96 24"
      aria-hidden
    >
      <rect x="0" y="0" width="96" height="24" rx="5" fill="#E60000" />
      <polygon points="10,7 10,17 19,12" fill="white" />
      <text
        x="24"
        y="12"
        dominantBaseline="central"
        fill="white"
        fontSize="11"
        fontFamily="system-ui, sans-serif"
        fontWeight="700"
        letterSpacing="-0.02em"
      >
        PekeTube
      </text>
    </svg>
  );
}
