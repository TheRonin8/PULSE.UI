import { useEffect, useRef, useState } from "react";
import mqtt from "mqtt";

export const useMqtt = (sensorName) => {
  const clientRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!sensorName) return;

    const topic = `live/${sensorName}`;
    
      const client = mqtt.connect(`ws://${process.env.REACT_APP_BROKER_HOST}:9001`, {
  clientId: `pulse-ui-${Math.random().toString(16).slice(2)}`,
  clean: true,
  reconnectPeriod: 3000,
})
     

    clientRef.current = client;

    client.on("connect", () => {
      setConnected(true);
      setError(null);
      client.subscribe(topic, { qos: 1 });
    });

  client.on("message", (_, payload) => {
  const str = payload.toString();
  try {
    const data = JSON.parse(str);
    setMessages(prev => [...prev.slice(-99), { ...data, receivedAt: new Date() }]);
  } catch {
    const parsed = {};
    str.replace(/[{}]/g, "").split(",").forEach(pair => {
      const [k, v] = pair.split(":").map(s => s.trim());
      if (k && v) parsed[k] = isNaN(v) ? v : parseFloat(v);
    });
    setMessages(prev => [...prev.slice(-99), { ...parsed, receivedAt: new Date() }]);
  }
});
    client.on("error", (err) => { setError(err.message); setConnected(false); });
    client.on("disconnect", () => setConnected(false));

    return () => { client.unsubscribe(topic); client.end(); };
  }, [sensorName]);

  return { messages, connected, error };
};