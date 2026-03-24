import React from "react";

const Setup = () => {
  return (
    <div>
      <div className="sb-page-header px-4 py-3 mb-4">
        <h5 className="sb-header-title mb-1">
          <i className="bi bi-gear me-2 sb-accent"></i>Setup
        </h5>
        <p className="sb-header-subtitle mb-0">Configure your system settings.</p>
      </div>
      <div className="sb-placeholder-page d-flex align-items-center justify-content-center">
        <div className="text-center">
          <i className="bi bi-gear sb-placeholder-icon mb-3"></i>
          <h5 style={{ color: "var(--sb-text)" }}>Setup</h5>
          <p style={{ color: "var(--sb-muted)" }} className="small">This page is under development.</p>
        </div>
      </div>
    </div>
  );
};

export default Setup;