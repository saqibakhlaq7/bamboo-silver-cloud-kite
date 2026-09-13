import { cn } from "@/lib/utils";

export function VesperMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={cn("text-accent", className)}
      aria-hidden="true"
    >
      <rect x="3" y="6" width="26" height="20" rx="5" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M5 9.5 L16 17.5 L27 9.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="23.5" cy="21" r="2.2" fill="currentColor" />
    </svg>
  );
}
