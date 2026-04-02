import React, { useState } from "react";
import { useProtocols } from "../hooks/useprotocols";
import MqttForm from "./MqttForm";

const ConnectionModal = ({ onClose, onSave }) => {
  const { protocols, loading } = useProtocols();
  const [selectedProtocol, setSelectedProtocol] = useState("");

  if (selectedProtocol === "MQTT") {
    return (
      <MqttForm
        onClose={onClose}
        onConnected={(conn) => {
          onSave(conn);  // ✅ saves connection to state + localStorage
          onClose();     // ✅ closes modal
        }}
      />
    );
  }

  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
      style={{ backgroundColor: "rgba(0,0,0,0.6)", zIndex: 1050 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="card border-0 shadow-lg p-4" style={{ width: "520px" }}>
        <div className="d-flex justify-content-between mb-3">
          <h5>Connection Setup</h5>
          <button className="btn-close" onClick={() => onClose()}></button>
        </div>

        <label className="sb-form-label mb-2">Select Protocol</label>
        <select
          className="form-select sb-input"
          value={selectedProtocol}
          onChange={(e) => setSelectedProtocol(e.target.value)}
          disabled={loading}
        >
          <option value="">-- Select Protocol --</option>
          {!loading &&
            protocols.map((p, i) => (
              <option key={i} value={p}>
                {p}
              </option>
            ))}
        </select>
      </div>
    </div>
  );
};

export default ConnectionModal;