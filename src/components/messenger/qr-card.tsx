import { encodeQr } from "@/lib/messenger/qr";
import { cn } from "@/lib/utils";

export function QrCard({
  value,
  label,
  className,
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  const modules = encodeQr(value);
  const size = modules.length;
  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <div className="rounded-lg bg-fg p-3 text-bg">
        <svg
          viewBox={`0 0 ${size} ${size}`}
          className="size-44"
          role="img"
          aria-label={label ?? "QR code"}
        >
          {modules.map((row, y) =>
            row.map((on, x) =>
              on ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="currentColor" /> : null,
            ),
          )}
        </svg>
      </div>
      {label ? <p className="text-center text-xs text-muted">{label}</p> : null}
    </div>
  );
}
