import api from "./axiosInstance";

export const getSensorData = async (sensorId, startDate, endDate) => {
  try {
    const response = await api.get(`/api/sensors/${sensorId}/data`, {
  params: { from: startDate, to: endDate }
});
    
    return response.data;
  } catch (error) {
    console.error("Error fetching sensor data:", error);
    throw error;
  }
};