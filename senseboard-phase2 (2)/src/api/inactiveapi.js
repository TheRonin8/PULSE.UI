import api from "./axiosInstance";;

const BASE_URL = process.env.REACT_APP_API_URL;

export async function getInactiveSensors(connectionId) {
  const response = await api.get(
    `${BASE_URL}/api/Sensors/connection/${connectionId}/inactive`
  );
  return response.data;
}


export async function inactivateSensor(sensorId) {
  const response = await api.put(
    `${BASE_URL}/api/Sensors/${sensorId}/inactivate`
  );
  return response.data;
}
