import { useMemo } from "react";

export const useTenantFinder = () => {
  const state = useMemo(() => ({ searchResults: [] as any[] }), []);
  return {
    ...state,
    isLoading: false,
  };
};
