import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { addSensor, deleteSensor } from "../api/sensorsapi";
import { getActiveSensors } from "../api/activeapi";
import ConnectionModal from "../components/ConnectionModal";
import MqttForm from "../components/MqttForm";
import { updateConnection, deleteConnection } from "../api/connectionsapi";
import api from "../api/axiosInstance";

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

  const [showAddDropdown, setShowAddDropdown] = useState(false);
  const addDropdownRef = useRef(null);

  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
  const connDropdownRef = useRef(null);

  const [sensorView, setSensorView] = useState("tile");
  const SENSORS_PER_PAGE = 9;
  const [currentPage, setCurrentPage] = useState(1);

  // ── Bulk upload state ──────────────────────────────────────────────────────
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [templateDownloading, setTemplateDownloading] = useState(false);
  const [previewPage, setPreviewPage] = useState(1);
  const PREVIEW_PER_PAGE = 8;
  const bulkFileInputRef = useRef(null);

  // ── Validate API response state ────────────────────────────────────────────
  const [validateResult, setValidateResult] = useState(null);
  // validateResult shape:
  // { totalRows, successCount, failureCount, rows[], errors[], requiredRenames[] }

  // ── Restore panel state ────────────────────────────────────────────────────
  const [showRestorePanel, setShowRestorePanel] = useState(false);
  const [deletedConnections, setDeletedConnections] = useState([]);
  const [deletedSensors, setDeletedSensors] = useState([]);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [restoringId, setRestoringId] = useState(null);

  const [confirmModal, setConfirmModal] = useState({ show: false, message: "", onConfirm: null });

  // ── Rename suggestion modal (single-add flow) ──────────────────────────────
  const [renameModal, setRenameModal] = useState({ show: false, originalName: "", proposedName: "", pendingPayload: null });

  // ── Parameter & Unit dropdowns ─────────────────────────────────────────────
  const PARAM_API_BASE = "http://10.4.0.103:8081";
  const [parameters, setParameters] = useState([]);
  const [parametersLoading, setParametersLoading] = useState(false);
  const [units, setUnits] = useState([]);
  const [unitsLoading, setUnitsLoading] = useState(false);
  
   const fetchParameters = useCallback(async () => {
    setParametersLoading(true);
    try {
      const res = await fetch(`${PARAM_API_BASE}/api/parameters`);
      const data = await res.json();
      // data: [{ parameterId, parameterName }, ...]
      setParameters(Array.isArray(data) ? data : []);
    } catch { setParameters([]); }
    finally { setParametersLoading(false); }
  }, []);

  const fetchUnits = useCallback(async (parameterId) => {
    if (parameterId === null || parameterId === undefined) { setUnits([]); return; }
    setUnitsLoading(true);
    try {
      const res = await fetch(`${PARAM_API_BASE}/api/parameters/units/${parameterId}`);
      const data = await res.json();
      setUnits(Array.isArray(data) ? data : []);
    } catch { setUnits([]); }
    finally { setUnitsLoading(false); }
  }, []);
  // ── Fetch parameters when the add-sensor form opens ───────────────────────
  useEffect(() => {
    if (showForm) {
      fetchParameters();
      setUnits([]);
    }
  }, [showForm, fetchParameters]);

  // ── Fetch units whenever the selected quantity/parameter changes ───────────
  useEffect(() => {
    if (!showForm) return;
    const matched = parameters.find(p => p.parameterName === form.quantity);
    if (matched) {
      fetchUnits(matched.parameterId);
    } else {
      setUnits([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.quantity, parameters]);

  // ── Outside click handlers ─────────────────────────────────────────────────
  useEffect(() => {
    const h = (e) => { if (addDropdownRef.current && !addDropdownRef.current.contains(e.target)) setShowAddDropdown(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => {
    const h = (e) => { if (connDropdownRef.current && !connDropdownRef.current.contains(e.target)) setOpenDropdownId(null); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // ── Toast ──────────────────────────────────────────────────────────────────
  const showToast = useCallback((msg, type = "success") => {
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
    } catch { setSensors([]); }
  }, []);

  const syncConnections = useCallback(async (createdByMe = false) => {
    try {
      const url = createdByMe ? "/api/connections/all?createdByMe=true" : "/api/connections/all";
      const live = await api.get(url).then(r => Array.isArray(r.data) ? r.data : r.data?.data ?? []);
      const mapped = live.map(c => ({ id: c.connectionId, name: c.connectionName, connectionUrl: c.connectionUrl, port: c.port, tlsEnabled: c.tlsEnabled, isPublic: c.isPublic }));
      localStorage.setItem("sb_connections", JSON.stringify(mapped));
      setConnections(mapped);
      return mapped;
    } catch { setConnections([]); return []; }
  }, []);

  useEffect(() => {
    syncConnections().then(mapped => { if (mapped.length) { setActiveConnectionId(mapped[0].id); fetchSensors(mapped[0].id); } });
  }, [syncConnections, fetchSensors]);

  useEffect(() => { fetchSensors(activeConnectionId); setCurrentPage(1); }, [activeConnectionId, fetchSensors]);

  useEffect(() => {
    syncConnections(connCreatedByMe).then(mapped => { const first = mapped[0]?.id ?? null; setActiveConnectionId(first); fetchSensors(first); });
  }, [connCreatedByMe, syncConnections, fetchSensors]);

  // ── Restore ────────────────────────────────────────────────────────────────
  const refreshDeletedLists = async () => {
    setRestoreLoading(true);
    try {
      const [dc, ds] = await Promise.all([
        api.get("/api/Connections/deleted").then(r => r.data),
        api.get("/api/Sensors/deleted").then(r => r.data),
      ]);
      setDeletedConnections((Array.isArray(dc) ? dc : []).map(c => ({ ...c, _id: String(c.connectionId ?? c.id ?? "") })));
      setDeletedSensors((Array.isArray(ds) ? ds : []).map(s => ({ ...s, _id: String(s.sensorId ?? s.id ?? "") })));
    } catch { setDeletedConnections([]); setDeletedSensors([]); }
    finally { setRestoreLoading(false); }
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
      showToast("Connection restored successfully!");
    } catch { showToast("Failed to restore connection.", "danger"); }
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
      showToast("Sensor restored successfully!");
    } catch { showToast("Failed to restore sensor.", "danger"); }
    finally { setRestoringId(null); }
  };

  // ── Connection handlers ────────────────────────────────────────────────────
  const handleConnectionSaved = async (newConnection) => {
    setShowConnectionModal(false);
    const mapped = await syncConnections();
    const saved = mapped.find(c => c.id === newConnection.id) ?? mapped[0];
    if (saved) { setActiveConnectionId(saved.id); await fetchSensors(saved.id); }
  };

  const handleDeleteConnection = (connId) => {
    setConfirmModal({
      show: true, message: "Are you sure you want to delete this connection?",
      onConfirm: async () => {
        try {
          await deleteConnection(connId);
          const updated = connections.filter(c => c.id !== connId);
          setConnections(updated);
          localStorage.setItem("sb_connections", JSON.stringify(updated));
          if (activeConnectionId === connId) { const next = updated.length ? updated[0].id : null; setActiveConnectionId(next); await fetchSensors(next); }
        } catch (err) { console.error(err); }
      },
    });
  };

  const handleUpdateConnection = async (updatedData) => {
    try {
      await updateConnection(editingConnection.id, updatedData);
      const updated = connections.map(c => c.id === editingConnection.id ? { ...c, name: updatedData.connectionName } : c);
      setConnections(updated);
      localStorage.setItem("sb_connections", JSON.stringify(updated));
      setEditingConnection(null);
    } catch (err) { console.error(err); }
  };

  // ── Sensor form ────────────────────────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value } = e.target;
    // Reset unit whenever the quantity (parameter) selection changes
    setForm(prev => ({ ...prev, [name]: value, ...(name === "quantity" ? { unit: "" } : {}) }));
    setErrors(prev => ({ ...prev, [name]: "" }));
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

  // Builds the request payload from the current form (optionally overriding the name)
  const buildSensorPayload = (overrideName = null) => ({
    connectionId: activeConnectionId,
    sensorName:   overrideName ?? form.sensorName,
    locatedAt:    form.location,
    topicName:    form.topicName,
    quantity:     form.quantity,
    unit:         form.unit,
  });

  // Shared: commit a (possibly renamed) payload and finish the flow
  const commitSensor = async (payload) => {
    const res = await api.post("/api/Sensors", payload);
    if (res.data?.sensorId || res.data?.message) {
      setSensors(prev => [...prev, {
        id: res.data.sensorId || Date.now(),
        ...form,
        sensorName: payload.sensorName,   // reflect accepted/proposed name
        location:   form.location,
        createdAt:  new Date(),
      }]);
      setForm({ sensorName: "", location: "", topicName: "", quantity: "", unit: "" });
      setShowForm(false);
      showToast(`Sensor "${payload.sensorName}" added!`);
    }
  };

  const handleAddSensor = async () => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    try {
      const payload = buildSensorPayload();
      const res = await api.post("/api/Sensors", payload);

      if (res.data?.requiresRename) {
        // Backend says name conflicts — ask the user
        setRenameModal({
          show:         true,
          originalName: res.data.originalName,
          proposedName: res.data.proposedName,
          pendingPayload: payload,
        });
        return;
      }

      // No conflict — sensor was added directly
      if (res.data?.sensorId || res.data?.message) {
        setSensors(prev => [...prev, { id: res.data.sensorId || Date.now(), ...form, createdAt: new Date() }]);
        setForm({ sensorName: "", location: "", topicName: "", quantity: "", unit: "" });
        setShowForm(false);
        showToast(`Sensor "${form.sensorName}" added!`);
      }
    } catch (err) { setErrors({ sensorName: err.response?.data?.message || "Failed to add sensor." }); }
  };

  // User clicked "Yes, use proposed name" — resend with proposedName swapped in
  const handleRenameAccept = async () => {
    const { proposedName, pendingPayload } = renameModal;
    setRenameModal({ show: false, originalName: "", proposedName: "", pendingPayload: null });
    try {
      await commitSensor({ ...pendingPayload, sensorName: proposedName });
    } catch (err) { setErrors({ sensorName: err.response?.data?.message || "Failed to add sensor." }); }
  };

  // User clicked "No, keep my name" — close modal, leave form open for manual edit
  const handleRenameDecline = () => {
    setRenameModal({ show: false, originalName: "", proposedName: "", pendingPayload: null });
  };

  const handleDeleteSensor = (sensorId) => {
    setConfirmModal({
      show: true, message: "Are you sure you want to delete this sensor?",
      onConfirm: async () => {
        try { await deleteSensor(sensorId); setSensors(prev => prev.filter(s => s.id !== sensorId)); }
        catch (err) { console.error(err); }
      },
    });
  };

  const toggleField = (field) => setSelectedFields(prev => prev.includes(field) ? prev.filter(f => f !== field) : [...prev, field]);

  // ── Bulk upload ────────────────────────────────────────────────────────────
  const handleDownloadTemplate = async () => {
    setTemplateDownloading(true);
    try {
      const response = await api.get("/api/Sensors/bulk-import/template", { responseType: "blob" });
      const blob = new Blob([response.data], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url; link.download = "sensor_bulk_template.xlsx";
      document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
    } catch { showToast("Failed to download template.", "danger"); }
    finally { setTemplateDownloading(false); }
  };

  const handleBulkFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBulkFile(file);
    setValidateResult(null);
    setPreviewPage(1);
  };

  // Step 1: Validate — calls /api/Sensors/bulk-import/validate
  const handleValidate = async () => {
    if (!bulkFile || !activeConnectionId) return;
    setBulkUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", bulkFile);
      const res = await api.post(
        `/api/Sensors/bulk-import/validate?connectionId=${activeConnectionId}`,
        fd,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      setValidateResult(res.data);
      setPreviewPage(1);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.response?.data?.title || "Validation failed.";
      showToast(msg, "danger");
    } finally { setBulkUploading(false); }
  };
 
  // Step 2: Confirm import — calls /api/Sensors/bulk-import/commit with error-free rows as JSON
  const handleConfirmImport = async () => {
    if (!validateResult || !activeConnectionId) return;
    setBulkUploading(true);
    try {
      // Build the error row set from the latest validateResult
      const errorSet = new Set((validateResult.errors ?? []).map(e => e.row));
 
      // Keep only rows that passed validation, mapped to the exact API shape
      const validRows = (validateResult.rows ?? [])
        .filter(r => !errorSet.has(r.rowNumber))
        .map(r => ({
          rowNumber: r.rowNumber,
          sensorName: r.sensorName,
          topicName: r.topicName,
          locatedAt: r.locatedAt,
          quantity: r.quantity,
          unit: r.unit,
        }));
 
      const res = await api.post(
        `/api/Sensors/bulk-import/commit?connectionId=${activeConnectionId}`,
        validRows
      );
 
      const addedCount = res.data?.addedCount ?? validRows.length;
      showToast(`${addedCount} sensor${addedCount !== 1 ? "s" : ""} imported successfully!`);
      await fetchSensors(activeConnectionId);
      closeBulkModal();
    } catch (err) {
      const msg = err?.response?.data?.message || err?.response?.data?.title || "Import failed.";
      showToast(msg, "danger");
    } finally { setBulkUploading(false); }
  };
 
  const closeBulkModal = () => {
    setShowBulkModal(false);
    setBulkFile(null);
    setValidateResult(null);
    setPreviewPage(1);
    if (bulkFileInputRef.current) bulkFileInputRef.current.value = "";
  };
 

  const activeConn = connections.find(c => c.id === activeConnectionId);

  // ── Derived from validateResult ────────────────────────────────────────────
  const rows           = validateResult?.rows          ?? [];
  const apiErrors      = validateResult?.errors        ?? [];
  const requiredRenames = validateResult?.requiredRenames ?? [];
  const errorRowNums   = new Set(apiErrors.map(e => e.row));
  const renamedRowNums = new Set(requiredRenames.map(r => r.row));
  const totalPreviewPages = Math.ceil(rows.length / PREVIEW_PER_PAGE);
  const previewSlice   = rows.slice((previewPage - 1) * PREVIEW_PER_PAGE, previewPage * PREVIEW_PER_PAGE);

  return (
    <div>
      {/* ── Page Header ── */}
      <div className="sb-page-header px-4 py-3 mb-4">
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <h5 className="sb-header-title mb-1"><i className="bi bi-broadcast me-2 sb-accent"></i>Sensors</h5>
            <p className="sb-header-subtitle mb-0">Manage and monitor your sensors.</p>
          </div>
          {isAdmin && (
            <button className="btn btn-outline-warning d-flex align-items-center gap-2"
              style={{ borderRadius: "50px", padding: "7px 18px", fontWeight: 600, fontSize: "0.85rem" }}
              onClick={openRestorePanel}>
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

      {/* ── Confirm Modal ── */}
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

      {/* ── Rename Suggestion Modal ── */}
      {renameModal.show && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10000 }}>
          <div style={{ background: "var(--sb-card-bg, #fff)", borderRadius: 18, padding: "32px 28px", width: 420, maxWidth: "92vw", boxShadow: "0 24px 60px rgba(0,0,0,0.20)" }}>
            {/* Icon + title */}
            <div className="d-flex align-items-center gap-3 mb-3">
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(245,158,11,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <i className="bi bi-pencil-fill" style={{ color: "#f59e0b", fontSize: "1.15rem" }}></i>
              </div>
              <div>
                <p style={{ fontWeight: 700, fontSize: "1rem", color: "var(--sb-text)", margin: 0 }}>Name Already Exists</p>
                <p style={{ fontSize: "0.78rem", color: "var(--sb-muted)", margin: 0 }}>A sensor with this name already exists.</p>
              </div>
            </div>

            {/* Name comparison */}
            <div style={{ background: "var(--sb-light-bg, #f9fafb)", borderRadius: 12, padding: "14px 16px", marginBottom: 20 }}>
              <div className="d-flex align-items-center gap-2 mb-2">
                <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--sb-muted)", textTransform: "uppercase", letterSpacing: "0.05em", minWidth: 72 }}>Your name</span>
                <span style={{ fontSize: "0.88rem", color: "#dc2626", fontWeight: 600, background: "#fee2e2", borderRadius: 6, padding: "2px 10px" }}>
                  <i className="bi bi-x-circle me-1" style={{ fontSize: "0.75rem" }}></i>{renameModal.originalName}
                </span>
              </div>
              <div className="d-flex align-items-center gap-2">
                <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--sb-muted)", textTransform: "uppercase", letterSpacing: "0.05em", minWidth: 72 }}>Suggested</span>
                <span style={{ fontSize: "0.88rem", color: "#059669", fontWeight: 600, background: "#d1fae5", borderRadius: 6, padding: "2px 10px" }}>
                  <i className="bi bi-check-circle me-1" style={{ fontSize: "0.75rem" }}></i>{renameModal.proposedName}
                </span>
              </div>
            </div>

            <p style={{ fontSize: "0.83rem", color: "var(--sb-muted)", marginBottom: 22 }}>
              Would you like to save the sensor using the suggested name instead?
            </p>

            {/* Actions */}
            <div className="d-flex gap-2 justify-content-end">
              <button className="btn btn-outline-secondary" style={{ borderRadius: 10, fontWeight: 600, fontSize: "0.85rem" }}
                onClick={handleRenameDecline}>
                No, cancel
              </button>
              <button className="btn sb-connect-btn d-flex align-items-center gap-2" style={{ borderRadius: 10, fontWeight: 600, fontSize: "0.85rem" }}
                onClick={handleRenameAccept}>
                <i className="bi bi-check-lg"></i>Yes, use suggested
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="container-fluid px-4">
        {/* ── Top bar ── */}
        <div className="d-flex align-items-center mb-4 gap-3" style={{ minWidth: 0 }}>
          <div className="d-flex align-items-center gap-2" style={{ minWidth: 0, flex: 1, overflow: "hidden" }}>
            {isAdmin && (
              <button onClick={() => setConnCreatedByMe(v => !v)} className="btn d-flex align-items-center gap-1"
                style={{ flexShrink: 0, borderRadius: "50px", padding: "5px 12px", fontWeight: 700, fontSize: "0.75rem", border: connCreatedByMe ? "1.5px solid var(--sb-accent)" : "1.5px dashed var(--sb-border)", background: connCreatedByMe ? "rgba(0,198,174,0.10)" : "transparent", color: connCreatedByMe ? "var(--sb-accent)" : "var(--sb-muted)", transition: "all 0.15s", whiteSpace: "nowrap" }}>
                <i className={`bi ${connCreatedByMe ? "bi-person-fill-check" : "bi-person-check"}`}></i>Created by Me
              </button>
            )}
            {isAdmin && connections.length > 0 && <div style={{ width: 1, height: 22, background: "var(--sb-border)", flexShrink: 0 }} />}
            <div style={{ display: "flex", alignItems: "center", gap: 6, overflowX: "auto", overflowY: "visible", scrollbarWidth: "none", msOverflowStyle: "none", flex: 1, minWidth: 0, paddingBottom: 2 }}>
              <style>{`.conn-scroll::-webkit-scrollbar { display: none; }`}</style>
              <div className="conn-scroll" style={{ display: "flex", gap: 6, alignItems: "center" }}>
                {connections.length === 0 ? (
                  <p className="mb-0 small" style={{ color: "var(--sb-muted)", whiteSpace: "nowrap" }}>No connections yet. Add one to get started.</p>
                ) : connections.map(conn => (
                  <div key={conn.id} className="d-flex align-items-center" style={{ flexShrink: 0, position: "relative" }}>
                    <button className={`btn ${activeConnectionId === conn.id ? "sb-connect-btn" : "btn-outline-secondary"}`}
                      style={{ borderRadius: "50px", padding: isAdmin ? "4px 32px 4px 12px" : "4px 12px", fontWeight: 600, fontSize: "0.8rem", whiteSpace: "nowrap" }}
                      onClick={() => setActiveConnectionId(conn.id)}>
                      <i className="bi bi-hdd-network me-1" style={{ fontSize: "0.75rem" }}></i>{conn.name}
                    </button>
                    {isAdmin && (
                      <button className="btn btn-sm p-0 border-0 bg-transparent d-flex align-items-center justify-content-center"
                        style={{ position: "absolute", right: "7px", color: activeConnectionId === conn.id ? "white" : "var(--sb-muted)", width: "18px", height: "18px", zIndex: 2 }}
                        onClick={(e) => { e.stopPropagation(); if (openDropdownId === conn.id) { setOpenDropdownId(null); } else { const rect = e.currentTarget.getBoundingClientRect(); setDropdownPos({ top: rect.bottom + 6, left: rect.right - 130 }); setOpenDropdownId(conn.id); } }}>
                        <i className="bi bi-three-dots-vertical" style={{ fontSize: "0.72rem" }}></i>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {openDropdownId && (
            <div ref={connDropdownRef} style={{ position: "fixed", top: dropdownPos.top, left: dropdownPos.left, background: "var(--sb-white, #fff)", border: "1px solid var(--sb-border, #e5e7eb)", borderRadius: "10px", boxShadow: "0 8px 24px rgba(0,0,0,0.13)", minWidth: "130px", fontSize: "0.88rem", zIndex: 9999, overflow: "hidden" }}>
              <button className="btn w-100 text-start d-flex align-items-center gap-2 py-2 px-3" style={{ borderRadius: 0, background: "transparent", border: "none", color: "var(--sb-text, #111)" }}
                onClick={() => { const conn = connections.find(c => c.id === openDropdownId); setEditingConnection(conn); setOpenDropdownId(null); }}>
                <i className="bi bi-pencil" style={{ color: "var(--sb-accent, #00c6ae)" }}></i>Edit
              </button>
              <hr style={{ margin: "2px 0", borderColor: "var(--sb-border, #e5e7eb)" }} />
              <button className="btn w-100 text-start d-flex align-items-center gap-2 py-2 px-3 text-danger" style={{ borderRadius: 0, background: "transparent", border: "none" }}
                onClick={() => { handleDeleteConnection(openDropdownId); setOpenDropdownId(null); }}>
                <i className="bi bi-trash"></i>Delete
              </button>
            </div>
          )}

          <div className="d-flex gap-2" style={{ flexShrink: 0 }}>
            <button className="btn btn-outline-secondary d-flex align-items-center gap-2"
              style={{ borderRadius: "50px", padding: "7px 16px", fontWeight: 600, fontSize: "0.83rem", whiteSpace: "nowrap" }}
              onClick={() => setShowConnectionModal(true)}>
              <i className="bi bi-hdd-network"></i>Add Connection
            </button>
            <div ref={addDropdownRef} style={{ position: "relative" }}>
              <div className="d-flex">
                <button className="btn sb-connect-btn d-flex align-items-center gap-2"
                  style={{ borderRadius: "50px 0 0 50px", padding: "7px 14px", fontWeight: 600, fontSize: "0.83rem", whiteSpace: "nowrap", borderRight: "1px solid rgba(255,255,255,0.3)" }}
                  disabled={!activeConnectionId}
                  onClick={() => { setForm({ sensorName: "", location: "", topicName: "", quantity: "", unit: "" }); setErrors({}); setShowForm(true); setShowAddDropdown(false); }}>
                  <i className="bi bi-plus-circle-fill"></i>Add Sensor
                </button>
                <button className="btn sb-connect-btn d-flex align-items-center justify-content-center"
                  style={{ borderRadius: "0 50px 50px 0", padding: "7px 10px" }}
                  disabled={!activeConnectionId}
                  onClick={() => setShowAddDropdown(v => !v)}>
                  <i className={`bi bi-chevron-${showAddDropdown ? "up" : "down"}`} style={{ fontSize: "0.7rem" }}></i>
                </button>
              </div>
              {showAddDropdown && (
                <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, background: "var(--sb-white)", border: "1px solid var(--sb-border)", borderRadius: "12px", boxShadow: "0 8px 24px rgba(0,0,0,0.12)", minWidth: "210px", zIndex: 1000, overflow: "hidden" }}>
                  <button className="btn w-100 text-start d-flex align-items-center gap-3 px-3 py-2"
                    style={{ borderRadius: 0, fontSize: "0.85rem", fontWeight: 600, color: "var(--sb-text)", background: "transparent", border: "none" }}
                    onClick={() => { setForm({ sensorName: "", location: "", topicName: "", quantity: "", unit: "" }); setErrors({}); setShowForm(true); setShowAddDropdown(false); }}>
                    <span style={{ width: 30, height: 30, borderRadius: "8px", background: "rgba(0,198,174,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <i className="bi bi-plus-circle" style={{ color: "var(--sb-accent)", fontSize: "0.95rem" }}></i>
                    </span>
                    <div><div style={{ lineHeight: 1.3 }}>Add Single Sensor</div><div style={{ fontSize: "0.72rem", color: "var(--sb-muted)", fontWeight: 400 }}>Fill in a form</div></div>
                  </button>
                  <div style={{ height: 1, background: "var(--sb-border)", margin: "0 12px" }} />
                  <button className="btn w-100 text-start d-flex align-items-center gap-3 px-3 py-2"
                    style={{ borderRadius: 0, fontSize: "0.85rem", fontWeight: 600, color: "var(--sb-text)", background: "transparent", border: "none" }}
                    onClick={() => { setShowBulkModal(true); setShowAddDropdown(false); }}>
                    <span style={{ width: 30, height: 30, borderRadius: "8px", background: "rgba(99,102,241,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <i className="bi bi-file-earmark-spreadsheet" style={{ color: "#6366f1", fontSize: "0.95rem" }}></i>
                    </span>
                    <div><div style={{ lineHeight: 1.3 }}>Add Bulk Sensors</div><div style={{ fontSize: "0.72rem", color: "var(--sb-muted)", fontWeight: 400 }}>Upload Excel file</div></div>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {activeConn && (
          <p className="mb-3 small" style={{ color: "var(--sb-muted)" }}>
            <i className="bi bi-hdd-network me-1"></i>Showing sensors for: <strong style={{ color: "var(--sb-text)" }}>{activeConn.name}</strong>
          </p>
        )}

        {/* ── View toggle ── */}
        {sensors.length > 0 && (
          <div className="d-flex justify-content-end mb-3">
            <div className="d-flex" style={{ border: "1px solid var(--sb-border)", borderRadius: "10px", overflow: "hidden" }}>
              {[{ key: "tile", icon: "bi-grid-3x3-gap-fill", label: "Tile" }, { key: "table", icon: "bi-table", label: "Table" }].map(v => (
                <button key={v.key} onClick={() => { setSensorView(v.key); setCurrentPage(1); }}
                  style={{ padding: "6px 14px", border: "none", fontWeight: 600, fontSize: "0.8rem", background: sensorView === v.key ? "var(--sb-accent)" : "transparent", color: sensorView === v.key ? "#fff" : "var(--sb-muted)", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, transition: "all 0.15s", borderLeft: v.key === "table" ? "1px solid var(--sb-border)" : "none" }}>
                  <i className={`bi ${v.icon}`}></i> {v.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Sensor list ── */}
        {sensors.length === 0 ? (
          <div className="text-center py-5">
            <i className="bi bi-broadcast" style={{ fontSize: "3rem", color: "var(--sb-accent)" }}></i>
            <p className="mt-3" style={{ color: "var(--sb-muted)" }}>{activeConnectionId ? "No sensors for this connection. Click + to add one." : "Select or add a connection first."}</p>
          </div>
        ) : (() => {
          const totalPages = Math.ceil(sensors.length / SENSORS_PER_PAGE);
          const pageSensors = sensors.slice((currentPage - 1) * SENSORS_PER_PAGE, currentPage * SENSORS_PER_PAGE);

          const Pagination = () => totalPages <= 1 ? null : (
            <div className="d-flex justify-content-center align-items-center gap-1 mt-4">
              <button className="btn btn-sm btn-outline-secondary" style={{ borderRadius: "8px", padding: "4px 10px" }} disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}><i className="bi bi-chevron-left"></i></button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} className="btn btn-sm" style={{ borderRadius: "8px", padding: "4px 10px", fontWeight: 600, fontSize: "0.8rem", background: currentPage === p ? "var(--sb-accent)" : "transparent", color: currentPage === p ? "#fff" : "var(--sb-muted)", border: currentPage === p ? "1px solid var(--sb-accent)" : "1px solid var(--sb-border)" }} onClick={() => setCurrentPage(p)}>{p}</button>
              ))}
              <button className="btn btn-sm btn-outline-secondary" style={{ borderRadius: "8px", padding: "4px 10px" }} disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}><i className="bi bi-chevron-right"></i></button>
              <span className="ms-2 small" style={{ color: "var(--sb-muted)" }}>{(currentPage - 1) * SENSORS_PER_PAGE + 1}–{Math.min(currentPage * SENSORS_PER_PAGE, sensors.length)} of {sensors.length}</span>
            </div>
          );

          if (sensorView === "table") return (
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
                      <tr key={sensor.id} style={{ borderBottom: "1px solid var(--sb-border)" }}
                        onMouseEnter={e => e.currentTarget.style.background = "var(--sb-light-bg)"}
                        onMouseLeave={e => e.currentTarget.style.background = ""}>
                        <td style={{ padding: "10px 14px", color: "var(--sb-muted)" }}>{(currentPage - 1) * SENSORS_PER_PAGE + idx + 1}</td>
                        <td style={{ padding: "10px 14px", fontWeight: 600, color: "var(--sb-text)" }}>{sensor.sensorName}</td>
                        <td style={{ padding: "10px 14px", color: "var(--sb-muted)" }}>{sensor.location || sensor.locatedAt}</td>
                        <td style={{ padding: "10px 14px", color: "var(--sb-muted)", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sensor.topicName}</td>
                        <td style={{ padding: "10px 14px", color: "var(--sb-muted)" }}>{sensor.quantity ? `${sensor.quantity} (${sensor.unit})` : "—"}</td>
                        <td style={{ padding: "10px 14px", color: "var(--sb-muted)", whiteSpace: "nowrap" }}>{sensor.createdAt ? new Date(sensor.createdAt).toLocaleDateString() : "—"}</td>
                        <td style={{ padding: "10px 14px" }}>
                          <div className="d-flex gap-2">
                            <button className="btn btn-sm" style={{ borderRadius: "8px", padding: "3px 10px", fontSize: "0.78rem", background: "rgba(0,198,174,0.1)", color: "var(--sb-accent)", border: "1px solid var(--sb-accent)", fontWeight: 600 }}
                              onClick={() => { setSelectedSensor(sensor); setSelectedFields([]); setSelectedInterval(""); }}>
                              <i className="bi bi-sliders me-1"></i>View
                            </button>
                            {isAdmin && (
                              <button className="btn btn-sm" style={{ borderRadius: "8px", padding: "3px 10px", fontSize: "0.78rem", background: "rgba(220,53,69,0.08)", color: "#dc3545", border: "1px solid #dc3545", fontWeight: 600 }}
                                onClick={() => handleDeleteSensor(sensor.id)}>
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
                      <p style={{ color: "var(--sb-muted)", fontSize: "0.85rem" }} className="mb-1"><i className="bi bi-geo-alt me-1"></i>{sensor.location || sensor.locatedAt}</p>
                      <p style={{ color: "var(--sb-muted)", fontSize: "0.85rem" }} className="mb-1"><i className="bi bi-tag me-1"></i>{sensor.topicName}</p>
                      {sensor.quantity && <p style={{ color: "var(--sb-muted)", fontSize: "0.85rem" }} className="mb-0"><i className="bi bi-rulers me-1"></i>{sensor.quantity} ({sensor.unit})</p>}
                      <p style={{ color: "var(--sb-muted)", fontSize: "0.85rem" }} className="mt-2 mb-0"><i className="bi bi-calendar me-1"></i>Added: {sensor.createdAt ? new Date(sensor.createdAt).toLocaleDateString() : ""}</p>
                      <div className="mt-3 pt-2 d-flex justify-content-between align-items-center" style={{ borderTop: "1px solid var(--sb-border)" }}>
                        <span style={{ cursor: "pointer", color: "var(--sb-accent)", fontSize: "0.9rem" }} onClick={() => { setSelectedSensor(sensor); setSelectedFields([]); setSelectedInterval(""); }}>
                          <i className="bi bi-sliders me-1"></i>Configure &amp; View Data
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
              <div className="text-center py-4"><div className="spinner-border" style={{ color: "var(--sb-accent)" }}></div><p className="mt-2 small" style={{ color: "var(--sb-muted)" }}>Loading deleted items…</p></div>
            ) : (
              <>
                <h6 className="mb-3" style={{ color: "var(--sb-text)", fontWeight: 700 }}><i className="bi bi-hdd-network me-2" style={{ color: "var(--sb-accent)" }}></i>Deleted Connections ({deletedConnections.length})</h6>
                {deletedConnections.length === 0 ? <p className="small mb-4" style={{ color: "var(--sb-muted)" }}>No deleted connections.</p> : (
                  <div className="mb-4">
                    {deletedConnections.map(c => { const id = c._id; const isRestoring = String(restoringId) === id; return (
                      <div key={id} className="d-flex justify-content-between align-items-center p-2 mb-2" style={{ background: "var(--sb-light-bg)", borderRadius: "10px", opacity: isRestoring ? 0.65 : 1 }}>
                        <div><p className="mb-0 fw-semibold" style={{ fontSize: "0.88rem", color: "var(--sb-text)" }}>{c.connectionName ?? c.name}</p><p className="mb-0 small" style={{ color: "var(--sb-muted)" }}>{c.connectionUrl}</p></div>
                        <button className="btn btn-sm btn-outline-success d-flex align-items-center gap-1" style={{ borderRadius: "20px", fontSize: "0.78rem", minWidth: 80 }} disabled={!!restoringId} onClick={() => handleRestoreConnection(id)}>
                          {isRestoring ? <><span className="spinner-border spinner-border-sm" style={{ width: "0.75rem", height: "0.75rem" }}></span> Restoring…</> : <><i className="bi bi-arrow-counterclockwise"></i> Restore</>}
                        </button>
                      </div>
                    ); })}
                  </div>
                )}
                <hr />
                <h6 className="mb-3 mt-3" style={{ color: "var(--sb-text)", fontWeight: 700 }}><i className="bi bi-broadcast me-2" style={{ color: "var(--sb-accent)" }}></i>Deleted Sensors ({deletedSensors.length})</h6>
                {deletedSensors.length === 0 ? <p className="small" style={{ color: "var(--sb-muted)" }}>No deleted sensors.</p> : (
                  deletedSensors.map(s => { const id = s._id; const parentConnId = s.connectionId ?? s.connection_id ?? null; const isRestoring = String(restoringId) === id; return (
                    <div key={id} className="d-flex justify-content-between align-items-center p-2 mb-2" style={{ background: "var(--sb-light-bg)", borderRadius: "10px", opacity: isRestoring ? 0.65 : 1 }}>
                      <div><p className="mb-0 fw-semibold" style={{ fontSize: "0.88rem", color: "var(--sb-text)" }}>{s.sensorName ?? s.name}</p><p className="mb-0 small" style={{ color: "var(--sb-muted)" }}>{s.location ?? s.locatedAt} · {s.topicName}</p></div>
                      <button className="btn btn-sm btn-outline-success d-flex align-items-center gap-1" style={{ borderRadius: "20px", fontSize: "0.78rem", minWidth: 80 }} disabled={!!restoringId} onClick={() => handleRestoreSensor(id, parentConnId)}>
                        {isRestoring ? <><span className="spinner-border spinner-border-sm" style={{ width: "0.75rem", height: "0.75rem" }}></span> Restoring…</> : <><i className="bi bi-arrow-counterclockwise"></i> Restore</>}
                      </button>
                    </div>
                  ); })
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Modals ── */}
      {showConnectionModal && <ConnectionModal onClose={() => setShowConnectionModal(false)} onSave={handleConnectionSaved} />}
      {editingConnection && (
        <MqttForm onClose={() => setEditingConnection(null)}
          initialData={{ connectionName: editingConnection.name, connectionUrl: editingConnection.connectionUrl || "", port: editingConnection.port || "1883", username: editingConnection.username || "", password: editingConnection.password || "", tlsEnabled: editingConnection.tlsEnabled || false, isPublic: editingConnection.isPublic || false }}
          onConnected={(updatedData) => handleUpdateConnection(updatedData)} isEditing={true} />
      )}

      {/* ── Add Single Sensor Modal ── */}
      {showForm && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1050 }}>
          <div className="card border-0 shadow-lg p-4" style={{ width: "500px", borderRadius: "20px", backgroundColor: "var(--sb-white)" }}>
            <div className="d-flex justify-content-between mb-4">
              <h5 className="mb-0"><i className="bi bi-broadcast me-2" style={{ color: "var(--sb-accent)" }}></i>Add New Sensor</h5>
              <button className="btn-close" onClick={() => { setShowForm(false); setErrors({}); }}></button>
            </div>
            {[{ label: "Sensor Name", name: "sensorName", placeholder: "e.g. Temperature Sensor 1" }, { label: "Location", name: "location", placeholder: "e.g. Factory Floor A" }, { label: "Topic Name", name: "topicName", placeholder: "e.g. sensors/temperature/1" }].map(({ label, name, placeholder }) => (
              <div className="mb-3" key={name}>
                <label className="form-label sb-form-label">{label} <span className="text-danger">*</span></label>
                <input type="text" name={name} className={`form-control sb-input ${errors[name] ? "is-invalid" : ""}`} placeholder={placeholder} value={form[name]} onChange={handleChange} />
                {errors[name] && <div className="invalid-feedback">{errors[name]}</div>}
              </div>
            ))}
            <div className="mb-4">
              <label className="form-label sb-form-label">Data Fields <span className="text-danger">*</span></label>
              <div className="d-flex gap-3">
                {/* ── Quantity dropdown (fetched from /api/parameters) ── */}
                <div className="flex-fill">
                  <select
                    name="quantity"
                    className={`form-select sb-input ${errors.quantity ? "is-invalid" : ""}`}
                    value={form.quantity}
                    onChange={handleChange}
                    disabled={parametersLoading}
                  >
                    <option value="">
                      {parametersLoading ? "Loading parameters…" : "Select Parameter"}
                    </option>
                    {parameters.map((p) => (
                      <option key={p.parameterId} value={p.parameterName}>{p.parameterName}</option>
                    ))}
                  </select>
                  {errors.quantity && <div className="invalid-feedback">{errors.quantity}</div>}
                </div>
                {/* ── Unit dropdown (fetched from /api/parameters/units/{id}) ── */}
                <div className="flex-fill">
                  <select
                    name="unit"
                    className={`form-select sb-input ${errors.unit ? "is-invalid" : ""}`}
                    value={form.unit}
                    onChange={handleChange}
                    disabled={!form.quantity || unitsLoading}
                  >
                    <option value="">
                      {!form.quantity
                        ? "Select parameter first"
                        : unitsLoading
                          ? "Loading units…"
                          : "Select Unit"}
                    </option>
                    {units.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
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
          <div className="card border-0 shadow-lg p-4" style={{ width: "680px", maxHeight: "90vh", overflowY: "auto", borderRadius: "20px", backgroundColor: "var(--sb-white)" }}>

            {/* Header */}
            <div className="d-flex justify-content-between align-items-center mb-4">
              <div>
                <h5 className="mb-0"><i className="bi bi-file-earmark-spreadsheet me-2" style={{ color: "#6366f1" }}></i>Bulk Add Sensors</h5>
                <p className="mb-0 small mt-1" style={{ color: "var(--sb-muted)" }}>Upload an Excel file to validate and add multiple sensors at once.</p>
              </div>
              <button className="btn-close" onClick={closeBulkModal}></button>
            </div>

            {/* Step 1: Download template */}
            <div className="d-flex align-items-center justify-content-between p-3 mb-3" style={{ background: "rgba(99,102,241,0.07)", borderRadius: "12px", border: "1px solid rgba(99,102,241,0.18)" }}>
              <div className="d-flex align-items-center gap-3">
                <div style={{ width: 40, height: 40, borderRadius: "10px", background: "rgba(99,102,241,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <i className="bi bi-download" style={{ color: "#6366f1", fontSize: "1.1rem" }}></i>
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "var(--sb-text)" }}>Step 1 — Download Template</div>
                  <div style={{ fontSize: "0.78rem", color: "var(--sb-muted)" }}>Fill in the template, then upload it below.</div>
                </div>
              </div>
              <button className="btn d-flex align-items-center gap-2"
                style={{ borderRadius: "50px", padding: "6px 16px", fontWeight: 600, fontSize: "0.8rem", background: "#6366f1", color: "#fff", border: "none", whiteSpace: "nowrap" }}
                onClick={handleDownloadTemplate} disabled={templateDownloading}>
                {templateDownloading ? <><span className="spinner-border spinner-border-sm"></span> Downloading…</> : <><i className="bi bi-file-earmark-arrow-down"></i>Download Template</>}
              </button>
            </div>

            {/* Step 2: Upload file */}
            <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "var(--sb-text)", marginBottom: 8 }}>Step 2 — Upload &amp; Validate</div>
            <label htmlFor="bulk-file-input"
              style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, padding: "24px 20px", border: "2px dashed var(--sb-border)", borderRadius: "12px", cursor: "pointer", marginBottom: 12, background: bulkFile ? "rgba(0,198,174,0.04)" : "var(--sb-light-bg)" }}>
              <i className="bi bi-cloud-upload" style={{ fontSize: "2rem", color: bulkFile ? "var(--sb-accent)" : "var(--sb-muted)" }}></i>
              {bulkFile
                ? <span style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--sb-accent)" }}><i className="bi bi-file-earmark-check me-1"></i>{bulkFile.name}</span>
                : <span style={{ fontSize: "0.85rem", color: "var(--sb-muted)" }}>Click to select or drag &amp; drop your <strong>.xlsx</strong> file</span>
              }
              <input id="bulk-file-input" ref={bulkFileInputRef} type="file" accept=".xlsx,.xls" style={{ display: "none" }} onChange={handleBulkFileChange} />
            </label>

            {/* Validate button — only show when file chosen and not yet validated */}
            {bulkFile && !validateResult && (
              <div className="d-flex justify-content-end mb-3">
                <button className="btn sb-connect-btn d-flex align-items-center gap-2"
                  onClick={handleValidate} disabled={bulkUploading}>
                  {bulkUploading
                    ? <><span className="spinner-border spinner-border-sm"></span> Validating…</>
                    : <><i className="bi bi-check2-circle"></i>Validate File</>
                  }
                </button>
              </div>
            )}

            {/* ── Validate result ── */}
            {validateResult && (
              <>
                {/* Summary stat cards */}
                <div className="d-flex gap-2 mb-3 flex-wrap">
                  {[
                    { label: "Total Rows",   val: validateResult.totalRows,   color: "#6366f1", icon: "bi-list-ol" },
                    { label: "Will Import",  val: validateResult.successCount, color: "#16a34a", icon: "bi-check-circle-fill" },
                    { label: "Errors",       val: validateResult.failureCount ?? apiErrors.length, color: "#dc2626", icon: "bi-x-circle-fill" },
                    { label: "Auto-renamed", val: requiredRenames.length,       color: "#f59e0b", icon: "bi-pencil-fill" },
                  ].map(c => (
                    <div key={c.label} style={{ flex: "1 1 100px", background: "var(--sb-light-bg)", borderRadius: 10, padding: "10px 12px", border: `1.5px solid ${c.color}22`, textAlign: "center" }}>
                      <div style={{ color: c.color, fontSize: "1.3rem", fontWeight: 800 }}>{c.val}</div>
                      <div style={{ color: "var(--sb-muted)", fontSize: "0.7rem" }}><i className={`bi ${c.icon} me-1`}></i>{c.label}</div>
                    </div>
                  ))}
                </div>

                {/* Legend */}
                {(requiredRenames.length > 0 || apiErrors.length > 0) && (
                  <div className="d-flex gap-3 mb-2 flex-wrap" style={{ fontSize: "0.75rem" }}>
                    {requiredRenames.length > 0 && (
                      <span style={{ color: "#b45309", background: "#fffbeb", padding: "3px 10px", borderRadius: 20, border: "1px solid #fde68a", fontWeight: 600 }}>
                        <i className="bi bi-pencil-fill me-1" style={{ fontSize: "0.65rem" }}></i>Yellow = auto-renamed (duplicate name)
                      </span>
                    )}
                    {apiErrors.length > 0 && (
                      <span style={{ color: "#b91c1c", background: "#fff5f5", padding: "3px 10px", borderRadius: 20, border: "1px solid #fca5a5", fontWeight: 600 }}>
                        <i className="bi bi-x-circle-fill me-1" style={{ fontSize: "0.65rem" }}></i>Red = validation error (will be skipped)
                      </span>
                    )}
                  </div>
                )}

                {/* Preview table */}
                {rows.length > 0 && (
                  <div className="mb-3">
                    <div style={{ overflowX: "auto", borderRadius: "10px", border: "1px solid var(--sb-border)" }}>
                      <table className="table table-sm mb-0" style={{ fontSize: "0.8rem" }}>
                        <thead>
                          <tr style={{ background: "var(--sb-light-bg)" }}>
                            {["Row", "Sensor Name", "Location", "Topic", "Quantity", "Unit"].map(h => (
                              <th key={h} style={{ padding: "8px 10px", color: "var(--sb-muted)", fontWeight: 700, whiteSpace: "nowrap", border: "none" }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {previewSlice.map((row, i) => {
                            const hasError  = errorRowNums.has(row.rowNumber);
                            const isRenamed = renamedRowNums.has(row.rowNumber);
                            const rename    = requiredRenames.find(r => r.row === row.rowNumber);
                            return (
                              <tr key={i} style={
                                hasError  ? { background: "#fff5f5",  outline: "2px solid #dc2626", outlineOffset: "-2px" }
                                : isRenamed ? { background: "#fffbeb", outline: "2px solid #f59e0b", outlineOffset: "-2px" }
                                : {}
                              }>
                                <td style={{ padding: "6px 10px", color: "var(--sb-muted)", fontSize: "0.75rem" }}>{row.rowNumber}</td>
                                <td style={{ padding: "6px 10px", fontWeight: 600, color: hasError ? "#dc2626" : isRenamed ? "#b45309" : "var(--sb-text)" }}>
                                  {hasError  && <i className="bi bi-x-circle-fill me-1" style={{ color: "#dc2626", fontSize: "0.7rem" }}></i>}
                                  {isRenamed && <i className="bi bi-pencil-fill me-1"   style={{ color: "#f59e0b", fontSize: "0.65rem" }}></i>}
                                  {row.sensorName}
                                  {isRenamed && (
                                    <span title={`Original: ${rename?.originalName}`}
                                      style={{ fontSize: "0.6rem", background: "#fef3c7", color: "#92400e", padding: "1px 6px", borderRadius: 10, marginLeft: 6, fontWeight: 700, cursor: "help" }}>
                                      was: {rename?.originalName}
                                    </span>
                                  )}
                                </td>
                                <td style={{ padding: "6px 10px", color: hasError ? "#dc2626" : "var(--sb-muted)" }}>{row.locatedAt}</td>
                                <td style={{ padding: "6px 10px", color: hasError ? "#dc2626" : "var(--sb-muted)", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.topicName}</td>
                                <td style={{ padding: "6px 10px", color: hasError ? "#dc2626" : "var(--sb-muted)" }}>{row.quantity}</td>
                                <td style={{ padding: "6px 10px", color: hasError ? "#dc2626" : "var(--sb-muted)" }}>{row.unit}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    {/* Preview pagination */}
                    {totalPreviewPages > 1 && (
                      <div className="d-flex justify-content-center align-items-center gap-1 mt-2">
                        <button className="btn btn-sm btn-outline-secondary" style={{ borderRadius: "6px", padding: "2px 8px" }} disabled={previewPage === 1} onClick={() => setPreviewPage(p => p - 1)}><i className="bi bi-chevron-left"></i></button>
                        {Array.from({ length: totalPreviewPages }, (_, i) => i + 1).map(p => (
                          <button key={p} onClick={() => setPreviewPage(p)} style={{ padding: "2px 8px", border: `1px solid ${previewPage === p ? "var(--sb-accent)" : "var(--sb-border)"}`, borderRadius: "6px", background: previewPage === p ? "var(--sb-accent)" : "transparent", color: previewPage === p ? "#fff" : "var(--sb-muted)", fontWeight: 600, fontSize: "0.75rem", cursor: "pointer" }}>{p}</button>
                        ))}
                        <button className="btn btn-sm btn-outline-secondary" style={{ borderRadius: "6px", padding: "2px 8px" }} disabled={previewPage === totalPreviewPages} onClick={() => setPreviewPage(p => p + 1)}><i className="bi bi-chevron-right"></i></button>
                        <span className="ms-1 small" style={{ color: "var(--sb-muted)" }}>{(previewPage - 1) * PREVIEW_PER_PAGE + 1}–{Math.min(previewPage * PREVIEW_PER_PAGE, rows.length)} of {rows.length}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Error detail */}
                {apiErrors.length > 0 && (
                  <div className="p-3 mb-3" style={{ background: "#fff5f5", borderRadius: "10px", border: "1px solid #fca5a5" }}>
                    <p className="mb-2 fw-semibold" style={{ color: "#dc2626", fontSize: "0.85rem" }}>
                      <i className="bi bi-x-circle-fill me-1"></i>{apiErrors.length} row{apiErrors.length !== 1 ? "s" : ""} will be skipped:
                    </p>
                    {apiErrors.map((e, i) => (
                      <div key={i} className="d-flex gap-2 align-items-start mb-1">
                        <span style={{ fontSize: "0.75rem", color: "#9ca3af", minWidth: 40 }}>Row {e.row}</span>
                        <span style={{ fontSize: "0.75rem", color: "#dc2626", fontWeight: 600 }}>{e.sensorName}:</span>
                        <span style={{ fontSize: "0.75rem", color: "#7f1d1d" }}>{e.error}{e.detail ? ` (${e.detail})` : ""}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Re-validate with different file */}
                <div className="d-flex align-items-center gap-2 mb-1">
                  <button className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
                    onClick={() => { setValidateResult(null); setBulkFile(null); if (bulkFileInputRef.current) bulkFileInputRef.current.value = ""; }}>
                    <i className="bi bi-arrow-counterclockwise"></i>Change file
                  </button>
                  {validateResult.successCount === 0 && (
                    <span className="small" style={{ color: "#dc2626" }}>No valid rows to import. Fix errors in your file and re-upload.</span>
                  )}
                </div>
              </>
            )}

            {/* Footer */}
            <div className="d-flex gap-2 justify-content-end mt-3">
              <button className="btn btn-outline-secondary" onClick={closeBulkModal}>Cancel</button>
              {validateResult && validateResult.successCount > 0 && (
                <button className="btn sb-connect-btn d-flex align-items-center gap-2"
                  onClick={handleConfirmImport} disabled={bulkUploading}>
                  {bulkUploading
                    ? <><span className="spinner-border spinner-border-sm"></span> Importing…</>
                    : <><i className="bi bi-cloud-upload-fill"></i>Import {validateResult.successCount} Sensor{validateResult.successCount !== 1 ? "s" : ""}</>
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
              {selectedSensor.quantity && <p className="sb-form-label mb-0"><i className="bi bi-rulers me-1"></i>{selectedSensor.quantity} ({selectedSensor.unit})</p>}
            </div>
            <div className="mb-3">
              <label className="sb-form-label mb-2">Select Data Fields</label>
              {selectedSensor.quantity ? (
                <div className="d-flex align-items-center justify-content-between p-2"
                  style={{ backgroundColor: "var(--sb-light-bg)", borderRadius: "8px", cursor: "pointer" }}
                  onClick={() => toggleField(selectedSensor.quantity)}>
                  <span style={{ fontSize: "0.88rem" }}>{selectedSensor.quantity} ({selectedSensor.unit})</span>
                  <input type="checkbox" checked={selectedFields.includes(selectedSensor.quantity)} onChange={() => toggleField(selectedSensor.quantity)} style={{ accentColor: "var(--sb-accent)", width: "16px", height: "16px" }} />
                </div>
              ) : <p className="small" style={{ color: "var(--sb-muted)" }}>No data fields specified.</p>}
            </div>
            <div className="mb-4">
              <label className="sb-form-label mb-2">Select Time Interval</label>
              <select className="form-select sb-input" value={selectedInterval} onChange={(e) => setSelectedInterval(e.target.value)}>
                <option value="">-- Select Interval --</option>
                {["1 Week", "15 Days", "1 Month", "3 Months"].map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
            <div className="d-flex justify-content-end">
              <button className="btn sb-connect-btn" disabled={!selectedFields.length || !selectedInterval}
                onClick={() => { setSelectedSensor(null); navigate("/dashboard", { state: { sensorId: selectedSensor.sensorId, sensorName: selectedSensor.sensorName, interval: selectedInterval, unit: selectedSensor.unit } }); }}>
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