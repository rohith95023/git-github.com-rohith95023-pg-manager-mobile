import { useEffect, useState } from "react";
import ThemeToggle from "../../components/ThemeToggle";
import { useTheme } from "../../context/ThemeContext";
import { pgAPI, tenantAPI } from "../../services/api";

const TenantFinder = () => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [pgFilter, setPgFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTenants, setTotalTenants] = useState(0);
  const [pgs, setPgs] = useState([]);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await tenantAPI.search({
          page,
          limit: 8,
          search: debouncedSearch,
          pgId: pgFilter === "ALL" ? "" : pgFilter,
      });
      setTenants(response.data || []);
      setTotalTenants(response.total || 0);
      setTotalPages(Math.ceil((response.total || 0) / 8));
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page, debouncedSearch, pgFilter]);

  useEffect(() => {
      const fetchPGs = async () => {
          const data = await pgAPI.getAll();
          setPgs(data || []);
      };
      fetchPGs();
   }, []);

  return (
    <div className="min-h-[85vh] p-4 md:p-8 space-y-8">
      {/* Refactored UI Shell */}
      <div className="flex justify-between items-center border-b pb-4">
          <h1 className="text-2xl font-bold">Resident Search</h1>
          <ThemeToggle />
      </div>
      {/* ... Search and List UI (Simplified for FastAPI) ... */}
      <div className="text-center py-10">Tenant Finder Workspace (FastAPI Integrated)</div>
    </div>
  );
};

export default TenantFinder;
