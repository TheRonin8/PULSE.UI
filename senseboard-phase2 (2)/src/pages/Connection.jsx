import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { connectBroker } from "../api/axios";
import {  MQTT_BROKERS } from "../utils/constants";
import { useProtocols } from "../hooks/useprotocols";

const Connection = () => {
  const [selectedProtocol, setSelectedProtocol] = useState("");
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();
  const {protocols,loading,error } = useProtocols();

  const handleProtocolSelect = (e) => {
    const protocol = e.target.value;
    setSelectedProtocol(protocol);
    if (protocol) {
      setShowModal(true);
      document.body.style.overflow = "hidden";
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedProtocol("");
    document.body.style.overflow = "";
  };

  const handleConnected = () => {
    closeModal();
    document.body.style.overflow = "";
    navigate("/sensor");
  };

  return (
    <div className="sb-connection-page">
      <div className="sb-page-header px-4 py-3 mb-4">
        <h5 className="sb-header-title mb-1">
          <i className="bi bi-hdd-network me-2 sb-accent"></i>Configure your Sense Board
        </h5>
        <p className="sb-header-subtitle mb-0">
          Select a protocol to establish a connection with your hardware device.
        </p>
      </div>

      <div className="container-fluid px-4">
        <div className="row justify-content-center">
          <div className="col-12 col-md-6 col-lg-4">
            <div className="card sb-protocol-card shadow-sm border-0 p-4">
              <h6 className="sb-form-label mb-3">Protocol Name</h6>
              <select
                className="form-select sb-input"
                value={selectedProtocol}
                onChange={handleProtocolSelect}
                disabled = {loading}
              >
                <option value="">
                  {loading ? "Loading protocols...." : "--  Select Protocol  --"}
                </option>
                {!loading && !error && protocols.map((p) => (
                  <option key ={p} value={p}>{p}</option>
                ))}
                </select>
                {error && (
                  <p className="text-danger small mt-2 mb-0">
                    <i className="bi bi-exclamation-circle me-1"></i>
                    {error}
                  </p>
                )}
            </div>
          </div>
        </div>
      </div>

      {/* Pure React Modal */}
      {showModal && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
          style={{ backgroundColor: "rgba(0,0,0,0.6)", zIndex: 1050, overflowY: "auto" }}
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div style={{ width: "100%", maxWidth: "520px", margin: "20px", zIndex: 1051 }}>
            {selectedProtocol === "MQTT" ? (
              <MqttForm onConnected={handleConnected} onClose={closeModal} />
            ) : (
              <PlaceholderForm protocol={selectedProtocol} onClose={closeModal} />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/* ── MQTT Form ─────────────────────────────────────────────── */
const MqttForm = ({ onConnected, onClose }) => {
  const [tab, setTab] = useState("basic");
  const [status, setStatus] = useState("idle");

  const [basic, setBasic] = useState({
    brokerName: MQTT_BROKERS[0].name,
    port: MQTT_BROKERS[0].port,
    connectionName: "",
    ssl: true,
  });

  const [custom, setCustom] = useState({
    ip: "", brokerName: "", port: "", connectionName: "",
    username: "", password: "", ssl: false,
  });

  const selectedBroker = MQTT_BROKERS.find((b) => b.name === basic.brokerName) || MQTT_BROKERS[0];

  const basicConnectionString = () => {
    const protocol = basic.ssl ? "wss" : "ws";
    return `${protocol}://${selectedBroker.host}:${basic.port}`;
  };

  const customConnectionString = () => {
    if (!custom.ip && !custom.port) return "Fill the IP and Port to generate";
    const protocol = custom.ssl ? "wss" : "ws";
    return `${protocol}://${custom.ip}/${custom.brokerName}/${custom.port}`;
  };

  const handleBrokerChange = (e) => {
    const found = MQTT_BROKERS.find((b) => b.name === e.target.value);
    setBasic({ ...basic, brokerName: e.target.value, port: found ? found.port : basic.port, ssl: found ? found.ssl : basic.ssl });
  };

  const handleConnect = async () => {
    setStatus("connecting");
    const payload = tab === "basic"
      ? { type: "basic", brokerName: basic.brokerName, port: basic.port, connectionName: basic.connectionName, ssl: basic.ssl, connectionString: basicConnectionString() }
      : { type: "custom", ip: custom.ip, brokerName: custom.brokerName, port: custom.port, username: custom.username, password: custom.password, connectionName: custom.connectionName, ssl: custom.ssl, connectionString: customConnectionString() };
    try {
      await connectBroker(payload);
      setStatus("connected");
      setTimeout(() => onConnected(), 800);
    } catch {
      setStatus("error");
    }
  };

  const dotClass = status === "connected" ? "sb-dot-connected" : status === "error" ? "sb-dot-error" : "sb-dot-idle";

  return (
    <div className="sb-modal-content p-0" style={{ borderRadius: "16px", overflow: "hidden" }}>
      {/* Header */}
      <div className="sb-modal-header d-flex align-items-start justify-content-between">
        <div>
          <h5 className="sb-modal-title">MQTT Broker Connection</h5>
          <p className="text-muted small mb-0">Configure your connection to an MQTT broker.</p>
        </div>
        <button className="btn-close btn-close-white ms-3" onClick={onClose}></button>
      </div>

      {/* Body */}
      <div className="sb-modal-body" style={{ maxHeight: "60vh", overflowY: "auto" }}>
        {/* Broker chips */}
        {tab === "basic" && (
          <div className="d-flex gap-2 mb-3 flex-wrap">
            {MQTT_BROKERS.map((b) => (
              <button
                key={b.name}
                className={`btn sb-chip-btn ${basic.brokerName === b.name ? "sb-chip-active" : ""}`}
                onClick={() => setBasic({ ...basic, brokerName: b.name, port: b.port, ssl: b.ssl })}
              >
                {b.name}
              </button>
            ))}
          </div>
        )}

        {/* Tabs */}
        <ul className="nav sb-modal-tabs mb-3">
          <li className="nav-item">
            <button className={`nav-link sb-tab-link ${tab === "basic" ? "active" : ""}`} onClick={() => setTab("basic")}>Basic</button>
          </li>
          <li className="nav-item">
            <button className={`nav-link sb-tab-link ${tab === "custom" ? "active" : ""}`} onClick={() => setTab("custom")}>Custom</button>
          </li>
        </ul>

        {tab === "basic" ? (
          <>
            <div className="mb-3">
              <label className="sb-modal-label">Broker Name</label>
              <select className="form-select sb-modal-input" value={basic.brokerName} onChange={handleBrokerChange}>
                {MQTT_BROKERS.map((b) => <option key={b.name}>{b.name}</option>)}
              </select>
            </div>
            <div className="mb-3">
              <label className="sb-modal-label">Port</label>
              <input type="number" className="form-control sb-modal-input" value={basic.port} onChange={(e) => setBasic({ ...basic, port: e.target.value })} />
            </div>
            <div className="mb-3">
              <label className="sb-modal-label">Connection Name</label>
              <input type="text" className="form-control sb-modal-input" placeholder="e.g. My MQTT Connection" value={basic.connectionName} onChange={(e) => setBasic({ ...basic, connectionName: e.target.value })} />
            </div>
            <div className="mb-3 d-flex align-items-center justify-content-between">
              <div>
                <div className="sb-modal-label mb-0">SSL / TLS</div>
                <small className="text-muted">Use secure connection (WSS)</small>
              </div>
              <input className="form-check-input sb-switch" type="checkbox" checked={basic.ssl} onChange={(e) => setBasic({ ...basic, ssl: e.target.checked })} />
            </div>
          </>
        ) : (
          <>
            <div className="mb-3">
              <label className="sb-modal-label">IP</label>
              <input type="text" className="form-control sb-modal-input" placeholder="e.g. 192.168.1.100" value={custom.ip} onChange={(e) => setCustom({ ...custom, ip: e.target.value })} />
            </div>
            <div className="mb-3">
              <label className="sb-modal-label">Broker Name</label>
              <input type="text" className="form-control sb-modal-input" placeholder="e.g. My Custom Broker" value={custom.brokerName} onChange={(e) => setCustom({ ...custom, brokerName: e.target.value })} />
            </div>
            <div className="mb-3">
              <label className="sb-modal-label">Port</label>
              <input type="number" className="form-control sb-modal-input" placeholder="e.g. 8883" value={custom.port} onChange={(e) => setCustom({ ...custom, port: e.target.value })} />
            </div>
            <div className="mb-3">
              <label className="sb-modal-label">Username</label>
              <input type="text" className="form-control sb-modal-input" placeholder="Username" value={custom.username} onChange={(e) => setCustom({ ...custom, username: e.target.value })} />
            </div>
            <div className="mb-3">
              <label className="sb-modal-label">Password</label>
              <input type="password" className="form-control sb-modal-input" placeholder="Password" value={custom.password} onChange={(e) => setCustom({ ...custom, password: e.target.value })} />
            </div>
            <div className="mb-3">
              <label className="sb-modal-label">Connection Name</label>
              <input type="text" className="form-control sb-modal-input" placeholder="e.g. My Custom Connection" value={custom.connectionName} onChange={(e) => setCustom({ ...custom, connectionName: e.target.value })} />
            </div>
          </>
        )}

        <hr className="sb-modal-divider" />
        <div className="mb-2">
          <span className={`sb-conn-dot ${dotClass} me-2`}></span>
          <span className="sb-modal-label d-inline">Connection String Preview</span>
        </div>
        <div className="sb-conn-string-box">
          <code className="sb-conn-string-text">
            {tab === "basic" ? basicConnectionString() : customConnectionString()}
          </code>
        </div>
      </div>

      {/* Footer */}
      <div className="sb-modal-footer d-flex justify-content-end gap-2">
        <button className="btn sb-cancel-btn" onClick={onClose}>Cancel</button>
        <button className="btn sb-connect-btn" onClick={handleConnect} disabled={status === "connecting"}>
          {status === "connecting" && <span className="spinner-border spinner-border-sm me-2"></span>}
          {status === "connected" ? "Connected!" : "Connect"}
        </button>
      </div>
    </div>
  );
};

/* ── Placeholder Form ──────────────────────────────────────── */
const PlaceholderForm = ({ protocol, onClose }) => (
  <div className="sb-modal-content p-0" style={{ borderRadius: "16px", overflow: "hidden" }}>
    <div className="sb-modal-header d-flex align-items-center justify-content-between">
      <h5 className="sb-modal-title">{protocol} Connection</h5>
      <button className="btn-close btn-close-white" onClick={onClose}></button>
    </div>
    <div className="sb-modal-body text-center py-5">
      <i className="bi bi-tools sb-coming-soon-icon mb-3"></i>
      <h6 className="text-muted">Coming Soon</h6>
      <p className="text-muted small">{protocol} protocol support is under development.</p>
    </div>
    <div className="sb-modal-footer d-flex justify-content-end">
      <button className="btn sb-cancel-btn" onClick={onClose}>Close</button>
    </div>
  </div>
);

export default Connection;