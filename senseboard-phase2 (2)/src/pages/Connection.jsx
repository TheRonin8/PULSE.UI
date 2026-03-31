import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useProtocols } from "../hooks/useprotocols";
import { validateConnection, createConnection } from "../api/connectionsapi";


const SuccessPopup = ({ message }) => (
  <div style={{ position: "fixed", bottom: "30px", right: "30px", zIndex: 9999, backgroundColor: "#198754", color: "#fff", padding: "14px 22px", borderRadius: "12px", boxShadow: "0 4px 20px rgba(0,0,0,0.3)", display: "flex", alignItems: "center", gap: "10px" }}>
    <i className="bi bi-check-circle-fill fs-5"></i>
    <div>
      <div style={{ fontWeight: 600 }}>Connected Successfully!</div>
      <div style={{ fontSize: "0.8rem", opacity: 0.85 }}>{message}</div>
    </div>
  </div>
);

const Connection = () => {
  const [selectedProtocol, setSelectedProtocol] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showConnected, setShowConnected] = useState(false);
  const navigate = useNavigate();
  const { protocols, loading, error } = useProtocols();

  const handleProtocolSelect = (e) => {
    const protocol = e.target.value;
    setSelectedProtocol(protocol);
    if (protocol) { setShowModal(true); document.body.style.overflow = "hidden"; }
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedProtocol("");
    document.body.style.overflow = "";
  };

 const handleConnected = () => {
    closeModal();
    setShowConnected(true);
    setTimeout(() => {
      setShowConnected(false);
      navigate("/sensor", { state: { showSuccess: true } });
    }, 1500);
  };

  return (
    <div className="sb-connection-page">
      {showConnected && <SuccessPopup message="Redirecting to sensors..." />}
      <div className="sb-page-header px-4 py-3 mb-4">
        <h5 className="sb-header-title mb-1"><i className="bi bi-hdd-network me-2 sb-accent"></i>Configure your Sense Board</h5>
        <p className="sb-header-subtitle mb-0">Select a protocol to establish a connection with your hardware device.</p>
      </div>

      <div className="container-fluid px-4">
        <div className="row justify-content-center">
          <div className="col-12 col-md-6 col-lg-4">
            <div className="card sb-protocol-card shadow-sm border-0 p-4">
              <h6 className="sb-form-label mb-3">Protocol Name</h6>
              <select className="form-select sb-input" value={selectedProtocol} onChange={handleProtocolSelect} disabled={loading} style={{ color: "var(--sb-text)", backgroundColor: "var(--sb-light-bg)" }}>
                <option value="">{loading ? "Loading protocols...." : "--  Select Protocol  --"}</option>
                {!loading && !error && protocols.map((p, i) => <option key={i} value={p}>{p}</option>)}
              </select>
              {error && <p className="text-danger small mt-2 mb-0"><i className="bi bi-exclamation-circle me-1"></i>{error}</p>}
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ backgroundColor: "rgba(0,0,0,0.6)", zIndex: 1050, overflowY: "auto" }} onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
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

const MqttForm = ({ onConnected, onClose }) => {
  const [status, setStatus] = useState("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [custom, setCustom] = useState({
    ip: "", brokerName: "", port: "", connectionName: "",
    username: "", password: "", ssl: false,
  });

  const connectionString = custom.ip && custom.port
    ? `${custom.ssl ? "wss" : "ws"}://${custom.ip}:${custom.port}`
    : "Fill the IP and Port to generate";

  const dotClass = status === "connected" ? "sb-dot-connected" : status === "error" ? "sb-dot-error" : "sb-dot-idle";

  const handleConnect = async () => {
    setStatus("connecting");
    setErrorMessage("");

    const validatePayload = {
      connectionUrl: custom.ip,
      port: Number(custom.port),
      tlsEnabled: custom.ssl,
      isPublic: false,
      username: custom.username || null,
      password: custom.password || null,
    };

    const createPayload = {
      connectionName: custom.connectionName,
      protocol: "MQTT",
      connectionUrl: custom.ip,
      port: Number(custom.port),
      tlsEnabled: custom.ssl,
      isPublic: false,
      username: custom.username || null,
      password: custom.password || null,
    };

    try {
      const validateRes = await validateConnection(validatePayload);
      if (validateRes?.message === "Connection is subscribable.") {
        const createRes = await createConnection(createPayload);
        if (createRes?.message === "Connection saved successfully." || createRes?.connectionId) {
          localStorage.setItem("sb_connectionId", createRes.connectionId);
          setStatus("connected");
          setShowSuccess(true);
          setTimeout(() => onConnected(), 800);
        } else {
          setStatus("error");
          setErrorMessage("Failed to save connection.");
        }
      } else {
        setStatus("error");
        setErrorMessage("Broker is not reachable.");
      }
    } catch (err) {
      setStatus("error");
      setErrorMessage(err.response?.data?.message || err.response?.data?.error || err.message || "Connection failed.");
    }
  };

  return (
    <>
      {showSuccess && <SuccessPopup message={`${custom.ip} · Port ${custom.port}`} />}

      <div className="sb-modal-content p-0" style={{ borderRadius: "16px", overflow: "hidden" }}>
        <div className="sb-modal-header d-flex align-items-start justify-content-between">
          <div>
            <h5 className="sb-modal-title">MQTT Broker Connection</h5>
            <p className="text-muted small mb-0">Configure your connection to an MQTT broker.</p>
          </div>
          <button className="btn-close btn-close-white ms-3" onClick={onClose}></button>
        </div>

        <div className="sb-modal-body" style={{ maxHeight: "60vh", overflowY: "auto" }}>
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
          <div className="mb-3 d-flex align-items-center justify-content-between">
            <div>
              <div className="sb-modal-label mb-0">SSL / TLS</div>
              <small className="text-muted">Use secure connection (WSS)</small>
            </div>
            <input className="form-check-input sb-switch" type="checkbox" checked={custom.ssl} onChange={(e) => setCustom({ ...custom, ssl: e.target.checked })} />
          </div>

          <hr className="sb-modal-divider" />
          <div className="mb-2">
            <span className={`sb-conn-dot ${dotClass} me-2`}></span>
            <span className="sb-modal-label d-inline">Connection String Preview</span>
          </div>
          <div className="sb-conn-string-box">
            <code className="sb-conn-string-text">{connectionString}</code>
          </div>
        </div>

        <div className="sb-modal-footer d-flex flex-column gap-2">
          {status === "error" && errorMessage && (
            <p className="text-danger small mb-1 text-end">
              <i className="bi bi-exclamation-circle me-1"></i>{errorMessage}
            </p>
          )}
          <div className="d-flex justify-content-end gap-2">
            <button className="btn sb-cancel-btn" onClick={onClose}>Cancel</button>
            <button className="btn sb-connect-btn" onClick={handleConnect} disabled={status === "connecting"}>
              {status === "connecting" && <span className="spinner-border spinner-border-sm me-2"></span>}
              {status === "connected" ? "Connected!" : "Connect"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

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