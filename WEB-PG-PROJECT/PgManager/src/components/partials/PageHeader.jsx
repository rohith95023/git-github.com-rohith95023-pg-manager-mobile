/**
 * PageHeader Component
 * A consistent page header component with title, subtitle, and action buttons
 * Used across all pages for consistent layout
 */
import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { Clock } from "lucide-react";

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const PageHeader = ({ 
  title, 
  subtitle,
  icon: Icon,
  isDark,
  actions,
  showTime = false,
  className
}) => {
  return (
    <div className={cn(
      "flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6",
      className
    )}>
      <div className="flex items-start gap-3">
        {Icon && (
          <div className={cn(
            "p-2.5 rounded-xl mt-1",
            isDark ? "bg-blue-500/10" : "bg-blue-50"
          )}>
            <Icon className={cn("w-5 h-5", isDark ? "text-blue-400" : "text-blue-600")} />
          </div>
        )}
        <div>
          <h1 className={cn(
            "text-2xl md:text-3xl font-black tracking-tight",
            isDark ? "text-white" : "text-slate-900"
          )}>
            {title}
          </h1>
          {subtitle && (
            <p className={cn(
              "mt-1 flex items-center gap-2 text-sm font-medium",
              isDark ? "text-slate-400" : "text-slate-600"
            )}>
              {showTime && <Clock size={16} />}
              {subtitle}
            </p>
          )}
        </div>
      </div>
      
      {actions && (
        <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
          {actions}
        </div>
      )}
    </div>
  );
};

export default PageHeader;

/**
 * PageHeader with Tabs support
 */
export const TabbedPageHeader = ({ 
  title, 
  subtitle,
  icon: Icon,
  isDark,
  tabs,
  activeTab,
  onTabChange,
  actions,
  className
}) => {
  return (
    <div className={cn("space-y-4", className)}>
      <PageHeader 
        title={title}
        subtitle={subtitle}
        icon={Icon}
        isDark={isDark}
        actions={actions}
      />
      
      {tabs && tabs.length > 0 && (
        <div className={cn(
          "flex gap-1 p-1 rounded-xl w-fit",
          isDark ? "bg-white/5" : "bg-slate-100"
        )}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange?.(tab.id)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                activeTab === tab.id
                  ? isDark 
                    ? "bg-blue-600 text-white shadow-lg" 
                    : "bg-white text-slate-900 shadow-sm"
                  : isDark 
                    ? "text-slate-400 hover:text-white" 
                    : "text-slate-600 hover:text-slate-900"
              )}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className={cn(
                  "ml-2 px-1.5 py-0.5 rounded text-xs",
                  activeTab === tab.id
                    ? isDark ? "bg-white/20" : "bg-blue-100"
                    : isDark ? "bg-white/10" : "bg-slate-200"
                )}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
