import { useEffect, useState } from "react";
import axios from "axios";

export const useProtocols = () => {
    const [protocols, setProtocols] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const url = `${process.env.REACT_APP_API_URL}/api/protocols`;
        console.log("Calling URL:", url);

        axios.get(url)
            .then(res => {
                console.log("API Response:", res.data);
                // API returns plain array of strings ["MQTT", "TCP"]
                setProtocols(res.data);
            })
            .catch((err) => {
                console.log("Error:", err.message);
                setError("Failed to load protocols");
            })
            .finally(() => setLoading(false));
    }, []);

    return { protocols, loading, error };
};