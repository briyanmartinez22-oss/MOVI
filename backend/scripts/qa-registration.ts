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
  };
}
