import React, { useState, useEffect } from "react";
import { MQTT_BROKERS } from "../utils/constants";
import { connectBroker } from "../api/axios";

const MqttModal = ({ modalId, onConnected }) => {
  const [tab, setTab] = useState("basic");
  const [status, setStatus] = useState("idle"); // idle | connecting | connected | error

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
    if (!custom.ip && !custom.brokerName && !custom.port) return "Fill the IP and Port to generate";
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
      if (onConnected) onConnected();
    } catch {
      setStatus("error");
    }
  };

  const dotClass = status === "connected" ? "sb-dot-connected" : status === "error" ? "sb-dot-error" : "sb-dot-idle";

  return (
    <div className="modal fade" id={modalId} tabIndex="-1" aria-hidden="true">
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content sb-modal-content">
          <div className="modal-header sb-modal-header border-0 pb-0">
            <div>
              <h5 className="modal-title sb-modal-title">MQTT Broker Connection</h5>
              <p className="text-muted small mb-0">Configure your connection to an MQTT broker to receive real-time data.</p>
            </div>
            <button type="button" className="btn-close btn-close-white" data-bs-dismiss="modal"></button>
          </div>

          <div className="modal-body sb-modal-body pt-2">
            {tab === "basic" && (
              <div className="sb-broker-chips d-flex gap-2 mb-3 flex-wrap">
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

            <ul className="nav sb-modal-tabs mb-3">
              <li className="nav-item">
                <button className={`nav-link sb-tab-link ${tab === "basic" ? "active" : ""}`} onClick={() => setTab("basic")}>Basic</button>
              </li>
              <li className="nav-item">
                <button className={`nav-link sb-tab-link ${tab === "custom" ? "active" : ""}`} onClick={() => setTab("custom")}>Custom</button>
              </li>
            </ul>

            {tab === "basic" ? (
              <div>
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
                  <div className="form-check form-switch mb-0">
                    <input className="form-check-input sb-switch" type="checkbox" checked={basic.ssl} onChange={(e) => setBasic({ ...basic, ssl: e.target.checked })} />
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <div className="mb-3">
                  <label className="sb-modal-label">IP</label>
                  <input type="text" className="form-control sb-modal-input" placeholder="e.g. mqtt://192.168.1.100" value={custom.ip} onChange={(e) => setCustom({ ...custom, ip: e.target.value })} />
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
              </div>
            )}

            <hr className="sb-modal-divider" />
            <div className="mb-2">
              <span className={`sb-conn-dot ${dotClass} me-2`}></span>
              <span className="sb-modal-label">{tab === "basic" ? "Connection String Preview" : "Connection String"}</span>
            </div>
            <div className="sb-conn-string-box">
              <code className="sb-conn-string-text">
                {tab === "basic" ? basicConnectionString() : customConnectionString()}
              </code>
            </div>
          </div>

          <div className="modal-footer sb-modal-footer border-0">
            <button className="btn sb-cancel-btn" data-bs-dismiss="modal">Cancel</button>
            <button className="btn sb-connect-btn" onClick={handleConnect} disabled={status === "connecting"}>
              {status === "connecting" ? <span className="spinner-border spinner-border-sm me-2"></span> : null}
              {status === "connected" ? "Connected!" : "Connect"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MqttModal;
