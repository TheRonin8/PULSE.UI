import api from "./axiosInstance";
 
export const addSensor = async (payload) => {
  const body = {
    connectionId: Number(payload.connectionId), // ✅ ensure int, not string
    sensorName:   payload.sensorName,
    quantity:     payload.quantity,
    unit:         payload.unit,
    topicName:    payload.topicName,
    locatedAt:    payload.location,
  };
   console.log("POST /api/Sensors →", body); // ← remove after confirming fix
 
  const response = await api.post("/api/Sensors", body);
  return response.data;
};
 
export const deleteSensor = async (sensorId) => {
  const response = await api.delete(`/api/Sensors/${sensorId}`);
  return response.data;
};
 
export const getSensorByUser = (userId) =>
  api.get(`/api/Sensors/user/${userId}`);