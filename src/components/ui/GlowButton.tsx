import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-2xl font-medium text-sm transition-all duration-200 select-none active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "gradient-blue text-white shadow-md shadow-blue-500/25 hover:shadow-lg hover:shadow-blue-500/40 hover:scale-[1.02]",
        secondary:
          "bg-white border border-blue-200 text-blue-600 hover:bg-blue-50/70 hover:border-blue-300 hover:scale-[1.02] shadow-xs",
        ghost:
          "bg-transparent text-slate-600 hover:bg-blue-50/60 hover:text-blue-600",
      },
      size: {
        default: "px-5 py-2.5",
        sm: "px-3.5 py-1.5 text-xs rounded-xl",
        lg: "px-7 py-3 text-base rounded-2xl",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
);

export interface GlowButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  children: React.ReactNode;
  icon?: React.ReactNode;
}

export const GlowButton: React.FC<GlowButtonProps> = ({
  children,
  className,
  variant,
  size,
  icon,
  ...props
}) => {
  return (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </button>
  );
};
