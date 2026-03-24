import React from "react";
import { useMqtt } from "../hooks/useMQTT";

const Dashboard = ({ sensorName }) => {
  const { messages, connected, error, clearMessages } = useMqtt("Demo_sensor");

  const latestMessage = messages.length > 0 ? messages[messages.length - 1] : null;

  return (
    <div>
      <div className="sb-page-header px-4 py-3 mb-4">
        <h5 className="sb-header-title mb-1">
          <i className="bi bi-speedometer2 me-2 sb-accent"></i>Dashboard
        </h5>
        <p className="sb-header-subtitle mb-0">
          Live sensor data visualization.
          <span className="ms-2">
            {connected ? (
              <span style={{ color: "#28c76f" }}>
                <i className="bi bi-circle-fill me-1" style={{ fontSize: "0.6rem" }}></i>
                Live
              </span>
            ) : (
              <span style={{ color: "#e74c3c" }}>
                <i className="bi bi-circle-fill me-1" style={{ fontSize: "0.6rem" }}></i>
                Disconnected
              </span>
            )}
          </span>
          {error && (
            <span className="text-danger small ms-2">
              <i className="bi bi-exclamation-circle me-1"></i>
              {error}
            </span>
          )}
        </p>
      </div>

      <div className="container-fluid px-4">
        {!latestMessage ? (
          <div className="text-center py-5">
            <i className="bi bi-broadcast" style={{ fontSize: "3rem", color: "var(--sb-accent)" }}></i>
            <p className="mt-3" style={{ color: "var(--sb-muted)" }}>
              Waiting for live sensor data...
            </p>
          </div>
        ) : (
          <div className="row g-3">
            <div className="col-12 col-md-6 col-lg-4">
              <div
                className="card border-0 shadow-sm p-3"
                style={{ borderRadius: "12px", backgroundColor: "var(--sb-card-bg)" }}
              >
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <h6 className="sb-header-title mb-0">
                    <i className="bi bi-broadcast me-2 sb-accent"></i>
                    {latestMessage.topic || "Sensor Data"}
                  </h6>
                  <span className="sb-live-badge">
                    <span className="sb-pulse-dot"></span> LIVE
                  </span>
                </div>
                <pre style={{
                  color: "var(--sb-accent)",
                  fontSize: "0.82rem",
                  margin: 0,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-all"
                }}>
                  {(() => {
                    const { receivedAt, raw, ...sensorData } = latestMessage;
                    return raw ? raw : JSON.stringify(sensorData, null, 2);
                  })()}
                </pre>
                <p style={{ color: "var(--sb-muted)", fontSize: "0.75rem" }} className="mt-2 mb-0">
                  <i className="bi bi-clock me-1"></i>
                  {latestMessage.receivedAt?.toLocaleTimeString()}
                </p>
              </div>
            </div>
          </div>
        )}

        {messages.length > 0 && (
          <button
            className="btn btn-sm btn-outline-secondary mt-3"
            onClick={clearMessages}
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
};

export default Dashboard;