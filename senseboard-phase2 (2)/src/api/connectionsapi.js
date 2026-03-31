import api from "./axiosInstance";;

const BASE_URL = process.env.REACT_APP_API_URL;

export const validateConnection = async (payload) => {
    const response = await api.post(
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
    const response = await api.post(
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
    const response = await api.get(`${BASE_URL}/api/Connections`);
    return response.data;
};