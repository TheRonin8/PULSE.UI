import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend
} from "chart.js";
import { Line } from "react-chartjs-2";
import { getSensorData } from "../api/sensorDataApi";

// ✅ Register Chart.js components
ChartJS.register(
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend
);

const Dashboard = () => {

  const location = useLocation();
  const { sensorId, sensorName, interval, unit } = location.state || {};

  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (sensorId && interval) {
      fetchSensorData();
    }
  }, [sensorId, interval]);

  const fetchSensorData = async () => {
    setLoading(true);
    setError("");

    try {
      const data = await getSensorData(sensorId);
      const filtered = filterDataByInterval(data);
      prepareChartData(filtered);
    } catch (err) {
      console.error(err);
      setError("Failed to load sensor data");
    } finally {
      setLoading(false);
    }
  };

  const getDaysFromInterval = () => {
    switch (interval) {
      case "1 Week":
        return 7;
      case "15 Days":
        return 15;
      case "1 Month":
        return 30;
      case "3 Months":
        return 90;
      default:
        return 7;
    }
  };

  const filterDataByInterval = (data) => {
    const days = getDaysFromInterval();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    return data.filter(item =>
      new Date(item.timestamp) >= cutoff
    );
  };

  const prepareChartData = (data) => {
    if (!data || data.length === 0) {
      setChartData(null);
      return;
    }

    const labels = data.map(item =>
      new Date(item.timestamp).toLocaleDateString()
    );

    const values = data.map(item => item.value);

    setChartData({
      labels,
      datasets: [
        {
          label: `${sensorName} (${unit || ""})`,
          data: values,
          borderColor: "#00c6ae",
          backgroundColor: "rgba(0,198,174,0.15)",
          fill: true,
          tension: 0.4,
          pointRadius: 3
        }
      ]
    });
  };

  return (
    <div className="container-fluid px-4">
      <h4 className="mb-4">
         {sensorName} Plotted Graph {interval}
      </h4>

      {loading && <p>Loading sensor data...</p>}

      {error && <p className="text-danger">{error}</p>}

      {chartData && !loading && (
        <Line
          data={chartData}
          options={{
            responsive: true,
            plugins: {
              legend: { display: true }
            },
            scales: {
              y: { beginAtZero: true }
            }
          }}
        />
      )}

      {!loading && !chartData && (
        <p>No data available for selected interval.</p>
      )}
    </div>
  );
};

export default Dashboard;