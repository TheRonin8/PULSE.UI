import api from "./axiosInstance";;



export const getSensorData = async (sensorId) => {
  try {
    const response = await api.get(
      `/api/sensors/${sensorId}/data`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching sensor data:", error);
    throw error;
  }
};