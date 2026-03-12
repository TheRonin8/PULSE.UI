import axios from "axios";
import { API_BASE_URL } from "../utils/constants";

// ─── SET TO false WHEN BACKEND IS READY ───────────────────────────────────────
const MOCK_MODE = true;
// ──────────────────────────────────────────────────────────────────────────────

const MOCK_USERS_KEY = "sb_mock_users";

const getMockUsers = () => JSON.parse(localStorage.getItem(MOCK_USERS_KEY) || "[]");
const saveMockUsers = (users) => localStorage.setItem(MOCK_USERS_KEY, JSON.stringify(users));

const mockDelay = (ms = 600) => new Promise((res) => setTimeout(res, ms));

const mockError = (message, status = 400) => {
  const err = new Error(message);
  err.response = { data: { message }, status };
  return Promise.reject(err);
};

export const loginUser = async (credentials) => {
  if (!MOCK_MODE) return api.post("/auth/login", credentials);
  await mockDelay();
  const users = getMockUsers();
  const user = users.find(
    (u) => u.username === credentials.username && u.password === credentials.password
  );
  if (!user) return mockError("Invalid username or password");
  return { data: { token: "mock-token-" + Date.now(), user: { username: user.username } } };
};

export const registerUser = async (data) => {
  if (!MOCK_MODE) return api.post("/auth/register", data);
  await mockDelay();
  const users = getMockUsers();
  if (users.find((u) => u.username === data.username)) return mockError("Username already exists");
  if (users.find((u) => u.email === data.email)) return mockError("Email already registered");
  saveMockUsers([...users, { username: data.username, email: data.email, password: data.password }]);
  return { data: { message: "Registered successfully" } };
};

export const connectBroker = async (data) => {
  if (!MOCK_MODE) return api.post("/connection/mqtt", data);
  await mockDelay(800);
  return { data: { message: "Connected", connectionId: "mock-" + Date.now() } };
};

// ─── Real axios instance (used when MOCK_MODE = false) ────────────────────────
const api = axios.create({ baseURL: API_BASE_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("sb_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
