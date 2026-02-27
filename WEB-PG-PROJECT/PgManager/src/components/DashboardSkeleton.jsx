import React from "react";
import "./Skeleton.css"; // Import the CSS we just created

const DashboardSkeleton = () => {
  return (
    <div className="dashboard">
      <div className="page-header">
        <div>
          <div className="skeleton skeleton-title"></div>
          <div className="skeleton skeleton-subtitle"></div>
        </div>
      </div>

      {/* Stats Grid Skeleton */}
      <div className="stats-grid">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="skeleton skeleton-card"></div>
        ))}
      </div>

      {/* Tables Grid Skeleton */}
      <div className="dashboard-grid">
        <div className="skeleton skeleton-table-card"></div>
        <div className="skeleton skeleton-table-card"></div>
      </div>

      {/* Quick Actions Skeleton */}
      <div className="quick-actions">
        <div className="skeleton skeleton-title" style={{ width: "20%" }}></div>
        <div className="actions-grid">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton skeleton-action"></div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DashboardSkeleton;
