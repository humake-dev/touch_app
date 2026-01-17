import AsyncStorage from "@react-native-async-storage/async-storage";
import { handleApiError } from './errorHandler';
import { BASE_URL } from '../../Config';

const authFetch = async (url: string, options: any = {}) => {
  let accessToken = await AsyncStorage.getItem("accessToken");

  let res = await fetch(`${BASE_URL}`+url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (res.status !== 401) {
    if (!res.ok) {
      await handleApiError(res);
    }  
  }   


try {
  accessToken = await refreshAccessToken();
} catch {
  await AsyncStorage.multiRemove(["accessToken", "refreshToken"]);
  throw new Error("logout");
}
  console.log("🟢 authFetch using accessToken:", accessToken);
  return fetch(`${BASE_URL}`+url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${accessToken}`,
    },
  });
};

const refreshAccessToken = async () => {
  const refreshToken = await AsyncStorage.getItem("refreshToken");

  if (!refreshToken) {
    throw new Error("No refresh token");
  }

  const res = await fetch(`${BASE_URL}/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) {
    // refresh 자체가 만료 → 로그아웃
    await AsyncStorage.multiRemove(["accessToken", "refreshToken"]);
    throw new Error("Refresh token expired");
  }

  const { access_token } = await res.json();
  await AsyncStorage.setItem("accessToken", access_token);

  return access_token;
};

export default authFetch;