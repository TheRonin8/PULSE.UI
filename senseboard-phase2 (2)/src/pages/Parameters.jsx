import React, { useState, useEffect, useCallback } from "react";
import api from "../api/axiosInstance";
// FIX 1: Removed leading space; single base — units are nested in the same GET response
const BASE = "/api/parameters";

/* ─── Toggle Switch ───────────────────────────────────────────────── */
const ToggleSwitch = ({ checked, onChange, disabled }) => (
  <div
    onClick={!disabled ? onChange : undefined}
    style={{
      width: 40, height: 22, borderRadius: 11,
      cursor: disabled ? "not-allowed" : "pointer",
      background: checked ? "var(--sb-accent)" : "var(--sb-border)",
      position: "relative", transition: "background .2s", flexShrink: 0,
      opacity: disabled ? 0.5 : 1,
    }}
  >
    <div style={{
      width: 16, height: 16, borderRadius: "50%", background: "#fff",
      position: "absolute", top: 3,
      left: checked ? 21 : 3,
      transition: "left .2s",
      boxShadow: "0 1px 3px rgba(0,0,0,.25)",
    }} />
  </div>
);

/* ─── Inline Form Row ─────────────────────────────────────────────── */
const InlineForm = ({ placeholder, buttonLabel, onSave, onCancel, loading }) => {
  const [name, setName] = useState("");
  const [enabled, setEnabled] = useState(true);

  const handleSave = () => { if (name.trim()) onSave(name.trim(), enabled); };
  const handleKey = (e) => {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") onCancel();
  };

  return (
    <div
      className="d-flex align-items-center gap-2 flex-wrap"
      style={{
        padding: "10px 14px",
        background: "var(--sb-hover, rgba(0,0,0,.03))",
        borderRadius: 8, marginTop: 6,
      }}
    >
      <input
        autoFocus
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={handleKey}
        placeholder={placeholder}
        style={{
          flex: 1, minWidth: 160, padding: "6px 12px", borderRadius: 6, fontSize: 13,
          border: "1px solid var(--sb-border)", background: "var(--sb-bg, #fff)",
          color: "var(--sb-text)", outline: "none",
        }}
      />
      <div className="d-flex align-items-center gap-1" style={{ fontSize: 12, color: "var(--sb-muted)", whiteSpace: "nowrap" }}>
        <ToggleSwitch checked={enabled} onChange={() => setEnabled(v => !v)} />
        <span>{enabled ? "Enabled" : "Disabled"}</span>
      </div>
      <button
        onClick={handleSave}
        disabled={loading || !name.trim()}
        style={{
          padding: "6px 16px", borderRadius: 6, fontSize: 13, fontWeight: 600,
          background: "var(--sb-accent)", color: "#fff", border: "none",
          cursor: loading || !name.trim() ? "not-allowed" : "pointer",
          opacity: loading || !name.trim() ? 0.6 : 1,
        }}
      >
        {loading
          ? <><i className="bi bi-arrow-clockwise me-1" style={{ animation: "spin .7s linear infinite" }} />Saving…</>
          : buttonLabel}
      </button>
      <button
        onClick={onCancel}
        style={{
          padding: "6px 12px", borderRadius: 6, fontSize: 13,
          background: "none", border: "1px solid var(--sb-border)",
          color: "var(--sb-muted)", cursor: "pointer",
        }}
      >
        Cancel
      </button>
    </div>
  );
};

/* ─── Unit Row ────────────────────────────────────────────────────── */
// FIX 4: onToggleUnit is now a plain prop — no function-property hack
const UnitRow = ({ unit, onToggleUnit }) => {
  const [busy, setBusy] = useState(false);

  const handleToggle = async () => {
    setBusy(true);
    await onToggleUnit(unit);
    setBusy(false);
  };

  return (
    <div
      className="d-flex align-items-center justify-content-between"
      style={{
        padding: "8px 14px", borderRadius: 6, marginBottom: 4,
        background: "var(--sb-hover, rgba(0,0,0,.025))",
        border: "1px solid var(--sb-border)",
      }}
    >
      <div className="d-flex align-items-center gap-2">
        <i className="bi bi-rulers" style={{ fontSize: 13, color: "var(--sb-muted)" }} />
        <span style={{ fontSize: 13, color: "var(--sb-text)" }}>
          {unit.unit || unit.unitName || unit.name}
        </span>
      </div>
      <div className="d-flex align-items-center gap-2">
        <span style={{ fontSize: 11, color: unit.isEnabled ? "var(--sb-accent)" : "var(--sb-muted)" }}>
          {unit.isEnabled ? "Enabled" : "Disabled"}
        </span>
        <ToggleSwitch checked={!!unit.isEnabled} onChange={handleToggle} disabled={busy} />
      </div>
    </div>
  );
};

