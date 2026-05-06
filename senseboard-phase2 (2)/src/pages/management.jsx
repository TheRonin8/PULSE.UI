import React, { useState, useEffect, useCallback } from "react";
import api from "../api/axiosInstance";

function toArray(d) {
  if (Array.isArray(d)) return d;
  if (d?.data   && Array.isArray(d.data))   return d.data;
  if (d?.items  && Array.isArray(d.items))  return d.items;
  if (d?.result && Array.isArray(d.result)) return d.result;
  return [];
}

const PAL = [
  { bg:"#dbeafe", fg:"#1d4ed8" }, { bg:"#dcfce7", fg:"#15803d" },
  { bg:"#fef9c3", fg:"#a16207" }, { bg:"#fce7f3", fg:"#9d174d" },
  { bg:"#ede9fe", fg:"#6d28d9" }, { bg:"#ccfbf1", fg:"#0f766e" },
];
function Avatar({ name = "?", size = 38 }) {
  const ini = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const c   = PAL[name.charCodeAt(0) % PAL.length];
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", background: c.bg, color: c.fg,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontWeight: 600, fontSize: size * 0.34, flexShrink: 0, userSelect: "none",
    }}>{ini}</div>
  );
}

function StatusBadge({ status }) {
  const label = status === true || status === "true" ? "Active"
    : status === false || status === "false" ? "Inactive"
    : status ?? "Active";
  const map = {
    Active:   { bg: "#dcfce7", color: "#15803d" },
    Inactive: { bg: "#f1f5f9", color: "#64748b" },
    Pending:  { bg: "#fef9c3", color: "#a16207" },
    Error:    { bg: "#fee2e2", color: "#b91c1c" },
  };
  const s = map[label] || map.Active;
  return (
    <span style={{ background: s.bg, color: s.color, fontSize: 12, fontWeight: 600, padding: "2px 10px", borderRadius: 20 }}>
      {label}
    </span>
  );
}

function RoleBadge({ role }) {
  const isAdmin = role?.toLowerCase() === "admin";
  return (
    <span style={{
      background: isAdmin ? "#ede9fe" : "#f1f5f9",
      color: isAdmin ? "#6d28d9" : "#64748b",
      fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20,
    }}>
      {role ?? "User"}
    </span>
  );
}

// ─── Confirm Modal ──────────────────────────────────────────────────────────────
function ConfirmModal({ message, onConfirm, onClose, confirmLabel = "Confirm", confirmStyle = "btn-danger" }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999,
    }}>
      <div style={{
        background: "var(--sb-card-bg)", borderRadius: 16, padding: "32px 28px",
        minWidth: 340, maxWidth: "90vw", boxShadow: "0 24px 60px rgba(0,0,0,0.18)", textAlign: "center",
      }}>
        <i className="bi bi-exclamation-triangle-fill mb-3 d-block" style={{ fontSize: "2rem", color: "#f59e0b" }} />
        <p style={{ fontWeight: 600, fontSize: 15, color: "var(--sb-text)", marginBottom: 20 }}>{message}</p>
        <div className="d-flex gap-2 justify-content-center">
          <button className="btn btn-sm btn-outline-secondary px-4" onClick={onClose}>Cancel</button>
          <button className={`btn btn-sm px-4 ${confirmStyle}`} onClick={() => { onConfirm(); onClose(); }}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Connections tab ────────────────────────────────────────────────────────────
