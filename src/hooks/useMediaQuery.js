// Modified for React Native migration
import { useEffect, useState } from "react";

const useMediaQuery = (query) => {
  // TODO: window.matchMedia is not available in React Native.
  // Use useWindowDimensions() or react-native-responsive-screen if needed.
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    // Media queries don't exist in RN like they do in web.
    // Logic should be replaced with native screen width checks.
  }, [query]);

  return matches;
};

export default useMediaQuery;

