import { BRAND } from "@/lib/brand";

/**
 * The wordmark, drawn as text rather than an image so it stays sharp at every
 * size and rebrands from one file. If a client supplies real logo artwork,
 * swap the two spans for an <img src="/logo.svg" /> and keep the sizes.
 */

const SIZES = {
  sm: "text-lg",
  md: "text-3xl",
  lg: "text-5xl",
} as const;

export function Logo({
  size = "md",
  className = "",
}: {
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return (
    <span
      dir="ltr"
      aria-label={`${BRAND.wordmarkTop} ${BRAND.wordmarkBottom}`}
      className={`inline-flex flex-col items-center leading-none text-ink ${SIZES[size]} ${className}`}
    >
      <span className="font-display tracking-[0.03em]">{BRAND.wordmarkTop}</span>
      {/* indent cancels the trailing letter-space so the word stays centred */}
      <span className="mt-[0.4em] font-display text-[0.26em] tracking-[0.42em] indent-[0.42em]">
        {BRAND.wordmarkBottom}
      </span>
    </span>
  );
}
