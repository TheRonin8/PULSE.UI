import { useEffect, useRef, useState } from "react";
import mqtt from "mqtt";
 
export const useMqtt = (sensorName) => {
    const clientRef             = useRef(null);
    const [messages, setMessages] = useState([]);
    const [connected, setConnected] = useState(false);
    const [error, setError]     = useState(null);
 
    useEffect(() => {
        if (!sensorName) return;
 
        // Connect to Mosquitto via WebSocket
        // Use the backend machine IP — same machine running Docker
        const brokerUrl = `ws://${process.env.REACT_APP_BROKER_HOST}:9001`;
        const topic     = `sensor/${sensorName}`;
 
        const client = mqtt.connect(brokerUrl, {
            clientId: `pulse-ui-${Math.random().toString(16).slice(2)}`,
            clean:    true,
            reconnectPeriod: 3000,
        });
 
        clientRef.current = client;
 
        client.on("connect", () => {
            setConnected(true);
            setError(null);
            client.subscribe(topic, { qos: 1 });
        });
 
        client.on("message", (receivedTopic, payload) => {
            try {
                const data = JSON.parse(payload.toString());
                setMessages(prev => [...prev.slice(-99), { ...data, receivedAt: new Date() }]);
            } catch {
                // payload was not JSON — store as raw string
                setMessages(prev => [...prev.slice(-99), {
                    raw: payload.toString(),
                    receivedAt: new Date()
                }]);
            }
        });
 
        client.on("error", (err) => {
            setError(err.message);
            setConnected(false);
        });
 
        client.on("disconnect", () => setConnected(false));
 
        // Cleanup on unmount or sensorName change
        return () => {
            client.unsubscribe(topic);
            client.end();
        };
    }, [sensorName]);
 
    return { messages, connected, error };
};