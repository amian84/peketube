import Image from "next/image";

/** Logo grande para la landing (icono PWA + nombre). */
export function LandingHeroLogo() {
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
      <Image
        src="/icons/icon-512.png"
        alt=""
        width={112}
        height={112}
        className="h-24 w-24 shrink-0 rounded-2xl shadow-lg sm:h-28 sm:w-28"
        priority
      />
      <div className="text-center sm:text-left">
        <p className="text-4xl font-bold tracking-tight text-[#0F0F0F] sm:text-5xl">
          PekeTube
        </p>
        <p className="mt-1 text-sm font-medium text-[#606060] sm:text-base">
          YouTube familiar · control parental
        </p>
      </div>
    </div>
  );
}
