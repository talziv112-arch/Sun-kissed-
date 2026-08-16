// Brand logo (uploaded SUN-KISSED palm mark, background removed).
// The HTML <title> remains "Sunkissed"; this is the visual logo.
/* eslint-disable @next/next/no-img-element */
export default function Logo({
  className = "",
  height = 40,
  priority = false,
}: {
  className?: string;
  height?: number;
  priority?: boolean;
}) {
  return (
    <img
      src="/logo.png"
      alt="Sunkissed"
      height={height}
      style={{ height, width: "auto" }}
      className={className}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
    />
  );
}
