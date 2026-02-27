/**
 * LoadingSpinner Component
 * A consistent loading indicator used across the application
 */
import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const LoadingSpinner = ({ 
  size = "md", 
  color = "blue",
  text,
  fullScreen = false,
  className 
}) => {
  const sizeClasses = {
    sm: "h-4 w-4 border-2",
    md: "h-8 w-8 border-2",
    lg: "h-12 w-12 border-3",
    xl: "h-16 w-16 border-4"
  };

  const colorClasses = {
    blue: "border-blue-500/30 border-t-blue-500",
    emerald: "border-emerald-500/30 border-t-emerald-500",
    amber: "border-amber-500/30 border-t-amber-500",
    rose: "border-rose-500/30 border-t-rose-500",
    white: "border-white/30 border-t-white"
  };

  const spinner = (
    <div className={cn("rounded-full animate-spin", sizeClasses[size], colorClasses[color])} />
  );

  if (fullScreen) {
    return (
      <div className={cn(
        "fixed inset-0 z-50 flex flex-col items-center justify-center gap-4",
        "bg-[var(--bg-app)]/80 backdrop-blur-sm",
        className
      )}>
        {spinner}
        {text && (
          <span className="text-sm font-medium text-[var(--text-secondary)] animate-pulse">
            {text}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 py-8", className)}>
      {spinner}
      {text && (
        <span className="text-sm font-medium text-[var(--text-secondary)]">
          {text}
        </span>
      )}
    </div>
  );
};

export default LoadingSpinner;

/**
 * Page Loader - Full screen loading for route transitions
 */
export const PageLoader = () => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[var(--bg-app)]/50 backdrop-blur-sm animate-fade-in">
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <div className="h-16 w-16 rounded-2xl bg-blue-600/10 border-2 border-blue-600/20 animate-pulse"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-8 w-8 rounded-lg bg-blue-600 animate-bounce shadow-lg shadow-blue-500/50"></div>
        </div>
      </div>
      <span className="text-xs font-black uppercase tracking-widest text-blue-600 animate-pulse">Loading Workspace...</span>
    </div>
  </div>
);

/**
 * Skeleton Loader for content loading states
 */
export const SkeletonLoader = ({ lines = 3, className }) => (
  <div className={cn("space-y-3 animate-pulse", className)}>
    {Array.from({ length: lines }).map((_, i) => (
      <div 
        key={i} 
        className={cn(
          "h-4 rounded",
          i === lines - 1 ? "w-3/4" : "w-full",
          "bg-[var(--border-soft)]"
        )} 
      />
    ))}
  </div>
);
