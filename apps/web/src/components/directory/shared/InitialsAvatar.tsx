import type { CSSProperties } from "react";
import { OptimizedImage } from "#/components/site/optimized-image";

const TITLE_PREFIXES = [
  "dr.",
  "dr",
  "mr.",
  "mr",
  "mrs.",
  "mrs",
  "ms.",
  "ms",
  "prof.",
  "prof",
  "miss",
  "rev",
  "rev.",
];

function getInitials(name: string): string {
  const words = name
    .trim()
    .split(/\s+/)
    .map((word) => word.replace(/[().]/g, ""))
    .filter((word) => word.length > 0 && !TITLE_PREFIXES.includes(word.toLowerCase()));

  if (words.length === 0) return "";
  if (words.length === 1) return words[0]!.charAt(0).toUpperCase();
  return `${words[0]!.charAt(0)}${words[words.length - 1]!.charAt(0)}`.toUpperCase();
}

export interface InitialsAvatarProps {
  name: string;
  size?: number;
  ringColor?: string;
  photoUrl?: string;
  colorClassName?: string;
  className?: string;
}

export function InitialsAvatar({
  name,
  size = 48,
  ringColor,
  photoUrl,
  colorClassName = "bg-indigo-100 text-indigo-700",
  className = "",
}: InitialsAvatarProps) {
  const style: CSSProperties = {
    width: size,
    height: size,
    fontSize: Math.max(11, Math.round(size * 0.36)),
  };
  const ringClass = ringColor ?? "";

  if (photoUrl) {
    return (
      <div
        className={`shrink-0 overflow-hidden rounded-full ${ringClass} ${className}`}
        style={style}
        aria-hidden="true"
      >
        <OptimizedImage
          src={photoUrl}
          alt=""
          width={size}
          height={size}
          sizes={`${size}px`}
          maxWidth={512}
          className="h-full w-full object-cover object-top"
        />
      </div>
    );
  }

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full font-bold ${colorClassName} ${ringClass} ${className}`}
      style={style}
      aria-hidden="true"
    >
      {getInitials(name)}
    </div>
  );
}
