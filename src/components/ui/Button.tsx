import React, { forwardRef } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/format";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      disabled,
      children,
      leftIcon,
      rightIcon,
      type = "button",
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 select-none disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]";

    const variantStyles = {
      primary:
        "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-600/20 hover:shadow-md hover:shadow-indigo-600/25",
      secondary:
        "bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-200/80 shadow-xs",
      outline:
        "border border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50 text-slate-800 shadow-xs",
      ghost:
        "bg-transparent hover:bg-slate-100 text-slate-700 hover:text-slate-900",
      destructive:
        "bg-rose-600 hover:bg-rose-700 text-white shadow-sm shadow-rose-600/20",
    };

    const sizeStyles = {
      sm: "text-xs px-3 py-1.5 gap-1.5",
      md: "text-sm px-4 py-2.5 gap-2",
      lg: "text-base px-6 py-3.5 gap-2.5 font-semibold",
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden="true" />
        ) : (
          leftIcon && <span className="shrink-0">{leftIcon}</span>
        )}
        <span>{children}</span>
        {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = "Button";
