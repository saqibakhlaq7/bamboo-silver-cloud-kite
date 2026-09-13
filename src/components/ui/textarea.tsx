import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "flex min-h-24 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg",
        "placeholder:text-faint outline-none transition-[border-color,box-shadow] duration-150",
        "focus-visible:border-border-strong focus-visible:ring-2 focus-visible:ring-accent/40",
        "disabled:opacity-40 resize-none",
        className,
      )}
      {...props}
    />
  );
}
