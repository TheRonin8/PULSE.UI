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

  
export const getProtocolsByAdmin = () =>
  api.get("/api/protocols/admin/all");

export const updateProtocolAccess = (protocolId,accessAllowed) =>
  api.put(`/api/protocols/${protocolId}`,{accessAllowed});