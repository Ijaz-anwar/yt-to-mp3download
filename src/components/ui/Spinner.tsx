import React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/format";

export interface SpinnerProps extends React.SVGAttributes<SVGSVGElement> {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Spinner({ size = "md", className, ...props }: SpinnerProps) {
  const sizeMap = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  return (
    <Loader2
      className={cn("animate-spin text-indigo-600", sizeMap[size], className)}
      {...props}
    />
  );
}
