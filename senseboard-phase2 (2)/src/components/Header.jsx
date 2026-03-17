import React from "react";



const Header = ({ title, subtitle }) => {
  return (
    <header className="sb-page-header px-4 py-3">
      <div className="container-fluid">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
          <div className="d-flex align-items-center gap-3">
           
            <div>
              <h4 className="sb-header-title mb-0">
                <i className="bi bi-activity me-2 sb-accent"></i>
                {title || "Dashboard"}
              </h4>
              {subtitle && (
                <small className="sb-header-subtitle">{subtitle}</small>
              )}
            </div>
          </div>
          <div className="sb-header-badge">
            <span className="badge sb-live-badge">
              <span className="sb-pulse-dot"></span> LIVE
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;