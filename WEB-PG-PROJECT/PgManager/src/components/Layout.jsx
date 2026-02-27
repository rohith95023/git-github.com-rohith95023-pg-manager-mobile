import { useState, useEffect } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { 
  LayoutDashboard, 
  Building2, 
  Bed, 
  Users, 
  Calendar, 
  CreditCard, 
  Receipt,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Home,
  Settings,
  Menu,
  X,
  Moon,
  Sun,
  TrendingUp,
  Search,
  AlertTriangle
} from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import ErrorBoundary from "./ErrorBoundary";
import FabMenu from "./FabMenu";
import ConfirmationModal from "./ConfirmationModal";
import useMediaQuery from "../hooks/useMediaQuery";
import MobileLayout from "./MobileLayout";

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const Layout = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const isDark = theme === "dark";

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    logout();
    setShowLogoutConfirm(false);
    navigate("/login");
  };

  const menuItems = [
    { path: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { path: "/pgs", icon: Building2, label: "PG Properties" },
    { path: "/rooms", icon: Bed, label: "Rooms & Beds" },
    { path: "/tenants", icon: Users, label: "Resident Directory" },
    { path: "/finder", icon: Search, label: "Smart Tenant Finder", isNew: true },

    { path: "/payments", icon: CreditCard, label: "Financial Records"},
    { path: "/expenses", icon: Receipt, label: "Expense Tracker" },
    { path: "/profit-loss", icon: TrendingUp, label: "Profit & Loss", isBeta: true },
  ];

  return (
    <>
      {isMobile ? (
        <MobileLayout />
      ) : (
        <div className={cn(
          "flex min-h-screen selection:bg-blue-500/30 overflow-x-hidden transition-colors duration-300",
          "bg-[var(--bg-app)] text-[var(--text-primary)]"
        )}>
          {/* Mobile Top Header */}
          <header className={cn(
            "lg:hidden fixed top-0 left-0 right-0 h-16 backdrop-blur-xl z-[45] px-4 flex items-center justify-between shadow-sm transition-colors duration-300",
            "bg-[var(--bg-surface)]/80 border-b border-[var(--border-soft)]",
            !isDark && "shadow-[0_4px_20px_-5px_rgba(0,0,0,0.05)]"
          )}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                <Home size={18} strokeWidth={2.5} />
              </div>
              <span className="font-bold text-lg tracking-tight">PG Manager</span>
            </div>
            <div className="flex items-center gap-2">
              {/* Theme Toggle - Mobile */}
              <button 
                onClick={toggleTheme}
                className={cn(
                  "p-2 rounded-xl transition-all duration-300 border",
                  "bg-[var(--bg-subtle)] border-[var(--border-soft)] text-[var(--text-secondary)] hover:bg-[var(--border-soft)]"
                )}
                aria-label="Toggle theme"
              >
                {isDark ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <button 
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-lg transition-colors text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
              >
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </header>

          {/* Sidebar Overlay for Mobile */}
          {mobileMenuOpen && (
            <div 
              className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[50] animate-in fade-in duration-300" 
              onClick={() => setMobileMenuOpen(false)}
            />
          )}

          {/* Sidebar */}
          <aside 
            className={cn(
              "fixed top-0 h-full transition-all duration-500 ease-in-out flex flex-col lg:translate-x-0 leading-relaxed overflow-hidden",
              "bg-[var(--sidebar-bg)] border-r border-[var(--sidebar-border)]",
              isDark ? "shadow-2xl" : "shadow-[1px_0_20px_rgba(0,0,0,0.03)]",
              sidebarCollapsed ? "lg:w-24" : "lg:w-72",
              mobileMenuOpen ? "translate-x-0 w-[280px] z-[60]" : "-translate-x-full w-[280px] z-[10] lg:z-[10]"
            )}
          >
            {/* Decorative Side Blur Blob */}
            {isDark && (
              <div className="absolute top-1/2 -left-64 w-80 h-80 bg-blue-500/10 rounded-full blur-[120px] pointer-events-none -z-10 opacity-30 animate-pulse-glow" />
            )}
            {/* Sidebar Header */}
            <div className={cn(
              "p-6 hidden lg:flex items-center transition-all duration-300",
              sidebarCollapsed ? "justify-center p-4" : "justify-between"
            )}>
              {/* Logo - Hide in collapsed mode to save space, or keep centering logic */}
              {!sidebarCollapsed && (
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="min-w-[40px] h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                    <Home size={22} strokeWidth={2.5} />
                  </div>
                  <span className="font-bold text-lg tracking-tight leading-tight text-[var(--text-primary)]">
                    PG Manager
                  </span>
                </div>
              )}

              {/* Toggle Button */}
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className={cn(
                  "p-1.5 rounded-lg transition-colors border border-transparent flex items-center justify-center",
                  "text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-blue-600",
                   // When collapsed, the button becomes the only content, so we style it to look like the logo trigger or just centered
                   sidebarCollapsed && "w-12 h-12 bg-blue-500/5 border-blue-500/10 text-blue-600"
                )}
                title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
              >
                {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
              </button>
            </div>

            {/* Mobile Sidebar Close Button */}
            <div className={cn(
              "lg:hidden p-6 flex items-center justify-between mb-2",
              "border-b border-[var(--border-soft)]"
            )}>
                <span className="font-bold text-lg text-[var(--text-primary)]">Menu</span>
                <button onClick={() => setMobileMenuOpen(false)} className="text-[var(--text-secondary)]"><X size={20}/></button>
            </div>

            <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto no-scrollbar">
              {menuItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) => cn(
                    "flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 group relative mx-2",
                    isActive 
                      ? (isDark ? "bg-blue-500/10 text-blue-400 font-bold border border-blue-500/20 shadow-lg shadow-blue-500/5" : "bg-blue-600 text-white font-bold shadow-lg shadow-blue-600/30") 
                      : "border border-transparent text-[var(--text-secondary)] hover:text-blue-500 hover:bg-blue-500/5"
                  )}
                >
                  {({ isActive }) => (
                    <>
                      <div className={cn("min-w-[20px] transition-all duration-300 group-hover:scale-110", isActive ? (isDark ? "text-blue-400" : "text-white") : "text-slate-400 group-hover:text-blue-500")}>
                        <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                      </div>
                      {(!sidebarCollapsed || mobileMenuOpen) && (
                        <span className="text-sm lg:text-[14px] whitespace-nowrap animate-in fade-in slide-in-from-left-3 duration-300 flex items-center gap-2">
                          {item.label}
                          {item.isNew && (
                            <span className={cn(
                              "px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider animate-pulse",
                              isDark ? "bg-green-500/20 text-green-500 border border-green-500/30" : "bg-green-500 text-white"
                            )}>
                              New
                            </span>
                          )}
                          {item.isBeta && (
                            <span className={cn(
                              "px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider",
                              isDark ? "bg-amber-500/20 text-amber-500 border border-amber-500/30" : "bg-amber-500 text-white"
                            )}>
                              Beta
                            </span>
                          )}
                        </span>
                      )}
                      {isActive && (
                        <div className="absolute left-0 w-1 h-6 rounded-r-full bg-blue-600" />
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </nav>

            <div className={cn(
              "p-4 border-t transition-all duration-300", 
              "border-[var(--border-soft)]",
              sidebarCollapsed && !mobileMenuOpen ? "space-y-6 px-2" : "space-y-3 px-4"
            )}>
              <div 
                onClick={() => navigate('/settings')}
                className={cn(
                  "flex items-center transition-all duration-300 cursor-pointer group/profile",
                  sidebarCollapsed && !mobileMenuOpen 
                    ? "justify-center" 
                    : "gap-3 rounded-2xl p-3 border bg-[var(--bg-subtle)] border-[var(--border-soft)] hover:border-blue-500/30 hover:bg-blue-500/5 shadow-sm"
              )}>
                <div 
                  className={cn(
                    "w-9 h-9 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold shadow-md shrink-0 cursor-pointer hover:scale-105 transition-transform",
                    sidebarCollapsed && !mobileMenuOpen && "ring-4 ring-blue-500/10"
                  )}
                  title={user?.full_name}
                >
                  {user?.full_name?.charAt(0).toUpperCase() || "M"}
                </div>
                
                {(!sidebarCollapsed || mobileMenuOpen) && (
                  <div className="flex flex-col min-w-0 flex-1 overflow-hidden text-left animate-in fade-in slide-in-from-left-2 duration-300">
                    <span className="text-xs font-black truncate text-[var(--text-primary)]">
                      {user?.full_name || "Manager"}
                    </span>
                    <span className="text-[10px] font-bold text-[var(--text-muted)] truncate">
                      {user?.role || "Admin"}
                    </span>
                  </div>
                )}

                {(!sidebarCollapsed || mobileMenuOpen) && (
                  <button 
                    onClick={() => navigate('/settings')}
                    className="p-1.5 rounded-lg transition-colors text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-blue-500 hover:shadow-sm shrink-0"
                    title="Settings"
                  >
                    <Settings size={14} />
                  </button>
                )}
              </div>
              
              <button 
                onClick={handleLogoutClick}
                className={cn(
                  "flex items-center rounded-xl transition-all font-medium border border-transparent group overflow-hidden",
                  "text-rose-500 hover:bg-rose-500/10 hover:border-rose-500/20",
                  sidebarCollapsed && !mobileMenuOpen 
                    ? "justify-center w-10 h-10 mx-auto p-0" 
                    : "w-full gap-3 px-4 py-3"
                )}
                title="Log Out"
              >
                <LogOut size={20} className="transition-transform group-hover:scale-110 shrink-0" />
                {(!sidebarCollapsed || mobileMenuOpen) && (
                  <span className="text-sm font-bold truncate animate-in fade-in slide-in-from-left-2 duration-300">
                    Log Out
                  </span>
                )}
              </button>
            </div>
          </aside>

          {/* Main Content */}
          <main
            className={cn(
              "flex-1 transition-[margin] duration-500 min-h-screen relative z-[20]",
              sidebarCollapsed ? "lg:ml-24" : "lg:ml-72",
              "ml-0"
            )}
          >
            <div className="min-h-screen pb-24 relative pt-16 lg:pt-4 px-4 md:px-6 lg:pr-24 xl:pr-28">
              <div key={location.pathname} className="max-w-[1600px] mx-auto animate-page-enter">
                 <ErrorBoundary>
                   <Outlet />
                 </ErrorBoundary>
              </div>
            </div>
          </main>
        </div>
      )}

      <FabMenu />

      <ConfirmationModal 
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={confirmLogout}
        title="Logging Out?"
        subtitle="Session Security"
        message="You are about to end your current session. You will need to sign in again to access the property manager."
        confirmText="Confirm Log Out"
        cancelText="Stay Logged In"
        type="warning"
      />
    </>
  );
};

export default Layout;
