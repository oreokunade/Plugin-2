import Image from "next/image";

interface LogoProps {
  /** "full" = wordmark + mark (default). "mark" = icon only. */
  variant?: "full" | "mark";
  height?: number;
  className?: string;
}

export function Logo({ variant = "full", height = 28, className = "" }: LogoProps) {
  if (variant === "mark") {
    return (
      <Image
        src="/logo-mark.png"
        alt="Plugin"
        width={height}
        height={height}
        className={`rounded-lg ${className}`}
        priority
      />
    );
  }

  // Full logo: maintain aspect ratio (original ~2098×594 ≈ 3.53:1)
  const width = Math.round(height * 3.53);
  return (
    <Image
      src="/logo.png"
      alt="Plugin"
      width={width}
      height={height}
      className={className}
      priority
    />
  );
}
