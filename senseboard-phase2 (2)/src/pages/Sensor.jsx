import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { addSensor } from "../api/sensorsapi";
import { getActiveSensors, activateSensor } from "../api/activeapi";
import { getInactiveSensors, inactivateSensor } from "../api/inactiveapi";

const Sensor = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("active");
  const [sensors, setSensors] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editSensor, setEditSensor] = useState(null);
  const [successMsg, setSuccessMsg] = useState("");
  const [form, setForm] = useState({
    sensorName: "", location: "", topicName: "", quantity: "", unit: "",
  });
  const [errors, setErrors] = useState({});
  const [selectedSensor, setSelectedSensor] = useState(null);
  const [selectedFields, setSelectedFields] = useState([]);
  const [selectedInterval, setSelectedInterval] = useState("");

  const connectionId = Number(localStorage.getItem("sb_connectionId")) || 0;

  const fetchSensors = async () => {
    console.log("token:",localStorage.getItem("sb_access_token"));
    if (!connectionId) return;
    try {
      const data = activeTab === "active"
        ? await getActiveSensors(connectionId)
        : await getInactiveSensors(connectionId);
      if (Array.isArray(data)) {
        const normalized = data.map(s => ({
          ...s,
          status: s.isActive ? "active" : "inactive",
          id: s.sensorId
        }));
        setSensors(normalized);
      }
    } catch (err) {
      console.error("Error fetching sensors:", err);
    }
  };

  useEffect(() => {
    setShowForm(false);
    if (location.state?.showSuccess) {
      setSuccessMsg("Connected successfully!");
      setTimeout(() => setSuccessMsg(""), 3000);
    }
    fetchSensors();
  }, []);

  useEffect(() => {
    fetchSensors();
  }, [activeTab]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: "" });
  };

  const validate = () => {
    const errs = {};
    if (!form.sensorName.trim()) errs.sensorName = "Sensor name is required";
    if (!form.location.trim()) errs.location = "Location is required";
    if (!form.topicName.trim()) errs.topicName = "Topic name is required";
    if (!form.quantity.trim()) errs.quantity = "Quantity is required";
    if (!form.unit.trim()) errs.unit = "Unit is required";
    return errs;
  };

  const handleAddSensor = async () => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    try {
      const res = await addSensor({
        connectionId,
        sensorName: form.sensorName,
        quantity: form.quantity,
        unit: form.unit,
        topicName: form.topicName,
        location: form.location,
      });
      localStorage.setItem("sensorId", res.sensorId);
      if (res?.message === "Sensor added successfully." || res?.sensorId) {
        const newSensor = {
          id: res.sensorId || Date.now(),
          ...form,
          status: "active",
          addedOn: new Date().toLocaleDateString(),
        };
        setSensors([...sensors, newSensor]);
        setSuccessMsg("Sensor added successfully!");
        setForm({ sensorName: "", location: "", topicName: "", quantity: "", unit: "" });
        setErrors({});
        setShowForm(false);
        setEditSensor(null);
        setTimeout(() => setSuccessMsg(""), 3000);
      }
    } catch (err) {
      const message = err.response?.data?.message || "Failed to add sensor.";
      setErrors({ ...errors, sensorName: message });
    }
  };

  const handleToggleStatus = async (sensor) => {
    try {
      if (sensor.status === "active") {
        await inactivateSensor(sensor.sensorId);
        setSuccessMsg("Sensor deactivated successfully!");
      } else {
        await activateSensor(sensor.sensorId);
        setSuccessMsg("Sensor activated successfully!");
      }
      setTimeout(() => setSuccessMsg(""), 3000);
      fetchSensors();
    } catch (err) {
      console.error("Toggle status error:", err);
    }
  };

  const handleDeleteSensor = (id) => {
    setSensors(sensors.filter(s => s.id !== id));
    setSuccessMsg("Sensor deleted successfully!");
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  const filteredSensors = sensors.filter((s) => s.status === activeTab);

  const handleSensorClick = (sensor) => {
    setSelectedSensor(sensor);
    setSelectedFields([]);
    setSelectedInterval("");
  };

  const toggleField = (field) => {
    setSelectedFields((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field]
    );
  };

  return (
    <div>
      <div className="sb-page-header px-4 py-3 mb-4">
        <h5 className="sb-header-title mb-1">
          <i className="bi bi-broadcast me-2 sb-accent"></i>Sensors
        </h5>
        <p className="sb-header-subtitle mb-0">Manage and monitor your sensors.</p>
      </div>

      {successMsg && (
        <div className="position-fixed top-0 end-0 m-4" style={{ zIndex: 9999 }}>
          <div className="alert alert-success d-flex align-items-center gap-2 shadow">
            <i className="bi bi-check-circle-fill"></i>
            {successMsg}
          </div>
        </div>
      )}

      <div className="container-fluid px-4">
        <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
          <div className="d-flex gap-2">
            <button className={`btn ${activeTab === "active" ? "sb-primary-btn" : "btn-outline-secondary"}`} style={{ borderRadius: "8px", padding: "7px 22px", fontWeight: 600 }} onClick={() => setActiveTab("active")}>
              <i className="bi bi-check-circle me-2"></i>Active
            </button>
            <button className={`btn ${activeTab === "inactive" ? "sb-primary-btn" : "btn-outline-secondary"}`} style={{ borderRadius: "8px", padding: "7px 22px", fontWeight: 600 }} onClick={() => setActiveTab("inactive")}>
              <i className="bi bi-x-circle me-2"></i>Inactive
            </button>
          </div>
          <button className="btn sb-connect-btn d-flex align-items-center gap-2" style={{ borderRadius: "50px", padding: "8px 20px", fontWeight: 600 }} onClick={() => { setEditSensor(null); setForm({ sensorName: "", location: "", topicName: "", quantity: "", unit: "" }); setShowForm(true); }}>
            <i className="bi bi-plus-circle-fill" style={{ fontSize: "1.2rem" }}></i>
            Add Sensor
          </button>
        </div>

        {filteredSensors.length === 0 ? (
          <div className="text-center py-5" style={{ userSelect: "none" }}>
            <i className="bi bi-broadcast" style={{ fontSize: "3rem", color: "var(--sb-accent)" }}></i>
            <p className="mt-3" style={{ color: "var(--sb-muted)" }}>No {activeTab} sensors found. Click + to add one.</p>
          </div>
        ) : (
          <div className="row g-3">
            {filteredSensors.map((sensor) => (
              <div className="col-12 col-md-6 col-lg-4" key={sensor.id || sensor.sensorId}>
                <div className="card border-0 shadow-sm p-3" style={{ borderRadius: "12px", backgroundColor: "var(--sb-card-bg)", userSelect: "none" }}>
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <h6 className="sb-header-title mb-0">{sensor.sensorName}</h6>
                    <span className="badge" style={{ backgroundColor: "#e8faf8", color: "var(--sb-accent)", border: "1px solid var(--sb-accent)", borderRadius: "20px", fontSize: "0.75rem" }}>
                      <span className="sb-pulse-dot me-1"></span>{sensor.status || activeTab}
                    </span>
                  </div>
                  <p style={{ color: "var(--sb-muted)", fontSize: "0.85rem" }} className="mb-1"><i className="bi bi-geo-alt me-1"></i>{String(sensor.location || sensor.locatedAt || "")}</p>
                  <p style={{ color: "var(--sb-muted)", fontSize: "0.85rem" }} className="mb-1"><i className="bi bi-tag me-1"></i>{sensor.topicName}</p>
                  {sensor.quantity && (
                    <p style={{ color: "var(--sb-muted)", fontSize: "0.85rem" }} className="mb-0">
                      <i className="bi bi-rulers me-1"></i>{sensor.quantity} ({sensor.unit})
                    </p>
                  )}
                  <p style={{ color: "var(--sb-muted)", fontSize: "0.85rem" }} className="mt-2 mb-0">
                    <i className="bi bi-calendar me-1"></i>Added: {sensor.addedOn || (sensor.createdAt ? new Date(sensor.createdAt).toLocaleDateString() : "")}
                  </p>
                  <div className="mt-3 pt-2 d-flex align-items-center justify-content-between" style={{ borderTop: "1px solid var(--sb-border)" }}>
                    <span className="small" style={{ cursor: "pointer", color: "var(--sb-accent)" }} onClick={() => handleSensorClick(sensor)}>
                      <i className="bi bi-sliders me-1"></i>Configure & View Data
                    </span>
                    <div className="d-flex gap-3">
                      <span className="small" style={{ cursor: "pointer", color: activeTab === "active" ? "#e74c3c" : "#28c76f" }} onClick={() => handleToggleStatus(sensor)}>
                        <i className={`bi ${activeTab === "active" ? "bi-toggle-off" : "bi-toggle-on"} me-1`}></i>
                        {activeTab === "active" ? "Inactivate" : "Activate"}
                      </span>
                      <span className="small" style={{ cursor: "pointer", color: "#e74c3c" }} onClick={() => handleDeleteSensor(sensor.id || sensor.sensorId)}>
                        <i className="bi bi-trash me-1"></i>Delete
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Sensor Form */}
      {showForm && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1050 }}>
          <div className="card border-0 shadow-lg p-4" style={{ width: "100%", maxWidth: "500px", borderRadius: "20px", backgroundColor: "var(--sb-white)", border: "1px solid rgba(0,198,174,0.2)" }}>
            <div className="d-flex align-items-center justify-content-between mb-4">
              <h5 className="mb-0" style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, color: "var(--sb-text)" }}>
                <i className="bi bi-broadcast me-2" style={{ color: "var(--sb-accent)" }}></i>Add New Sensor
              </h5>
              <button className="btn-close" onClick={() => { setShowForm(false); setErrors({}); }}></button>
            </div>
            <div className="mb-3">
              <label className="form-label sb-form-label">Sensor Name <span className="text-danger">*</span></label>
              <input type="text" name="sensorName" className={`form-control sb-input ${errors.sensorName ? "is-invalid" : ""}`} placeholder="e.g. Temperature Sensor 1" value={form.sensorName} onChange={handleChange} />
              {errors.sensorName && <div className="invalid-feedback">{errors.sensorName}</div>}
            </div>
            <div className="mb-3">
              <label className="form-label sb-form-label">Location <span className="text-danger">*</span></label>
              <input type="text" name="location" className={`form-control sb-input ${errors.location ? "is-invalid" : ""}`} placeholder="e.g. Factory Floor A" value={form.location} onChange={handleChange} />
              {errors.location && <div className="invalid-feedback">{errors.location}</div>}
            </div>
            <div className="mb-3">
              <label className="form-label sb-form-label">Topic Name <span className="text-danger">*</span></label>
              <input type="text" name="topicName" className={`form-control sb-input ${errors.topicName ? "is-invalid" : ""}`} placeholder="e.g. sensors/temperature/1" value={form.topicName} onChange={handleChange} />
              {errors.topicName && <div className="invalid-feedback">{errors.topicName}</div>}
            </div>
            <div className="mb-4">
              <label className="form-label sb-form-label">Data Fields <span className="text-danger">*</span></label>
              <div className="d-flex gap-3">
                <div className="flex-fill">
                  <input type="text" name="quantity" className={`form-control sb-input ${errors.quantity ? "is-invalid" : ""}`} placeholder="Quantity (e.g. Temperature)" value={form.quantity} onChange={handleChange} />
                  {errors.quantity && <div className="invalid-feedback">{errors.quantity}</div>}
                </div>
                <div className="flex-fill">
                  <input type="text" name="unit" className={`form-control sb-input ${errors.unit ? "is-invalid" : ""}`} placeholder="Unit (e.g. Celsius)" value={form.unit} onChange={handleChange} />
                  {errors.unit && <div className="invalid-feedback">{errors.unit}</div>}
                </div>
              </div>
            </div>
            <div className="d-flex gap-2 justify-content-end">
              <button className="btn" style={{ border: "1.5px solid var(--sb-border)", color: "var(--sb-text)", borderRadius: "8px", padding: "8px 20px" }} onClick={() => { setShowForm(false); setErrors({}); }}>Cancel</button>
              <button className="btn sb-connect-btn" onClick={handleAddSensor}>
                <i className="bi bi-plus-circle me-2"></i>Add Sensor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sensor Detail Popup */}
      {selectedSensor && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ backgroundColor: "rgba(0,0,0,0.6)", zIndex: 1060 }}>
          <div className="card border-0 shadow-lg p-4" style={{ width: "100%", maxWidth: "500px", borderRadius: "16px", backgroundColor: "var(--sb-white)", border: "1px solid rgba(0,198,174,0.2)", maxHeight: "90vh", overflowY: "auto" }}>
            <div className="d-flex align-items-center justify-content-between mb-3">
              <h5 className="sb-modal-title mb-0">
                <i className="bi bi-broadcast me-2" style={{ color: "var(--sb-accent)" }}></i>
                {selectedSensor.sensorName}
              </h5>
              <button className="btn-close" onClick={() => setSelectedSensor(null)}></button>
            </div>
            <div className="mb-3 p-3" style={{ backgroundColor: "var(--sb-light-bg)", borderRadius: "10px" }}>
              <p className="sb-form-label mb-1"><i className="bi bi-geo-alt me-1"></i>Location: <span style={{ color: "var(--sb-text)" }}>{selectedSensor.location || selectedSensor.locatedAt}</span></p>
              <p className="sb-form-label mb-1"><i className="bi bi-tag me-1"></i>Topic: <span style={{ color: "var(--sb-text)" }}>{selectedSensor.topicName}</span></p>
              {selectedSensor.quantity && (
                <p className="sb-form-label mb-0"><i className="bi bi-rulers me-1"></i>Data: <span style={{ color: "var(--sb-text)" }}>{selectedSensor.quantity} ({selectedSensor.unit})</span></p>
              )}
            </div>
            <div className="mb-3">
              <label className="sb-form-label mb-2">Select Data Fields to Display</label>
              <div className="d-flex flex-column gap-2">
                {!selectedSensor.quantity ? (
                  <p className="small mb-0" style={{ color: "var(--sb-muted)" }}>No data fields specified.</p>
                ) : (
                  <div className="d-flex align-items-center justify-content-between p-2" style={{ backgroundColor: "var(--sb-light-bg)", borderRadius: "8px", cursor: "pointer" }} onClick={() => toggleField(selectedSensor.quantity)}>
                    <span style={{ color: "var(--sb-text)", fontSize: "0.88rem" }}>{selectedSensor.quantity} ({selectedSensor.unit})</span>
                    <input type="checkbox" checked={selectedFields.includes(selectedSensor.quantity)} onChange={() => toggleField(selectedSensor.quantity)} style={{ accentColor: "var(--sb-accent)", width: "16px", height: "16px", cursor: "pointer" }} />
                  </div>
                )}
              </div>
            </div>
            <div className="mb-4">
              <label className="sb-form-label mb-2">Select Time Interval</label>
              <select className="form-select sb-input" value={selectedInterval} onChange={(e) => setSelectedInterval(e.target.value)}>
                <option value="">-- Select Interval --</option>
                <option value="1 Week">1 Week</option>
                <option value="15 Days">15 Days</option>
                <option value="1 Month">1 Month</option>
                <option value="3 Months">3 Months</option>
              </select>
            </div>
            <div className="d-flex justify-content-end">
              <button className="btn sb-connect-btn" disabled={selectedFields.length === 0 || !selectedInterval}
               onClick={() => {   setSelectedSensor(null);   navigate("/dashboard", {     state: {       sensorId: selectedSensor.sensorId,       sensorName: selectedSensor.sensorName,       interval: selectedInterval,       unit: selectedSensor.unit,     }   }); }}>
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