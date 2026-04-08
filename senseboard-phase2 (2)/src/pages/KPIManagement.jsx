import React, { useState, useEffect } from "react";
import * as formulajs from "@formulajs/formulajs";

// ── Default KPI Cards ─────────────────────────────────────────
const DEFAULT_KPIS = [
  { id: 1, name: "Availability", icon: "bi-check2-circle", color: "#28c76f", formula: "availability", value: null, unit: "%" },
  { id: 2, name: "Performance", icon: "bi-speedometer2", color: "var(--sb-accent)", formula: "performance", value: null, unit: "%" },
  { id: 3, name: "Quality", icon: "bi-award", color: "#0f4c81", formula: "quality", value: null, unit: "%" },
  { id: 4, name: "OEE", icon: "bi-graph-up", color: "#f39c12", formula: "OEE", value: null, unit: "%" },
  { id: 5, name: "Downtime", icon: "bi-clock-history", color: "#e74c3c", formula: "downtime", value: null, unit: "hrs" },
];

// ── Evaluate formula using formulajs ──────────────────────────
const evaluateFormula = (formulaStr, latestValues) => {
  try {
    // Replace variable names with their latest values
    let expr = formulaStr.toUpperCase();
    Object.entries(latestValues).forEach(([key, val]) => {
      expr = expr.replace(new RegExp(key.toUpperCase(), "g"), val);
    });

    // Handle Excel-style functions via formulajs
    expr = expr
      .replace(/SUM\(([^)]+)\)/g, (_, args) => {
        const nums = args.split(",").map(Number).filter(n => !isNaN(n));
        return formulajs.SUM(nums);
      })
      .replace(/AVERAGE\(([^)]+)\)/g, (_, args) => {
        const nums = args.split(",").map(Number).filter(n => !isNaN(n));
        return formulajs.AVERAGE(nums);
      })
      .replace(/MAX\(([^)]+)\)/g, (_, args) => {
        const nums = args.split(",").map(Number).filter(n => !isNaN(n));
        return formulajs.MAX(nums);
      })
      .replace(/MIN\(([^)]+)\)/g, (_, args) => {
        const nums = args.split(",").map(Number).filter(n => !isNaN(n));
        return formulajs.MIN(nums);
      });

    // eslint-disable-next-line no-eval
    const result = eval(expr);
    return isNaN(result) ? "N/A" : Number(result).toFixed(2);
  } catch {
    return "Error";
  }
};

