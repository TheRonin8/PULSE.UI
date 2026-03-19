import axios from "axios";
const BASE_URL =process.env.REACT_APP_API_URL;
export const getProtocols=async () => 
    {
        const response =await axios.get(`${BASE_URL}/api/protocols`);
        return response.data;

};
