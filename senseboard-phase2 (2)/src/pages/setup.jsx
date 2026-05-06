import React, { useState, useEffect } from "react";
import api from "../api/axiosInstance";

// ─── API calls ───────────────────────────────────────────────────────────────
const getProtocolsByAdmin = () => api.get("/api/protocols/admin/all");
const updateProtocol      = (id, accessAllowed) =>
  api.put(`/api/protocols/${id}`, { accessAllowed });
const createProtocol      = (payload) =>
  api.post("/api/protocols", payload);

// ─── Protocol icon map ───────────────────────────────────────────────────────
const PROTOCOL_META = {
  MQTT:      { icon: "bi-broadcast",         color: "#00c6ae", desc: "Lightweight pub/sub messaging for IoT devices" },
  ModBus:    { icon: "bi-hdd-network",       color: "#0f8fd4", desc: "Serial communication protocol for industrial devices" },
  TCP:       { icon: "bi-diagram-3",         color: "#7b5ea7", desc: "Reliable connection-oriented data transmission" },
  WebSocket: { icon: "bi-arrow-left-right",  color: "#f39c12", desc: "Full-duplex real-time communication over HTTP" },
};
const getProtocolMeta = (name) =>
  PROTOCOL_META[name] ?? { icon: "bi-plug", color: "#6c757d", desc: "Communication protocol" };

// ─── Toggle Switch component ─────────────────────────────────────────────────
const ToggleSwitch = ({ checked, onChange, disabled, color }) => (
  <div
    onClick={() => !disabled && onChange(!checked)}
    style={{
      width: 48, height: 26, borderRadius: 13,
      background: checked ? (color || "#00c6ae") : "var(--sb-border)",
      position: "relative",
      cursor: disabled ? "not-allowed" : "pointer",
      transition: "background 0.25s ease",
      flexShrink: 0,
      boxShadow: checked ? `0 0 0 3px ${(color || "#00c6ae")}28` : "none",
      opacity: disabled ? 0.55 : 1,
    }}
  >
    <div style={{
      position: "absolute", top: 3,
      left: checked ? 25 : 3,
      width: 20, height: 20, borderRadius: "50%",
      background: "#fff",
      boxShadow: "0 1px 4px rgba(0,0,0,0.22)",
      transition: "left 0.22s cubic-bezier(.4,0,.2,1)",
    }} />
  </div>
);

