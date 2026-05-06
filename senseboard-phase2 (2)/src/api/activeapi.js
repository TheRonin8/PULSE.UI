import api from "./axiosInstance";
 
export async function getActiveSensors(connectionId) {
  // ✅ Correct: route param matches [HttpGet("all/{connectionId:int}")]
  const response = await api.get(`/api/Sensors/all/${connectionId}`);
  return response.data;
}
 
export async function activateSensor(sensorId) {
  const response = await api.put(`/api/Sensors/${sensorId}/activate`);
  return response.data; // ✅ Fixed typo: was "response. Data"
}