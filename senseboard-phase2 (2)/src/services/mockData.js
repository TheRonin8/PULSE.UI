// Used during development until backend APIs are ready
export const getMockSensorData = () => ({
  temperature: { id: 1, name: "Temperature", unit: "°C",  value: +(20 + Math.random() * 10).toFixed(1) },
  humidity:    { id: 2, name: "Humidity",    unit: "%",   value: +(40 + Math.random() * 30).toFixed(1) },
  motion:      { id: 3, name: "Motion",      unit: "",    value: Math.random() > 0.5 ? "Detected" : "Clear" },
  pressure:    { id: 4, name: "Pressure",    unit: "hPa", value: +(1000 + Math.random() * 20).toFixed(1) },
  flow:        { id: 5, name: "Flow",        unit: "L/m", value: +(5 + Math.random() * 10).toFixed(2) },
});
