import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const ThemeToggle = ({ className }) => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button 
      onClick={toggleTheme}
      className={cn(
        "p-2 md:p-2.5 rounded-xl transition-all duration-300 border group",
        isDark 
          ? "bg-slate-800/80 border-slate-700 text-amber-400 hover:bg-slate-700 hover:border-amber-500/30 hover:shadow-lg hover:shadow-amber-500/10" 
          : "bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100 hover:border-blue-300 hover:shadow-lg hover:shadow-blue-500/10",
        className
      )}
      aria-label="Toggle theme"
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      <span className="block transition-transform duration-500 ease-in-out group-hover:rotate-180 group-active:scale-75">
        {isDark ? <Sun size={18} /> : <Moon size={18} />}
      </span>
    </button>
  );
};

export default ThemeToggle;
