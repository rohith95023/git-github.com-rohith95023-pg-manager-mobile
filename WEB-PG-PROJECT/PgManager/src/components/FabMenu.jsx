
import React, { useState } from 'react';
import { Plus, Building2, Bed, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const FabMenu = () => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => setIsOpen(!isOpen);

  const actions = [
    { label: "Onboard Tenant", icon: Users, href: "/tenants?onboard=true", color: "bg-amber-500" },
    { label: "Add Room", icon: Bed, href: "/rooms?create=true", color: "bg-emerald-500" },
    { label: "Create Property", icon: Building2, href: "/pgs?action=new", color: "bg-blue-500" },
  ];

  return (
    <div className="fixed bottom-6 right-6 z-50 flex lg:hidden flex-col items-end gap-3 pointer-events-none">
      {/* Menu Options - Use visibility to ensure they don't block interactions when closed */}
      <div
        className={cn(
          "flex flex-col items-end gap-3 transition-all duration-300",
          isOpen 
            ? "opacity-100 translate-y-0 pointer-events-auto visible" 
            : "opacity-0 translate-y-10 pointer-events-none invisible"
        )}
      >
        {actions.map((action, index) => (
          <Link
            key={index}
            to={action.href}
            className={cn(
                "group flex items-center gap-3 transition-all",
                isOpen ? "pointer-events-auto" : "pointer-events-none"
            )}
            onClick={() => setIsOpen(false)}
          >
            <span className="bg-white text-slate-700 px-3 py-1.5 rounded-lg text-sm font-semibold shadow-lg border border-slate-100 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              {action.label}
            </span>
            <div className={cn("p-3 rounded-full text-white shadow-lg transition-transform hover:scale-110", action.color)}>
              <action.icon size={20} />
            </div>
          </Link>
        ))}
      </div>

      {/* Main Toggle Button - Always interactive */}
      <button
        onClick={toggleMenu}
        className={cn(
          "p-4 rounded-full shadow-2xl text-white transition-all duration-300 hover:scale-105 active:scale-95 pointer-events-auto",
          isOpen ? "bg-rose-500 rotate-45" : "bg-blue-600 hover:bg-blue-700"
        )}
      >
        <Plus size={28} />
      </button>
    </div>
  );
};

export default FabMenu;
