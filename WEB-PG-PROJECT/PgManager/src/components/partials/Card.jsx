/**
 * Card Component
 * A consistent card wrapper used across the application
 */
import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const Card = ({ 
  children, 
  isDark,
  title,
  subtitle,
  icon: Icon,
  action,
  className,
  bodyClassName,
  headerClassName,
  noPadding = false
}) => {
  return (
    <div className={cn(
      "rounded-2xl border overflow-hidden shadow-xl transition-colors duration-300 backdrop-blur-md",
      isDark 
        ? "bg-slate-900/50 border-white/10" 
        : "bg-white border-slate-200",
      className
    )}>
      {/* Card Header */}
      {(title || subtitle || action) && (
        <div className={cn(
          "p-4 md:p-5 flex items-center justify-between",
          isDark ? "border-b border-white/5" : "border-b border-slate-100",
          headerClassName
        )}>
          <div className="flex items-center gap-3">
            {Icon && (
              <div className={cn(
                "p-2 rounded-xl",
                isDark ? "bg-white/5" : "bg-slate-100"
              )}>
                <Icon className={cn("w-5 h-5", isDark ? "text-blue-400" : "text-blue-600")} />
              </div>
            )}
            <div>
              {title && (
                <h3 className={cn(
                  "text-base md:text-lg font-semibold",
                  isDark ? "text-white" : "text-slate-900"
                )}>
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className={cn(
                  "text-sm",
                  isDark ? "text-slate-400" : "text-slate-500"
                )}>
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          {action && (
            <div>{action}</div>
          )}
        </div>
      )}
      
      {/* Card Body */}
      <div className={cn(
        noPadding ? "" : "p-4 md:p-5",
        bodyClassName
      )}>
        {children}
      </div>
    </div>
  );
};

export default Card;

/**
 * Card Grid - For displaying cards in a grid layout
 */
export const CardGrid = ({ 
  children, 
  columns = 3,
  gap = 4,
  className 
}) => {
  const gridCols = {
    1: "grid-cols-1",
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
    5: "grid-cols-1 md:grid-cols-3 lg:grid-cols-5",
    6: "grid-cols-1 md:grid-cols-3 lg:grid-cols-6"
  };

  return (
    <div className={cn(
      "grid",
      gridCols[columns] || gridCols[3],
      `gap-${gap}`,
      className
    )}>
      {children}
    </div>
  );
};

/**
 * Stat Card Grid - Specialized grid for stat cards
 */
export const StatCardGrid = ({ children, cols = 4, className }) => {
  const gridCols = {
    2: "grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 md:grid-cols-3",
    4: "grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
    5: "grid-cols-2 md:grid-cols-3 lg:grid-cols-5",
    6: "grid-cols-2 md:grid-cols-3 lg:grid-cols-6"
  };

  return (
    <div className={cn(
      "grid",
      gridCols[cols] || "grid-cols-2 md:grid-cols-4",
      "gap-3 md:gap-4",
      className
    )}>
      {children}
    </div>
  );
};
