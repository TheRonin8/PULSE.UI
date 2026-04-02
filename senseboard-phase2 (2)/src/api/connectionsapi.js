// ✅ Final connectionsapi.js — no BASE_URL needed at all
import api from "./axiosInstance";

export const validateConnection = async (payload) => {
    const response = await api.post("/api/Connections/validate", {
        connectionUrl: payload.connectionUrl,
        port:          Number(payload.port),
        tlsEnabled:    payload.tlsEnabled,
        isPublic:      payload.isPublic,
        username:      payload.username || null,
        password:      payload.password || null,
    });
    return response.data;
};

export const createConnection = async (payload) => {
    const response = await api.post("/api/Connections", {
        connectionName: payload.connectionName,
        protocol:       payload.protocol,
        connectionUrl:  payload.connectionUrl,
        port:           Number(payload.port),
        isPublic:       payload.isPublic,
        username:       payload.username || null,
        password:       payload.password || null,
        tlsEnabled:     payload.tlsEnabled,
    });
    return response.data;
};

export const getConnections = async () => {
    const response = await api.get("/api/Connections");
    return response.data;
};