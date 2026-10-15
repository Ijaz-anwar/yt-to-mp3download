import React from "react";
import { cn } from "@/lib/utils/format";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "primary" | "success" | "warning" | "neutral" | "outline";
  size?: "sm" | "md";
}

export function Badge({
  className,
  variant = "default",
  size = "md",
  children,
  ...props
}: BadgeProps) {
  const variantStyles = {
    default: "bg-slate-100 text-slate-800 border-slate-200",
    primary: "bg-indigo-50 text-indigo-700 border-indigo-200/80",
    success: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
    warning: "bg-amber-50 text-amber-800 border-amber-200/80",
    neutral: "bg-slate-800 text-white border-transparent",
    outline: "bg-white text-slate-700 border-slate-300",
  };

  const sizeStyles = {
    sm: "text-[11px] px-2 py-0.5",
    md: "text-xs px-2.5 py-1 font-medium",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border font-medium uppercase tracking-wide",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
