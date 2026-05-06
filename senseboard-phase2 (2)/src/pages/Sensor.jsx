import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { addSensor, deleteSensor } from "../api/sensorsapi";
import { getActiveSensors } from "../api/activeapi";
import ConnectionModal from "../components/ConnectionModal";
import MqttForm from "../components/MqttForm";
import { updateConnection, deleteConnection } from "../api/connectionsapi";
import api from "../api/axiosInstance";
import * as XLSX from "xlsx"; // npm install xlsx

const Sensor = () => {
  const navigate = useNavigate();
  const role = localStorage.getItem("sb_role");
  const isAdmin = role === "admin";

  const [connections, setConnections] = useState([]);
  const [activeConnectionId, setActiveConnectionId] = useState(null);
  const [sensors, setSensors] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);
  const [selectedSensor, setSelectedSensor] = useState(null);
  const [selectedFields, setSelectedFields] = useState([]);
  const [selectedInterval, setSelectedInterval] = useState("");
  const [editingConnection, setEditingConnection] = useState(null);
  const [form, setForm] = useState({ sensorName: "", location: "", topicName: "", quantity: "", unit: "" });
  const [errors, setErrors] = useState({});
  const [connCreatedByMe, setConnCreatedByMe] = useState(false);

  // ── Add Sensor split-button dropdown ───────────────────────────────────────
  const [showAddDropdown, setShowAddDropdown] = useState(false);
  const addDropdownRef = useRef(null);

  // ── Connection pill edit/delete dropdown ───────────────────────────────────
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
  const connDropdownRef = useRef(null);

  // ── View toggle (tile / table) ─────────────────────────────────────────────
  const [sensorView, setSensorView] = useState("tile"); // "tile" | "table"

  // ── Pagination ─────────────────────────────────────────────────────────────
  const SENSORS_PER_PAGE = 9;
  const [currentPage, setCurrentPage] = useState(1);

  // ── Bulk upload state ──────────────────────────────────────────────────────
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkPreview, setBulkPreview] = useState([]);
  const [bulkErrors, setBulkErrors] = useState([]);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);
  const bulkFileInputRef = useRef(null);

  // Restore panel state
  const [showRestorePanel, setShowRestorePanel] = useState(false);
  const [deletedConnections, setDeletedConnections] = useState([]);
  const [deletedSensors, setDeletedSensors] = useState([]);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [restoringId, setRestoringId] = useState(null);

  const [confirmModal, setConfirmModal] = useState({ show: false, message: "", onConfirm: null });

  // Close add-dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (addDropdownRef.current && !addDropdownRef.current.contains(e.target)) {
        setShowAddDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Close connection pill dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (connDropdownRef.current && !connDropdownRef.current.contains(e.target)) {
        setOpenDropdownId(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Toast helper ───────────────────────────────────────────────────────────
  const showSuccess = useCallback((msg, type = "success") => {
    setSuccessMsg({ msg, type });
    setTimeout(() => setSuccessMsg(null), 3500);
  }, []);

  // ── Core helpers ───────────────────────────────────────────────────────────
  const fetchSensors = useCallback(async (connId) => {
    if (!connId) { setSensors([]); return; }
    try {
      const data = await getActiveSensors(connId);
      if (Array.isArray(data)) setSensors(data.map(s => ({ ...s, id: s.sensorId })));
      else setSensors([]);
    } catch {
      setSensors([]);
    }
  }, []);

  const syncConnections = useCallback(async (createdByMe = false) => {
    try {
      const url = createdByMe ? "/api/connections/all?createdByMe=true" : "/api/connections/all";
      const live = await api.get(url).then(r => Array.isArray(r.data) ? r.data : r.data?.data ?? []);
      const mapped = live.map(c => ({
        id: c.connectionId,
        name: c.connectionName,
        connectionUrl: c.connectionUrl,
        port: c.port,
        tlsEnabled: c.tlsEnabled,
        isPublic: c.isPublic,
      }));
      localStorage.setItem("sb_connections", JSON.stringify(mapped));
      setConnections(mapped);
      return mapped;
    } catch {
      setConnections([]);
      return [];
    }
  }, []);

  useEffect(() => {
    syncConnections().then(mapped => {
      if (mapped.length) {
        setActiveConnectionId(mapped[0].id);
        fetchSensors(mapped[0].id);
      }
    });
  }, [syncConnections, fetchSensors]);

  useEffect(() => {
    fetchSensors(activeConnectionId);
    setCurrentPage(1);
  }, [activeConnectionId, fetchSensors]);

  useEffect(() => {
    syncConnections(connCreatedByMe).then(mapped => {
      const first = mapped[0]?.id ?? null;
      setActiveConnectionId(first);
      fetchSensors(first);
    });
  }, [connCreatedByMe, syncConnections, fetchSensors]);

  // ── Restore panel ──────────────────────────────────────────────────────────
  const refreshDeletedLists = async () => {
    setRestoreLoading(true);
    try {
      const [dc, ds] = await Promise.all([
        api.get("/api/Connections/deleted").then(r => r.data),
        api.get("/api/Sensors/deleted").then(r => r.data),
      ]);
      setDeletedConnections((Array.isArray(dc) ? dc : []).map(c => ({ ...c, _id: String(c.connectionId ?? c.id ?? "") })));
      setDeletedSensors((Array.isArray(ds) ? ds : []).map(s => ({ ...s, _id: String(s.sensorId ?? s.id ?? "") })));
    } catch {
      setDeletedConnections([]); setDeletedSensors([]);
    } finally {
      setRestoreLoading(false);
    }
  };

  const openRestorePanel = async () => { setShowRestorePanel(true); await refreshDeletedLists(); };

  const handleRestoreConnection = async (id) => {
    setRestoringId(id);
    try {
      await api.patch(`/api/Connections/${id}/restore`);
      await refreshDeletedLists();
      const mapped = await syncConnections();
      const conn = mapped.find(c => String(c.id) === String(id)) ?? mapped[0];
      if (conn) { setActiveConnectionId(conn.id); await fetchSensors(conn.id); }
      showSuccess("Connection restored successfully!");
    } catch { showSuccess("Failed to restore connection.", "danger"); }
    finally { setRestoringId(null); }
  };

  const handleRestoreSensor = async (id, parentConnectionId) => {
    setRestoringId(id);
    try {
      await api.patch(`/api/Sensors/${id}/restore`);
      await refreshDeletedLists();
      const mapped = await syncConnections();
      const targetConnId = parentConnectionId ?? activeConnectionId ?? mapped[0]?.id;
      if (targetConnId) { setActiveConnectionId(targetConnId); await fetchSensors(targetConnId); }
      showSuccess("Sensor restored successfully!");
    } catch { showSuccess("Failed to restore sensor.", "danger"); }
    finally { setRestoringId(null); }
  };

  // ── Existing handlers ──────────────────────────────────────────────────────
  const handleConnectionSaved = async (newConnection) => {
    setShowConnectionModal(false);
    const mapped = await syncConnections();
    const saved = mapped.find(c => c.id === newConnection.id) ?? mapped[0];
    if (saved) { setActiveConnectionId(saved.id); await fetchSensors(saved.id); }
  };

  const handleDeleteConnection = (connId) => {
    setConfirmModal({
      show: true,
      message: "Are you sure you want to delete this connection?",
      onConfirm: async () => {
        try {
          await deleteConnection(connId);
          const updated = connections.filter(c => c.id !== connId);
          setConnections(updated);
          localStorage.setItem("sb_connections", JSON.stringify(updated));
          if (activeConnectionId === connId) {
            const next = updated.length ? updated[0].id : null;
            setActiveConnectionId(next);
            await fetchSensors(next);
          }
        } catch (err) { console.error("Failed to delete connection:", err); }
      },
    });
  };

  const handleUpdateConnection = async (updatedData) => {
    try {
      await updateConnection(editingConnection.id, updatedData);
      const updated = connections.map(c =>
        c.id === editingConnection.id ? { ...c, name: updatedData.connectionName } : c
      );
      setConnections(updated);
      localStorage.setItem("sb_connections", JSON.stringify(updated));
      setEditingConnection(null);
    } catch (err) { console.error("Failed to update connection:", err); }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: "" });
  };

  const validate = () => {
    const errs = {};
    if (!form.sensorName.trim()) errs.sensorName = "Required";
    if (!form.location.trim()) errs.location = "Required";
    if (!form.topicName.trim()) errs.topicName = "Required";
    if (!form.quantity.trim()) errs.quantity = "Required";
    if (!form.unit.trim()) errs.unit = "Required";
    return errs;
  };

  const handleAddSensor = async () => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    try {
      const res = await addSensor({ connectionId: activeConnectionId, ...form });
      if (res?.sensorId || res?.message) {
        setSensors(prev => [...prev, { id: res.sensorId || Date.now(), ...form, createdAt: new Date() }]);
        setForm({ sensorName: "", location: "", topicName: "", quantity: "", unit: "" });
        setShowForm(false);
        showSuccess("Sensor added!");
      }
    } catch (err) {
      setErrors({ sensorName: err.response?.data?.message || "Failed to add sensor." });
    }
  };

  const handleDeleteSensor = (sensorId) => {
    setConfirmModal({
      show: true,
      message: "Are you sure you want to delete this sensor?",
      onConfirm: async () => {
        try {
          await deleteSensor(sensorId);
          setSensors(prev => prev.filter(s => s.id !== sensorId));
        } catch (err) { console.error("Failed to delete sensor:", err); }
      },
    });
  };

  const toggleField = (field) => setSelectedFields(prev =>
    prev.includes(field) ? prev.filter(f => f !== field) : [...prev, field]
  );

  // ── Bulk upload helpers ────────────────────────────────────────────────────

  /**
   * Download the bulk-import template from the API.
   * Calls GET /api/Sensors/bulk-import/template, receives the xlsx binary,
   * and triggers a browser download.
   */
  const [templateDownloading, setTemplateDownloading] = useState(false);
  const [previewPage, setPreviewPage] = useState(1);
  const PREVIEW_PER_PAGE = 8;

  const handleDownloadTemplate = async () => {
    setTemplateDownloading(true);
    try {
      const response = await api.get("/api/Sensors/bulk-import/template", {
        baseURL: "http://10.4.0.103:8081",
        responseType: "blob",
      });
      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "sensor_bulk_template.xlsx";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download template:", err);
      showSuccess("Failed to download template. Please try again.", "danger");
    } finally {
      setTemplateDownloading(false);
    }
  };

  const REQUIRED_KEYS = ["SensorName", "TopicName", "LocatedAt", "Quantity", "Unit"];

  /**
   * Parse the uploaded Excel file.
   * Row 1 (index 0) → machine-readable keys (e.g. "sensorName")
   * Row 2 (index 1) → display labels — skipped
   * Row 3+ (index 2+) → data rows (rows 3-5 are template examples)
   */
  const handleBulkFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBulkFile(file);
    setBulkPreview([]);
    setBulkErrors([]);
    setBulkResult(null);
    setPreviewPage(1);
  };
  const handleBulkUpload = async () => {
    if (!bulkFile || !activeConnectionId) return;
    setBulkUploading(true);
    try {
      // Send raw .xlsx as multipart/form-data.
      // connectionId comes from the active connection tab — not from the file.
      const fd = new FormData();
      fd.append("file", bulkFile);

      const res = await api.post(
        `/api/Sensors/bulk-import?connectionId=${activeConnectionId}`,
        fd,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      const data = res.data;

      // Parse the intermediate JSON the server extracted from Excel.
      let parsedRows = [];
      if (data.parsedJson) {
        try { parsedRows = JSON.parse(data.parsedJson); } catch { parsedRows = []; }
      }
      // Normalise to the shape the preview table expects
      const previewRows = parsedRows.map(r => ({
        sensorName: r.sensorName ?? r.SensorName ?? "",
        topicName:  r.topicName  ?? r.TopicName  ?? "",
        location:   r.locatedAt  ?? r.LocatedAt  ?? "",
        quantity:   r.quantity   ?? r.Quantity   ?? "",
        unit:       r.unit       ?? r.Unit       ?? "",
      }));
      if (previewRows.length) setBulkPreview(previewRows);

      // Map API response shape to what the result section renders
      const successCount = data.successCount ?? 0;
      const failures     = Array.isArray(data.errors) ? data.errors : [];

      const success = successCount > 0
        ? Array.from({ length: successCount }, (_, i) => `Sensor ${i + 1}`)
        : [];

      const failed = failures.map(e => ({
        name:   e.sensorName ?? `Row ${e.row}`,
        reason: e.detail ? `${e.error} — ${e.detail}` : e.error,
        row:    e.row ?? null,
      }));

      setBulkResult({ success, failed, totalRows: data.totalRows ?? 0 });

      if (data.parseError) {
        showSuccess(`Parse error: ${data.parseError}`, "danger");
      } else if (successCount > 0) {
        showSuccess(`${successCount} sensor(s) added successfully!`);
        if (activeConnectionId) await fetchSensors(activeConnectionId);
      }
    } catch (err) {
      const msg = err?.response?.data?.parseError
               || err?.response?.data?.message
               || err?.response?.data?.title
               || "Bulk upload failed.";
      showSuccess(msg, "danger");
      setBulkResult({ success: [], failed: [{ name: "Upload", reason: msg }], totalRows: 0 });
    } finally {
      setBulkUploading(false);
    }
  };
  const closeBulkModal = () => {
    setShowBulkModal(false);
    setBulkFile(null);
    setBulkPreview([]);
    setBulkErrors([]);
    setBulkResult(null);
    setPreviewPage(1);
    if (bulkFileInputRef.current) bulkFileInputRef.current.value = "";
  };

  const activeConn = connections.find(c => c.id === activeConnectionId);

  return (
    <div>
      {/* ── Page Header ── */}
      <div className="sb-page-header px-4 py-3 mb-4">
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <h5 className="sb-header-title mb-1">
              <i className="bi bi-broadcast me-2 sb-accent"></i>Sensors
            </h5>
            <p className="sb-header-subtitle mb-0">Manage and monitor your sensors.</p>
          </div>
          {isAdmin && (
            <button
              className="btn btn-outline-warning d-flex align-items-center gap-2"
              style={{ borderRadius: "50px", padding: "7px 18px", fontWeight: 600, fontSize: "0.85rem" }}
              onClick={openRestorePanel}
            >
              <i className="bi bi-arrow-counterclockwise"></i>Restore Deleted
            </button>
          )}
        </div>
      </div>

      {/* ── Toast ── */}
      {successMsg && (
        <div className="position-fixed top-0 end-0 m-4" style={{ zIndex: 9999 }}>
          <div className={`alert alert-${successMsg.type} shadow border-0 d-flex align-items-center gap-2`}>
            <i className={`bi bi-${successMsg.type === "success" ? "check-circle-fill" : "exclamation-circle-fill"}`}></i>
            {successMsg.msg}
          </div>
        </div>
      )}

      {/* ── Global Confirm Modal ── */}
      {confirmModal.show && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
          <div style={{ background: "var(--sb-card-bg)", borderRadius: 16, padding: "32px 28px", minWidth: 340, maxWidth: "90vw", boxShadow: "0 24px 60px rgba(0,0,0,0.18)", textAlign: "center" }}>
            <i className="bi bi-exclamation-triangle-fill mb-3 d-block" style={{ fontSize: "2rem", color: "#f59e0b" }} />
            <p style={{ fontWeight: 600, fontSize: 15, color: "var(--sb-text)", marginBottom: 20 }}>{confirmModal.message}</p>
            <div className="d-flex gap-2 justify-content-center">
              <button className="btn btn-sm btn-outline-secondary px-4" onClick={() => setConfirmModal({ show: false, message: "", onConfirm: null })}>Cancel</button>
              <button className="btn btn-sm btn-danger px-4" onClick={() => { confirmModal.onConfirm(); setConfirmModal({ show: false, message: "", onConfirm: null }); }}>Confirm</button>
            </div>
          </div>
        </div>
      )}

      <div className="container-fluid px-4">
        {/* Top bar */}
        <div className="d-flex align-items-center mb-4 gap-3" style={{ minWidth: 0 }}>

          {/* Left: filter + connection pills */}
          <div className="d-flex align-items-center gap-2" style={{ minWidth: 0, flex: 1, overflow: "hidden" }}>
            {isAdmin && (
              <button
                onClick={() => setConnCreatedByMe(v => !v)}
                className="btn d-flex align-items-center gap-1"
                style={{
                  flexShrink: 0, borderRadius: "50px", padding: "5px 12px", fontWeight: 700, fontSize: "0.75rem",
                  border: connCreatedByMe ? "1.5px solid var(--sb-accent)" : "1.5px dashed var(--sb-border)",
                  background: connCreatedByMe ? "rgba(0,198,174,0.10)" : "transparent",
                  color: connCreatedByMe ? "var(--sb-accent)" : "var(--sb-muted)",
                  transition: "all 0.15s", whiteSpace: "nowrap",
                }}
              >
                <i className={`bi ${connCreatedByMe ? "bi-person-fill-check" : "bi-person-check"}`}></i>
                Created by Me
              </button>
            )}

            {isAdmin && connections.length > 0 && (
              <div style={{ width: 1, height: 22, background: "var(--sb-border)", flexShrink: 0 }} />
            )}

            <div style={{ display: "flex", alignItems: "center", gap: 6, overflowX: "auto", overflowY: "visible", scrollbarWidth: "none", msOverflowStyle: "none", flex: 1, minWidth: 0, paddingBottom: 2 }}>
              <style>{`.conn-scroll::-webkit-scrollbar { display: none; }`}</style>
              <div className="conn-scroll" style={{ display: "flex", gap: 6, alignItems: "center" }}>
                {connections.length === 0 ? (
                  <p className="mb-0 small" style={{ color: "var(--sb-muted)", whiteSpace: "nowrap" }}>No connections yet. Add one to get started.</p>
                ) : (
                  connections.map(conn => (
                    <div key={conn.id} className="d-flex align-items-center" style={{ flexShrink: 0, position: "relative" }}>
                      <button
                        className={`btn ${activeConnectionId === conn.id ? "sb-connect-btn" : "btn-outline-secondary"}`}
                        style={{ borderRadius: "50px", padding: isAdmin ? "4px 32px 4px 12px" : "4px 12px", fontWeight: 600, fontSize: "0.8rem", whiteSpace: "nowrap" }}
                        onClick={() => setActiveConnectionId(conn.id)}
                      >
                        <i className="bi bi-hdd-network me-1" style={{ fontSize: "0.75rem" }}></i>{conn.name}
                      </button>
                      {isAdmin && (
                        <button
                          className="btn btn-sm p-0 border-0 bg-transparent d-flex align-items-center justify-content-center"
                          style={{
                            position: "absolute", right: "7px",
                            color: activeConnectionId === conn.id ? "white" : "var(--sb-muted)",
                            width: "18px", height: "18px", zIndex: 2,
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (openDropdownId === conn.id) {
                              setOpenDropdownId(null);
                            } else {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setDropdownPos({ top: rect.bottom + 6, left: rect.right - 130 });
                              setOpenDropdownId(conn.id);
                            }
                          }}
                        >
                          <i className="bi bi-three-dots-vertical" style={{ fontSize: "0.72rem" }}></i>
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* ── Connection pill action dropdown (fixed portal, escapes overflow) ── */}
          {openDropdownId && (
            <div
              ref={connDropdownRef}
              style={{
                position: "fixed",
                top: dropdownPos.top,
                left: dropdownPos.left,
                background: "var(--sb-white, #fff)",
                border: "1px solid var(--sb-border, #e5e7eb)",
                borderRadius: "10px",
                boxShadow: "0 8px 24px rgba(0,0,0,0.13)",
                minWidth: "130px",
                fontSize: "0.88rem",
                zIndex: 9999,
                overflow: "hidden",
              }}
            >
              <button
                className="btn w-100 text-start d-flex align-items-center gap-2 py-2 px-3"
                style={{ borderRadius: 0, background: "transparent", border: "none", color: "var(--sb-text, #111)" }}
                onClick={() => {
                  const conn = connections.find(c => c.id === openDropdownId);
                  setEditingConnection(conn);
                  setOpenDropdownId(null);
                }}
              >
                <i className="bi bi-pencil" style={{ color: "var(--sb-accent, #00c6ae)" }}></i>Edit
              </button>
              <hr style={{ margin: "2px 0", borderColor: "var(--sb-border, #e5e7eb)" }} />
              <button
                className="btn w-100 text-start d-flex align-items-center gap-2 py-2 px-3 text-danger"
                style={{ borderRadius: 0, background: "transparent", border: "none" }}
                onClick={() => {
                  handleDeleteConnection(openDropdownId);
                  setOpenDropdownId(null);
                }}
              >
                <i className="bi bi-trash"></i>Delete
              </button>
            </div>
          )}

          {/* Right: action buttons */}
          <div className="d-flex gap-2" style={{ flexShrink: 0 }}>
            <button
              className="btn btn-outline-secondary d-flex align-items-center gap-2"
              style={{ borderRadius: "50px", padding: "7px 16px", fontWeight: 600, fontSize: "0.83rem", whiteSpace: "nowrap" }}
              onClick={() => setShowConnectionModal(true)}
            >
              <i className="bi bi-hdd-network"></i>Add Connection
            </button>

            {/* ── Split "Add Sensor" button with dropdown ── */}
            <div ref={addDropdownRef} style={{ position: "relative" }}>
              <div className="d-flex">
                {/* Left half — opens single sensor form directly */}
                <button
                  className="btn sb-connect-btn d-flex align-items-center gap-2"
                  style={{
                    borderRadius: "50px 0 0 50px",
                    padding: "7px 14px",
                    fontWeight: 600, fontSize: "0.83rem", whiteSpace: "nowrap",
                    borderRight: "1px solid rgba(255,255,255,0.3)",
                  }}
                  disabled={!activeConnectionId}
                  onClick={() => {
                    setForm({ sensorName: "", location: "", topicName: "", quantity: "", unit: "" });
                    setErrors({});
                    setShowForm(true);
                    setShowAddDropdown(false);
                  }}
                >
                  <i className="bi bi-plus-circle-fill"></i>Add Sensor
                </button>

                {/* Right half — chevron toggle */}
                <button
                  className="btn sb-connect-btn d-flex align-items-center justify-content-center"
                  style={{ borderRadius: "0 50px 50px 0", padding: "7px 10px" }}
                  disabled={!activeConnectionId}
                  onClick={() => setShowAddDropdown(v => !v)}
                  aria-label="More sensor options"
                >
                  <i className={`bi bi-chevron-${showAddDropdown ? "up" : "down"}`} style={{ fontSize: "0.7rem" }}></i>
                </button>
              </div>

              {/* Dropdown */}
              {showAddDropdown && (
                <div
                  style={{
                    position: "absolute", top: "calc(100% + 6px)", right: 0,
                    background: "var(--sb-white)", border: "1px solid var(--sb-border)",
                    borderRadius: "12px", boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                    minWidth: "210px", zIndex: 1000, overflow: "hidden",
                  }}
                >
                  {/* Option 1 — Single sensor */}
                  <button
                    className="btn w-100 text-start d-flex align-items-center gap-3 px-3 py-2"
                    style={{ borderRadius: 0, fontSize: "0.85rem", fontWeight: 600, color: "var(--sb-text)", background: "transparent", border: "none" }}
                    onClick={() => {
                      setForm({ sensorName: "", location: "", topicName: "", quantity: "", unit: "" });
                      setErrors({});
                      setShowForm(true);
                      setShowAddDropdown(false);
                    }}
                  >
                    <span style={{ width: 30, height: 30, borderRadius: "8px", background: "rgba(0,198,174,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <i className="bi bi-plus-circle" style={{ color: "var(--sb-accent)", fontSize: "0.95rem" }}></i>
                    </span>
                    <div>
                      <div style={{ lineHeight: 1.3 }}>Add Single Sensor</div>
                      <div style={{ fontSize: "0.72rem", color: "var(--sb-muted)", fontWeight: 400 }}>Fill in a form</div>
                    </div>
                  </button>

                  <div style={{ height: 1, background: "var(--sb-border)", margin: "0 12px" }} />

                  {/* Option 2 — Bulk upload */}
                  <button
                    className="btn w-100 text-start d-flex align-items-center gap-3 px-3 py-2"
                    style={{ borderRadius: 0, fontSize: "0.85rem", fontWeight: 600, color: "var(--sb-text)", background: "transparent", border: "none" }}
                    onClick={() => {
                      setShowBulkModal(true);
                      setShowAddDropdown(false);
                    }}
                  >
                    <span style={{ width: 30, height: 30, borderRadius: "8px", background: "rgba(99,102,241,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <i className="bi bi-file-earmark-spreadsheet" style={{ color: "#6366f1", fontSize: "0.95rem" }}></i>
                    </span>
                    <div>
                      <div style={{ lineHeight: 1.3 }}>Add Bulk Sensors</div>
                      <div style={{ fontSize: "0.72rem", color: "var(--sb-muted)", fontWeight: 400 }}>Upload Excel file</div>
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {activeConn && (
          <p className="mb-3 small" style={{ color: "var(--sb-muted)" }}>
            <i className="bi bi-hdd-network me-1"></i>
            Showing sensors for: <strong style={{ color: "var(--sb-text)" }}>{activeConn.name}</strong>
          </p>
        )}

        {/* ── View toggle ── */}
        {sensors.length > 0 && (
          <div className="d-flex justify-content-end mb-3">
            <div className="d-flex" style={{ border: "1px solid var(--sb-border)", borderRadius: "10px", overflow: "hidden" }}>
              <button
                onClick={() => { setSensorView("tile"); setCurrentPage(1); }}
                style={{
                  padding: "6px 14px", border: "none", fontWeight: 600, fontSize: "0.8rem",
                  background: sensorView === "tile" ? "var(--sb-accent)" : "transparent",
                  color: sensorView === "tile" ? "#fff" : "var(--sb-muted)",
                  cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
                  transition: "all 0.15s",
                }}
              >
                <i className="bi bi-grid-3x3-gap-fill"></i> Tile
              </button>
              <button
                onClick={() => { setSensorView("table"); setCurrentPage(1); }}
                style={{
                  padding: "6px 14px", border: "none", fontWeight: 600, fontSize: "0.8rem",
                  background: sensorView === "table" ? "var(--sb-accent)" : "transparent",
                  color: sensorView === "table" ? "#fff" : "var(--sb-muted)",
                  cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
                  transition: "all 0.15s",
                  borderLeft: "1px solid var(--sb-border)",
                }}
              >
                <i className="bi bi-table"></i> Table
              </button>
            </div>
          </div>
        )}

        {/* Sensor list */}
        {sensors.length === 0 ? (
          <div className="text-center py-5">
            <i className="bi bi-broadcast" style={{ fontSize: "3rem", color: "var(--sb-accent)" }}></i>
            <p className="mt-3" style={{ color: "var(--sb-muted)" }}>
              {activeConnectionId ? "No sensors for this connection. Click + to add one." : "Select or add a connection first."}
            </p>
          </div>
        ) : (() => {
          const totalPages = Math.ceil(sensors.length / SENSORS_PER_PAGE);
          const pageSensors = sensors.slice((currentPage - 1) * SENSORS_PER_PAGE, currentPage * SENSORS_PER_PAGE);

          const Pagination = () => totalPages <= 1 ? null : (
            <div className="d-flex justify-content-center align-items-center gap-1 mt-4">
              <button
                className="btn btn-sm btn-outline-secondary"
                style={{ borderRadius: "8px", padding: "4px 10px" }}
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => p - 1)}
              >
                <i className="bi bi-chevron-left"></i>
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  className="btn btn-sm"
                  style={{
                    borderRadius: "8px", padding: "4px 10px", fontWeight: 600, fontSize: "0.8rem",
                    background: currentPage === p ? "var(--sb-accent)" : "transparent",
                    color: currentPage === p ? "#fff" : "var(--sb-muted)",
                    border: currentPage === p ? "1px solid var(--sb-accent)" : "1px solid var(--sb-border)",
                  }}
                  onClick={() => setCurrentPage(p)}
                >
                  {p}
                </button>
              ))}
              <button
                className="btn btn-sm btn-outline-secondary"
                style={{ borderRadius: "8px", padding: "4px 10px" }}
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
              >
                <i className="bi bi-chevron-right"></i>
              </button>
              <span className="ms-2 small" style={{ color: "var(--sb-muted)" }}>
                {(currentPage - 1) * SENSORS_PER_PAGE + 1}–{Math.min(currentPage * SENSORS_PER_PAGE, sensors.length)} of {sensors.length}
              </span>
            </div>
          );

          if (sensorView === "table") {
            return (
              <>
                <div style={{ overflowX: "auto", borderRadius: "12px", border: "1px solid var(--sb-border)" }}>
                  <table className="table mb-0" style={{ fontSize: "0.875rem" }}>
                    <thead>
                      <tr style={{ background: "var(--sb-light-bg)" }}>
                        {["#", "Sensor Name", "Location", "Topic", "Quantity / Unit", "Added", "Actions"].map(h => (
                          <th key={h} style={{ padding: "10px 14px", color: "var(--sb-muted)", fontWeight: 700, whiteSpace: "nowrap", border: "none", borderBottom: "1px solid var(--sb-border)" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pageSensors.map((sensor, idx) => (
                        <tr key={sensor.id} style={{ borderBottom: "1px solid var(--sb-border)", transition: "background 0.1s" }}
                          onMouseEnter={e => e.currentTarget.style.background = "var(--sb-light-bg)"}
                          onMouseLeave={e => e.currentTarget.style.background = ""}
                        >
                          <td style={{ padding: "10px 14px", color: "var(--sb-muted)" }}>{(currentPage - 1) * SENSORS_PER_PAGE + idx + 1}</td>
                          <td style={{ padding: "10px 14px", fontWeight: 600, color: "var(--sb-text)" }}>{sensor.sensorName}</td>
                          <td style={{ padding: "10px 14px", color: "var(--sb-muted)" }}>{sensor.location || sensor.locatedAt}</td>
                          <td style={{ padding: "10px 14px", color: "var(--sb-muted)", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sensor.topicName}</td>
                          <td style={{ padding: "10px 14px", color: "var(--sb-muted)" }}>{sensor.quantity ? `${sensor.quantity} (${sensor.unit})` : "—"}</td>
                          <td style={{ padding: "10px 14px", color: "var(--sb-muted)", whiteSpace: "nowrap" }}>{sensor.createdAt ? new Date(sensor.createdAt).toLocaleDateString() : "—"}</td>
                          <td style={{ padding: "10px 14px" }}>
                            <div className="d-flex gap-2">
                              <button
                                className="btn btn-sm"
                                style={{ borderRadius: "8px", padding: "3px 10px", fontSize: "0.78rem", background: "rgba(0,198,174,0.1)", color: "var(--sb-accent)", border: "1px solid var(--sb-accent)", fontWeight: 600 }}
                                onClick={() => { setSelectedSensor(sensor); setSelectedFields([]); setSelectedInterval(""); }}
                              >
                                <i className="bi bi-sliders me-1"></i>View
                              </button>
                              {isAdmin && (
                                <button
                                  className="btn btn-sm"
                                  style={{ borderRadius: "8px", padding: "3px 10px", fontSize: "0.78rem", background: "rgba(220,53,69,0.08)", color: "#dc3545", border: "1px solid #dc3545", fontWeight: 600 }}
                                  onClick={() => handleDeleteSensor(sensor.id)}
                                >
                                  <i className="bi bi-trash"></i>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination />
              </>
            );
          }

          return (
            <>
              <div className="row g-3">
                {pageSensors.map((sensor) => (
                  <div className="col-12 col-md-6 col-lg-4" key={sensor.id}>
                    <div className="card border-0 shadow-sm p-3" style={{ borderRadius: "12px", backgroundColor: "var(--sb-card-bg)" }}>
                      <div className="d-flex align-items-center justify-content-between mb-2">
                        <h6 className="sb-header-title mb-0">{sensor.sensorName}</h6>
                        <span className="badge" style={{ backgroundColor: "#e8faf8", color: "var(--sb-accent)", border: "1px solid var(--sb-accent)", borderRadius: "20px" }}>
                          <span className="sb-pulse-dot me-1"></span>Active
                        </span>
                      </div>
                      <p style={{ color: "var(--sb-muted)", fontSize: "0.85rem" }} className="mb-1">
                        <i className="bi bi-geo-alt me-1"></i>{sensor.location || sensor.locatedAt}
                      </p>
                      <p style={{ color: "var(--sb-muted)", fontSize: "0.85rem" }} className="mb-1">
                        <i className="bi bi-tag me-1"></i>{sensor.topicName}
                      </p>
                      {sensor.quantity && (
                        <p style={{ color: "var(--sb-muted)", fontSize: "0.85rem" }} className="mb-0">
                          <i className="bi bi-rulers me-1"></i>{sensor.quantity} ({sensor.unit})
                        </p>
                      )}
                      <p style={{ color: "var(--sb-muted)", fontSize: "0.85rem" }} className="mt-2 mb-0">
                        <i className="bi bi-calendar me-1"></i>
                        Added: {sensor.createdAt ? new Date(sensor.createdAt).toLocaleDateString() : ""}
                      </p>
                      <div className="mt-3 pt-2 d-flex justify-content-between align-items-center" style={{ borderTop: "1px solid var(--sb-border)" }}>
                        <span
                          style={{ cursor: "pointer", color: "var(--sb-accent)", fontSize: "0.9rem" }}
                          onClick={() => { setSelectedSensor(sensor); setSelectedFields([]); setSelectedInterval(""); }}
                        >
                          <i className="bi bi-sliders me-1"></i>Configure & View Data
                        </span>
                        {isAdmin && (
                          <span style={{ cursor: "pointer", color: "#dc3545", fontSize: "0.9rem" }} onClick={() => handleDeleteSensor(sensor.id)}>
                            <i className="bi bi-trash me-1"></i>Delete
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <Pagination />
            </>
          );
        })()}
      </div>

      {/* ── Restore Panel ── */}
      {showRestorePanel && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ backgroundColor: "rgba(0,0,0,0.55)", zIndex: 1070 }}>
          <div className="card border-0 shadow-lg p-4" style={{ width: "580px", maxHeight: "80vh", overflowY: "auto", borderRadius: "18px", backgroundColor: "var(--sb-white)" }}>
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h5 className="mb-0"><i className="bi bi-arrow-counterclockwise me-2" style={{ color: "var(--sb-accent)" }}></i>Restore Deleted Items</h5>
              <button className="btn-close" onClick={() => setShowRestorePanel(false)}></button>
            </div>
            {restoreLoading ? (
              <div className="text-center py-4">
                <div className="spinner-border" style={{ color: "var(--sb-accent)" }}></div>
                <p className="mt-2 small" style={{ color: "var(--sb-muted)" }}>Loading deleted items…</p>
              </div>
            ) : (
              <>
                <h6 className="mb-3" style={{ color: "var(--sb-text)", fontWeight: 700 }}>
                  <i className="bi bi-hdd-network me-2" style={{ color: "var(--sb-accent)" }}></i>Deleted Connections ({deletedConnections.length})
                </h6>
                {deletedConnections.length === 0 ? (
                  <p className="small mb-4" style={{ color: "var(--sb-muted)" }}>No deleted connections.</p>
                ) : (
                  <div className="mb-4">
                    {deletedConnections.map(c => {
                      const id = c._id;
                      const isRestoring = String(restoringId) === id;
                      return (
                        <div key={id} className="d-flex justify-content-between align-items-center p-2 mb-2" style={{ background: "var(--sb-light-bg)", borderRadius: "10px", opacity: isRestoring ? 0.65 : 1 }}>
                          <div>
                            <p className="mb-0 fw-semibold" style={{ fontSize: "0.88rem", color: "var(--sb-text)" }}>{c.connectionName ?? c.name}</p>
                            <p className="mb-0 small" style={{ color: "var(--sb-muted)" }}>{c.connectionUrl}</p>
                          </div>
                          <button className="btn btn-sm btn-outline-success d-flex align-items-center gap-1" style={{ borderRadius: "20px", fontSize: "0.78rem", minWidth: 80 }} disabled={!!restoringId} onClick={() => handleRestoreConnection(id)}>
                            {isRestoring ? <><span className="spinner-border spinner-border-sm" style={{ width: "0.75rem", height: "0.75rem" }}></span> Restoring…</> : <><i className="bi bi-arrow-counterclockwise"></i> Restore</>}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
                <hr />
                <h6 className="mb-3 mt-3" style={{ color: "var(--sb-text)", fontWeight: 700 }}>
                  <i className="bi bi-broadcast me-2" style={{ color: "var(--sb-accent)" }}></i>Deleted Sensors ({deletedSensors.length})
                </h6>
                {deletedSensors.length === 0 ? (
                  <p className="small" style={{ color: "var(--sb-muted)" }}>No deleted sensors.</p>
                ) : (
                  deletedSensors.map(s => {
                    const id = s._id;
                    const parentConnId = s.connectionId ?? s.connection_id ?? null;
                    const isRestoring = String(restoringId) === id;
                    return (
                      <div key={id} className="d-flex justify-content-between align-items-center p-2 mb-2" style={{ background: "var(--sb-light-bg)", borderRadius: "10px", opacity: isRestoring ? 0.65 : 1 }}>
                        <div>
                          <p className="mb-0 fw-semibold" style={{ fontSize: "0.88rem", color: "var(--sb-text)" }}>{s.sensorName ?? s.name}</p>
                          <p className="mb-0 small" style={{ color: "var(--sb-muted)" }}>{s.location ?? s.locatedAt} · {s.topicName}</p>
                        </div>
                        <button className="btn btn-sm btn-outline-success d-flex align-items-center gap-1" style={{ borderRadius: "20px", fontSize: "0.78rem", minWidth: 80 }} disabled={!!restoringId} onClick={() => handleRestoreSensor(id, parentConnId)}>
                          {isRestoring ? <><span className="spinner-border spinner-border-sm" style={{ width: "0.75rem", height: "0.75rem" }}></span> Restoring…</> : <><i className="bi bi-arrow-counterclockwise"></i> Restore</>}
                        </button>
                      </div>
                    );
                  })
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Connection Modal */}
      {showConnectionModal && (
        <ConnectionModal onClose={() => setShowConnectionModal(false)} onSave={handleConnectionSaved} />
      )}

      {/* Edit Connection Modal */}
      {editingConnection && (
        <MqttForm
          onClose={() => setEditingConnection(null)}
          initialData={{
            connectionName: editingConnection.name,
            connectionUrl: editingConnection.connectionUrl || "",
            port: editingConnection.port || "1883",
            username: editingConnection.username || "",
            password: editingConnection.password || "",
            tlsEnabled: editingConnection.tlsEnabled || false,
            isPublic: editingConnection.isPublic || false,
          }}
          onConnected={(updatedData) => handleUpdateConnection(updatedData)}
          isEditing={true}
        />
      )}

      {/* ── Add Single Sensor Modal ── */}
      {showForm && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1050 }}>
          <div className="card border-0 shadow-lg p-4" style={{ width: "500px", borderRadius: "20px", backgroundColor: "var(--sb-white)" }}>
            <div className="d-flex justify-content-between mb-4">
              <h5 className="mb-0"><i className="bi bi-broadcast me-2" style={{ color: "var(--sb-accent)" }}></i>Add New Sensor</h5>
              <button className="btn-close" onClick={() => { setShowForm(false); setErrors({}); }}></button>
            </div>
            {[
              { label: "Sensor Name", name: "sensorName", placeholder: "e.g. Temperature Sensor 1" },
              { label: "Location", name: "location", placeholder: "e.g. Factory Floor A" },
              { label: "Topic Name", name: "topicName", placeholder: "e.g. sensors/temperature/1" },
            ].map(({ label, name, placeholder }) => (
              <div className="mb-3" key={name}>
                <label className="form-label sb-form-label">{label} <span className="text-danger">*</span></label>
                <input type="text" name={name} className={`form-control sb-input ${errors[name] ? "is-invalid" : ""}`} placeholder={placeholder} value={form[name]} onChange={handleChange} />
                {errors[name] && <div className="invalid-feedback">{errors[name]}</div>}
              </div>
            ))}
            <div className="mb-4">
              <label className="form-label sb-form-label">Data Fields <span className="text-danger">*</span></label>
              <div className="d-flex gap-3">
                <div className="flex-fill">
                  <input type="text" name="quantity" className={`form-control sb-input ${errors.quantity ? "is-invalid" : ""}`} placeholder="Quantity (e.g. Temperature)" value={form.quantity} onChange={handleChange} />
                  {errors.quantity && <div className="invalid-feedback">{errors.quantity}</div>}
                </div>
                <div className="flex-fill">
                  <input type="text" name="unit" className={`form-control sb-input ${errors.unit ? "is-invalid" : ""}`} placeholder="Unit (e.g. °C)" value={form.unit} onChange={handleChange} />
                  {errors.unit && <div className="invalid-feedback">{errors.unit}</div>}
                </div>
              </div>
            </div>
            <div className="d-flex gap-2 justify-content-end">
              <button className="btn btn-outline-secondary" onClick={() => { setShowForm(false); setErrors({}); }}>Cancel</button>
              <button className="btn sb-connect-btn" onClick={handleAddSensor}><i className="bi bi-plus-circle me-2"></i>Save Sensor</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Bulk Upload Modal ── */}
      {showBulkModal && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ backgroundColor: "rgba(0,0,0,0.55)", zIndex: 1055 }}>
          <div className="card border-0 shadow-lg p-4" style={{ width: "640px", maxHeight: "88vh", overflowY: "auto", borderRadius: "20px", backgroundColor: "var(--sb-white)" }}>

            {/* Header */}
            <div className="d-flex justify-content-between align-items-center mb-4">
              <div>
                <h5 className="mb-0">
                  <i className="bi bi-file-earmark-spreadsheet me-2" style={{ color: "#6366f1" }}></i>
                  Bulk Add Sensors
                </h5>
                <p className="mb-0 small mt-1" style={{ color: "var(--sb-muted)" }}>
                  Upload an Excel file to add multiple sensors at once.
                </p>
              </div>
              <button className="btn-close" onClick={closeBulkModal}></button>
            </div>

            {/* Step 1: Download template */}
            <div
              className="d-flex align-items-center justify-content-between p-3 mb-3"
              style={{ background: "rgba(99,102,241,0.07)", borderRadius: "12px", border: "1px solid rgba(99,102,241,0.18)" }}
            >
              <div className="d-flex align-items-center gap-3">
                <div style={{ width: 40, height: 40, borderRadius: "10px", background: "rgba(99,102,241,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <i className="bi bi-download" style={{ color: "#6366f1", fontSize: "1.1rem" }}></i>
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "var(--sb-text)" }}>Step 1 — Download Template</div>
                  <div style={{ fontSize: "0.78rem", color: "var(--sb-muted)" }}>Fill in the template, then upload it below.</div>
                </div>
              </div>
              <button
                className="btn d-flex align-items-center gap-2"
                style={{ borderRadius: "50px", padding: "6px 16px", fontWeight: 600, fontSize: "0.8rem", background: "#6366f1", color: "#fff", border: "none", whiteSpace: "nowrap" }}
                onClick={handleDownloadTemplate}
                disabled={templateDownloading}
              >
                {templateDownloading
                  ? <><span className="spinner-border spinner-border-sm"></span> Downloading…</>
                  : <><i className="bi bi-file-earmark-arrow-down"></i>Download Template</>
                }
              </button>
            </div>

            {/* Step 2: Upload */}
            <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "var(--sb-text)", marginBottom: 8 }}>
              Step 2 — Upload Filled Template
            </div>

            {/* Drop zone / file picker */}
            <label
              htmlFor="bulk-file-input"
              style={{
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                gap: 8, padding: "28px 20px", border: "2px dashed var(--sb-border)",
                borderRadius: "12px", cursor: "pointer", marginBottom: 16,
                background: bulkFile ? "rgba(0,198,174,0.04)" : "var(--sb-light-bg)",
              }}
            >
              <i className="bi bi-cloud-upload" style={{ fontSize: "2rem", color: bulkFile ? "var(--sb-accent)" : "var(--sb-muted)" }}></i>
              {bulkFile ? (
                <span style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--sb-accent)" }}>
                  <i className="bi bi-file-earmark-check me-1"></i>{bulkFile.name}
                </span>
              ) : (
                <span style={{ fontSize: "0.85rem", color: "var(--sb-muted)" }}>
                  Click to select or drag & drop your <strong>.xlsx</strong> file
                </span>
              )}
              <input id="bulk-file-input" ref={bulkFileInputRef} type="file" accept=".xlsx,.xls" style={{ display: "none" }} onChange={handleBulkFileChange} />
            </label>

            {/* Parse errors */}
            {bulkErrors.length > 0 && (
              <div className="mb-3 p-3" style={{ background: "#fff5f5", borderRadius: "10px", border: "1px solid #fca5a5" }}>
                <p className="mb-1 fw-semibold" style={{ color: "#dc2626", fontSize: "0.85rem" }}>
                  <i className="bi bi-exclamation-circle me-1"></i>Issues found:
                </p>
                {bulkErrors.map((e, i) => (
                  <p key={i} className="mb-0 small" style={{ color: "#dc2626" }}>{e.message}</p>
                ))}
              </div>
            )}

            {/* Preview table */}
            {bulkPreview.length > 0 && (
              <div className="mb-3">
                {(() => {
                  const errorRowNums = new Set(bulkErrors.map(e => e.rowIndex).filter(r => r !== undefined));
                  const totalPreviewPages = Math.ceil(bulkPreview.length / PREVIEW_PER_PAGE);
                  const previewSlice = bulkPreview.slice((previewPage - 1) * PREVIEW_PER_PAGE, previewPage * PREVIEW_PER_PAGE);
                  return (
                    <>
                      <p className="mb-2 small fw-semibold" style={{ color: "var(--sb-text)" }}>
                        <i className="bi bi-table me-1" style={{ color: "var(--sb-accent)" }}></i>
                        Parsed from file — {bulkPreview.length} row{bulkPreview.length !== 1 ? "s" : ""} found
                        {bulkErrors.length > 0 && <span className="text-danger ms-2">({bulkErrors.length} row{bulkErrors.length !== 1 ? "s" : ""} skipped due to errors)</span>}
                      </p>
                      <div style={{ overflowX: "auto", borderRadius: "10px", border: "1px solid var(--sb-border)" }}>
                        <table className="table table-sm mb-0" style={{ fontSize: "0.8rem" }}>
                          <thead>
                            <tr style={{ background: "var(--sb-light-bg)" }}>
                              {["Sensor Name", "Location", "Topic", "Quantity", "Unit"].map(h => (
                                <th key={h} style={{ padding: "8px 10px", color: "var(--sb-muted)", fontWeight: 700, whiteSpace: "nowrap", border: "none" }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {previewSlice.map((row, i) => {
                              const absIdx = (previewPage - 1) * PREVIEW_PER_PAGE + i;
                              const hasError = errorRowNums.has(absIdx);
                              return (
                                <tr key={i} style={hasError ? { outline: "2px solid #dc2626", outlineOffset: "-2px", background: "#fff5f5" } : {}}>
                                  <td style={{ padding: "6px 10px", color: hasError ? "#dc2626" : "var(--sb-text)", fontWeight: hasError ? 600 : 400 }}>
                                    {hasError && <i className="bi bi-exclamation-circle-fill me-1 text-danger"></i>}
                                    {row.sensorName}
                                  </td>
                                  <td style={{ padding: "6px 10px", color: hasError ? "#dc2626" : "var(--sb-muted)" }}>{row.location}</td>
                                  <td style={{ padding: "6px 10px", color: hasError ? "#dc2626" : "var(--sb-muted)", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.topicName}</td>
                                  <td style={{ padding: "6px 10px", color: hasError ? "#dc2626" : "var(--sb-muted)" }}>{row.quantity}</td>
                                  <td style={{ padding: "6px 10px", color: hasError ? "#dc2626" : "var(--sb-muted)" }}>{row.unit}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      {totalPreviewPages > 1 && (
                        <div className="d-flex justify-content-center align-items-center gap-1 mt-2">
                          <button className="btn btn-sm btn-outline-secondary" style={{ borderRadius: "6px", padding: "2px 8px" }} disabled={previewPage === 1} onClick={() => setPreviewPage(p => p - 1)}>
                            <i className="bi bi-chevron-left"></i>
                          </button>
                          {Array.from({ length: totalPreviewPages }, (_, i) => i + 1).map(p => (
                            <button key={p} onClick={() => setPreviewPage(p)} style={{ padding: "2px 8px", border: `1px solid ${previewPage === p ? "var(--sb-accent)" : "var(--sb-border)"}`, borderRadius: "6px", background: previewPage === p ? "var(--sb-accent)" : "transparent", color: previewPage === p ? "#fff" : "var(--sb-muted)", fontWeight: 600, fontSize: "0.75rem", cursor: "pointer" }}>
                              {p}
                            </button>
                          ))}
                          <button className="btn btn-sm btn-outline-secondary" style={{ borderRadius: "6px", padding: "2px 8px" }} disabled={previewPage === totalPreviewPages} onClick={() => setPreviewPage(p => p + 1)}>
                            <i className="bi bi-chevron-right"></i>
                          </button>
                          <span className="ms-1 small" style={{ color: "var(--sb-muted)" }}>
                            {(previewPage - 1) * PREVIEW_PER_PAGE + 1}–{Math.min(previewPage * PREVIEW_PER_PAGE, bulkPreview.length)} of {bulkPreview.length}
                          </span>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            )}

            {/* Result summary — matches API shape: { totalRows, successCount, failureCount, parsedJson, errors[] } */}
            {bulkResult && (
              <div className="mb-3">
                {/* Totals row */}
                <div className="d-flex gap-2 mb-2 flex-wrap">
                  {[
                    { label: "Total Rows",   val: bulkResult.totalRows ?? (bulkResult.success.length + bulkResult.failed.length), color: "#6366f1", icon: "bi-list-ol" },
                    { label: "Imported",     val: bulkResult.success.length, color: "#16a34a", icon: "bi-check-circle-fill" },
                    { label: "Failed",       val: bulkResult.failed.length,  color: "#dc2626", icon: "bi-x-circle-fill" },
                  ].map(c => (
                    <div key={c.label} style={{ flex: "1 1 100px", background: "var(--sb-bg, #f8f9fa)", borderRadius: 10, padding: "10px 14px", border: `1px solid ${c.color}22`, textAlign: "center" }}>
                      <div style={{ color: c.color, fontSize: "1.4rem", fontWeight: 800 }}>{c.val}</div>
                      <div style={{ color: "var(--sb-muted)", fontSize: "0.75rem" }}><i className={`bi ${c.icon} me-1`}></i>{c.label}</div>
                    </div>
                  ))}
                </div>

                {bulkResult.success.length > 0 && (
                  <div className="p-3 mb-2" style={{ background: "#f0fdf4", borderRadius: "10px", border: "1px solid #86efac" }}>
                    <p className="mb-0 fw-semibold" style={{ color: "#16a34a", fontSize: "0.85rem" }}>
                      <i className="bi bi-check-circle-fill me-1"></i>
                      {bulkResult.success.length} sensor{bulkResult.success.length !== 1 ? "s" : ""} added successfully.
                    </p>
                  </div>
                )}

                {bulkResult.failed.length > 0 && (
                  <div className="p-3" style={{ background: "#fff5f5", borderRadius: "10px", border: "1px solid #fca5a5" }}>
                    <p className="mb-2 fw-semibold" style={{ color: "#dc2626", fontSize: "0.85rem" }}>
                      <i className="bi bi-x-circle-fill me-1"></i>{bulkResult.failed.length} row{bulkResult.failed.length !== 1 ? "s" : ""} failed:
                    </p>
                    <div style={{ overflowX: "auto", maxHeight: 220, overflowY: "auto", borderRadius: "8px", border: "1px solid #fca5a5" }}>
                      <table className="table table-sm mb-0" style={{ fontSize: "0.78rem" }}>
                        <thead style={{ position: "sticky", top: 0, zIndex: 1 }}>
                          <tr style={{ background: "#fee2e2" }}>
                            <th style={{ padding: "6px 10px", color: "#7f1d1d", fontWeight: 700, whiteSpace: "nowrap", border: "none", width: 40 }}>#</th>
                            <th style={{ padding: "6px 10px", color: "#7f1d1d", fontWeight: 700, whiteSpace: "nowrap", border: "none", width: 60 }}>Row</th>
                            <th style={{ padding: "6px 10px", color: "#7f1d1d", fontWeight: 700, whiteSpace: "nowrap", border: "none" }}>Sensor Name</th>
                            <th style={{ padding: "6px 10px", color: "#7f1d1d", fontWeight: 700, whiteSpace: "nowrap", border: "none" }}>Error</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bulkResult.failed.map((f, i) => (
                            <tr key={i} style={{ borderBottom: "1px solid #fecaca", background: i % 2 === 0 ? "#fff5f5" : "#fff" }}>
                              <td style={{ padding: "5px 10px", color: "#9ca3af" }}>{i + 1}</td>
                              <td style={{ padding: "5px 10px", color: "#dc2626", fontWeight: 600 }}>{f.row ?? "—"}</td>
                              <td style={{ padding: "5px 10px", color: "#dc2626", fontWeight: 600 }}>{f.name}</td>
                              <td style={{ padding: "5px 10px", color: "#7f1d1d" }}>{f.reason}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Footer */}
            <div className="d-flex gap-2 justify-content-end mt-2">
              <button className="btn btn-outline-secondary" onClick={closeBulkModal}>
                {bulkResult ? "Close" : "Cancel"}
              </button>
              {!bulkResult && (
                <button
                  className="btn sb-connect-btn d-flex align-items-center gap-2"
                  disabled={!bulkFile || bulkUploading}
                  onClick={handleBulkUpload}
                >
                  {bulkUploading
                    ? <><span className="spinner-border spinner-border-sm"></span> Uploading…</>
                    : <><i className="bi bi-cloud-upload-fill"></i>Upload Sensors</>
                  }
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Sensor Detail Popup ── */}
      {selectedSensor && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ backgroundColor: "rgba(0,0,0,0.6)", zIndex: 1060 }}>
          <div className="card border-0 shadow-lg p-4" style={{ width: "500px", borderRadius: "16px", backgroundColor: "var(--sb-white)", maxHeight: "90vh", overflowY: "auto" }}>
            <div className="d-flex justify-content-between mb-3">
              <h5 className="mb-0"><i className="bi bi-broadcast me-2" style={{ color: "var(--sb-accent)" }}></i>{selectedSensor.sensorName}</h5>
              <button className="btn-close" onClick={() => setSelectedSensor(null)}></button>
            </div>
            <div className="mb-3 p-3" style={{ backgroundColor: "var(--sb-light-bg)", borderRadius: "10px" }}>
              <p className="sb-form-label mb-1"><i className="bi bi-geo-alt me-1"></i>Location: {selectedSensor.location || selectedSensor.locatedAt}</p>
              <p className="sb-form-label mb-1"><i className="bi bi-tag me-1"></i>Topic: {selectedSensor.topicName}</p>
              {selectedSensor.quantity && (
                <p className="sb-form-label mb-0"><i className="bi bi-rulers me-1"></i>{selectedSensor.quantity} ({selectedSensor.unit})</p>
              )}
            </div>
            <div className="mb-3">
              <label className="sb-form-label mb-2">Select Data Fields</label>
              {selectedSensor.quantity ? (
                <div
                  className="d-flex align-items-center justify-content-between p-2"
                  style={{ backgroundColor: "var(--sb-light-bg)", borderRadius: "8px", cursor: "pointer" }}
                  onClick={() => toggleField(selectedSensor.quantity)}
                >
                  <span style={{ fontSize: "0.88rem" }}>{selectedSensor.quantity} ({selectedSensor.unit})</span>
                  <input type="checkbox" checked={selectedFields.includes(selectedSensor.quantity)} onChange={() => toggleField(selectedSensor.quantity)} style={{ accentColor: "var(--sb-accent)", width: "16px", height: "16px" }} />
                </div>
              ) : (
                <p className="small" style={{ color: "var(--sb-muted)" }}>No data fields specified.</p>
              )}
            </div>
            <div className="mb-4">
              <label className="sb-form-label mb-2">Select Time Interval</label>
              <select className="form-select sb-input" value={selectedInterval} onChange={(e) => setSelectedInterval(e.target.value)}>
                <option value="">-- Select Interval --</option>
                {["1 Week", "15 Days", "1 Month", "3 Months"].map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
            <div className="d-flex justify-content-end">
              <button
                className="btn sb-connect-btn"
                disabled={!selectedFields.length || !selectedInterval}
                onClick={() => {
                  setSelectedSensor(null);
                  navigate("/dashboard", { state: { sensorId: selectedSensor.sensorId, sensorName: selectedSensor.sensorName, interval: selectedInterval, unit: selectedSensor.unit } });
                }}
              >
                <i className="bi bi-speedometer2 me-2"></i>View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sensor;