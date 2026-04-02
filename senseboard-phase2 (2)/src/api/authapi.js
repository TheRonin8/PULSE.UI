import api from "./axiosInstance";

/* ───────── REGISTER ───────── */

export const registerUser = async (payload) => {
  const response = await api.post("/api/auth/register", {
    username: payload.username,
    email: payload.email,
    fullName: payload.fullName,
    phoneNumber: payload.contactNo,
    password: payload.password,
  });

  return response.data;
};

/* ───────── LOGIN ───────── */

export const loginUser = async (payload) => {
  const response = await api.post("/api/auth/login", {
    username: payload.username,
    password: payload.password,
  });

  return response.data;
};
export const logoutUser = async () => {
  const refreshToken = localStorage.getItem("sb_refresh_token");
  const response = await api.post("/api/auth/logout", { refreshToken });
  return response.data;
};
