import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * The Omi Chat mark. `variant="mark"` returns the bare glyph, `"full"` adds the
 * wordmark, `"glass"` puts it inside a floating glass tile.
 */
export function Logo({
  variant = "full",
  size = 36,
  className,
  priority = false,
}: {
  variant?: "mark" | "full" | "glass";
  size?: number;
  className?: string;
  priority?: boolean;
}) {
  const mark = (
    <Image
      src="/brand/omi-chat-logo.png"
      alt="Omi Chat logo"
      width={size}
      height={size}
      priority={priority}
      className="select-none object-contain drop-shadow-[0_6px_20px_rgba(42,103,204,0.22)]"
      draggable={false}
    />
  );

  if (variant === "mark") {
    return <span className={cn("inline-flex", className)}>{mark}</span>;
  }

  if (variant === "glass") {
    return (
      <span
        className={cn(
          "glass glass-sheen inline-flex items-center gap-3 rounded-2xl px-3.5 py-2.5",
          className,
        )}
      >
        {mark}
        <span className="font-display text-xl leading-none tracking-tight text-fg">
          Omi Chat
        </span>
      </span>
    );
  }

  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      {mark}
      <span className="font-display text-2xl leading-none tracking-tight text-fg">
        Omi<span className="text-gradient-brand ml-0.5">Chat</span>
      </span>
    </span>
  );
}