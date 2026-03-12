export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000/api";

export const PROTOCOLS = ["MQTT", "MODBUS", "OPC-UA", "Modbus TCP"];

export const MQTT_BROKERS = [
  { name: "EMQX Cloud", host: "broker.emqx.io", port: 8084, ssl: true },
  { name: "HiveMQ", host: "broker.hivemq.com", port: 8884, ssl: true },
  { name: "Mosquitto Test", host: "test.mosquitto.org", port: 8081, ssl: true },
];
