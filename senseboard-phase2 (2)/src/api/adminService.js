import api from "./axiosInstance";
 
// ── Only these 4 endpoints exist on your backend ─────────────────────────────

const getAllConnections     = ()       => api.get("/api/Connections/all");

 const getAllSensors         = ()       => api.get("/api/Sensors/all");

const getConnectionsByUser = (userId) => api.get(`/api/Connections/user/${userId}`);

const getSensorsByUser     = (userId) => api.get(`/api/Sensors/user/${userId}`);
 
// getAllUsers intentionally removed — /api/users does not exist on your backend
export {getAllConnections,getAllSensors,getConnectionsByUser,getSensorsByUser};