/** Enlaces apple-touch-startup-image (OQ-09-004 A). */
const SPLASH_LINKS: { href: string; media: string }[] = [
  {
    href: "/splash/apple-splash-640x1136.png",
    media:
      "(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)",
  },
  {
    href: "/splash/apple-splash-750x1334.png",
    media:
      "(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)",
  },
  {
    href: "/splash/apple-splash-828x1792.png",
    media:
      "(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)",
  },
  {
    href: "/splash/apple-splash-1125x2436.png",
    media:
      "(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
  },
  {
    href: "/splash/apple-splash-1242x2688.png",
    media:
      "(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
  },
  {
    href: "/splash/apple-splash-1284x2778.png",
    media:
      "(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
  },
];

export function AppleSplashHead() {
  return (
    <>
      <link rel="apple-touch-icon" href="/icons/apple-touch-icon-180.png" />
      {SPLASH_LINKS.map(({ href, media }) => (
        <link
          key={href}
          rel="apple-touch-startup-image"
          href={href}
          media={media}
        />
      ))}
    </>
  );
}
