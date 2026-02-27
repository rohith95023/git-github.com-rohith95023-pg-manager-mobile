// Modified for React Native migration
import { createContext, useContext, useState, useEffect } from "react";

const UIContext = createContext(null);

export const UIProvider = ({ children }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(true); // Default to mobile in RN
  const [isTablet, setIsTablet] = useState(false);

  // Handle screen resize
  useEffect(() => {
    // TODO: In React Native, use useWindowDimensions() hook or Dimensions listener
    const handleResizeNative = () => {
      // Logic would go here
    };
  }, []);

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => !prev);
  };

  const value = {
    sidebarCollapsed,
    setSidebarCollapsed,
    toggleSidebar,
    isMobile,
    isTablet
  };

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
};

export const useUI = () => {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error("useUI must be used within a UIProvider");
  }
  return context;
};

export default UIContext;

