import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Modal } from "bootstrap";
import MqttModal from "../components/MqttModal";
import PlaceholderModal from "../components/PlaceholderModal";
import { PROTOCOLS } from "../utils/constants";

const Connection = () => {
  const [selectedProtocol, setSelectedProtocol] = useState("");
  const navigate = useNavigate();

  const modalIdMap = {
    MQTT: "mqttModal",
    MODBUS: "modbusModal",
    "OPC-UA": "opcuaModal",
    "Modbus TCP": "modbustcpModal",
  };

  const handleProtocolSelect = (e) => {
    const protocol = e.target.value;
    setSelectedProtocol(protocol);
    if (protocol) {
      const modalEl = document.getElementById(modalIdMap[protocol]);
      if (modalEl) {
        const modal = new Modal(modalEl);
        modal.show();
      }
    }
  };

  return (
    <div className="sb-connection-page">
      <div className="sb-page-header px-4 py-3 mb-4">
        <h5 className="sb-header-title mb-1"><i className="bi bi-hdd-network me-2 sb-accent"></i>Configure your Sense Board</h5>
        <p className="sb-header-subtitle mb-0">Select a protocol to establish a connection with your hardware device.</p>
      </div>

      <div className="container-fluid px-4">
        <div className="row justify-content-center">
          <div className="col-12 col-md-6 col-lg-4">
            <div className="card sb-protocol-card shadow-sm border-0 p-4">
              <h6 className="sb-form-label mb-3">Protocol Name</h6>
              <select className="form-select sb-input" value={selectedProtocol} onChange={handleProtocolSelect}>
                <option value="">-- Select Protocol --</option>
                {PROTOCOLS.map((p) => <option key={p}>{p}</option>)}
              </select>
              {selectedProtocol && (
                <p className="text-muted small mt-2 mb-0">
                  <i className="bi bi-info-circle me-1"></i>
                  {selectedProtocol} protocol selected. Configure in the modal.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

    <MqttModal modalId="mqttModal" onConnected={() => {
  document.querySelectorAll(".modal-backdrop").forEach(el => el.remove());
  document.body.classList.remove("modal-open");
  document.body.style.removeProperty("padding-right");
  navigate("/sensor");
}} />
      <PlaceholderModal modalId="modbusModal" protocol="MODBUS" />
      <PlaceholderModal modalId="opcuaModal" protocol="OPC-UA" />
      <PlaceholderModal modalId="modbustcpModal" protocol="Modbus TCP" />
    </div>
  );
};

export default Connection;
