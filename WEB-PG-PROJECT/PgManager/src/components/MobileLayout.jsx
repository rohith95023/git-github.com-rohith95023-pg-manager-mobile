import React, { useMemo } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  Bed,
  Users,
  CreditCard,
  Settings,
  ArrowLeft,
  PlusCircle
} from "lucide-react";
import { twMerge } from "tailwind-merge";
import { clsx } from "clsx";
import ErrorBoundary from "./ErrorBoundary";

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const tabDefinitions = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/tenants", label: "Residents", icon: Users },
  { path: "/rooms", label: "Rooms", icon: Bed },
  { path: "/payments", label: "Finance", icon: CreditCard },
  { path: "/settings", label: "Settings", icon: Settings },
];

const tabMatcher = {
  "/dashboard": (path) => path === "/dashboard",
  "/tenants": (path) => path.startsWith("/tenants") || path.startsWith("/finder"),
  "/rooms": (path) => path.startsWith("/rooms") || path.startsWith("/beds") || path.startsWith("/reservations"),
  "/payments": (path) =>
    ["/payments", "/expenses", "/profit-loss"].some((prefix) => path.startsWith(prefix)),
  "/settings": (path) => path.startsWith("/settings") || path.startsWith("/profile"),
};

const actionMap = [
  {
    match: (path) => path.startsWith("/payments"),
    label: "Add Payment",
    icon: PlusCircle,
    onClick: (navigate) => navigate("/payments?action=new")
  },
  {
    match: (path) => path.startsWith("/rooms"),
    label: "Add Room",
    icon: PlusCircle,
    onClick: (navigate) => navigate("/rooms?create=true")
  },
  {
    match: (path) => path.startsWith("/tenants"),
    label: "Add Resident",
    icon: PlusCircle,
    onClick: (navigate) => navigate("/tenants?create=true")
  },
  {
    match: (path) => path.startsWith("/dashboard"),
    label: "New Property",
    icon: Building2,
    onClick: (navigate) => navigate("/pgs?action=new")
  }
];

const titleMap = {
  "/dashboard": "Dashboard",
  "/pgs": "Properties",
  "/rooms": "Rooms",
  "/beds": "Beds",
  "/tenants": "Residents",
  "/finder": "Tenant Finder",
  "/payments": "Payments",
  "/expenses": "Expenses",
  "/profit-loss": "Profit & Loss",
  "/settings": "Settings"
};

const MobileLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const currentPath = location.pathname;
  const pageTitle = useMemo(() => {
    if (titleMap[currentPath]) {
      return titleMap[currentPath];
    }
    const fallbackKey = Object.keys(titleMap).find((key) => currentPath.startsWith(key));
    return (fallbackKey && titleMap[fallbackKey]) || "PG Manager";
  }, [currentPath]);

  const actionItem = useMemo(
    () => actionMap.find((action) => action.match(currentPath)),
    [currentPath]
  );

  const showBackButton = !["/dashboard", "/login", "/signup"].includes(currentPath);

  return (
    <div className="mobile-shell">
      <header className="mobile-header">
        <button
          onClick={() => (showBackButton ? navigate(-1) : navigate("/dashboard"))}
          className={cn(
            "mobile-header-action",
            showBackButton ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
          aria-label="Go back"
        >
          <ArrowLeft size={22} />
        </button>

        <h1 className="mobile-header-title" aria-live="polite">
          {pageTitle}
        </h1>

        <button
          onClick={() => actionItem?.onClick(navigate)}
          className={cn(
            "mobile-header-action",
            actionItem ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
          aria-label={actionItem ? actionItem.label : "No action available"}
        >
          {actionItem && <actionItem.icon size={22} />}
        </button>
      </header>

      <main className="mobile-main" role="main">
        <div className="mobile-main-inner">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </div>
      </main>

      <nav className="mobile-tabbar" aria-label="Primary">
        {tabDefinitions.map((tab) => {
          const isActive = tabMatcher[tab.path]?.(currentPath);
          const TabIcon = tab.icon;
          return (
            <NavLink
              key={tab.path}
              to={tab.path}
              className={cn(
                "mobile-tab",
                isActive ? "mobile-tab-active" : ""
              )}
            >
              <TabIcon size={20} />
              <span>{tab.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
};

export default MobileLayout;
