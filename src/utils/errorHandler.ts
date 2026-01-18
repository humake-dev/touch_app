import { ERROR_MESSAGES } from '../constants/errorMessages';
import { AppError } from './AppError';

export async function handleApiError(res: Response) {
  let data: any = null;

  try {
    data = await res.json();
  } catch (_) {}

  const code = data?.detail?.code ?? data?.detail;

  const messageKey =
    ERROR_MESSAGES[code] ??
    data?.detail?.message ?? // 서버가 key를 주는 경우
    'error.unknown';

  throw new AppError(messageKey, code, res.status);
}
