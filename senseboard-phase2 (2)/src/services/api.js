import axios from "axios";
import { API_BASE_URL } from "../utils/constants";

const api = axios.create({ baseURL: API_BASE_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("sb_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const loginUser = (credentials) => api.post("/auth/login", credentials);
export const registerUser = (data) => api.post("/auth/register", data);
export const connectBroker = (data) => api.post("/connection/connect", data);
export const getSensorData = () => api.get("/sensors/latest");

export default api;
var sensorList = ['TCP','MQTT'];