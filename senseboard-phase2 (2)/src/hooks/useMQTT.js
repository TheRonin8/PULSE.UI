import { useEffect, useRef, useState } from "react";
import mqtt from "mqtt";
 
export const useMqtt = (sensorName) => {
  const clientRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);
 
  useEffect(() => {
    if (!sensorName) return;
 
    const brokerUrl = `ws://${process.env.REACT_APP_BROKER_HOST}:9001`;
    console.log("connecting to:",brokerUrl);
    const topic = `sensor/${sensorName}`;
 
    const client = mqtt.connect(brokerUrl, {
      username: "adminmqtt",
      password: "ABBD135836A-FE40-4F81-8754-B8BBAC759D14393",
      
      clientId: `pulse-ui-${Math.random().toString(16).slice(2)}`,
      clean: true,
      reconnectPeriod: 3000,
    });
 
    clientRef.current = client;
 
    client.on("connect", () => {
      console.log("✅ Connected to MQTT broker");
      setConnected(true);
      setError(null);
      client.subscribe(topic, { qos: 1 }, () => {
        console.log(`📡 Subscribed to ${topic}`);  // ✅ fixed template literal
      });
    });
 
    client.on("message", (receivedTopic, payload) => {
      console.log(`📨 Message on ${receivedTopic}:`, payload.toString());
      try {
        const data = JSON.parse(payload.toString());
        setMessages(prev => [...prev.slice(-99), { ...data, receivedAt: new Date() }]);
      } catch {
        setMessages(prev => [...prev.slice(-99), { raw: payload.toString(), receivedAt: new Date() }]);
      }
    });
 
    client.on("error", (err) => {
      console.error("❌ MQTT error:", err.message);
      setError(err.message);
      setConnected(false);
    });
 
    client.on("disconnect", () => {
      console.log("🔌 Disconnected from broker");
      setConnected(false);
    });
 
    return () => {
      client.unsubscribe(topic);
      console.log(`🚫 Unsubscribed from ${topic}`);  // ✅ fixed
      client.end();
    };
  }, [sensorName]);
 
  return { messages, connected, error };
};