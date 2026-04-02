import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { addSensor, deleteSensor } from "../api/sensorsapi";
import { getActiveSensors } from "../api/activeapi";
import { updateConnection, deleteConnection } from "../api/connectionsapi";
import ConnectionModal from "../components/ConnectionModal";
import MqttForm from "../components/MqttForm";

const Sensor = () => {
  const navigate = useNavigate();
  const [connections, setConnections] = useState([]);
  const [activeConnectionId, setActiveConnectionId] = useState(null);
  const [sensors, setSensors] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [selectedSensor, setSelectedSensor] = useState(null);
  const [selectedFields, setSelectedFields] = useState([]);
  const [selectedInterval, setSelectedInterval] = useState("");
  const [editingConnection, setEditingConnection] = useState(null);
  const [form, setForm] = useState({ sensorName: "", location: "", topicName: "", quantity: "", unit: "" });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("sb_connections") || "[]");
    setConnections(saved);
    if (saved.length) setActiveConnectionId(saved[0].id);
  }, []);

  useEffect(() => {
    if (activeConnectionId) fetchSensors(activeConnectionId);
    else setSensors([]);
  }, [activeConnectionId]);

  const fetchSensors = async (connId) => {
    try {
      const data = await getActiveSensors(connId);
      if (Array.isArray(data)) {
        setSensors(data.map(s => ({ ...s, id: s.sensorId })));
      }
    } catch (err) {
      console.error("Error fetching sensors:", err);
      setSensors([]);
    }
  };

  const handleConnectionSaved = (newConnection) => {
    setShowConnectionModal(false);
    const saved = JSON.parse(localStorage.getItem("sb_connections") || "[]");
    const updated = [...saved, newConnection];
    localStorage.setItem("sb_connections", JSON.stringify(updated));
    setConnections(updated);
    setActiveConnectionId(newConnection.id);
  };

  const handleDeleteConnection = async (connId) => {
    if (!window.confirm("Delete this connection?")) return;
    try {
      await deleteConnection(connId);
      const updated = connections.filter(c => c.id !== connId);
      setConnections(updated);
      localStorage.setItem("sb_connections", JSON.stringify(updated));
      if (activeConnectionId === connId) {
        setActiveConnectionId(updated.length ? updated[0].id : null);
        setSensors([]);
      }
    } catch (err) {
      console.error("Failed to delete connection:", err);
    }
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
    } catch (err) {
      console.error("Failed to update connection:", err);
    }
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
        setSuccessMsg("Sensor added!");
        setTimeout(() => setSuccessMsg(""), 3000);
      }
    } catch (err) {
      setErrors({ sensorName: err.response?.data?.message || "Failed to add sensor." });
    }
  };

  const handleDeleteSensor = async (sensorId) => {
    if (!window.confirm("Are you sure you want to delete this sensor?")) return;
    try {
      await deleteSensor(sensorId);
      setSensors(prev => prev.filter(s => s.id !== sensorId));
    } catch (err) {
      console.error("Failed to delete sensor:", err);
    }
  };

  const toggleField = (field) => {
    setSelectedFields(prev => prev.includes(field) ? prev.filter(f => f !== field) : [...prev, field]);
  };

  const activeConn = connections.find(c => c.id === activeConnectionId);

  return (
    <div>
      <div className="sb-page-header px-4 py-3 mb-4">
        <h5 className="sb-header-title mb-1"><i className="bi bi-broadcast me-2 sb-accent"></i>Sensors</h5>
        <p className="sb-header-subtitle mb-0">Manage and monitor your sensors.</p>
      </div>

      {successMsg && (
        <div className="position-fixed top-0 end-0 m-4" style={{ zIndex: 9999 }}>
          <div className="alert alert-success shadow"><i className="bi bi-check-circle-fill me-2"></i>{successMsg}</div>
        </div>
      )}

      <div className="container-fluid px-4">

        {/* Top bar */}
        <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">

          {/* Connection tabs */}
          <div className="d-flex gap-2 flex-wrap">
            {connections.length === 0 ? (
              <p className="mb-0 small" style={{ color: "var(--sb-muted)" }}>No connections yet. Add one to get started.</p>
            ) : (
              connections.map(conn => (
                <div key={conn.id} className="d-flex align-items-center gap-1">
                  <button
                    className={`btn ${activeConnectionId === conn.id ? "sb-connect-btn" : "btn-outline-secondary"}`}
                    style={{ borderRadius: "50px", padding: "6px 18px", fontWeight: 600 }}
                    onClick={() => setActiveConnectionId(conn.id)}>
                    <i className="bi bi-hdd-network me-1"></i>{conn.name}
                  </button>
                  <button className="btn btn-sm btn-outline-secondary"
                    style={{ borderRadius: "50%", width: "32px", height: "32px", padding: 0 }}
                    title="Edit"
                    onClick={() => setEditingConnection(conn)}>
                    <i className="bi bi-pencil" style={{ fontSize: "0.75rem" }}></i>
                  </button>
                  <button className="btn btn-sm btn-outline-danger"
                    style={{ borderRadius: "50%", width: "32px", height: "32px", padding: 0 }}
                    title="Delete"
                    onClick={() => handleDeleteConnection(conn.id)}>
                    <i className="bi bi-trash" style={{ fontSize: "0.75rem" }}></i>
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Action buttons */}
          <div className="d-flex gap-2">
            <button className="btn btn-outline-secondary d-flex align-items-center gap-2"
              style={{ borderRadius: "50px", padding: "8px 20px", fontWeight: 600 }}
              onClick={() => setShowConnectionModal(true)}>
              <i className="bi bi-hdd-network"></i>Add Connection
            </button>
            <button className="btn sb-connect-btn d-flex align-items-center gap-2"
              style={{ borderRadius: "50px", padding: "8px 20px", fontWeight: 600 }}
              disabled={!activeConnectionId}
              onClick={() => { setForm({ sensorName: "", location: "", topicName: "", quantity: "", unit: "" }); setShowForm(true); }}>
              <i className="bi bi-plus-circle-fill"></i>Add Sensor
            </button>
          </div>
        </div>

        {/* Active connection label */}
        {activeConn && (
          <p className="mb-3 small" style={{ color: "var(--sb-muted)" }}>
            <i className="bi bi-hdd-network me-1"></i>
            Showing sensors for: <strong style={{ color: "var(--sb-text)" }}>{activeConn.name}</strong>
          </p>
        )}

        {/* Sensor cards */}
        {sensors.length === 0 ? (
          <div className="text-center py-5">
            <i className="bi bi-broadcast" style={{ fontSize: "3rem", color: "var(--sb-accent)" }}></i>
            <p className="mt-3" style={{ color: "var(--sb-muted)" }}>
              {activeConnectionId ? "No sensors for this connection. Click + to add one." : "Select or add a connection first."}
            </p>
          </div>
        ) : (
          <div className="row g-3">
            {sensors.map((sensor) => (
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
                  {sensor.quantity && (
                    <p style={{ color: "var(--sb-muted)", fontSize: "0.85rem" }} className="mb-0">
                      <i className="bi bi-rulers me-1"></i>{sensor.quantity} ({sensor.unit})
                    </p>
                  )}
                  <p style={{ color: "var(--sb-muted)", fontSize: "0.85rem" }} className="mt-2 mb-0">
                    <i className="bi bi-calendar me-1"></i>Added: {sensor.createdAt ? new Date(sensor.createdAt).toLocaleDateString() : ""}
                  </p>
                  <div className="mt-3 pt-2 d-flex justify-content-between align-items-center"
                    style={{ borderTop: "1px solid var(--sb-border)" }}>
                    <span style={{ cursor: "pointer", color: "var(--sb-accent)", fontSize: "0.9rem" }}
                      onClick={() => { setSelectedSensor(sensor); setSelectedFields([]); setSelectedInterval(""); }}>
                      <i className="bi bi-sliders me-1"></i>Configure & View Data
                    </span>
                    <span style={{ cursor: "pointer", color: "#dc3545", fontSize: "0.9rem" }}
                      onClick={() => handleDeleteSensor(sensor.id)}>
                      <i className="bi bi-trash me-1"></i>Delete
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Connection Modal */}
      {showConnectionModal && (
        <ConnectionModal
          onClose={() => setShowConnectionModal(false)}
          onSave={handleConnectionSaved}
        />
      )}

      {/* Edit Connection Modal */}
      {editingConnection && (
        <MqttForm
          onClose={() => setEditingConnection(null)}
          initialData={{
            connectionName: editingConnection.name,
            connectionUrl:  editingConnection.connectionUrl || "",
            port:           editingConnection.port || "1883",
            username:       editingConnection.username || "",
            password:       editingConnection.password || "",
            tlsEnabled:     editingConnection.tlsEnabled || false,
            isPublic:       editingConnection.isPublic || false,
          }}
          onConnected={(updatedData) => handleUpdateConnection(updatedData)}
          isEditing={true}
        />
      )}

      {/* Add Sensor Form */}
      {showForm && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
          style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1050 }}>
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
                <input type="text" name={name} className={`form-control sb-input ${errors[name] ? "is-invalid" : ""}`}
                  placeholder={placeholder} value={form[name]} onChange={handleChange} />
                {errors[name] && <div className="invalid-feedback">{errors[name]}</div>}
              </div>
            ))}
            <div className="mb-4">
              <label className="form-label sb-form-label">Data Fields <span className="text-danger">*</span></label>
              <div className="d-flex gap-3">
                <div className="flex-fill">
                  <input type="text" name="quantity" className={`form-control sb-input ${errors.quantity ? "is-invalid" : ""}`}
                    placeholder="Quantity (e.g. Temperature)" value={form.quantity} onChange={handleChange} />
                  {errors.quantity && <div className="invalid-feedback">{errors.quantity}</div>}
                </div>
                <div className="flex-fill">
                  <input type="text" name="unit" className={`form-control sb-input ${errors.unit ? "is-invalid" : ""}`}
                    placeholder="Unit (e.g. °C)" value={form.unit} onChange={handleChange} />
                  {errors.unit && <div className="invalid-feedback">{errors.unit}</div>}
                </div>
              </div>
            </div>
            <div className="d-flex gap-2 justify-content-end">
              <button className="btn btn-outline-secondary" onClick={() => { setShowForm(false); setErrors({}); }}>Cancel</button>
              <button className="btn sb-connect-btn" onClick={handleAddSensor}><i className="bi bi-plus-circle me-2"></i>Add Sensor</button>
            </div>
          </div>
        </div>
      )}

      {/* Sensor Detail Popup */}
      {selectedSensor && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
          style={{ backgroundColor: "rgba(0,0,0,0.6)", zIndex: 1060 }}>
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
                  <input type="checkbox" checked={selectedFields.includes(selectedSensor.quantity)}
                    onChange={() => toggleField(selectedSensor.quantity)}
                    style={{ accentColor: "var(--sb-accent)", width: "16px", height: "16px" }} />
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