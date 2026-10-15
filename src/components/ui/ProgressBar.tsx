import React from "react";
import { cn } from "@/lib/utils/format";

export interface ProgressBarProps {
  progress?: number; // 0 to 100
  indeterminate?: boolean;
  label?: string;
  sublabel?: string;
  className?: string;
}

export function ProgressBar({
  progress = 0,
  indeterminate = false,
  label,
  sublabel,
  className,
}: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, progress));

  return (
    <div className={cn("w-full space-y-1.5", className)}>
      {(label || sublabel) && (
        <div className="flex justify-between items-center text-xs">
          {label && <span className="font-semibold text-slate-700">{label}</span>}
          {sublabel ? (
            <span className="text-slate-500">{sublabel}</span>
          ) : !indeterminate ? (
            <span className="font-medium text-slate-600">{Math.round(clamped)}%</span>
          ) : null}
        </div>
      )}
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 border border-slate-200/60">
        {indeterminate ? (
          <div className="h-full w-1/3 rounded-full bg-indigo-600 animate-[indeterminate_1.5s_infinite_linear]" />
        ) : (
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-600 transition-all duration-300 ease-out"
            style={{ width: `${clamped}%` }}
          />
        )}
      </div>
    </div>
  );
}
