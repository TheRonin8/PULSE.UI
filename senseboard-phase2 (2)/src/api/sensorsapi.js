import axios from "axios";

const BASE_URL = process.env.REACT_APP_API_URL;

export const addSensor = async (payload) => {
    const response = await axios.post(
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