import api from "./axiosInstance";;

const BASE_URL = process.env.REACT_APP_API_URL;

export const getProtocols = async () => {
  if (!BASE_URL) {
    throw new Error("REACT_APP_API_URL is not defined");
  }
  const url = `${BASE_URL}/api/pulse/getallconnections`;
  console.log("Calling:", url);
  const response = await api.get(url);
  return response.data;
};