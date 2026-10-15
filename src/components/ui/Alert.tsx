import React from "react";
import { Info, CheckCircle2, AlertTriangle, AlertCircle, X } from "lucide-react";
import { cn } from "@/lib/utils/format";

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "info" | "success" | "warning" | "error";
  title?: string;
  onDismiss?: () => void;
}

export function Alert({
  variant = "info",
  title,
  children,
  className,
  onDismiss,
  ...props
}: AlertProps) {
  const configs = {
    info: {
      container: "bg-indigo-50/70 border-indigo-200 text-indigo-950",
      icon: <Info className="w-5 h-5 text-indigo-600 shrink-0" />,
      titleColor: "text-indigo-900 font-semibold",
    },
    success: {
      container: "bg-emerald-50/70 border-emerald-200 text-emerald-950",
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />,
      titleColor: "text-emerald-900 font-semibold",
    },
    warning: {
      container: "bg-amber-50/70 border-amber-200 text-amber-950",
      icon: <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />,
      titleColor: "text-amber-900 font-semibold",
    },
    error: {
      container: "bg-rose-50/70 border-rose-200 text-rose-950",
      icon: <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />,
      titleColor: "text-rose-900 font-semibold",
    },
  };

  const current = configs[variant];

  return (
    <div
      role="alert"
      className={cn(
        "relative flex gap-3.5 rounded-xl border p-4 text-sm leading-relaxed transition-all",
        current.container,
        className
      )}
      {...props}
    >
      <div className="mt-0.5">{current.icon}</div>
      <div className="flex-1 space-y-1">
        {title && <h5 className={current.titleColor}>{title}</h5>}
        <div className="text-slate-700 text-xs sm:text-sm">{children}</div>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          type="button"
          aria-label="Dismiss alert"
          className="text-slate-400 hover:text-slate-700 transition-colors p-1"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
