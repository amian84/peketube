import { PEKETUBE_GITHUB_URL } from "@/lib/landing/constants";

/** Cinta diagonal estilo «Fork me on GitHub» (esquina superior derecha). */
export function ForkMeOnGitHub() {
  return (
    <a
      href={PEKETUBE_GITHUB_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Fork me on GitHub"
      className="group fixed right-0 top-0 z-[60] h-[132px] w-[132px] overflow-hidden sm:h-[150px] sm:w-[150px]"
    >
      <span className="absolute right-[-44px] top-[30px] w-[176px] rotate-45 bg-[#24292f] py-1.5 text-center text-[10px] font-semibold tracking-wide text-white shadow-md transition group-hover:bg-[#1b1f23] sm:right-[-36px] sm:top-[32px] sm:w-[200px] sm:py-2 sm:text-xs">
        Fork me on GitHub
      </span>
    </a>
  );
}
