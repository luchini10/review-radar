type BrandMarkProps = {
  className?: string;
  inverted?: boolean;
};

export function BrandMark({
  className = "h-10 w-10",
  inverted = false,
}: BrandMarkProps) {
  const foreground = inverted ? "#f7f8f2" : "#0c1b16";
  const signal = "#c8f46c";

  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 48 48"
    >
      <rect fill={foreground} height="48" rx="15" width="48" />
      <circle cx="24" cy="24" r="13" stroke={inverted ? "#39554b" : "#435b52"} strokeWidth="1.5" />
      <circle cx="24" cy="24" r="7.5" stroke={inverted ? "#527166" : "#647970"} strokeWidth="1.5" />
      <path
        d="M24 24 34.8 15.2A14 14 0 0 1 38 24H24Z"
        fill={signal}
        fillOpacity=".95"
      />
      <path d="M24 8v4M8 24h4" stroke={signal} strokeLinecap="round" strokeWidth="1.8" />
      <circle cx="24" cy="24" fill={signal} r="2.75" />
    </svg>
  );
}
