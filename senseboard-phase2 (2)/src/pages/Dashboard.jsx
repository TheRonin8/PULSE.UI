import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Chart as ChartJS, LineElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend } from "chart.js";
import { Line } from "react-chartjs-2";
import { getSensorData } from "../api/sensorDataApi";
import { useMqtt } from "../hooks/useMQTT";

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend);

const Dashboard = () => {
  const location = useLocation();
  const { sensorId, sensorName, interval, unit } = location.state || {};

  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { messages, connected, error: mqttError } = useMqtt(sensorName);

  const getDays = () =>
    ({ "1 Week": 7, "15 Days": 15, "1 Month": 30, "3 Months": 90 }[interval] ?? 365);

 useEffect(() => {
  if (!sensorId || !interval) return;

  const fetchData = async () => {
    setLoading(true);
    setError("");

    try {
      const startDate = new Date(
        Date.now() - getDays() * 86400000
      ).toISOString();

      const endDate = new Date().toISOString();
      const data = await getSensorData(sensorId, startDate, endDate);

      if (!data?.length) {
        setChartData(null);
        return;
      }

      setChartData({
        labels: data.map(d =>
          new Date(d.timestamp).toLocaleDateString()
        ),
        datasets: [
          {
            label: `${sensorName} (${unit || ""})`,
            data: data.map(d => d.value),
            borderColor: "#00c6ae",
            backgroundColor: "rgba(0,198,174,0.15)",
            fill: true,
            tension: 0.4,
            pointRadius: 3,
          },
        ],
      });
    } catch (err) {
      setError("Failed to load sensor data");
    } finally {
      setLoading(false);
    }
  };

  fetchData();
}, [sensorId, interval, sensorName, unit]);



  // ✅ Fixed: deps include sensorName & unit, datasetLabel captured outside updater
  useEffect(() => {
    console.log("MQTT messages:", messages); 
    if (!messages.length) return;
    const latest = messages[messages.length - 1];
    console.log("latest:", latest);
    const value = latest.value ?? parseFloat(latest.raw);
    console.log("value:", value);
    const label = new Date(latest.receivedAt).toLocaleTimeString();
    if (isNaN(value)) return;

    const datasetLabel = `${sensorName} (${unit || ""})`;

    setChartData(prev => {
      if (!prev) return {
        labels: [label],
        datasets: [{
          label: datasetLabel,
          data: [value],
          borderColor: "#00c6ae",
          backgroundColor: "rgba(0,198,174,0.15)",
          fill: true, tension: 0.4, pointRadius: 3,
        }],
      };
      return {
        ...prev,
        labels: [...prev.labels, label],
        datasets: [{ ...prev.datasets[0], data: [...prev.datasets[0].data, value] }],
      };
    });
  }, [messages, sensorName, unit]); // ✅ fixed deps

  return (
    <div className="container-fluid px-4">
      <h4 className="mb-3">{sensorName} — {interval}</h4>
      <p className="small mb-2">
        MQTT: {connected
          ? <span className="text-success">● Connected</span>
          : <span className="text-danger">● Disconnected</span>}
        {mqttError && <span className="text-danger ms-2">({mqttError})</span>}
      </p>
      {loading && <p>Loading historical data…</p>}
      {error && <p className="text-danger">{error}</p>}
      {chartData
        ? <Line data={chartData} options={{ responsive: true, plugins: { legend: { display: true } }, scales: { y: { beginAtZero: true } } }} />
        : !loading && <p>No data available.</p>}
    </div>
  );
};

export default Dashboard;