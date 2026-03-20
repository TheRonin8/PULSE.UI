import axios from "axios";

const BASE_URL = process.env.REACT_APP_API_URL;

export const validateConnection = async (payload) => {
    const response = await axios.post(
        `${BASE_URL}/api/Connections/validate`,
        {
            connectionUrl: payload.connectionUrl,
            port:          Number(payload.port),
            tlsEnabled:    payload.tlsEnabled,
            isPublic:      payload.isPublic,
            username:      payload.username || null,
            password:      payload.password || null,
        }
    );
    return response.data;
};

export const createConnection = async (payload) => {
    const response = await axios.post(
        `${BASE_URL}/api/Connections`,
        {
            connectionName: payload.connectionName,
            protocol:       payload.protocol,
            connectionUrl:  payload.connectionUrl,
            port:           Number(payload.port),
            isPublic:       payload.isPublic,
            username:       payload.username || null,
            password:       payload.password || null,
            tlsEnabled:     payload.tlsEnabled,
        }
    );
    return response.data;
};

export const getConnections = async () => {
    const response = await axios.get(`${BASE_URL}/api/Connections`);
    return response.data;
};