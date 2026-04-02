import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Chart as ChartJS, LineElement, CategoryScale, LinearScale,
  PointElement, Tooltip, Legend, Filler
} from "chart.js";
import { Line } from "react-chartjs-2";
import { getSensorData } from "../api/sensorDataApi";
import { useMqtt } from "../hooks/useMQTT";

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend, Filler);

const Dashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { sensorId, sensorName, interval, unit } = location.state || {};

  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [liveValue, setLiveValue] = useState(null);
  const [liveTime, setLiveTime] = useState(null);
  const [stats, setStats] = useState({ min: null, max: null, avg: null });

  const { messages, connected, error: mqttError } = useMqtt(sensorName);

  const getDays = () =>
    ({ "1 Week": 7, "15 Days": 15, "1 Month": 30, "3 Months": 90 }[interval] ?? 7);

  const computeStats = (dataArr) => {
    if (!dataArr?.length) return;
    const nums = dataArr.filter(v => !isNaN(v));
    setStats({
      min: Math.min(...nums).toFixed(2),
      max: Math.max(...nums).toFixed(2),
      avg: (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2),
    });
  };

  const makeDataset = (label) => ({
    label,
    data: [],
    borderColor: "#00c6ae",
    backgroundColor: "rgba(0,198,174,0.08)",
    fill: true,
    tension: 0.4,
    pointRadius: 3,
    pointHoverRadius: 6,
    pointBackgroundColor: "#00c6ae",
    borderWidth: 2,
  });

  useEffect(() => {
    if (!sensorId || !interval) return;
    const fetchData = async () => {
      setLoading(true);
      setError("");
      try {
        const startDate = new Date(Date.now() - getDays() * 86400000).toISOString();
        const endDate = new Date().toISOString();
        const data = await getSensorData(sensorId, startDate, endDate);
        if (!data?.length) { setChartData(null); return; }
        const values = data.map(d => d.value);
        computeStats(values);
        setChartData({
          labels: data.map(d => new Date(d.timestamp).toLocaleDateString()),
          datasets: [{ ...makeDataset(`${sensorName} (${unit || ""})`), data: values }],
        });
      } catch {
        setError("Failed to load sensor data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [sensorId, interval]);

  useEffect(() => {
  if (!messages.length) return;
  const latest = messages[messages.length - 1];
  const value = latest.value ?? parseFloat(latest.raw);
  if (isNaN(value)) return;

  // ✅ Only add if timestamp is within selected interval
  const receivedAt = new Date(latest.receivedAt);
  const cutoff = new Date(Date.now() - getDays() * 86400000);
  if (receivedAt < cutoff) return; // ← skip old messages

  const label = receivedAt.toLocaleTimeString();
  setLiveValue(value);
  setLiveTime(label);

  const datasetLabel = `${sensorName} (${unit || ""})`;
  setChartData(prev => {
    const newData = prev ? [...prev.datasets[0].data, value] : [value];
    const newLabels = prev ? [...prev.labels, label] : [label];
    computeStats(newData);
    if (!prev) return {
      labels: newLabels,
      datasets: [{ ...makeDataset(datasetLabel), data: newData }],
    };
    return {
      ...prev,
      labels: newLabels,
      datasets: [{ ...prev.datasets[0], data: newData }],
    };
  });
}, [messages, sensorName, unit]);

  const chartOptions = {
    responsive: true,
    animation: { duration: 400 },
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { display: true, position: "top", labels: { usePointStyle: true, padding: 16 } },
      tooltip: {
        backgroundColor: "rgba(0,0,0,0.75)",
        padding: 10,
        cornerRadius: 8,
        callbacks: { label: ctx => ` ${ctx.parsed.y} ${unit || ""}` },
      },
    },
    scales: {
      x: {
        grid: { color: "rgba(0,0,0,0.05)" },
        ticks: { maxTicksLimit: 10, font: { size: 11 } },
      },
      y: {
        beginAtZero: false,
        grid: { color: "rgba(0,0,0,0.05)" },
        ticks: { font: { size: 11 }, callback: v => `${v} ${unit || ""}` },
      },
    },
  };

  return (
    <div className="container-fluid px-4 py-3">
      {/* Header */}
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
        <div>
          <button className="btn btn-sm btn-outline-secondary me-3" onClick={() => navigate(-1)}>
            <i className="bi bi-arrow-left me-1"></i>Back
          </button>
          <span style={{ fontWeight: 700, fontSize: "1.2rem", color: "var(--sb-text)" }}>
            {sensorName}
          </span>
          <span className="ms-2 badge" style={{ backgroundColor: "#e8faf8", color: "var(--sb-accent)", border: "1px solid var(--sb-accent)", borderRadius: "20px" }}>
            {interval}
          </span>
        </div>
        <span className="small">
          MQTT: {connected
            ? <span className="text-success fw-semibold">● Connected</span>
            : <span className="text-danger fw-semibold">● Disconnected</span>}
          {mqttError && <span className="text-danger ms-2">({mqttError})</span>}
        </span>
      </div>

      {loading && <div className="text-center py-4"><div className="spinner-border" style={{ color: "var(--sb-accent)" }}></div></div>}
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="row g-3">
        {/* Chart */}
        <div className="col-12 col-lg-9">
          <div className="card border-0 shadow-sm p-3" style={{ borderRadius: "16px", backgroundColor: "var(--sb-card-bg)" }}>
            <h6 className="mb-3" style={{ color: "var(--sb-muted)", fontWeight: 600 }}>
              <i className="bi bi-graph-up me-2" style={{ color: "var(--sb-accent)" }}></i>
              Sensor Readings — Last {getDays()} Days
            </h6>
            {chartData
              ? <Line data={chartData} options={chartOptions} />
              : !loading && (
                <div className="text-center py-5" style={{ color: "var(--sb-muted)" }}>
                  <i className="bi bi-reception-0" style={{ fontSize: "2.5rem" }}></i>
                  <p className="mt-2">No data yet. Waiting for live feed…</p>
                </div>
              )}
          </div>
        </div>

        {/* Side Panel */}
        <div className="col-12 col-lg-3 d-flex flex-column gap-3">

          {/* Live Value Card */}
          <div className="card border-0 shadow-sm p-3 text-center" style={{ borderRadius: "16px", backgroundColor: "var(--sb-card-bg)", borderLeft: "4px solid #00c6ae" }}>
            <p className="mb-1 small" style={{ color: "var(--sb-muted)", fontWeight: 600 }}>
              <i className="bi bi-broadcast me-1"></i>LIVE VALUE
            </p>
            <div style={{ fontSize: "2.5rem", fontWeight: 800, color: "#00c6ae", lineHeight: 1.1 }}>
              {liveValue !== null ? liveValue : "—"}
            </div>
            <div style={{ fontSize: "1rem", color: "var(--sb-muted)" }}>{unit || ""}</div>
            {liveTime && <div className="mt-1 small" style={{ color: "var(--sb-muted)" }}>at {liveTime}</div>}
            <div className="mt-2">
              {connected
                ? <span className="badge bg-success">Live</span>
                : <span className="badge bg-secondary">Offline</span>}
            </div>
          </div>

          {/* Stats Card */}
          <div className="card border-0 shadow-sm p-3" style={{ borderRadius: "16px", backgroundColor: "var(--sb-card-bg)" }}>
            <p className="mb-3 small fw-semibold" style={{ color: "var(--sb-muted)" }}>
              <i className="bi bi-bar-chart me-1"></i>STATISTICS
            </p>
            {[
              { label: "Min", value: stats.min, icon: "bi-arrow-down-circle", color: "#3b82f6" },
              { label: "Max", value: stats.max, icon: "bi-arrow-up-circle", color: "#ef4444" },
              { label: "Avg", value: stats.avg, icon: "bi-dash-circle", color: "#f59e0b" },
            ].map(({ label, value, icon, color }) => (
              <div key={label} className="d-flex align-items-center justify-content-between mb-2 p-2"
                style={{ backgroundColor: "var(--sb-light-bg)", borderRadius: "8px" }}>
                <span style={{ color: "var(--sb-muted)", fontSize: "0.85rem" }}>
                  <i className={`bi ${icon} me-1`} style={{ color }}></i>{label}
                </span>
                <span style={{ fontWeight: 700, color: "var(--sb-text)", fontSize: "0.95rem" }}>
                  {value !== null ? `${value} ${unit || ""}` : "—"}
                </span>
              </div>
            ))}
          </div>

          {/* Sensor Info Card */}
          <div className="card border-0 shadow-sm p-3" style={{ borderRadius: "16px", backgroundColor: "var(--sb-card-bg)" }}>
            <p className="mb-3 small fw-semibold" style={{ color: "var(--sb-muted)" }}>
              <i className="bi bi-info-circle me-1"></i>SENSOR INFO
            </p>
            <div className="small" style={{ color: "var(--sb-text)", lineHeight: 2 }}>
              <div><i className="bi bi-tag me-2" style={{ color: "var(--sb-accent)" }}></i>{sensorName}</div>
              <div><i className="bi bi-rulers me-2" style={{ color: "var(--sb-accent)" }}></i>{unit || "—"}</div>
              <div><i className="bi bi-calendar me-2" style={{ color: "var(--sb-accent)" }}></i>{interval}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;