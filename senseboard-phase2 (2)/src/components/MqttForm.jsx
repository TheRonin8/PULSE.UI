import React, { useState } from "react";
import { validateConnection, createConnection } from "../api/connectionsapi";

const MqttForm = ({ onClose, onConnected }) => {
  const [form, setForm] = useState({
    connectionName: "", connectionUrl: "", port: "1883",
    username: "", password: "", tlsEnabled: false, isPublic: false,
  });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState(""); // "validating" | "valid" | "invalid" | "saving"

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
  setStatus("saving");
  try {
    const res = await createConnection({ ...form, protocol: "MQTT" });
    const newConnection = {
      id: res.connectionId || res.id,
      name: form.connectionName,
    };
    localStorage.setItem("sb_connectionId", newConnection.id);
    onConnected?.(newConnection);
  } catch {
    setStatus("error");
  }
};

// 2. Fix disabled — was blocking Save button during saving state


  return (
    <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
      style={{ backgroundColor: "rgba(0,0,0,0.6)", zIndex: 1060 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="card border-0 shadow-lg p-4" style={{ width: "520px", borderRadius: "16px", backgroundColor: "var(--sb-white)" }}>
        <div className="d-flex justify-content-between mb-3">
          <h5 className="mb-0"><i className="bi bi-broadcast me-2" style={{ color: "var(--sb-accent)" }}></i>MQTT Connection</h5>
          <button className="btn-close" onClick={onClose}></button>
        </div>

        {[
          { label: "Connection Name", name: "connectionName", placeholder: "e.g. Factory MQTT" },
          { label: "Broker URL", name: "connectionUrl", placeholder: "e.g. 10.4.0.103" },
          { label: "Port", name: "port", placeholder: "1883" },
          { label: "Username", name: "username", placeholder: "Demouser" },
          { label: "Password", name: "password", placeholder: "demopassword", type: "password" },
        ].map(({ label, name, placeholder, type }) => (
          <div className="mb-3" key={name}>
            <label className="form-label sb-form-label">{label}</label>
            <input type={type || "text"} name={name} className={`form-control sb-input ${errors[name] ? "is-invalid" : ""}`}
              placeholder={placeholder} value={form[name]} onChange={handleChange} />
            {errors[name] && <div className="invalid-feedback">{errors[name]}</div>}
          </div>
        ))}

        <div className="d-flex gap-4 mb-4">
          <div className="form-check">
            <input className="form-check-input" type="checkbox" name="tlsEnabled" checked={form.tlsEnabled} onChange={handleChange} id="tls" />
            <label className="form-check-label" htmlFor="tls">TLS Enabled</label>
          </div>
          <div className="form-check">
            <input className="form-check-input" type="checkbox" name="isPublic" checked={form.isPublic} onChange={handleChange} id="public" />
            <label className="form-check-label" htmlFor="public">Public Broker</label>
          </div>
        </div>

        {status === "valid" && <p className="text-success small mb-2">✅ Connection validated successfully</p>}
        {status === "invalid" && <p className="text-danger small mb-2">❌ Connection failed. Check broker URL/port.</p>}
        {status === "error" && <p className="text-danger small mb-2">❌ Failed to save connection.</p>}

        <div className="d-flex gap-2 justify-content-end">
          <button className="btn btn-outline-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-outline-success" onClick={handleValidate} disabled={status === "validating"}>
            {status === "validating" ? "Validating…" : "Validate"}
          </button>
        <button className="btn sb-connect-btn" onClick={handleSave} disabled={status !== "valid" || status === "saving"}>
            {status === "saving" ? "Saving…" : "Save Connection"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MqttForm;