import React, { useState } from "react";
import { validateConnection, createConnection } from "../api/connectionsapi";

const MqttForm = ({ onClose, onConnected, initialData, isEditing }) => {

  const [form, setForm] = useState({
    connectionName: initialData?.connectionName || "",
    connectionUrl:  initialData?.connectionUrl  || "",
    port:           initialData?.port           || "1883",
    username:       initialData?.username       || "",
    password:       initialData?.password       || "",
    tlsEnabled:     initialData?.tlsEnabled     || false,
    isPublic:       initialData?.isPublic       || false,
  });

  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("");

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
    setErrors(prev => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    const errs = {};
    if (!form.connectionName.trim()) errs.connectionName = "Required";
    if (!form.connectionUrl.trim()) errs.connectionUrl = "Required";
    if (!form.port) errs.port = "Required";
    if (!form.username.trim()) errs.username = "Required";
    if (!form.password.trim()) errs.password = "Required";
    return errs;
  };

  const handleValidate = async () => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setStatus("validating");
    try {
      await validateConnection(form);
      setStatus("valid");
    } catch (err) {
      console.log("Validate error:", err.response?.status, err.response?.data);
      setStatus("invalid");
    }
  };

  const handleSave = async () => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    if (status !== "valid") {
      setErrors({ connectionUrl: "Please validate before saving." });
      return;
    }
    setStatus("saving");
    try {
      if (isEditing) {
        onConnected?.({ ...form, protocol: "MQTT" });
        onClose?.();
      } else {
        const res = await createConnection({ ...form, protocol: "MQTT" });
        const newConnection = { id: res.connectionId || res.id, name: form.connectionName };
        localStorage.setItem("sb_connectionId", newConnection.id);
        onConnected?.(newConnection);
        onClose?.();
      }
    } catch (err) {
      console.log("Save error:", err.response?.status, err.response?.data);
      setStatus("error");
    }
  };

  return (
    <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
      style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1060 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>

      <div className="card border-0 shadow-lg"
        style={{ width: "440px", borderRadius: "16px", backgroundColor: "var(--sb-white)" }}>

        {/* Header */}
        <div className="d-flex justify-content-between align-items-center px-4 pt-3 pb-2"
          style={{ borderBottom: "1px solid var(--sb-border)" }}>
          <div className="d-flex align-items-center gap-2">
            <i className="bi bi-broadcast" style={{ color: "var(--sb-accent)", fontSize: "1rem" }}></i>
            <h6 className="mb-0 fw-semibold" style={{ fontSize: "0.95rem" }}>
              {isEditing ? "Edit Connection" : "New MQTT Connection"}
            </h6>
          </div>
          <button className="btn-close" style={{ fontSize: "0.75rem" }} onClick={() => onClose()}></button>
        </div>

        <div className="px-4 py-3">

          {/* Row 1: Connection Name */}
          <div className="mb-2">
            <label className="form-label sb-form-label mb-1" style={{ fontSize: "0.8rem" }}>
              Connection Name <span className="text-danger">*</span>
            </label>
            <input type="text" name="connectionName"
              className={`form-control sb-input form-control-sm ${errors.connectionName ? "is-invalid" : ""}`}
              placeholder="e.g. Factory MQTT"
              value={form.connectionName} onChange={handleChange} />
            {errors.connectionName && <div className="invalid-feedback" style={{ fontSize: "0.75rem" }}>{errors.connectionName}</div>}
          </div>

          {/* Row 2: Broker URL + Port side by side */}
          <div className="d-flex gap-2 mb-2">
            <div style={{ flex: 2 }}>
              <label className="form-label sb-form-label mb-1" style={{ fontSize: "0.8rem" }}>
                Broker URL <span className="text-danger">*</span>
              </label>
              <input type="text" name="connectionUrl"
                className={`form-control sb-input form-control-sm ${errors.connectionUrl ? "is-invalid" : ""}`}
                placeholder="e.g. 10.4.0.103"
                value={form.connectionUrl} onChange={handleChange} />
              {errors.connectionUrl && <div className="invalid-feedback" style={{ fontSize: "0.75rem" }}>{errors.connectionUrl}</div>}
            </div>
            <div style={{ flex: 1 }}>
              <label className="form-label sb-form-label mb-1" style={{ fontSize: "0.8rem" }}>
                Port <span className="text-danger">*</span>
              </label>
              <input type="text" name="port"
                className={`form-control sb-input form-control-sm ${errors.port ? "is-invalid" : ""}`}
                placeholder="1883"
                value={form.port} onChange={handleChange} />
              {errors.port && <div className="invalid-feedback" style={{ fontSize: "0.75rem" }}>{errors.port}</div>}
            </div>
          </div>

          {/* Row 3: Username + Password side by side */}
          <div className="d-flex gap-2 mb-2">
            <div className="flex-fill">
              <label className="form-label sb-form-label mb-1" style={{ fontSize: "0.8rem" }}>
                Username <span className="text-danger">*</span>
              </label>
              <input type="text" name="username"
                className={`form-control sb-input form-control-sm ${errors.username ? "is-invalid" : ""}`}
                placeholder="e.g. adminmqtt"
                value={form.username} onChange={handleChange} />
              {errors.username && <div className="invalid-feedback" style={{ fontSize: "0.75rem" }}>{errors.username}</div>}
            </div>
            <div className="flex-fill">
              <label className="form-label sb-form-label mb-1" style={{ fontSize: "0.8rem" }}>
                Password <span className="text-danger">*</span>
              </label>
              <input type="password" name="password"
                className={`form-control sb-input form-control-sm ${errors.password ? "is-invalid" : ""}`}
                placeholder="Enter password"
                value={form.password} onChange={handleChange} />
              {errors.password && <div className="invalid-feedback" style={{ fontSize: "0.75rem" }}>{errors.password}</div>}
            </div>
          </div>

          {/* Row 4: Checkboxes */}
          <div className="d-flex gap-4 mb-3">
            <div className="form-check">
              <input className="form-check-input" type="checkbox" name="tlsEnabled"
                checked={form.tlsEnabled} onChange={handleChange} id="tls" />
              <label className="form-check-label" htmlFor="tls" style={{ fontSize: "0.82rem" }}>TLS Enabled</label>
            </div>
            <div className="form-check">
              <input className="form-check-input" type="checkbox" name="isPublic"
                checked={form.isPublic} onChange={handleChange} id="public" />
              <label className="form-check-label" htmlFor="public" style={{ fontSize: "0.82rem" }}>Public Broker</label>
            </div>
          </div>

          {/* Status messages */}
          {status === "valid"      && <p className="text-success mb-2" style={{ fontSize: "0.8rem" }}>✅ Validated successfully</p>}
          {status === "invalid"    && <p className="text-danger mb-2"  style={{ fontSize: "0.8rem" }}>❌ Failed. Check broker URL/port.</p>}
          {status === "error"      && <p className="text-danger mb-2"  style={{ fontSize: "0.8rem" }}>❌ Failed to save connection.</p>}
          {status === "validating" && <p className="text-warning mb-2" style={{ fontSize: "0.8rem" }}>⏳ Validating…</p>}

          {/* Buttons */}
          <div className="d-flex gap-2 justify-content-end pt-1"
            style={{ borderTop: "1px solid var(--sb-border)" }}>
            <button className="btn btn-outline-secondary btn-sm px-3" onClick={() => onClose()}>
              Cancel
            </button>
            <button className="btn btn-outline-success btn-sm px-3" onClick={handleValidate}
              disabled={status === "validating"}>
              {status === "validating" ? "Validating…" : "Validate"}
            </button>
            <button className="btn sb-connect-btn btn-sm px-3" onClick={handleSave}
              disabled={status === "saving" || status !== "valid"}>
              {status === "saving" ? "Saving…" : isEditing ? "Update" : "Save Connection"}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default MqttForm;