import { useEffect, useRef } from "react";

/**
 * Custom hook to poll a callback at a configurable interval.
 * @param {Function} callback - Function to call on each tick
 * @param {number} interval - Interval in milliseconds
 */
const usePolling = (callback, interval) => {
  const savedCallback = useRef();

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!interval) return;
    const tick = () => savedCallback.current();
    tick(); // call immediately on mount
    const id = setInterval(tick, interval);
    return () => clearInterval(id);
  }, [interval]);
};

export default usePolling;
