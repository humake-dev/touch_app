import AsyncStorage from "@react-native-async-storage/async-storage";
import { handleApiError } from './errorHandler';
import { BASE_URL } from '../../Config';

const authFetch = async (url: string, options: any = {}) => {
  let accessToken = await AsyncStorage.getItem("accessToken");

  const doFetch = (token: string | null) =>
    fetch(`${BASE_URL}${url}`, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: token ? `Bearer ${token}` : "",
      },
    });

  // 1️⃣ 첫 요청
  let res = await doFetch(accessToken);

  // 2️⃣ 정상 응답이면 바로 리턴
  if (res.status !== 401) {
    if (!res.ok) {
      await handleApiError(res);
    }
    return res;
  }

  // 3️⃣ 401 → refresh 시도
  try {
    accessToken = await refreshAccessToken();
  } catch {
    await AsyncStorage.multiRemove(["accessToken", "refreshToken"]);
    throw new Error("logout");
  }

  // 4️⃣ refresh 성공 → 재요청 (1회)
  res = await doFetch(accessToken);

  if (!res.ok) {
    await handleApiError(res);
  }

  return res;
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