// ── KPI Card Component ────────────────────────────────────────
const KpiCard = ({ kpi, latestValues }) => {
  const value = kpi.formula
    ? evaluateFormula(kpi.formula, latestValues)
    : kpi.value ?? "—";

  return (
    <div className="card border-0 shadow-sm p-3" style={{ borderRadius: "14px", backgroundColor: "var(--sb-card-bg)" }}>
      <div className="d-flex align-items-center justify-content-between mb-2">
        <div className="d-flex align-items-center gap-2">
          <div style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: kpi.color + "22", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <i className={`bi ${kpi.icon}`} style={{ color: kpi.color, fontSize: "1.1rem" }}></i>
          </div>
          <span className="sb-form-label mb-0" style={{ fontWeight: 600 }}>{kpi.name}</span>
        </div>
        <span className="sb-live-badge"><span className="sb-pulse-dot"></span> LIVE</span>
      </div>
      <div style={{ fontSize: "2rem", fontWeight: 700, color: kpi.color, fontFamily: "Syne, sans-serif" }}>
        {value}<span style={{ fontSize: "0.9rem", color: "var(--sb-muted)", marginLeft: 4 }}>{kpi.unit}</span>
      </div>
      {kpi.formula && (
        <p className="mb-0 mt-1" style={{ fontSize: "0.75rem", color: "var(--sb-muted)" }}>
          <i className="bi bi-function me-1"></i>{kpi.formula}
        </p>
      )}
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────
const KPIManagement = () => {
  const [kpis, setKpis] = useState(DEFAULT_KPIS);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", formula: "", unit: "", icon: "bi-graph-up", color: "#00c6ae" });
  const [errors, setErrors] = useState({});
  const [successMsg, setSuccessMsg] = useState("");
  const [latestValues, setLatestValues] = useState({
    availability: 92.5,
    performance: 87.3,
    quality: 98.1,
    OEE: 79.4,
    downtime: 3.2,
  });

  // Simulate live data updates every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setLatestValues(prev => ({
        ...prev,
        availability: +(85 + Math.random() * 15).toFixed(2),
        performance: +(80 + Math.random() * 20).toFixed(2),
        quality: +(95 + Math.random() * 5).toFixed(2),
        OEE: +(70 + Math.random() * 25).toFixed(2),
        downtime: +(Math.random() * 8).toFixed(2),
      }));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: "" });
  };

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = "KPI name is required";
    if (!form.formula.trim()) errs.formula = "Formula is required";
    return errs;
  };

  const handleAddKpi = () => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    const newKpi = {
      id: Date.now(),
      name: form.name,
      formula: form.formula,
      unit: form.unit || "",
      icon: form.icon,
      color: form.color,
      value: null,
    };
    setKpis([...kpis, newKpi]);
    setForm({ name: "", formula: "", unit: "", icon: "bi-graph-up", color: "#00c6ae" });
    setShowForm(false);
    setSuccessMsg("KPI added successfully!");
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  const handleDelete = (id) => {
    setKpis(kpis.filter(k => k.id !== id));
  };

  return (
    <div>
      {/* Header */}
      <div className="sb-page-header px-4 py-3 mb-4">
        <h5 className="sb-header-title mb-1">
          <i className="bi bi-graph-up-arrow me-2 sb-accent"></i>KPI Management
        </h5>
        <p className="sb-header-subtitle mb-0">Monitor and manage your Key Performance Indicators.</p>
      </div>

      {/* Success Toast */}
      {successMsg && (
        <div className="position-fixed top-0 end-0 m-4" style={{ zIndex: 9999 }}>
          <div className="alert d-flex align-items-center gap-2 shadow" style={{ backgroundColor: "#d1e7dd", color: "#0a3622", border: "1px solid #a3cfbb" }}>
            <i className="bi bi-check-circle-fill"></i>{successMsg}
          </div>
        </div>
      )}

      <div className="container-fluid px-4">
        {/* Add KPI Button */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h6 className="sb-header-title mb-0">
            <i className="bi bi-collection me-2 sb-accent"></i>KPI Dashboard
          </h6>
          <button className="btn sb-connect-btn d-flex align-items-center gap-2" style={{ borderRadius: "50px", padding: "8px 20px", fontWeight: 600 }} onClick={() => setShowForm(true)}>
            <i className="bi bi-plus-circle-fill" style={{ fontSize: "1.1rem" }}></i>Add KPI Formula
          </button>
        </div>

        {/* Formula Help */}
        <div className="mb-4 p-3" style={{ backgroundColor: "var(--sb-light-bg)", borderRadius: "12px", border: "1px solid var(--sb-border)" }}>
          <p className="sb-form-label mb-1"><i className="bi bi-info-circle me-2 sb-accent"></i>Supported Formula Functions</p>
          <div className="d-flex flex-wrap gap-2">
            {["SUM(a,b)", "AVERAGE(a,b)", "MAX(a,b)", "MIN(a,b)", "(a*b)/c", "a+b-c", "IF conditions"].map(f => (
              <span key={f} className="badge" style={{ backgroundColor: "var(--sb-white)", color: "var(--sb-text)", border: "1px solid var(--sb-border)", borderRadius: "6px", padding: "4px 10px", fontSize: "0.78rem", fontFamily: "monospace" }}>{f}</span>
            ))}
          </div>
          <p className="mb-0 mt-2" style={{ fontSize: "0.78rem", color: "var(--sb-muted)" }}>Use sensor variable names in formulas e.g. <code>availability * performance / 100</code></p>
        </div>

        {/* KPI Cards Grid */}
        <div className="row g-3">
          {kpis.map(kpi => (
            <div className="col-12 col-md-6 col-lg-4" key={kpi.id}>
              <div style={{ position: "relative" }}>
                <KpiCard kpi={kpi} latestValues={latestValues} />
                {!DEFAULT_KPIS.find(d => d.id === kpi.id) && (
                  <button
                    className="btn btn-sm"
                    style={{ position: "absolute", top: 8, right: 8, color: "#e74c3c", background: "none", border: "none", padding: "2px 6px" }}
                    onClick={() => handleDelete(kpi.id)}
                  >
                    <i className="bi bi-x-lg"></i>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add KPI Form */}
      {showForm && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1050 }}>
          <div className="card border-0 shadow-lg p-4" style={{ width: "100%", maxWidth: "500px", borderRadius: "20px", backgroundColor: "var(--sb-white)", border: "1px solid rgba(0,198,174,0.2)" }}>
            <div className="d-flex align-items-center justify-content-between mb-4">
              <h5 className="mb-0" style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, color: "var(--sb-text)" }}>
                <i className="bi bi-function me-2" style={{ color: "var(--sb-accent)" }}></i>Add KPI Formula
              </h5>
              <button className="btn-close" onClick={() => { setShowForm(false); setErrors({}); }}></button>
            </div>

            {/* KPI Name */}
            <div className="mb-3">
              <label className="form-label sb-form-label">KPI Name <span className="text-danger">*</span></label>
              <input type="text" name="name" className={`form-control sb-input ${errors.name ? "is-invalid" : ""}`} placeholder="e.g. Machine Efficiency" value={form.name} onChange={handleChange} />
              {errors.name && <div className="invalid-feedback">{errors.name}</div>}
            </div>

            {/* Formula */}
            <div className="mb-3">
              <label className="form-label sb-form-label">Formula <span className="text-danger">*</span></label>
              <input type="text" name="formula" className={`form-control sb-input ${errors.formula ? "is-invalid" : ""}`} placeholder="e.g. (availability * performance) / 100" value={form.formula} onChange={handleChange} />
              {errors.formula && <div className="invalid-feedback">{errors.formula}</div>}
              <small style={{ color: "var(--sb-muted)", fontSize: "0.75rem" }}>Use variable names from your sensor data</small>
            </div>

            {/* Unit */}
            <div className="mb-3">
              <label className="form-label sb-form-label">Unit</label>
              <input type="text" name="unit" className="form-control sb-input" placeholder="e.g. %, hrs, units" value={form.unit} onChange={handleChange} />
            </div>

            {/* Color & Icon row */}
            <div className="d-flex gap-3 mb-4">
              <div className="flex-fill">
                <label className="form-label sb-form-label">Color</label>
                <input type="color" name="color" className="form-control sb-input p-1" value={form.color} onChange={handleChange} style={{ height: "42px" }} />
              </div>
              <div className="flex-fill">
                <label className="form-label sb-form-label">Icon Class</label>
                <input type="text" name="icon" className="form-control sb-input" placeholder="e.g. bi-graph-up" value={form.icon} onChange={handleChange} />
              </div>
            </div>

            {/* Preview */}
            {form.formula && (
              <div className="mb-3 p-2" style={{ backgroundColor: "var(--sb-light-bg)", borderRadius: "8px" }}>
                <small style={{ color: "var(--sb-muted)" }}>Preview result: </small>
                <strong style={{ color: "var(--sb-accent)" }}>
                  {evaluateFormula(form.formula, latestValues)} {form.unit}
                </strong>
              </div>
            )}

            <div className="d-flex gap-2 justify-content-end">
              <button className="btn" style={{ border: "1.5px solid var(--sb-border)", color: "var(--sb-text)", borderRadius: "8px", padding: "8px 20px" }} onClick={() => { setShowForm(false); setErrors({}); }}>Cancel</button>
              <button className="btn sb-connect-btn" onClick={handleAddKpi}>
                <i className="bi bi-plus-circle me-2"></i>Add KPI
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KPIManagement;