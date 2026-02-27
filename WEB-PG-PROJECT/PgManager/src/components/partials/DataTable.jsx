/**
 * DataTable Component
 * A reusable data table component with sorting, pagination, and consistent styling
 * Used across all pages for displaying tabular data
 */
import React, { useState, useMemo } from "react";
import { 
  ChevronUp, 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight,
  Search,
  Filter
} from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const DataTable = ({ 
  data = [],
  columns = [],
  isDark,
  searchable = true,
  searchPlaceholder = "Search...",
  onSearch,
  pagination = true,
  pageSize = 10,
  emptyMessage = "No data available",
  loading = false,
  onRowClick,
  className
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [searchTerm, setSearchTerm] = useState("");

  // Filter data based on search term
  const filteredData = useMemo(() => {
    let result = [...data];
    
    // Apply search
    if (searchTerm && onSearch) {
      result = onSearch(result, searchTerm);
    }
    
    // Apply sorting
    if (sortConfig.key) {
      result.sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        
        if (aVal === bVal) return 0;
        
        const modifier = sortConfig.direction === "asc" ? 1 : -1;
        
        if (aVal === null || aVal === undefined) return modifier;
        if (bVal === null || bVal === undefined) return -modifier;
        
        if (typeof aVal === "number" && typeof bVal === "number") {
          return (aVal - bVal) * modifier;
        }
        
        return String(aVal).localeCompare(String(bVal)) * modifier;
      });
    }
    
    return result;
  }, [data, searchTerm, sortConfig, onSearch]);

  // Paginate data
  const paginatedData = useMemo(() => {
    if (!pagination) return filteredData;
    
    const startIndex = (currentPage - 1) * pageSize;
    return filteredData.slice(startIndex, startIndex + pageSize);
  }, [filteredData, currentPage, pagination, pageSize]);

  const totalPages = Math.ceil(filteredData.length / pageSize);

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc"
    }));
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const renderCell = (row, column) => {
    if (column.render) {
      return column.render(row[column.key], row);
    }
    
    if (column.format) {
      return column.format(row[column.key], row);
    }
    
    return row[column.key] ?? "-";
  };

  if (loading) {
    return (
      <div className={cn(
        "rounded-2xl border animate-pulse",
        isDark ? "bg-slate-800/50 border-white/10" : "bg-white border-slate-200"
      )}>
        <div className="h-64 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
            <span className={isDark ? "text-slate-400" : "text-slate-500"}>Loading data...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Search Bar */}
      {searchable && (
        <div className="flex items-center gap-3">
          <div className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-xl flex-1 max-w-md border",
            isDark ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-200"
          )}>
            <Search size={18} className={isDark ? "text-slate-400" : "text-slate-400"} />
            <input
              type="text"
              value={searchTerm}
              onChange={handleSearch}
              placeholder={searchPlaceholder}
              className={cn(
                "flex-1 bg-transparent outline-none text-sm font-medium",
                isDark ? "text-white placeholder:text-slate-500" : "text-slate-900 placeholder:text-slate-400"
              )}
            />
          </div>
        </div>
      )}

      {/* Table */}
      <div className={cn(
        "rounded-2xl border overflow-hidden",
        isDark ? "bg-slate-900/50 border-white/10" : "bg-white border-slate-200"
      )}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className={cn(
                "text-xs font-black tracking-wider uppercase",
                isDark ? "bg-white/5 text-slate-400" : "bg-slate-100 text-slate-600"
              )}>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className={cn(
                      "px-4 py-3 text-left",
                      column.sortable && "cursor-pointer hover:bg-white/5 transition-colors",
                      column.className
                    )}
                    onClick={() => column.sortable && handleSort(column.key)}
                  >
                    <div className="flex items-center gap-2">
                      {column.header}
                      {column.sortable && sortConfig.key === column.key && (
                        sortConfig.direction === "asc" 
                          ? <ChevronUp size={14} />
                          : <ChevronDown size={14} />
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className={cn(
              "text-sm font-medium",
              isDark ? "divide-y divide-white/5" : "divide-y divide-slate-100"
            )}>
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className={cn(
                    "px-4 py-12 text-center",
                    isDark ? "text-slate-400" : "text-slate-500"
                  )}>
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                paginatedData.map((row, rowIndex) => (
                  <tr 
                    key={row.id || rowIndex}
                    onClick={() => onRowClick?.(row)}
                    className={cn(
                      "transition-colors",
                      onRowClick && "cursor-pointer",
                      isDark ? "hover:bg-white/5" : "hover:bg-slate-50"
                    )}
                  >
                    {columns.map((column) => (
                      <td 
                        key={column.key} 
                        className={cn(
                          "px-4 py-3",
                          isDark ? "text-slate-300" : "text-slate-700",
                          column.cellClassName
                        )}
                      >
                        {renderCell(row, column)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {pagination && totalPages > 1 && (
        <div className={cn(
          "flex items-center justify-between",
          isDark ? "text-slate-400" : "text-slate-600"
        )}>
          <span className="text-sm font-medium">
            Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredData.length)} of {filteredData.length} results
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className={cn(
                "p-2 rounded-lg transition-colors",
                currentPage === 1
                  ? "opacity-50 cursor-not-allowed"
                  : isDark ? "hover:bg-white/10" : "hover:bg-slate-100"
              )}
            >
              <ChevronLeft size={18} />
            </button>
            
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={cn(
                    "w-8 h-8 rounded-lg text-sm font-medium transition-colors",
                    currentPage === pageNum
                      ? "bg-blue-600 text-white"
                      : isDark ? "hover:bg-white/10" : "hover:bg-slate-100"
                  )}
                >
                  {pageNum}
                </button>
              );
            })}
            
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className={cn(
                "p-2 rounded-lg transition-colors",
                currentPage === totalPages
                  ? "opacity-50 cursor-not-allowed"
                  : isDark ? "hover:bg-white/10" : "hover:bg-slate-100"
              )}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;
