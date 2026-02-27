import React, { Suspense, lazy, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { UIProvider } from "./context/UIContext";
import { ThemeProvider } from "./context/ThemeContext";
import Layout from "./components/Layout";
import ErrorBoundary from "./components/ErrorBoundary";
import { PageLoader } from "./components/partials";
import "./index.css";

const AuthPage = lazy(() => import("./pages/Auth/AuthPage"));
const Dashboard = lazy(() => import("./pages/Dashboard/Dashboard"));
const PGs = lazy(() => import("./pages/PGs/PGs"));
const Rooms = lazy(() => import("./pages/Rooms/Rooms"));
const Tenants = lazy(() => import("./pages/Tenants/Tenants"));
const TenantFinder = lazy(() => import("./pages/Tenants/TenantFinder"));
const Payments = lazy(() => import("./pages/Payments/Payments"));
const Expenses = lazy(() => import("./pages/Expenses/Expenses"));
const ProfitLoss = lazy(() => import("./pages/ProfitLoss/ProfitLossDashboard"));
const ProfileSettings = lazy(() => import("./pages/Auth/ProfileSettings"));

// Protected Route Component (Refined)
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  console.log("ProtectedRoute: Checking access on", window.location.pathname, { isAuthenticated, loading });

  if (loading) {
    console.log("ProtectedRoute: Loading...");
    return <PageLoader />;
  }
  if (!isAuthenticated) {
    console.log("ProtectedRoute: Not authenticated, redirecting to /login");
    return <Navigate to="/login" replace />;
  }

  console.log("ProtectedRoute: Access granted");
  return children;
};

// Public Route Component
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  console.log("PublicRoute: Checking access on", window.location.pathname, { isAuthenticated, loading });

  if (loading) {
      console.log("PublicRoute: Loading...");
      return <PageLoader />;
  }
  if (isAuthenticated) {
      console.log("PublicRoute: Authenticated, redirecting to /dashboard");
      return <Navigate to="/dashboard" replace />;
  }

  return children;
};

function App() {
  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const routeLoaders = [
      () => import("./pages/Dashboard/Dashboard"),
      () => import("./pages/PGs/PGs"),
      () => import("./pages/Rooms/Rooms"),
      () => import("./pages/Tenants/Tenants"),
      () => import("./pages/Tenants/TenantFinder"),
      () => import("./pages/Payments/Payments"),
      () => import("./pages/Expenses/Expenses"),
      () => import("./pages/ProfitLoss/ProfitLossDashboard"),
      () => import("./pages/Auth/ProfileSettings")
    ];

    const prefetchRoutes = () => {
      routeLoaders.forEach((load) => {
        load().catch(() => {});
      });
    };

    let handle = null;

    if ("requestIdleCallback" in window) {
      handle = window.requestIdleCallback(prefetchRoutes, { timeout: 2500 });
      return () => {
        if (window.cancelIdleCallback) {
          window.cancelIdleCallback(handle);
        }
      };
    }

    handle = window.setTimeout(prefetchRoutes, 1200);
    return () => window.clearTimeout(handle);
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <UIProvider>
            <BrowserRouter>
              <ErrorBoundary>
                  <Suspense fallback={<PageLoader />}>
                  <Routes>
                    {/* Public Routes */}
                    <Route
                      path="/login"
                      element={
                        <PublicRoute>
                          <AuthPage initialMode="login" />
                        </PublicRoute>
                      }
                    />
                    <Route
                      path="/signup"
                      element={
                        <PublicRoute>
                          <AuthPage initialMode="signup" />
                        </PublicRoute>
                      }
                    />

                    {/* Protected Routes */}
                    <Route
                      path="/"
                      element={
                        <ProtectedRoute>
                          <Layout />
                        </ProtectedRoute>
                      }
                    >
                      <Route index element={<Navigate to="/dashboard" replace />} />
                      <Route path="dashboard" element={<Dashboard />} />
                      <Route path="pgs" element={<PGs />} />
                      <Route path="rooms" element={<Rooms />} />
                      <Route path="tenants" element={<Tenants />} />
                      <Route path="finder" element={<TenantFinder />} />

                      <Route path="payments" element={<Payments />} />
                      <Route path="expenses" element={<Expenses />} />
                      <Route path="profit-loss" element={<ProfitLoss />} />
                      <Route path="settings" element={<ProfileSettings />} />
                    </Route>

                    {/* Catch all */}
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                  </Routes>
                  </Suspense>
              </ErrorBoundary>
            </BrowserRouter>
          </UIProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
