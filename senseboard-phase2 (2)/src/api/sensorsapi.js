import api from "./axiosInstance";;

const BASE_URL = process.env.REACT_APP_API_URL;

export const addSensor = async (payload) => {
    const response = await api.post(
        `${BASE_URL}/api/Sensors`,
        {
            connectionId: payload.connectionId,
            sensorName:   payload.sensorName,
            quantity:     payload.quantity,
            unit:         payload.unit,
            topicName:    payload.topicName,
            locatedAt:    payload.location,
        }
    );
    return response.data;
};
export const deleteSensor = async (sensorId) => {
  const response = await api.delete(`/api/Sensors/${sensorId}`);
  return response.data;
};