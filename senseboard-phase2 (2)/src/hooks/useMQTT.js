import { useContext } from "react";
import { MQTTContext } from "../context/MQTTContext";

export const useMQTT = () => useContext(MQTTContext);