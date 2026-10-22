import api from "./api";
import { AuthResponse, LoginCredentials } from "../types/auth";

export const loginUser = async (
  loginData: LoginCredentials,
): Promise<AuthResponse> => {
  const response = await api.post<AuthResponse>("/users/login", loginData);

  return response.data;
};
