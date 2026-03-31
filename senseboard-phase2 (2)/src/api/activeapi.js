import api from "./axiosInstance";;

const BASE_URL = process.env.REACT_APP_API_URL;

export async function getActiveSensors(connectionId) {
  const response = await api.get(
    `${BASE_URL}/api/Sensors/connection/${connectionId}/active`
  );
  return response.data;
}


export async function activateSensor(sensorId) {
  const response = await api.put(
    `${BASE_URL}/api/Sensors/${sensorId}/activate`
  );
  return response.data;
}