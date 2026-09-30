import React from "react";

export interface StatusDotProps {
  status: "active" | "inactive" | "warning" | "error";
  label?: string;
  size?: "sm" | "md" | "lg";
  pulse?: boolean;
  className?: string;
}

export const StatusDot: React.FC<StatusDotProps> = ({
  status,
  label,
  size = "md",
  pulse = true,
  className = "",
}) => {
  const sizeMap = {
    sm: "w-1.5 h-1.5",
    md: "w-2 h-2",
    lg: "w-2.5 h-2.5",
  };

  const pingSizeMap = {
    sm: "h-1.5 w-1.5",
    md: "h-2 w-2",
    lg: "h-2.5 w-2.5",
  };

  const colorMap = {
    active: {
      bg: "bg-emerald-500",
      ping: "bg-emerald-400",
      text: "text-emerald-700",
    },
    inactive: {
      bg: "bg-slate-400",
      ping: "bg-slate-300",
      text: "text-slate-500",
    },
    warning: {
      bg: "bg-amber-500",
      ping: "bg-amber-400",
      text: "text-amber-700",
    },
    error: {
      bg: "bg-red-500",
      ping: "bg-red-400",
      text: "text-red-700",
    },
  };

  const c = colorMap[status];

  return (
    <div className={`inline-flex items-center gap-1.5 select-none ${className}`}>
      <span className="relative flex items-center justify-center">
        {pulse && status !== "inactive" && (
          <span
            className={`animate-ping absolute inline-flex ${pingSizeMap[size]} rounded-full ${c.ping} opacity-75`}
          />
        )}
        <span className={`relative inline-flex rounded-full ${sizeMap[size]} ${c.bg}`} />
      </span>
      {label && (
        <span className={`text-xs font-semibold ${c.text}`}>{label}</span>
      )}
    </div>
  );
};