// ─── Add Protocol Modal ───────────────────────────────────────────────────────
const AddProtocolModal = ({ onClose, onSaved }) => {
  const [form, setForm]     = useState({ protocolName: "", accessAllowed: true });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState("");

  const validate = () => {
    const e = {};
    if (!form.protocolName.trim()) e.protocolName = "Protocol name is required.";
    return e;
  };

  const handleSave = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);
    setErr("");
    try {
      await createProtocol({
        protocolName: form.protocolName.trim(),
        accessAllowed: form.accessAllowed,
      });
      onSaved(`Protocol "${form.protocolName.trim()}" created successfully.`);
    } catch (ex) {
      setErr(ex?.response?.data?.message || "Failed to create protocol.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1060,
      background: "rgba(0,0,0,0.48)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
    }}
      onClick={onClose}
    >
      <div style={{
        width: "100%", maxWidth: 420,
        background: "var(--sb-white)", borderRadius: 18,
        boxShadow: "0 20px 56px rgba(0,0,0,0.16)", overflow: "hidden",
      }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: "16px 22px 14px",
          borderBottom: "1px solid var(--sb-border)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <h5 style={{ margin: 0, fontWeight: 800, color: "var(--sb-text)", fontSize: "1rem" }}>
              <i className="bi bi-plus-circle me-2" style={{ color: "var(--sb-accent)" }} />
              Add Protocol
            </h5>
            <p style={{ margin: 0, fontSize: "0.72rem", color: "var(--sb-muted)", marginTop: 2 }}>
              Register a new communication protocol
            </p>
          </div>
          <button className="btn-close" onClick={onClose} />
        </div>

        {/* Body */}
        <div style={{ padding: "20px 22px" }}>
          {err && (
            <div style={{
              marginBottom: 14, padding: "8px 12px", borderRadius: 8,
              background: "rgba(229,62,62,0.08)", border: "1px solid rgba(229,62,62,0.25)",
              fontSize: "0.78rem", color: "#e53e3e", fontWeight: 600,
              display: "flex", alignItems: "center", gap: 7,
            }}>
              <i className="bi bi-exclamation-circle-fill" />
              {err}
            </div>
          )}

          {/* Protocol Name */}
          <div className="mb-4">
            <label style={{
              fontSize: "0.67rem", fontWeight: 700, letterSpacing: "0.8px",
              textTransform: "uppercase", color: "var(--sb-muted)", marginBottom: 4, display: "block",
            }}>
              Protocol Name *
            </label>
            <input
              className={`field-input${errors.protocolName ? " err" : ""}`}
              placeholder="e.g. MQTT, ModBus, WebSocket"
              value={form.protocolName}
              onChange={e => {
                setForm(f => ({ ...f, protocolName: e.target.value }));
                setErrors(v => ({ ...v, protocolName: "" }));
              }}
              style={{
                width: "100%", background: "var(--sb-light-bg)",
                border: `1px solid ${errors.protocolName ? "#e53e3e" : "var(--sb-border)"}`,
                borderRadius: 8, padding: "8px 12px",
                color: "var(--sb-text)", fontSize: "0.88rem",
                outline: "none", fontFamily: "inherit",
              }}
            />
            {errors.protocolName && (
              <p style={{ fontSize: "0.66rem", color: "#e53e3e", margin: "4px 0 0" }}>
                {errors.protocolName}
              </p>
            )}
          </div>

          {/* Access toggle */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "12px 14px", borderRadius: 10,
            background: form.accessAllowed ? "rgba(0,198,174,0.07)" : "var(--sb-light-bg)",
            border: `1px solid ${form.accessAllowed ? "rgba(0,198,174,0.22)" : "var(--sb-border)"}`,
            transition: "all 0.2s",
          }}>
            <div>
              <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--sb-text)" }}>
                Enable on creation
              </div>
              <div style={{ fontSize: "0.72rem", color: "var(--sb-muted)", marginTop: 2 }}>
                Allow users to connect via this protocol immediately
              </div>
            </div>
            <ToggleSwitch
              checked={form.accessAllowed}
              onChange={val => setForm(f => ({ ...f, accessAllowed: val }))}
              color="#00c6ae"
            />
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: "12px 22px", borderTop: "1px solid var(--sb-border)",
          display: "flex", justifyContent: "flex-end", gap: 8,
        }}>
          <button
            style={{
              padding: "7px 18px", borderRadius: 8,
              border: "1.5px solid var(--sb-border)", background: "none",
              color: "var(--sb-text)", fontWeight: 600, cursor: "pointer", fontSize: "0.87rem",
            }}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="btn sb-connect-btn"
            style={{ borderRadius: 8, padding: "7px 20px", fontWeight: 600, fontSize: "0.87rem" }}
            onClick={handleSave}
            disabled={saving}
          >
            {saving
              ? <><span className="spinner-border spinner-border-sm me-2" />Saving…</>
              : <><i className="bi bi-plus-circle me-2" />Add Protocol</>
            }
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Protocol Card ───────────────────────────────────────────────────────────
const ProtocolCard = ({ protocol, onToggle, toggling }) => {
  const meta    = getProtocolMeta(protocol.protocolName);
  const active  = protocol.accessAllowed;
  const loading = toggling === protocol.protocolId;

  return (
    <div
      style={{
        background: active
          ? `linear-gradient(145deg, ${meta.color}0d 0%, rgba(255,255,255,0.98) 60%)`
          : "var(--sb-white)",
        border: active
          ? `1.5px solid ${meta.color}30`
          : "1.5px solid var(--sb-border)",
        borderRadius: 18,
        padding: "22px 24px",
        display: "flex",
        alignItems: "center",
        gap: 18,
        transition: "box-shadow 0.2s, transform 0.2s, border-color 0.25s, background 0.3s",
        position: "relative",
        overflow: "hidden",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = "0 8px 28px rgba(0,0,0,0.09)";
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = "";
        e.currentTarget.style.transform = "";
      }}
    >
      {/* Top accent bar */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 3,
        background: active ? meta.color : "var(--sb-border)",
        borderRadius: "18px 18px 0 0",
        transition: "background 0.3s",
      }} />

      {/* Icon */}
      <div style={{
        width: 52, height: 52, borderRadius: 14, flexShrink: 0,
        background: active ? meta.color + "1a" : "var(--sb-light-bg)",
        border: `1.5px solid ${active ? meta.color + "35" : "var(--sb-border)"}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "all 0.25s",
      }}>
        <i
          className={`bi ${meta.icon}`}
          style={{ fontSize: "1.4rem", color: active ? meta.color : "var(--sb-muted)", transition: "color 0.25s" }}
        />
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: "1.02rem", fontWeight: 800, color: "var(--sb-text)", letterSpacing: "-0.3px" }}>
            {protocol.protocolName}
          </span>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            fontSize: "0.68rem", fontWeight: 700, padding: "2px 9px",
            borderRadius: 50, whiteSpace: "nowrap",
            background: active ? meta.color + "14" : "rgba(150,150,150,0.10)",
            color:      active ? meta.color         : "#999",
            border:     `1px solid ${active ? meta.color + "30" : "#ddd"}`,
            transition: "all 0.25s",
          }}>
            <span style={{
              width: 5, height: 5, borderRadius: "50%",
              background: active ? meta.color : "#bbb",
              display: "inline-block",
              animation: active ? "pulseDot 2s infinite" : "none",
              transition: "background 0.25s",
            }} />
            {active ? "Enabled" : "Disabled"}
          </span>
        </div>
        <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--sb-muted)", lineHeight: 1.4 }}>
          {meta.desc}
        </p>
        <div style={{
          marginTop: 8, display: "inline-flex", alignItems: "center", gap: 5,
          fontSize: "0.67rem", fontWeight: 700, color: "var(--sb-muted)",
          background: "var(--sb-light-bg)", padding: "2px 8px", borderRadius: 6,
          border: "1px solid var(--sb-border)",
        }}>
          <i className="bi bi-hash" style={{ fontSize: "0.6rem" }} />
          Protocol ID {protocol.protocolId}
        </div>
      </div>

      {/* Toggle */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flexShrink: 0 }}>
        {loading ? (
          <div style={{ width: 48, height: 26, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div className="spinner-border spinner-border-sm" style={{ color: meta.color, width: "1rem", height: "1rem" }} />
          </div>
        ) : (
          <ToggleSwitch
            checked={active}
            onChange={(val) => onToggle(protocol.protocolId, val)}
            color={meta.color}
          />
        )}
        <span style={{
          fontSize: "0.63rem", fontWeight: 700,
          color: active ? meta.color : "var(--sb-muted)",
          textTransform: "uppercase", letterSpacing: "0.5px", transition: "color 0.25s",
        }}>
          {active ? "On" : "Off"}
        </span>
      </div>
    </div>
  );
};

// ─── Setup page ──────────────────────────────────────────────────────────────
const Setup = () => {
  const [protocols, setProtocols]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [toggling, setToggling]     = useState(null);
  const [toast, setToast]           = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  };

  const loadProtocols = () => {
    setLoading(true);
    getProtocolsByAdmin()
      .then(res => {
        const data = Array.isArray(res.data) ? res.data : [];
        setProtocols(data);
      })
      .catch(() => showToast("Failed to load protocols.", "danger"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadProtocols(); }, []);

  const handleToggle = async (protocolId, newValue) => {
    setProtocols(prev =>
      prev.map(p => p.protocolId === protocolId ? { ...p, accessAllowed: newValue } : p)
    );
    setToggling(protocolId);
    try {
      await updateProtocol(protocolId, newValue);
      const name = protocols.find(p => p.protocolId === protocolId)?.protocolName ?? "Protocol";
      showToast(`${name} ${newValue ? "enabled" : "disabled"} successfully.`);
    } catch (e) {
      setProtocols(prev =>
        prev.map(p => p.protocolId === protocolId ? { ...p, accessAllowed: !newValue } : p)
      );
      showToast(e?.response?.data?.message || "Failed to update protocol.", "danger");
    } finally {
      setToggling(null);
    }
  };

  const handleProtocolSaved = (msg) => {
    setShowAddModal(false);
    showToast(msg);
    loadProtocols();
  };

  const enabledCount  = protocols.filter(p => p.accessAllowed).length;
  const disabledCount = protocols.length - enabledCount;

  return (
    <div>
      <style>{`
        @keyframes pulseDot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(0.7)} }
        @keyframes fadeInUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        .protocol-card-enter { animation: fadeInUp 0.3s ease both; }
      `}</style>

      {/* ── Page Header ── */}
      <div className="px-4 py-3 mb-2" style={{ borderBottom: "1px solid var(--sb-border)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h5 style={{
              margin: 0, fontWeight: 800, fontSize: "1.3rem",
              color: "var(--sb-text)", display: "flex", alignItems: "center", gap: 8,
            }}>
              <i className="bi bi-gear" style={{ color: "var(--sb-accent)" }} />
              Communication Protocols
            </h5>
            <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--sb-muted)", marginTop: 2 }}>
              Enable or disable protocols for sensor connections
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Summary pills */}
            {!loading && protocols.length > 0 && (
              <div style={{ display: "flex", gap: 8 }}>
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "6px 14px", borderRadius: 50, fontSize: "0.78rem", fontWeight: 700,
                  background: "rgba(0,198,174,0.09)", color: "#00c6ae",
                  border: "1px solid rgba(0,198,174,0.22)",
                }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#00c6ae", display: "inline-block", animation: "pulseDot 2s infinite" }} />
                  {enabledCount} Enabled
                </span>
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "6px 14px", borderRadius: 50, fontSize: "0.78rem", fontWeight: 700,
                  background: "rgba(150,150,150,0.09)", color: "#888",
                  border: "1px solid rgba(150,150,150,0.20)",
                }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#ccc", display: "inline-block" }} />
                  {disabledCount} Disabled
                </span>
              </div>
            )}

            {/* Add Protocol button */}
            <button
              onClick={() => setShowAddModal(true)}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "8px 18px", borderRadius: 50, border: "none",
                background: "var(--sb-accent)", color: "#fff",
                fontSize: "0.85rem", fontWeight: 700, cursor: "pointer",
                transition: "opacity 0.15s",
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = "0.87"}
              onMouseLeave={e => e.currentTarget.style.opacity = "1"}
            >
              <i className="bi bi-plus-circle-fill" />
              Add Protocol
            </button>
          </div>
        </div>
      </div>

      {/* ── Toast ── */}
      {toast && (
        <div style={{ position: "fixed", top: 16, right: 16, zIndex: 9999 }}>
          <div className={`alert alert-${toast.type} shadow border-0 d-flex align-items-center gap-2 mb-0`}>
            <i className={`bi bi-${toast.type === "success" ? "check-circle-fill" : "exclamation-circle-fill"}`} />
            {toast.msg}
          </div>
        </div>
      )}

      {/* ── Content ── */}
      <div className="container-fluid px-4 py-4">
        {/* Warning banner */}
        <div style={{
          marginBottom: 20, padding: "11px 16px", borderRadius: 10,
          background: "rgba(229,62,62,0.07)", border: "1px solid rgba(229,62,62,0.22)",
          display: "flex", alignItems: "flex-start", gap: 10,
        }}>
          <i className="bi bi-exclamation-triangle-fill" style={{ color: "#e53e3e", fontSize: "1rem", marginTop: 1, flexShrink: 0 }} />
          <div style={{ fontSize: "0.78rem", color: "#e53e3e", fontWeight: 600, lineHeight: 1.5 }}>
            Before enabling any protocol, make sure the backend is properly configured to handle its connections.
          </div>
        </div>

        {/* Cards */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "50px 0" }}>
            <div className="spinner-border" style={{ color: "var(--sb-accent)" }} />
            <p style={{ marginTop: 12, color: "var(--sb-muted)", fontSize: "0.85rem" }}>Loading protocols…</p>
          </div>
        ) : protocols.length === 0 ? (
          <div style={{ textAlign: "center", padding: "64px 0", color: "var(--sb-muted)" }}>
            <i className="bi bi-plug" style={{ fontSize: "2.8rem", display: "block", marginBottom: 12, opacity: 0.3 }} />
            <p style={{ fontWeight: 600, fontSize: "1rem", marginBottom: 6 }}>No protocols found</p>
            <button
              onClick={() => setShowAddModal(true)}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "8px 20px", borderRadius: 50, border: "none",
                background: "var(--sb-accent)", color: "#fff",
                fontSize: "0.85rem", fontWeight: 700, cursor: "pointer",
              }}
            >
              <i className="bi bi-plus-circle-fill" />Add your first protocol
            </button>
          </div>
        ) : (
          <div className="row g-3">
            {protocols.map((protocol, idx) => (
              <div
                key={protocol.protocolId}
                className="col-12 col-md-6 col-xl-6 protocol-card-enter"
                style={{ animationDelay: `${idx * 60}ms` }}
              >
                <ProtocolCard
                  protocol={protocol}
                  onToggle={handleToggle}
                  toggling={toggling}
                />
              </div>
            ))}
          </div>
        )}

        {/* Info note */}
        {!loading && protocols.length > 0 && (
          <div style={{
            marginTop: 28, padding: "12px 16px", borderRadius: 12,
            background: "rgba(15,143,212,0.06)", border: "1px solid rgba(15,143,212,0.18)",
            display: "flex", alignItems: "flex-start", gap: 10,
          }}>
            <i className="bi bi-info-circle-fill" style={{ color: "#0f8fd4", fontSize: "1rem", marginTop: 1, flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#0f8fd4" }}>Protocol Access Control</div>
              <div style={{ fontSize: "0.75rem", color: "var(--sb-muted)", marginTop: 2, lineHeight: 1.5 }}>
                Enabling a protocol allows users to create sensor connections using that communication standard.
                Changes take effect immediately for new connections. Existing connections are not affected.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Add Protocol Modal ── */}
      {showAddModal && (
        <AddProtocolModal
          onClose={() => setShowAddModal(false)}
          onSaved={handleProtocolSaved}
        />
      )}
    </div>
  );
};

export default Setup;