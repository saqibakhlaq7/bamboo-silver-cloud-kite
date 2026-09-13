import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "flex h-11 w-full rounded-md border border-border bg-surface px-3 text-sm text-fg",
        "placeholder:text-faint outline-none transition-[border-color,box-shadow] duration-150",
        "focus-visible:border-border-strong focus-visible:ring-2 focus-visible:ring-accent/40",
        "disabled:opacity-40",
        className,
      )}
      {...props}
    />
  );
}
