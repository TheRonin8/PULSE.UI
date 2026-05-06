import axios from "axios";

// Single axios instance used by every API call in the app
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:5000",
});

// ── Request interceptor: attach access token to every request ────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("sb_access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response interceptor: silent token refresh on 401 ───────────────────────
// FIX 1: interceptor is now on `api`, not the base `axios` instance —
//         so it actually fires for calls made by this app.
// FIX 2: refresh token key is "sb_refresh_token" (matching what Login.jsx saves),
//         not "refreshToken".
// FIX 3: new tokens are saved under "sb_access_token" / "sb_refresh_token"
//         (matching every other key in the app).
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    // Only attempt refresh on 401, and only once per request (_retry guard)
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;

      try {
        const refreshToken = localStorage.getItem("sb_refresh_token");
        if (!refreshToken) throw new Error("No refresh token stored");

        // Call refresh using a plain axios call (not `api`) to avoid
        // triggering this interceptor recursively
        const { data } = await axios.post(
          `${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/auth/refresh`,
          { refreshToken }
        );

        // Persist new tokens
        localStorage.setItem("sb_access_token", data.accessToken);
        localStorage.setItem("sb_refresh_token", data.refreshToken);

        // Retry the original failed request with the new access token
        original.headers["Authorization"] = `Bearer ${data.accessToken}`;
        return api(original);
      } catch {
        // Refresh failed — clear everything and send to login
        localStorage.removeItem("sb_access_token");
        localStorage.removeItem("sb_refresh_token");
        localStorage.removeItem("sb_userId");
        localStorage.removeItem("sb_username");
        localStorage.removeItem("sb_role");
        localStorage.removeItem("sb_connectionId");
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

export default api;
