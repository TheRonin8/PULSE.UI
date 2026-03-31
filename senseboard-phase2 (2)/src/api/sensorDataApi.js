import api from "./axiosInstance";;

const BASE_URL = "http://10.4.0.103:8081";

export const getSensorData = async (sensorId) => {
  try {
    const response = await api.get(
      `${BASE_URL}/api/sensors/${sensorId}/data`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching sensor data:", error);
    throw error;
  }
};