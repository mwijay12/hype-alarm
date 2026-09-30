import React from "react";

interface AppLogoProps {
  className?: string;
  size?: number | string;
  animate?: boolean;
}

export const AppLogo: React.FC<AppLogoProps> = ({
  className = "",
  size = 28,
  animate = false,
}) => {
  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      <img
        src="/app-icon.svg"
        alt="HyperAlarm Pro"
        className={`w-full h-full object-contain ${
          animate ? "hover:scale-105 transition-transform duration-300" : ""
        }`}
      />
    </div>
  );
};
