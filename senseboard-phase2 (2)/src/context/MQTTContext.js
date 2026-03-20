import { createContext } from "react";

export const MQTTContext = createContext({
  messages: [],
  connected: false,
  subscribeTopic: () => {},
  unsubscribeTopic: () => {},
  publishMessage: () => {},
});