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
  const [status, setStatus] = useState(""); // "validating" | "valid" | "invalid" | "saving" | "error"

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
    } catch {
      setStatus("invalid");
    }
  };

  const handleSave = async () => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    if (status !== "valid") {
      setErrors({ connectionUrl: "Please validate the connection before saving." });
      return;
    }
    setStatus("saving");
    try {
      if (isEditing) {
        // In edit mode — pass form data up, parent calls PUT API
        onConnected?.({ ...form, protocol: "MQTT" });
        onClose?.();
      } else {
        // In create mode — call POST API
        const res = await createConnection({ ...form, protocol: "MQTT" });
        const newConnection = {
          id: res.connectionId || res.id,
          name: form.connectionName,
        };
        localStorage.setItem("sb_connectionId", newConnection.id);
        onConnected?.(newConnection);
        onClose?.();
      }
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
      style={{ backgroundColor: "rgba(0,0,0,0.6)", zIndex: 1060 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="card border-0 shadow-lg p-4" style={{ width: "520px", borderRadius: "16px", backgroundColor: "var(--sb-white)" }}>

        {/* Header */}
        <div className="d-flex justify-content-between mb-3">
          <h5 className="mb-0">
            <i className="bi bi-broadcast me-2" style={{ color: "var(--sb-accent)" }}></i>
            {isEditing ? "Edit Connection" : "MQTT Connection"}
          </h5>
          <button className="btn-close" onClick={() => onClose()}></button>
        </div>

        {/* Form fields */}
        {[
          { label: "Connection Name", name: "connectionName", placeholder: "e.g. Factory MQTT" },
          { label: "Broker URL",      name: "connectionUrl",  placeholder: "e.g. 10.4.0.103" },
          { label: "Port",            name: "port",           placeholder: "1883" },
          { label: "Username",        name: "username",       placeholder: "e.g. adminmqtt" },
          { label: "Password",        name: "password",       placeholder: "Enter password", type: "password" },
        ].map(({ label, name, placeholder, type }) => (
          <div className="mb-3" key={name}>
            <label className="form-label sb-form-label">
              {label} <span className="text-danger">*</span>
            </label>
            <input
              type={type || "text"}
              name={name}
              className={`form-control sb-input ${errors[name] ? "is-invalid" : ""}`}
              placeholder={placeholder}
              value={form[name]}
              onChange={handleChange}
            />
            {errors[name] && <div className="invalid-feedback">{errors[name]}</div>}
          </div>
        ))}

        {/* Checkboxes */}
        <div className="d-flex gap-4 mb-4">
          <div className="form-check">
            <input className="form-check-input" type="checkbox" name="tlsEnabled"
              checked={form.tlsEnabled} onChange={handleChange} id="tls" />
            <label className="form-check-label" htmlFor="tls">TLS Enabled</label>
          </div>
          <div className="form-check">
            <input className="form-check-input" type="checkbox" name="isPublic"
              checked={form.isPublic} onChange={handleChange} id="public" />
            <label className="form-check-label" htmlFor="public">Public Broker</label>
          </div>
        </div>

        {/* Status messages */}
        {status === "valid"     && <p className="text-success small mb-2">✅ Connection validated successfully</p>}
        {status === "invalid"   && <p className="text-danger small mb-2">❌ Connection failed. Check broker URL/port.</p>}
        {status === "error"     && <p className="text-danger small mb-2">❌ Failed to save connection.</p>}
        {status === "validating"&& <p className="text-warning small mb-2">⏳ Validating connection…</p>}

        {/* Buttons */}
        <div className="d-flex gap-2 justify-content-end">
          <button className="btn btn-outline-secondary" onClick={() => onClose()}>
            Cancel
          </button>
          <button className="btn btn-outline-success" onClick={handleValidate}
            disabled={status === "validating"}>
            {status === "validating" ? "Validating…" : "Validate"}
          </button>
          <button className="btn sb-connect-btn" onClick={handleSave}
            disabled={status === "saving" || status !== "valid"}>
            {status === "saving" ? "Saving…" : isEditing ? "Update Connection" : "Save Connection"}
          </button>
        </div>

      </div>
    </div>
  );
};

export default MqttForm;