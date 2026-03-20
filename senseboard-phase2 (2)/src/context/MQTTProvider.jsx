import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import mqtt from "mqtt";
import { MQTTContext } from "./MQTTContext";

export const MQTTProvider = ({ children }) => {
  const clientRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Mosquitto broker — using WebSocket port 9001
    const url = `ws://${process.env.REACT_APP_MQTT_HOST}:${process.env.REACT_APP_MQTT_PORT}`;
    console.log("Connecting to MQTT broker:", url);

    const mqttClient = mqtt.connect(url);
    clientRef.current = mqttClient;

    mqttClient.on("connect", () => {
      console.log("MQTT Connected!");
      setConnected(true);
      // Subscribe to all sensor topics
      mqttClient.subscribe("sensors/+", (err) => {
        if (!err) console.log("Subscribed to sensors/+");
        else console.error("Subscribe error:", err);
      });
    });

    mqttClient.on("message", (topic, message) => {
      try {
        const parsed = JSON.parse(message.toString());
        setMessages((prev) => [
          ...prev.slice(-99), // keep last 100 messages
          { topic, payload: parsed, timestamp: new Date().toISOString() }
        ]);
      } catch {
        // handle plain string messages
        setMessages((prev) => [
          ...prev.slice(-99),
          { topic, payload: message.toString(), timestamp: new Date().toISOString() }
        ]);
      }
    });

    mqttClient.on("error", (err) => {
      console.error("MQTT Error:", err);
      setConnected(false);
    });

    mqttClient.on("disconnect", () => {
      console.log("MQTT Disconnected");
      setConnected(false);
    });

    return () => {
      mqttClient.end();
    };
  }, []);

  const subscribeTopic = useCallback((topic) => {
    if (clientRef.current) {
      clientRef.current.subscribe(topic, (err) => {
        if (!err) console.log("Subscribed to", topic);
      });
    }
  }, []);

  const unsubscribeTopic = useCallback((topic) => {
    if (clientRef.current) {
      clientRef.current.unsubscribe(topic, (err) => {
        if (!err) console.log("Unsubscribed from", topic);
      });
    }
  }, []);

  const publishMessage = useCallback((topic, msg) => {
    if (clientRef.current) clientRef.current.publish(topic, msg);
  }, []);

  const contextValue = useMemo(() => ({
    messages,
    connected,
    subscribeTopic,
    unsubscribeTopic,
    publishMessage,
  }), [messages, connected, subscribeTopic, unsubscribeTopic, publishMessage]);

  return (
    <MQTTContext.Provider value={contextValue}>
      {children}
    </MQTTContext.Provider>
  );
};