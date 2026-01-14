import { ERROR_MESSAGES } from '../constants/errorMessages';
import { AppError } from './AppError';

export async function handleApiError(res: Response) {
  let data: any = null;

  try {
    data = await res.json();
  } catch (_) {}

  const code = data?.detail?.code ?? data?.detail;
  const message =
    ERROR_MESSAGES[code] ??
    data?.detail?.message ??
    '요청 처리 중 오류가 발생했습니다.';

  throw new AppError(message, code, res.status);
}
