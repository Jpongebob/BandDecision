type AuthFailure = { code?: string; status?: number; name?: string };

export function anonymousSignInError(error: AuthFailure): string {
  const code = error.code && /^[a-z0-9_]{1,64}$/.test(error.code) ? error.code : 'unknown';
  const status = Number.isInteger(error.status) && error.status! >= 100 && error.status! <= 599
    ? error.status : undefined;
  let message: string;
  if (code === 'anonymous_provider_disabled') {
    message = '연결된 Supabase 프로젝트의 익명 로그인이 꺼져 있습니다. Allow anonymous sign-ins를 켜고 저장하세요. 이미 켰다면 Vercel의 Supabase URL이 같은 프로젝트인지 확인하세요.';
  } else if (code === 'signup_disabled') {
    message = 'Supabase에서 새 사용자 생성이 차단되어 있습니다. Allow new users to sign up 설정을 확인하세요.';
  } else if (code === 'captcha_failed') {
    message = 'Supabase가 CAPTCHA 확인을 요구하지만 완료하지 못했습니다. 현재 간편 접속 화면의 CAPTCHA 연동 설정을 확인해야 합니다.';
  } else if (code === 'over_request_rate_limit' || status === 429) {
    message = 'Supabase 인증 요청 제한에 도달했습니다. 반복해서 누르지 말고 잠시 후 다시 시도하세요. 계속되면 Authentication의 Rate Limits를 확인하세요.';
  } else if (status === 401 || code === 'invalid_api_key') {
    message = 'Supabase 연결 키를 확인해 주세요. Vercel의 Supabase URL과 Publishable key가 같은 프로젝트 값인지 확인하고 재배포하세요.';
  } else if (error.name === 'AuthRetryableFetchError' || error.status === 0) {
    message = '배포 서버에서 Supabase에 연결하지 못했습니다. Supabase 프로젝트 실행 상태와 Vercel의 Supabase URL을 확인하세요.';
  } else if (status !== undefined && status >= 500) {
    message = 'Supabase 인증 서버에서 오류가 발생했습니다. 새 사용자 생성 트리거와 202611050002 마이그레이션 적용 여부를 확인하고 Auth·Postgres 오류 로그를 확인하세요.';
  } else {
    message = 'Supabase 간편 접속에 실패했습니다. 아래 인증 오류 코드를 관리자에게 알려 주세요.';
  }
  // Return only stable provider codes/status; never echo provider messages, cookies or credentials.
  return message + ' [인증 오류: ' + code + (status ? ', HTTP ' + status : '') + ']';
}
