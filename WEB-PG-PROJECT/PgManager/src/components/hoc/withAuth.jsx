import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

/**
 * Higher-Order Component for protecting routes.
 * Checks if the user is authenticated and optionally if they have the required role.
 * 
 * @param {React.Component} WrappedComponent - The component to wrap
 * @param {Object} options - Options for the HOC
 * @param {Array<string>} options.allowedRoles - List of roles allowed to access the route
 * @returns {React.Component} - The wrapped component
 */
const withAuth = (WrappedComponent, options = {}) => {
  const WithAuthComponent = (props) => {
    const { isAuthenticated, loading, user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const { allowedRoles } = options;

    useEffect(() => {
      if (!loading) {
        if (!isAuthenticated) {
          // Redirect to login, saving the current location to redirect back after login
          navigate("/login", { replace: true, state: { from: location } });
        } else if (allowedRoles && !allowedRoles.includes(user?.role)) {
          // User is authenticated but doesn't have the required role
          // For now, redirect to dashboard or show unauthorized page
          navigate("/dashboard", { replace: true });
        }
      }
    }, [isAuthenticated, loading, navigate, location, user, allowedRoles]);

    if (loading) {
      // Return a loading spinner or skeleton
      return (
        <div className="flex items-center justify-center min-h-screen bg-[#020617]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      );
    }

    // If authenticated (and authorized), render the component
    return isAuthenticated ? <WrappedComponent {...props} /> : null;
  };

  // Set display name for debugging
  const displayName = WrappedComponent.displayName || WrappedComponent.name || "Component";
  WithAuthComponent.displayName = `WithAuth(${displayName})`;

  return WithAuthComponent;
};

export default withAuth;
