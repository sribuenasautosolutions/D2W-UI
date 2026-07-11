import axios from "axios";

export const getDashboard = async () => {
  const response = await axios.get(
    "http://localhost:8080/dashboard"
  );

  return response.data;
};