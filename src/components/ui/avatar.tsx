"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { cn, hueFromString, initials } from "@/lib/utils";

const SIZES = {
  xs: "size-7 text-[0.6rem]",
  sm: "size-9 text-xs",
  md: "size-11 text-sm",
  lg: "size-14 text-base",
  xl: "size-20 text-xl",
  "2xl": "size-28 text-3xl",
} as const;

export function Avatar({
  src,
  name,
  id,
  size = "md",
  online,
  presence = "offline",
  ring = false,
  className,
}: {
  src?: string | null;
  name?: string | null;
  id?: string;
  size?: keyof typeof SIZES;
  online?: boolean;
  presence?: "online" | "away" | "busy" | "offline";
  ring?: boolean;
  className?: string;
}) {
  const [broken, setBroken] = useState(false);
  const hue = useMemo(() => hueFromString(id ?? name ?? "omi"), [id, name]);
  const dot = {
    online: "bg-mint-400",
    away: "bg-gold-400",
    busy: "bg-rust-400",
    offline: "bg-ink-500",
  }[presence];
  const isOnline = online ?? presence === "online";

  return (
    <span className={cn("relative inline-flex shrink-0", className)}>
      <span
        className={cn(
          "grid overflow-hidden rounded-full font-semibold text-fg select-none",
          SIZES[size],
          ring &&
            "ring-2 ring-brand-400/60 ring-offset-2 ring-offset-ink-900 transition-all duration-300",
        )}
        style={
          src && !broken
            ? undefined
            : {
                background: `linear-gradient(140deg, hsl(${hue} 72% 58%), hsl(${(hue + 58) % 360} 68% 42%))`,
              }
        }
      >
        {src && !broken ? (
          <Image
            src={src}
            alt={name ?? "Avatar"}
            width={160}
            height={160}
            unoptimized
            onError={() => setBroken(true)}
            className="size-full object-cover"
          />
        ) : (
          <span className="m-auto drop-shadow-sm">{initials(name)}</span>
        )}
      </span>

      {presence !== "offline" && (
        <span
          aria-label={presence}
          className={cn(
            "absolute right-0 bottom-0 size-3 rounded-full ring-[2.5px] ring-ink-900",
            dot,
            isOnline && "shadow-[0_0_10px_currentColor]",
          )}
        />
      )}
      {presence === "offline" && online === false && (
        <span className="absolute right-0 bottom-0 size-3 rounded-full bg-ink-500 ring-[2.5px] ring-ink-900" />
      )}
    </span>
  );
}

/** Overlapping avatars for group chats. */
export function AvatarStack({
  people,
  max = 3,
  size = "sm",
}: {
  people: Array<{ uid: string; displayName: string; avatarUrl?: string | null }>;
  max?: number;
  size?: keyof typeof SIZES;
}) {
  const shown = people.slice(0, max);
  const rest = people.length - shown.length;
  return (
    <span className="flex -space-x-2.5">
      {shown.map((p) => (
        <Avatar
          key={p.uid}
          id={p.uid}
          name={p.displayName}
          src={p.avatarUrl}
          size={size}
          className="rounded-full ring-2 ring-ink-850 transition-transform duration-300 hover:z-10 hover:-translate-y-0.5"
        />
      ))}
      {rest > 0 && (
        <span
          className={cn(
            "grid place-items-center rounded-full bg-fg/10 font-semibold text-fg ring-2 ring-ink-850",
            SIZES[size],
          )}
        >
          +{rest}
        </span>
      )}
    </span>
  );
}