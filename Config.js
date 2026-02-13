import Config from 'react-native-config';

const API_PROTOCOL = Config.API_PROTOCOL ?? 'https';
 const API_HOST = Config.API_HOST ?? 'api.humake.co.kr';
 const API_PORT = Config.API_PORT ?? '443';

/* if (!Config.API_PROTOCOL || !Config.API_HOST) {
  console.warn('[ENV WARNING] .env not fully loaded', Config);
} */

export const BASE_URL = `${API_PROTOCOL}://${API_HOST}:${API_PORT}`;
export const WS_URL = Config.WS_URL ?? 'ws://192.168.219.249:8088';
