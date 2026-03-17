import React, { useState,useEffect} from "react";

const Sensor = () => {
  const [activeTab, setActiveTab] = useState("active");
  const [sensors, setSensors] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [form, setForm] = useState({
    sensorName: "",
    location: "",
    topicName: "",
    dataDetails: "",
  });
  const [errors, setErrors] = useState({});
  useEffect(() => {
  setSensors([]);
}, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: "" });
  };

  const validate = () => {
    const errs = {};
    if (!form.sensorName.trim()) errs.sensorName = "Sensor name is required";
    if (!form.location.trim()) errs.location = "Location is required";
    if (!form.topicName.trim()) errs.topicName = "Topic name is required";
    return errs;
  };

  const handleAddSensor = () => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    const newSensor = {
      id: Date.now(),
      ...form,
      status: "active",
      addedOn: new Date().toLocaleDateString(),
    };

    setSensors([...sensors, newSensor]);
    setForm({ sensorName: "", location: "", topicName: "", dataDetails: "" });
    setErrors({});
    setShowForm(false);
    setSuccessMsg("Sensor added successfully!");
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  const filteredSensors = sensors.filter((s) => s.status === activeTab);

  return (
    <div>
      {/* Page Header */}
      <div className="sb-page-header px-4 py-3 mb-4">
        <h5 className="sb-header-title mb-1">
          <i className="bi bi-broadcast me-2 sb-accent"></i>Sensors
        </h5>
        <p className="sb-header-subtitle mb-0">Manage and monitor your sensors.</p>
      </div>

      {/* Success Toast */}
      {successMsg && (
        <div className="position-fixed top-0 end-0 m-4" style={{ zIndex: 9999 }}>
          <div className="alert alert-success d-flex align-items-center gap-2 shadow">
            <i className="bi bi-check-circle-fill"></i>
            {successMsg}
          </div>
        </div>
      )}

      <div className="container-fluid px-4">
        {/* Top Bar */}
        <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">

          {/* Left - Active / Inactive buttons */}
          <div className="d-flex gap-2">
            <button
              className={`btn ${activeTab === "active" ? "sb-primary-btn" : "btn-outline-secondary"}`}
              style={{ borderRadius: "8px", padding: "7px 22px", fontWeight: 600 }}
              onClick={() => setActiveTab("active")}
            >
              <i className="bi bi-check-circle me-2"></i>Active
            </button>
            <button
              className={`btn ${activeTab === "inactive" ? "sb-primary-btn" : "btn-outline-secondary"}`}
              style={{ borderRadius: "8px", padding: "7px 22px", fontWeight: 600 }}
              onClick={() => setActiveTab("inactive")}
            >
              <i className="bi bi-x-circle me-2"></i>Inactive
            </button>
          </div>

          {/* Right - Add Sensor button */}
          <button
            className="btn sb-connect-btn d-flex align-items-center gap-2"
            style={{ borderRadius: "50px", padding: "8px 20px", fontWeight: 600 }}
            onClick={() => setShowForm(true)}
          >
            <i className="bi bi-plus-circle-fill" style={{ fontSize: "1.2rem" }}></i>
            Add Sensor
          </button>
        </div>

        {/* Sensor Cards */}
        {filteredSensors.length === 0 ? (
          <div className="text-center text-muted py-5">
            <i className="bi bi-broadcast" style={{ fontSize: "3rem", color: "var(--sb-accent)" }}></i>
            <p className="mt-3">No {activeTab} sensors found. Click + to add one.</p>
          </div>
        ) : (
          <div className="row g-3">
            {filteredSensors.map((sensor) => (
              <div className="col-12 col-md-6 col-lg-4" key={sensor.id}>
                <div className="card border-0 shadow-sm p-3" style={{ borderRadius: "12px", backgroundColor: "var(--sb-card-bg)" }}>
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <h6 className="sb-header-title mb-0">{sensor.sensorName}</h6>
                    <span className="badge" style={{ backgroundColor: "#e8faf8", color: "var(--sb-accent)", border: "1px solid var(--sb-accent)", borderRadius: "20px", fontSize: "0.75rem" }}>
                      <span className="sb-pulse-dot me-1"></span>{sensor.status}
                    </span>
                  </div>
                  <p className="text-muted small mb-1"><i className="bi bi-geo-alt me-1"></i>{sensor.location}</p>
                  <p className="text-muted small mb-1"><i className="bi bi-tag me-1"></i>{sensor.topicName}</p>
                  {sensor.dataDetails && (
                    <p className="text-muted small mb-0"><i className="bi bi-card-text me-1"></i>{sensor.dataDetails}</p>
                  )}
                  <p className="text-muted small mt-2 mb-0"><i className="bi bi-calendar me-1"></i>Added: {sensor.addedOn}</p>

                  {/* No Actions Message */}
                  <div className="mt-3 pt-2" style={{ borderTop: "1px solid var(--sb-border)" }}>
                    <span className="text-muted small">
                      <i className="bi bi-info-circle me-1" style={{ color: "var(--sb-accent)" }}></i>
                      No actions available for this sensor yet.
                    </span>
                  </div>

                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Sensor Overlay Form */}
      {showForm && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
          style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1050 }}
        >
          <div
            className="card border-0 shadow-lg p-4"
            style={{ width: "100%", maxWidth: "480px", borderRadius: "16px", backgroundColor: "var(--sb-modal-bg)" }}
          >
            {/* Form Header */}
            <div className="d-flex align-items-center justify-content-between mb-4">
              <h5 className="sb-modal-title mb-0">
                <i className="bi bi-broadcast me-2" style={{ color: "var(--sb-accent)" }}></i>
                Add New Sensor
              </h5>
              <button
                className="btn-close btn-close-white"
                onClick={() => { setShowForm(false); setErrors({}); }}
              ></button>
            </div>

            {/* Sensor Name */}
            <div className="mb-3">
              <label className="sb-modal-label">Sensor Name <span className="text-danger">*</span></label>
              <input
                type="text"
                name="sensorName"
                className={`form-control sb-modal-input ${errors.sensorName ? "is-invalid" : ""}`}
                placeholder="e.g. Temperature Sensor 1"
                value={form.sensorName}
                onChange={handleChange}
              />
              {errors.sensorName && <div className="invalid-feedback">{errors.sensorName}</div>}
            </div>

            {/* Location */}
            <div className="mb-3">
              <label className="sb-modal-label">Location <span className="text-danger">*</span></label>
              <input
                type="text"
                name="location"
                className={`form-control sb-modal-input ${errors.location ? "is-invalid" : ""}`}
                placeholder="e.g. Factory Floor A"
                value={form.location}
                onChange={handleChange}
              />
              {errors.location && <div className="invalid-feedback">{errors.location}</div>}
            </div>

            {/* Topic Name */}
            <div className="mb-3">
              <label className="sb-modal-label">Topic Name <span className="text-danger">*</span></label>
              <input
                type="text"
                name="topicName"
                className={`form-control sb-modal-input ${errors.topicName ? "is-invalid" : ""}`}
                placeholder="e.g. sensors/temperature/1"
                value={form.topicName}
                onChange={handleChange}
              />
              {errors.topicName && <div className="invalid-feedback">{errors.topicName}</div>}
            </div>

            {/* Data Details */}
            <div className="mb-4">
              <label className="sb-modal-label">Data Details <span className="text-muted small">(optional)</span></label>
              <textarea
                name="dataDetails"
                className="form-control sb-modal-input"
                placeholder="Enter any additional details about this sensor..."
                rows={4}
                value={form.dataDetails}
                onChange={handleChange}
                style={{ resize: "none" }}
              />
            </div>

            {/* Footer Buttons */}
            <div className="d-flex gap-2 justify-content-end">
              <button
                className="btn sb-cancel-btn"
                onClick={() => { setShowForm(false); setErrors({}); }}
              >
                Cancel
              </button>
              <button
                className="btn sb-connect-btn"
                onClick={handleAddSensor}
              >
                <i className="bi bi-plus-circle me-2"></i>Add Sensor
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sensor;