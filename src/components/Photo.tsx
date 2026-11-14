import Image from "next/image";
import { coverSizes, heroQuality, photoQuality } from "@/lib/image-sizes";
import { photo, type PhotoKey } from "@/config/photos";

/**
 * Art-directed stock photo. Every image is illustrative licensed stock (see src/config/photos.ts);
 * `note` renders a small honest label so it is never mistaken for a StoneCraft project.
 */
export function Photo({ k, className = "", sizes = "100vw", priority, fill = true, note, alt }: { k: PhotoKey; className?: string; sizes?: string; priority?: boolean; fill?: boolean; note?: boolean; alt?: string }) {
  const p = photo(k);
  return (
    <>
      {fill
        ? <Image src={p.src} alt={alt ?? p.alt} fill sizes={coverSizes(sizes)} quality={priority ? heroQuality : photoQuality} priority={priority} className={`object-cover ${className}`} />
        : <Image src={p.src} alt={alt ?? p.alt} width={p.width} height={p.height} sizes={sizes} quality={priority ? heroQuality : photoQuality} priority={priority} className={className} />}
      {note && <span className="stock-note pointer-events-none absolute bottom-2 right-3 z-[1]">Illustrative photo</span>}
    </>
  );
}

/** Square monogram: four tiles and their grout lines, one tile honed bronze. */
export function Monogram({ size = 28, light = true }: { size?: number; light?: boolean }) {
  const stone = light ? "#EEE9E1" : "#25292B";
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden className="shrink-0">
      <rect x="1" y="1" width="14" height="14" fill={stone} />
      <rect x="17" y="1" width="14" height="14" fill="#B89A70" />
      <rect x="1" y="17" width="14" height="14" fill={stone} opacity=".55" />
      <rect x="17" y="17" width="14" height="14" fill={stone} />
    </svg>
  );
}
