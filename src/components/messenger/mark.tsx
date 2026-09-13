import { cn } from "@/lib/utils";

export function VesperMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "grid place-items-center rounded-full bg-accent text-accent-fg",
        className,
      )}
      aria-hidden="true"
    >
      <svg viewBox="0 0 32 32" fill="none" className="size-[58%]">
        <path
          d="M7 11.2c0-2.1 1.7-3.7 3.8-3.7h10.4c2.1 0 3.8 1.6 3.8 3.7v7.1c0 2.1-1.7 3.7-3.8 3.7h-5.1L10.8 25v-3h-.1C8.7 22 7 20.4 7 18.3v-7.1Z"
          fill="currentColor"
        />
      </svg>
    </span>
  );
}
