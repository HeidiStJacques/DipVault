import AsyncStorage from "@react-native-async-storage/async-storage";
import { DeviceEventEmitter } from "react-native";

const TOKEN_KEY = "auth_token";

export async function authFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = await AsyncStorage.getItem(TOKEN_KEY);

  const headers = new Headers(options.headers);

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    await AsyncStorage.removeItem(TOKEN_KEY);

    // Tell AuthContext that the login has expired
    DeviceEventEmitter.emit("auth:unauthorized");
  }

  return response;
}
