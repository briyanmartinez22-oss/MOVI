export const QA_PASSWORD = process.env.QA_TEST_PASSWORD ?? 'QaTest123';

export const QA_LICENSE_FRONT = 'https://example.com/license-front.jpg';
export const QA_LICENSE_BACK = 'https://example.com/license-back.jpg';

export function ownerRegisterPayload(
  phone: string,
  dui: string,
  firstName = 'QA',
  lastName = 'Owner'
) {
  return {
    phone,
    dui,
    firstName,
    lastName,
    documentType: 'DUI' as const,
    password: QA_PASSWORD,
  };
}

export function driverInviteRegisterPayload(
  phone: string,
  code: string,
  firstName = 'QA',
  lastName = 'Driver'
) {
  return {
    phone,
    firstName,
    lastName,
    code,
    licenseFront: QA_LICENSE_FRONT,
    licenseBack: QA_LICENSE_BACK,
    password: QA_PASSWORD,
  };
}

export async function loginWithPassword(
  req: (path: string, body?: unknown, token?: string, method?: string) => Promise<{ status: number; json: Record<string, unknown> }>,
  phone: string,
  password = QA_PASSWORD
): Promise<string> {
  const login = await req('/auth/login', { phone, password });
  const data = login.json.data as { authToken?: string } | undefined;
  if (!login.json.ok || !data?.authToken) {
    throw new Error(`Password login failed (${phone}): ${String(login.json.error ?? 'unknown')}`);
  }
  return data.authToken;
}