function ConnectionsTab({ connections }) {
  if (!connections) return <p className="text-muted small p-3">Loading…</p>;
  if (!connections.length) return <p className="text-muted small p-3">No connections for this user.</p>;
  return (
    <div className="table-responsive">
      <table className="table table-sm mb-0" style={{ fontSize: 14 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--sb-border)" }}>
            {["Name", "URL", "Port", "Protocol", "TLS", "Public"].map(h => (
              <th key={h} className="text-muted small py-2 px-3" style={{ background: "var(--sb-card-bg)", fontWeight: 500 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {connections.map((c, i) => (
            <tr key={c.connectionId ?? i} style={{ borderBottom: "1px solid var(--sb-border)" }}>
              <td className="py-2 px-3 fw-semibold">{c.connectionName ?? "—"}</td>
              <td className="py-2 px-3 text-muted" style={{ fontFamily: "monospace", fontSize: 12 }}>{c.connectionUrl ?? "—"}</td>
              <td className="py-2 px-3">{c.port ?? "—"}</td>
              <td className="py-2 px-3">{c.protocol ?? "—"}</td>
              <td className="py-2 px-3">{c.tlsEnabled ? "Yes" : "No"}</td>
              <td className="py-2 px-3">{c.isPublic ? "Yes" : "No"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Sensors tab ────────────────────────────────────────────────────────────────
function SensorsTab({ connections }) {
  if (!connections) return <p className="text-muted small p-3">Loading…</p>;
  const rows = connections.flatMap(c => (c.sensors ?? []).map(s => ({ ...s, _connName: c.connectionName })));
  if (!rows.length) return <p className="text-muted small p-3">No sensors for this user.</p>;
  return (
    <div className="table-responsive">
      <table className="table table-sm mb-0" style={{ fontSize: 14 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--sb-border)" }}>
            {["Name", "Quantity", "Unit", "Topic", "Location", "Connection", "Status"].map(h => (
              <th key={h} className="text-muted small py-2 px-3" style={{ background: "var(--sb-card-bg)", fontWeight: 500 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((s, i) => (
            <tr key={s.sensorId ?? i} style={{ borderBottom: "1px solid var(--sb-border)" }}>
              <td className="py-2 px-3 fw-semibold">{s.sensorName ?? "—"}</td>
              <td className="py-2 px-3 text-muted">{s.quantity ?? "—"}</td>
              <td className="py-2 px-3 text-muted">{s.unit ?? "—"}</td>
              <td className="py-2 px-3 text-muted" style={{ fontFamily: "monospace", fontSize: 12 }}>{s.topicName ?? "—"}</td>
              <td className="py-2 px-3 text-muted">{s.locatedAt ?? "—"}</td>
              <td className="py-2 px-3 text-muted">{s._connName ?? "—"}</td>
              <td className="py-2 px-3"><StatusBadge status={s.isActive} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── KPIs tab ───────────────────────────────────────────────────────────────────
function KPIsTab({ kpis }) {
  if (!kpis) return <p className="text-muted small p-3">Loading…</p>;
  if (!kpis.length) return <p className="text-muted small p-3">No KPIs for this user.</p>;
  return (
    <div className="table-responsive">
      <table className="table table-sm mb-0" style={{ fontSize: 14 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--sb-border)" }}>
            {["Name", "Frequency", "Status", "Created"].map(h => (
              <th key={h} className="text-muted small py-2 px-3" style={{ background: "var(--sb-card-bg)", fontWeight: 500 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {kpis.map((k, i) => (
            <tr key={k.kpiId ?? i} style={{ borderBottom: "1px solid var(--sb-border)" }}>
              <td className="py-2 px-3 fw-semibold">{k.kpiName ?? "—"}</td>
              <td className="py-2 px-3 text-muted">{k.frequency ?? "—"}</td>
              <td className="py-2 px-3"><StatusBadge status={k.isActive} /></td>
              <td className="py-2 px-3 text-muted" style={{ fontSize: 12 }}>
                {k.createdAt
                  ? new Date(k.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                  : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── User detail (active) ───────────────────────────────────────────────────────
const TABS = ["Connections", "Sensors", "KPIs"];

function UserDetail({ user, onEdit, onDelete }) {
  const [tab, setTab]         = useState("Connections");
  const [detail, setDetail]   = useState(null);
  const [detailErr, setDetailErr] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    setTab("Connections"); setDetail(null); setDetailErr(null);
    if (!user?.userId) return;
    setLoadingDetail(true);
    api.get(`/api/users/${user.userId}`)
      .then(r => setDetail(r.data))
      .catch(e => setDetailErr(e?.response?.data?.message || "Failed to load user details."))
      .finally(() => setLoadingDetail(false));
  }, [user?.userId]);

  if (!user) return (
    <div className="d-flex align-items-center justify-content-center flex-grow-1 text-muted small">
      Select a user to view details
    </div>
  );

  const displayName = user.fullName || "Unknown";
  const joined = (detail?.createdAt || user.createdAt)
    ? new Date(detail?.createdAt || user.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })
    : "—";

  return (
    <div className="d-flex flex-column flex-grow-1" style={{ minWidth: 0 }}>
      {/* Header */}
      <div className="d-flex align-items-center gap-3 flex-wrap p-3"
        style={{ borderBottom: "1px solid var(--sb-border)", rowGap: 10 }}>
        <Avatar name={displayName} size={46} />
        <div className="flex-grow-1" style={{ minWidth: 0 }}>
          <div className="fw-semibold d-flex align-items-center gap-2" style={{ fontSize: 15 }}>
            {displayName}<RoleBadge role={user.userRole} />
          </div>
          <div className="small text-muted">{user.email} · joined {joined}</div>
          {loadingDetail && <div className="small text-muted mt-1">Loading details…</div>}
          {detail && (
            <div className="d-flex gap-3 mt-1" style={{ fontSize: 12, color: "var(--sb-muted)" }}>
              <span>{detail.connectionCount ?? 0} connections</span>
              <span>{detail.sensorCount ?? 0} sensors</span>
              <span>{detail.kpiCount ?? 0} KPIs</span>
            </div>
          )}
        </div>
        <div className="d-flex gap-2">
          <button onClick={() => onEdit(user)} className="btn btn-sm btn-outline-secondary" style={{ fontSize: 13 }}>
            <i className="bi bi-pencil me-1" />Edit
          </button>
          <button onClick={() => onDelete(user)} className="btn btn-sm"
            style={{ fontSize: 13, border: "1px solid #b91c1c", color: "#b91c1c", background: "transparent" }}>
            <i className="bi bi-trash me-1" />Delete
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="d-flex px-3" style={{ borderBottom: "1px solid var(--sb-border)", overflowX: "auto" }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: "10px 14px", fontSize: 13, background: "none", border: "none", cursor: "pointer",
            borderBottom: tab === t ? "2px solid var(--sb-accent)" : "2px solid transparent",
            color: tab === t ? "var(--sb-accent)" : "var(--sb-muted)",
            fontWeight: tab === t ? 600 : 400, whiteSpace: "nowrap", flexShrink: 0,
          }}>{t}</button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {detailErr && (
          <div className="p-3">
            <div className="alert alert-danger py-2 small mb-0">{detailErr}</div>
          </div>
        )}
        {tab === "Connections" && <ConnectionsTab connections={detail?.connections ?? (detailErr ? [] : null)} />}
        {tab === "Sensors"     && <SensorsTab     connections={detail?.connections ?? (detailErr ? [] : null)} />}
        {tab === "KPIs"        && <KPIsTab        kpis={detail?.kpIs            ?? (detailErr ? [] : null)} />}
      </div>
    </div>
  );
}

// ─── Deleted user detail (right panel) ─────────────────────────────────────────
function DeletedUserDetail({ user, onRestore, restoring }) {
  if (!user) return (
    <div className="d-flex align-items-center justify-content-center flex-grow-1 text-muted small">
      Select a deleted user to restore
    </div>
  );

  const displayName = user.fullName || "Unknown";
  const deletedOn = user.deletedAt
    ? new Date(user.deletedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : null;

  return (
    <div className="d-flex flex-column flex-grow-1 align-items-center justify-content-center p-4" style={{ minWidth: 0 }}>
      <div style={{
        background: "var(--sb-light-bg)", borderRadius: 16, padding: "36px 40px",
        textAlign: "center", maxWidth: 360, width: "100%",
        border: "1px solid var(--sb-border)",
      }}>
        <div className="d-flex justify-content-center mb-3">
          <Avatar name={displayName} size={64} />
        </div>
        <h5 className="fw-semibold mb-1" style={{ color: "var(--sb-text)" }}>{displayName}</h5>
        <p className="text-muted small mb-1">{user.email}</p>
        <RoleBadge role={user.userRole} />
        {deletedOn && (
          <p className="text-muted small mt-3 mb-0">
            <i className="bi bi-calendar-x me-1" />Deleted on {deletedOn}
          </p>
        )}

        <hr style={{ borderColor: "var(--sb-border)", margin: "20px 0" }} />

        <p className="small text-muted mb-3">
          Restoring this user will re-activate their account and all associated data.
        </p>

        <button
          onClick={() => onRestore(user)}
          disabled={restoring}
          className="btn w-100"
          style={{
            background: "#15803d", color: "#fff", fontWeight: 600, fontSize: 14,
            border: "none", borderRadius: 8, padding: "10px 0",
            opacity: restoring ? 0.7 : 1,
          }}
        >
          {restoring
            ? <><span className="spinner-border spinner-border-sm me-2" />Restoring…</>
            : <><i className="bi bi-arrow-counterclockwise me-2" />Restore User</>}
        </button>
      </div>
    </div>
  );
}

// ─── Edit modal ─────────────────────────────────────────────────────────────────
function EditModal({ user, onClose, onSave }) {
  const [fullName, setFullName] = useState(user.fullName || "");
  const [email,    setEmail]    = useState(user.email    || "");
  const [userRole, setUserRole] = useState(user.userRole || "User");
  const [saving,   setSaving]   = useState(false);
  const [err,      setErr]      = useState(null);

  const save = async () => {
    if (!fullName.trim()) { setErr("Full name is required."); return; }
    if (!email.trim())    { setErr("Email is required."); return; }
    setSaving(true); setErr(null);
    try {
      const res = await api.patch(`/api/users/${user.userId}`, { fullName, email, userRole });
      // Use server response if available, otherwise merge locally
      const updated = res.data?.userId ? res.data : { ...user, fullName, email, userRole };
      onSave(updated);
    } catch (e) { setErr(e?.response?.data?.message || "Update failed."); }
    finally     { setSaving(false); }
  };

  return (
    <div className="modal d-block" tabIndex="-1" style={{ background: "rgba(0,0,0,0.4)" }} onClick={onClose}>
      <div className="modal-dialog modal-dialog-centered" onClick={e => e.stopPropagation()}>
        <div className="modal-content border-0 shadow" style={{ borderRadius: 12, background: "var(--sb-card-bg)" }}>
          <div className="modal-header border-0 pb-0">
            <h6 className="modal-title fw-semibold">Edit user</h6>
            <button className="btn-close" onClick={onClose} />
          </div>
          <div className="modal-body">
            <div className="mb-3">
              <label className="form-label small text-muted">Full name</label>
              <input value={fullName} onChange={e => setFullName(e.target.value)}
                className="form-control sb-input" style={{ fontSize: 14 }} />
            </div>
            <div className="mb-3">
              <label className="form-label small text-muted">Email</label>
              <input value={email} onChange={e => setEmail(e.target.value)}
                className="form-control sb-input" style={{ fontSize: 14 }} type="email" />
            </div>
            <div className="mb-3">
              <label className="form-label small text-muted">Role</label>
              <select value={userRole} onChange={e => setUserRole(e.target.value)}
                className="form-select sb-input" style={{ fontSize: 14 }}>
                <option value="User">User</option>
                <option value="Admin">Admin</option>
                <option value="Operator">Operator</option>
              </select>
            </div>
            {err && <div className="alert alert-danger py-2 small">{err}</div>}
          </div>
          <div className="modal-footer border-0 pt-0">
            <button className="btn btn-sm btn-outline-secondary" onClick={onClose}>Cancel</button>
            <button className="btn btn-sm sb-primary-btn" onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Deleted users panel (left sidebar) ────────────────────────────────────────
function DeletedUsersPanel({ selectedDeleted, onSelectDeleted, onRestored }) {
  const [deleted,   setDeleted]   = useState(null); // null = loading
  const [err,       setErr]       = useState(null);
  const [restoring, setRestoring] = useState(false);
  const [search,    setSearch]    = useState("");
  const [confirm,   setConfirm]   = useState(null); // user pending restore confirm

  const load = useCallback(async () => {
    setErr(null); setDeleted(null);
    try {
      const res = await api.get("/api/users/deleted");
      setDeleted(toArray(res.data));
    } catch (e) { setErr(e?.response?.data?.message || "Failed to load deleted users."); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const doRestore = async (user) => {
    setRestoring(true);
    try {
      await api.patch(`/api/users/${user.userId}/restore`);
      setDeleted(prev => prev.filter(u => u.userId !== user.userId));
      // If this user was selected, deselect them
      if (selectedDeleted?.userId === user.userId) onSelectDeleted(null);
      onRestored(); // bubble up → reload active list + stats
    } catch (e) { alert(e?.response?.data?.message || "Restore failed."); }
    finally     { setRestoring(false); }
  };

  const filtered = (deleted ?? []).filter(u =>
    (u.fullName || "").toLowerCase().includes(search.toLowerCase()) ||
    (u.email    || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      {/* Confirm restore modal */}
      {confirm && (
        <ConfirmModal
          message={`Restore "${confirm.fullName}"? Their account will be re-activated.`}
          confirmLabel="Restore"
          confirmStyle="btn-success"
          onConfirm={() => doRestore(confirm)}
          onClose={() => setConfirm(null)}
        />
      )}

      <div className="d-flex flex-column" style={{ height: "100%" }}>
        <div className="p-2" style={{ borderBottom: "1px solid var(--sb-border)" }}>
          <input type="text" placeholder="Search deleted…" value={search}
            onChange={e => setSearch(e.target.value)}
            className="form-control sb-input" style={{ fontSize: 13 }} />
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>
          {err && (
            <div className="p-3 text-danger small">
              {err} — <span style={{ cursor: "pointer", textDecoration: "underline" }} onClick={load}>retry</span>
            </div>
          )}
          {!err && deleted === null && (
            <p className="text-muted small text-center p-3">Loading…</p>
          )}
          {!err && deleted !== null && filtered.length === 0 && (
            <p className="text-muted small text-center p-3">
              {search ? "No matches." : "No deleted users."}
            </p>
          )}

          {filtered.map(u => {
            const isSelected = selectedDeleted?.userId === u.userId;
            return (
              <div
                key={u.userId}
                onClick={() => onSelectDeleted(u)}
                style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
                  borderBottom: "1px solid var(--sb-border)", cursor: "pointer",
                  background: isSelected ? "var(--sb-light-bg)" : "transparent",
                  borderLeft: isSelected ? "3px solid #15803d" : "3px solid transparent",
                }}
              >
                <Avatar name={u.fullName || "U"} size={34} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {u.fullName}
                  </div>
                  <div className="text-muted" style={{ fontSize: 11 }}>{u.email}</div>
                </div>
                {/* Quick-restore icon button */}
                <button
                  onClick={e => { e.stopPropagation(); setConfirm(u); }}
                  disabled={restoring}
                  title="Restore user"
                  className="btn btn-sm"
                  style={{
                    fontSize: 12, padding: "3px 8px",
                    border: "1px solid #15803d", color: "#15803d",
                    background: "transparent", whiteSpace: "nowrap", flexShrink: 0,
                  }}
                >
                  <i className="bi bi-arrow-counterclockwise" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

// ─── ManagementPage ─────────────────────────────────────────────────────────────
const managementPage = () => {
  const [users,           setUsers]           = useState([]);
  const [stats,           setStats]           = useState(null);
  const [selected,        setSelected]        = useState(null);
  const [selectedDeleted, setSelectedDeleted] = useState(null);
  const [search,          setSearch]          = useState("");
  const [loading,         setLoading]         = useState(true);
  const [fetchErr,        setFetchErr]        = useState(null);
  const [editing,         setEditing]         = useState(null);
  const [view,            setView]            = useState("active"); // "active" | "deleted"
  const [confirmModal,    setConfirmModal]    = useState({ show: false, message: "", onConfirm: null });

  useEffect(() => {
    if (!localStorage.getItem("sb_access_token")) window.location.href = "/login";
  }, []);

  // ── Load active users + stats ──────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true); setFetchErr(null);
    try {
      const [usersRes, statsRes] = await Promise.all([
        api.get("/api/users"),
        api.get("/api/users/stats"),
      ]);
      const userList = toArray(usersRes.data).filter(u => u.isActive !== false && !u.isDeleted);
      setUsers(userList);
      setStats(statsRes.data);
      setSelected(prev => {
        if (prev) {
          const still = userList.find(u => u.userId === prev.userId);
          if (still) return still;
        }
        return userList[0] ?? null;
      });
    } catch (e) {
      setFetchErr(e?.response?.data?.message || e.message || "Failed to load data.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Search filter (active view) ────────────────────────────────────────────
  const filtered = users.filter(u =>
    (u.fullName || "").toLowerCase().includes(search.toLowerCase()) ||
    (u.email    || "").toLowerCase().includes(search.toLowerCase())
  );

  // ── Edit save ──────────────────────────────────────────────────────────────
  const handleEditSave = updated => {
    setUsers(prev => prev.map(u => u.userId === updated.userId ? updated : u));
    if (selected?.userId === updated.userId) setSelected(updated);
    setEditing(null);
  };

  // ── Delete (soft-delete) ───────────────────────────────────────────────────
  const handleDelete = user => {
    setConfirmModal({
      show: true,
      message: `Delete "${user.fullName}"? They can be restored later from the Deleted tab.`,
      onConfirm: async () => {
        try {
          await api.delete(`/api/users/${user.userId}`);
          setUsers(prev => {
            const next = prev.filter(u => u.userId !== user.userId);
            if (selected?.userId === user.userId) 
              setSelected(next[0] ?? null);
            return next;
          });
          // Refresh stats in background
          api.get("/api/users/stats").then(r => setStats(r.data)).catch(() => {});
        } catch (e) { alert(e?.response?.data?.message || "Delete failed."); }
      },
    });
  };

  // ── Restore callback (called after successful restore in DeletedUsersPanel) ─
  const handleRestored = useCallback(() => {
    load(); // Reload active list + stats
  }, [load]);

  // ── Stat cards ─────────────────────────────────────────────────────────────
  const statCards = [
    { label: "Total users",       val: stats?.totalUsers       ?? users.length },
    { label: "Total connections", val: stats?.totalConnections ?? "—" },
    { label: "Total sensors",     val: stats?.totalSensors     ?? "—" },
    { label: "Total KPIs",        val: stats?.totalKPIs        ?? "—" },
  ];

  return (
    <div style={{ color: "var(--sb-text)" }}>
      {/* Edit Modal */}
      {editing && <EditModal user={editing} onClose={() => setEditing(null)} onSave={handleEditSave} />}

      {/* Delete Confirm Modal */}
      {confirmModal.show && (
        <ConfirmModal
          message={confirmModal.message}
          confirmLabel="Delete"
          confirmStyle="btn-danger"
          onConfirm={confirmModal.onConfirm}
          onClose={() => setConfirmModal({ show: false, message: "", onConfirm: null })}
        />
      )}

      <div className="px-4 pt-3">
        {fetchErr && (
          <div className="alert alert-danger py-2 small mb-3">
            {fetchErr} — <span style={{ cursor: "pointer", textDecoration: "underline" }} onClick={load}>retry</span>
          </div>
        )}

        {/* Stats */}
        <div className="row g-3 mb-4">
          {statCards.map(({ label, val }) => (
            <div key={label} className="col-6 col-md-3">
              <div className="card border-0 shadow-sm p-3" style={{ borderRadius: 12, background: "var(--sb-card-bg)" }}>
                <div className="small text-muted mb-1">{label}</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: "var(--sb-text)" }}>
                  {loading ? "—" : val}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Main card */}
        <div className="card border-0 shadow-sm d-flex flex-row"
          style={{ borderRadius: 12, overflow: "hidden", minHeight: 520, background: "var(--sb-card-bg)" }}>

          {/* ── Left sidebar ── */}
          <div style={{ width: 260, flexShrink: 0, borderRight: "1px solid var(--sb-border)", display: "flex", flexDirection: "column" }}>

            {/* Active / Deleted toggle */}
            <div className="d-flex" style={{ borderBottom: "1px solid var(--sb-border)" }}>
              {["active", "deleted"].map(v => (
                <button key={v} onClick={() => setView(v)} style={{
                  flex: 1, padding: "9px 0", fontSize: 12, fontWeight: view === v ? 600 : 400,
                  background: "none", border: "none", cursor: "pointer",
                  borderBottom: view === v ? "2px solid var(--sb-accent)" : "2px solid transparent",
                  color: view === v ? "var(--sb-accent)" : "var(--sb-muted)",
                  textTransform: "capitalize",
                }}>{v}</button>
              ))}
            </div>

            {/* Active users list */}
            {view === "active" ? (
              <>
                <div className="p-2">
                  <input type="text" placeholder="Search users…" value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="form-control sb-input" style={{ fontSize: 13 }} />
                </div>
                <div style={{ overflowY: "auto", flex: 1 }}>
                  {loading ? (
                    <p className="text-muted small text-center p-3">Loading…</p>
                  ) : filtered.length === 0 ? (
                    <p className="text-muted small text-center p-3">No users found.</p>
                  ) : filtered.map(u => {
                    const isActive = selected?.userId === u.userId;
                    const uStats   = stats?.userStats?.find(s => s.userId === u.userId);
                    return (
                      <div key={u.userId} onClick={() => setSelected(u)} style={{
                        display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", cursor: "pointer",
                        background: isActive ? "var(--sb-light-bg)" : "transparent",
                        borderLeft: isActive ? "3px solid var(--sb-accent)" : "3px solid transparent",
                      }}>
                        <Avatar name={u.fullName || "U"} size={36} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {u.fullName}
                          </div>
                          <div className="text-muted" style={{ fontSize: 11 }}>{u.userRole ?? "User"} · ID {u.userId}</div>
                          {uStats && (
                            <div style={{ fontSize: 10, color: "var(--sb-muted)", marginTop: 1 }}>
                              {uStats.connections}C · {uStats.sensors}S · {uStats.kpIs}K
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              /* Deleted users list */
              <DeletedUsersPanel
                selectedDeleted={selectedDeleted}
                onSelectDeleted={setSelectedDeleted}
                onRestored={handleRestored}
              />
            )}
          </div>

          {/* ── Right detail pane ── */}
          {view === "active" ? (
            <UserDetail user={selected} onEdit={setEditing} onDelete={handleDelete} />
          ) : (
            <DeletedUserDetail
              user={selectedDeleted}
              onRestore={user => {
                // Trigger restore via confirm modal
                setConfirmModal({
                  show: true,
                  message: `Restore "${user.fullName}"? Their account will be re-activated.`,
                  onConfirm: async () => {
                    try {
                      await api.patch(`/api/users/${user.userId}/restore`);
                      setSelectedDeleted(null);
                      handleRestored();
                      setView("active");
                    } catch (e) { alert(e?.response?.data?.message || "Restore failed."); }
                  },
                });
              }}
              restoring={false}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default managementPage;