/* ─── Parameter Row ───────────────────────────────────────────────── */
// FIX 4: separate onToggleParam and onToggleUnit props instead of the hack
const ParameterRow = ({
  param,
  onToggleParam,
  onToggleUnit,
  onAddUnit,
  addingUnitId,
  setAddingUnitId,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState(false);

  // FIX 2: units come from param.units (nested in API response)
  const units = param.units || [];
  const pid = param.parameterId || param.id;
  const isAddingUnit = addingUnitId === pid;

  const handleToggle = async () => {
    setBusy(true);
    await onToggleParam(param);
    setBusy(false);
  };

  return (
    <div style={{
      border: "1px solid var(--sb-border)", borderRadius: 10, marginBottom: 10,
      overflow: "hidden", background: "var(--sb-card-bg, var(--sb-bg, #fff))",
    }}>
      {/* Header row */}
      <div
        className="d-flex align-items-center justify-content-between"
        style={{ padding: "12px 16px" }}
      >
        <div className="d-flex align-items-center gap-3" style={{ flex: 1, minWidth: 0 }}>
          <button
            onClick={() => setExpanded(v => !v)}
            style={{
              background: "none", border: "none", cursor: "pointer", padding: 0,
              color: "var(--sb-muted)", fontSize: 13, display: "flex", alignItems: "center",
            }}
            title={expanded ? "Collapse" : "Expand units"}
          >
            <i className={`bi bi-chevron-${expanded ? "down" : "right"}`} />
          </button>
          <i className="bi bi-tag" style={{ fontSize: 14, color: "var(--sb-accent)", flexShrink: 0 }} />
          <span style={{
            fontSize: 14, fontWeight: 600, color: "var(--sb-text)",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {param.parameterName || param.name}
          </span>
          <span style={{
            fontSize: 11, padding: "2px 8px", borderRadius: 20,
            background: units.length
              ? "rgba(var(--sb-accent-rgb, 99,102,241),.1)"
              : "var(--sb-hover, rgba(0,0,0,.05))",
            color: units.length ? "var(--sb-accent)" : "var(--sb-muted)",
            fontWeight: 600, flexShrink: 0,
          }}>
            {units.length} unit{units.length !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="d-flex align-items-center gap-3">
          <button
            onClick={() => { setAddingUnitId(isAddingUnit ? null : pid); setExpanded(true); }}
            style={{
              padding: "5px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600,
              background: "none", border: "1px solid var(--sb-border)",
              color: "var(--sb-accent)", cursor: "pointer",
              display: "flex", alignItems: "center", gap: 5,
            }}
            title="Add unit"
          >
            <i className="bi bi-plus-lg" style={{ fontSize: 11 }} /> Unit
          </button>
          <div className="d-flex align-items-center gap-2">
            <span style={{ fontSize: 11, color: param.isEnabled ? "var(--sb-accent)" : "var(--sb-muted)" }}>
              {param.isEnabled ? "Enabled" : "Disabled"}
            </span>
            <ToggleSwitch checked={!!param.isEnabled} onChange={handleToggle} disabled={busy} />
          </div>
        </div>
      </div>

      {/* Expanded units */}
      {expanded && (
        <div style={{ padding: "0 16px 12px 44px", borderTop: "1px solid var(--sb-border)" }}>
          <div style={{ paddingTop: 10 }}>
            {units.length === 0 && !isAddingUnit && (
              <div
                className="d-flex align-items-center gap-2"
                style={{ padding: "10px 0", color: "var(--sb-muted)", fontSize: 13 }}
              >
                <i className="bi bi-info-circle" />
                <span>No units yet. Click <strong>+ Unit</strong> to add one.</span>
              </div>
            )}
            {units.map(u => (
              <UnitRow
                key={u.parameterUnitId || u.id}
                unit={u}
                onToggleUnit={onToggleUnit}   // FIX 4: plain prop
              />
            ))}
            {isAddingUnit && (
              <InlineForm
                placeholder="Unit name (e.g. kg, km, °C)"
                buttonLabel="Add Unit"
                onSave={(name, enabled) => onAddUnit(pid, name, enabled)}
                onCancel={() => setAddingUnitId(null)}
                loading={false}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/* ─── Main Parameters Page ────────────────────────────────────────── */
const Parameters = () => {
  const [parameters, setParameters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddParam, setShowAddParam] = useState(false);
  const [savingParam, setSavingParam] = useState(false);
  const [addingUnitId, setAddingUnitId] = useState(null);
  const [search, setSearch] = useState("");
  const [toastMsg, setToastMsg] = useState(null);

  const toast = (msg, type = "success") => {
    setToastMsg({ msg, type });
    setTimeout(() => setToastMsg(null), 3000);
  };

  // FIX 2: single fetch — units are nested inside each parameter object
 const fetchAll = useCallback(async () => {
  setLoading(true);
  setError(null);
  try {
    const res = await api.get(`${BASE}/admin/all`);
    setParameters(Array.isArray(res.data) ? res.data : []);
  } catch (err) {
    console.error(err);
    setError("Could not load parameters. Please try again.");
  } finally {
    setLoading(false);
  }
}, []);
  useEffect(() => { fetchAll(); }, [fetchAll]);

  // FIX 3: correct PUT URL — /api/parameters/admin/{parameterId}
  const handleToggleParam = async (param) => {
  const pid = param.parameterId || param.id;
  try {
    await api.put(`${BASE}/${pid}`, {
      IsEnabled: !param.isEnabled,
    });

    setParameters(prev =>
      prev.map(p =>
        (p.parameterId || p.id) === pid
          ? { ...p, isEnabled: !p.isEnabled }
          : p
      )
    );

    toast("Parameter updated");
  } catch {
    toast("Failed to update parameter", "error");
  }
};


  // FIX 3: correct PUT URL — /api/parameters/admin/units/{parameterUnitId}
 const handleToggleUnit = async (unit) => {
  const uid = unit.parameterUnitId || unit.id;
  try {
    await api.put(`${BASE}/unit/${uid}`, {
      IsEnabled: !unit.isEnabled,
    });

    setParameters(prev =>
      prev.map(p => ({
        ...p,
        units: p.units.map(u =>
          (u.parameterUnitId || u.id) === uid
            ? { ...u, isEnabled: !u.isEnabled }
            : u
        ),
      }))
    );

    toast("Unit updated");
  } catch {
    toast("Failed to update unit", "error");
  }
};
``

  // POST /api/parameters/admin
  const handleAddParam = async (name, isEnabled) => {
  setSavingParam(true);
  try {
    const res = await api.post(`${BASE}`, {
      ParameterName: name,
      IsEnabled: isEnabled,
    });

    setParameters(prev => [...prev, { ...res.data, units: [] }]);
    setShowAddParam(false);
    toast("Parameter added");
  } catch {
    toast("Failed to add parameter", "error");
  } finally {
    setSavingParam(false);
  }
};

  // POST /api/parameters/admin/units/{parameterId}
 const handleAddUnit = async (parameterId, unitName, isEnabled) => {
  try {
    const res = await api.post(`${BASE}/unit/${parameterId}`, {
      Unit: unitName,
      IsEnabled: isEnabled,
    });

    setParameters(prev =>
      prev.map(p =>
        (p.parameterId || p.id) === parameterId
          ? { ...p, units: [...p.units, res.data] }
          : p
      )
    );

    toast("Unit added");
    setAddingUnitId(null);
  } catch {
    toast("Failed to add unit", "error");
  }
};

  const filtered = parameters.filter(p =>
    (p.parameterName || p.name || "").toLowerCase().includes(search.toLowerCase())
  );

  const enabledCount = parameters.filter(p => p.isEnabled).length;
  const disabledCount = parameters.length - enabledCount;

  return (
    <div style={{ padding: "24px", maxWidth: 820, position: "relative" }}>

      {/* Toast */}
      {toastMsg && (
        <div style={{
          position: "fixed", bottom: 28, right: 28, zIndex: 9999,
          padding: "10px 20px", borderRadius: 8, fontSize: 13, fontWeight: 500,
          background: toastMsg.type === "error" ? "#dc3545" : "var(--sb-accent)",
          color: "#fff", boxShadow: "0 4px 16px rgba(0,0,0,.18)",
          display: "flex", alignItems: "center", gap: 8,
          animation: "fadeInUp .25s ease",
        }}>
          <i className={`bi ${toastMsg.type === "error" ? "bi-exclamation-circle" : "bi-check-circle"}`} />
          {toastMsg.msg}
        </div>
      )}

      {/* Stats bar */}
      <div className="d-flex gap-3 mb-4 flex-wrap">
        {[
          { icon: "bi-list-ul", label: "Total", value: parameters.length, color: "var(--sb-text)" },
          { icon: "bi-check-circle-fill", label: "Enabled", value: enabledCount, color: "var(--sb-accent)" },
          { icon: "bi-dash-circle", label: "Disabled", value: disabledCount, color: "var(--sb-muted)" },
        ].map(s => (
          <div key={s.label} style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "10px 18px", borderRadius: 8,
            border: "1px solid var(--sb-border)",
            background: "var(--sb-card-bg, var(--sb-bg, #fff))",
            minWidth: 110,
          }}>
            <i className={`bi ${s.icon}`} style={{ fontSize: 18, color: s.color }} />
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: s.color, lineHeight: 1.1 }}>{s.value}</div>
              <div style={{ fontSize: 11, color: "var(--sb-muted)" }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="d-flex align-items-center justify-content-between gap-3 mb-3 flex-wrap">
        <div style={{ position: "relative", flex: 1, minWidth: 180, maxWidth: 300 }}>
          <i className="bi bi-search" style={{
            position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
            color: "var(--sb-muted)", fontSize: 13, pointerEvents: "none",
          }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search parameters…"
            style={{
              width: "100%", padding: "7px 12px 7px 32px", borderRadius: 7, fontSize: 13,
              border: "1px solid var(--sb-border)", background: "var(--sb-bg, #fff)",
              color: "var(--sb-text)", outline: "none",
            }}
          />
        </div>
        <div className="d-flex gap-2">
          <button
            onClick={fetchAll}
            disabled={loading}
            style={{
              padding: "7px 14px", borderRadius: 7, fontSize: 13,
              background: "none", border: "1px solid var(--sb-border)",
              color: "var(--sb-muted)", cursor: "pointer",
              display: "flex", alignItems: "center", gap: 6,
            }}
            title="Refresh"
          >
            <i className={`bi bi-arrow-clockwise${loading ? " spin" : ""}`} />
          </button>
          <button
            onClick={() => setShowAddParam(v => !v)}
            style={{
              padding: "7px 16px", borderRadius: 7, fontSize: 13, fontWeight: 600,
              background: "var(--sb-accent)", color: "#fff", border: "none",
              cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
            }}
          >
            <i className="bi bi-plus-lg" /> Add Parameter
          </button>
        </div>
      </div>

      {/* Add Parameter inline form */}
      {showAddParam && (
        <div style={{ marginBottom: 16 }}>
          <InlineForm
            placeholder="Parameter name (e.g. Temperature, Pressure)"
            buttonLabel="Create Parameter"
            onSave={handleAddParam}
            onCancel={() => setShowAddParam(false)}
            loading={savingParam}
          />
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="d-flex align-items-center justify-content-center" style={{ minHeight: 180 }}>
          <div style={{ textAlign: "center", color: "var(--sb-muted)" }}>
            <i className="bi bi-arrow-clockwise spin mb-2 d-block" style={{ fontSize: "2rem" }} />
            <span style={{ fontSize: 14 }}>Loading parameters…</span>
          </div>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div
          className="d-flex align-items-center gap-3"
          style={{
            padding: "16px", borderRadius: 8,
            background: "rgba(220,53,69,.08)",
            border: "1px solid rgba(220,53,69,.2)", marginBottom: 16,
          }}
        >
          <i className="bi bi-exclamation-triangle-fill" style={{ color: "#dc3545", fontSize: 18 }} />
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: 13, color: "#dc3545" }}>{error}</span>
          </div>
          <button onClick={fetchAll} style={{
            padding: "5px 14px", borderRadius: 6, fontSize: 12,
            background: "#dc3545", color: "#fff", border: "none", cursor: "pointer",
          }}>
            Retry
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && filtered.length === 0 && (
        <div className="d-flex align-items-center justify-content-center" style={{ minHeight: 200 }}>
          <div style={{ textAlign: "center", color: "var(--sb-muted)" }}>
            <i className="bi bi-sliders mb-3 d-block" style={{ fontSize: "2.5rem" }} />
            <h6 style={{ color: "var(--sb-text)" }}>
              {search ? "No matching parameters" : "No parameters yet"}
            </h6>
            <p className="small mb-0">
              {search
                ? `No results for "${search}"`
                : 'Click "Add Parameter" to create your first one.'}
            </p>
          </div>
        </div>
      )}

      {/* Parameter list */}
      {!loading && !error && filtered.length > 0 && (
        <div>
          {filtered.map(param => {
            const pid = param.parameterId || param.id;
            return (
              <ParameterRow
                key={pid}
                param={param}
                onToggleParam={handleToggleParam}    // FIX 4: clean separate props
                onToggleUnit={handleToggleUnit}
                onAddUnit={handleAddUnit}
                addingUnitId={addingUnitId}
                setAddingUnitId={setAddingUnitId}
              />
            );
          })}
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { display: inline-block; animation: spin .7s linear infinite; }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default Parameters;
