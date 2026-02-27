// Modified for React Native migration
import { createContext, useContext, useState, useEffect } from "react";
// TODO: Replace with real AsyncStorage or use expo-appearance
const AsyncStoragePlaceholder = {
    getItem: (key) => null, // TODO: Implement async retrieval
    setItem: (key, val) => {}, 
    removeItem: (key) => {}
};

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState("light"); // Default for RN migration prep

  useEffect(() => {
    // Check AsyncStorage or system preference (TODO: use Appearance from react-native)
    const initTheme = () => {
        const saved = AsyncStoragePlaceholder.getItem("theme");
        if (saved) {
            setTheme(saved);
        } else {
            // TODO: Replace window.matchMedia with Appearance.getColorScheme()
            // if (Appearance.getColorScheme() === "dark") setTheme("dark");
        }
    };
    initTheme();
  }, []);

  useEffect(() => {
    // TODO: document object removed for RN
    // Update theme preference
    AsyncStoragePlaceholder.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const isDark = theme === "dark";

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
};

