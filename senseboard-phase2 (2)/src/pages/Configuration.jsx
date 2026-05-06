import React, { useState } from "react";
import Setup from "./setup";
import ManagementPage from "./management";
import Parameters from "./Parameters";   // ← new component

const TABS = [
  { key: "setup",      label: "Setup",      icon: "bi-gear" },
  { key: "management", label: "Management", icon: "bi-people" },
  { key: "parameters", label: "Parameters", icon: "bi-sliders" },
];

const Configuration = () => {
  const [activeTab, setActiveTab] = useState("setup");
  return (
    <div style={{ color: "var(--sb-text)" }}>
      <div className="sb-page-header px-4 py-3 mb-0">
        <h5 className="sb-header-title mb-1">
          <i className="bi bi-gear-wide-connected me-2 sb-accent"></i>Configuration
        </h5>
        <p className="sb-header-subtitle mb-0">Manage system setup, users, and parameters.</p>
      </div>
      <div className="px-4" style={{ borderBottom: "1px solid var(--sb-border)" }}>
        <div className="d-flex">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
              padding: "12px 20px", fontSize: 14, background: "none", border: "none", cursor: "pointer",
              borderBottom: activeTab === t.key ? "2px solid var(--sb-accent)" : "2px solid transparent",
              color: activeTab === t.key ? "var(--sb-accent)" : "var(--sb-muted)",
              fontWeight: activeTab === t.key ? 700 : 500,
              display: "flex", alignItems: "center", gap: 7, whiteSpace: "nowrap",
            }}>
              <i className={`bi ${t.icon}`}></i>{t.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        {activeTab === "setup"      && <Setup />}
        {activeTab === "management" && <ManagementPage />}
        {activeTab === "parameters" && <Parameters />}
      </div>
    </div>
  );
};

export default Configuration;
