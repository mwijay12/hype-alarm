import React from "react";
import { cn } from "../../lib/utils";

export interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  hoverable?: boolean;
  interactive?: boolean;
  glow?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className,
  hoverable = false,
  interactive = false,
  glow = false,
  ...props
}) => {
  const isHoverable = hoverable || interactive;
  return (
    <div
      className={cn(
        "bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-blue-500/15 dark:border-blue-500/25 rounded-3xl p-6 shadow-glass dark:shadow-[0_8px_30px_rgba(0,0,0,0.45)] text-slate-900 dark:text-slate-100 transition-all duration-300 relative overflow-hidden",
        isHoverable && "hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-500/10 dark:hover:shadow-blue-500/20 hover:border-blue-400/30 dark:hover:border-blue-400/40 cursor-pointer",
        glow && "ring-2 ring-blue-500/20 dark:ring-blue-500/30 border-blue-500/40 shadow-glow-active",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
