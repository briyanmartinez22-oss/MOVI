/**
 * Crea entidades efímeras para scripts QA (post db:reset-beta).
 */
import { req, OTP } from './admin-qa-auth';
import { driverInviteRegisterPayload, ownerRegisterPayload, QA_PASSWORD, loginWithPassword } from './qa-registration';

function place(name: string, lat: number, lng: number) {
  return {
    id: name.toLowerCase().replace(/\s+/g, '-'),
    name,
    coordinates: { latitude: lat, longitude: lng },
  };
}

export async function registerPassenger(fullName = 'QA Bootstrap Passenger') {
  const phone = `79${Date.now().toString().slice(-6)}`;
  await req('/auth/request-otp', { phone });
  await req('/auth/verify-otp', { phone, code: OTP });
  const reg = await req('/passengers/register', { phone, fullName, password: QA_PASSWORD });
  if (!reg.json.ok) throw new Error(reg.json.error ?? 'passenger register failed');
  return {
    id: reg.json.data?.user?.id as string,
    token: reg.json.data?.authToken as string,
    phone,
    password: QA_PASSWORD,
  };
}

export async function registerOwner(fullName = 'QA Bootstrap Owner') {
  const phone = `71${Date.now().toString().slice(-6)}`;
  await req('/auth/request-otp', { phone });
  await req('/auth/verify-otp', { phone, code: OTP });
  const reg = await req(
    '/owners/register',
    ownerRegisterPayload(phone, `${String(Date.now()).slice(-8)}-1`, 'QA', fullName.replace(/^QA\s+/, ''))
  );
  if (!reg.json.ok) throw new Error(reg.json.error ?? 'owner register failed');
  return {
    id: reg.json.data?.owner?.id as string,
    token: reg.json.data?.authToken as string,
    phone,
  };
}

export async function registerBusiness(fullName = 'QA Bootstrap Business') {
  const phone = `76${Date.now().toString().slice(-6)}`;
  const lat = 13.6929;
  const lng = -89.2182;
  await req('/auth/request-otp', { phone });
  await req('/auth/verify-otp', { phone, code: OTP });
  const reg = await req('/businesses/register', {
    phone,
    dui: `${String(Date.now()).slice(-8)}-2`,
    fullName,
    businessName: 'QA Bootstrap Biz',
    businessType: 'restaurant',
    businessPhone: phone,
    latitude: lat,
    longitude: lng,
    addressLabel: 'Centro',
    password: QA_PASSWORD,
  });
  if (!reg.json.ok) throw new Error(reg.json.error ?? 'business register failed');
  return {
    id: reg.json.data?.business?.id as string,
    token: reg.json.data?.authToken as string,
    phone,
  };
}

export async function registerDriverWithVehicle(adminToken: string) {
  const owner = await registerOwner('QA Bootstrap Owner Driver');
  const plate = `Q${Date.now().toString().slice(-5)}`;
  const vehicle = await req(
    '/vehicles/register',
    {
      unitNumber: '901',
      plateNumber: plate,
      associationName: 'QA Bootstrap',
      vehicleType: 'mototaxi',
    },
    owner.token
  );
  if (!vehicle.json.ok) throw new Error(vehicle.json.error ?? 'vehicle register failed');
  const vehicleId = vehicle.json.data?.vehicleId as string;
  await req(`/vehicles/${vehicleId}/submit-verification`, {}, owner.token);
  await req('/owners/submit-verification', {}, owner.token);
  await req(`/admin/owners/${owner.id}/approve`, {}, adminToken);
  await req(`/admin/vehicles/${vehicleId}/approve`, {}, adminToken);
  const inv = await req(`/vehicles/${vehicleId}/invite-driver`, {}, owner.token);
  const code = inv.json.data?.code as string;
  const dPhone = `78${Date.now().toString().slice(-6)}`;
  await req('/auth/request-otp', { phone: dPhone });
  await req('/auth/verify-otp', { phone: dPhone, code: OTP });
  const dReg = await req(
    '/drivers/register-with-invite',
    driverInviteRegisterPayload(dPhone, code, 'QA', 'Bootstrap Driver')
  );
  if (!dReg.json.ok) throw new Error(dReg.json.error ?? 'driver register failed');
  const driverId = dReg.json.data?.driver?.id as string;
  const driverToken = dReg.json.data?.authToken as string;
  await req(`/admin/drivers/${driverId}/approve`, {}, adminToken);
  await req(
    `/drivers/${driverId}/sessions/start`,
    { vehicleId, latitude: 13.6929, longitude: -89.2182 },
    driverToken
  );
  return { ownerId: owner.id, vehicleId, driverId, driverToken };
}

export async function createRequestedTrip(passengerToken: string) {
  const trip = await req(
    '/trips/request',
    {
      origin: place('QA Origin', 13.6929, -89.2182),
      destination: place('QA Destination', 13.6769, -89.2795),
      tripType: 'shared',
      passengerOfferPrice: 5,
      passengerCount: 1,
    },
    passengerToken
  );
  if (!trip.json.ok) throw new Error(trip.json.error ?? 'trip request failed');
  const id = trip.json.data?.id as string;
  return { id };
}

export async function ensureQaFixtures(adminToken: string) {
  const passenger = await registerPassenger();
  const { driverId } = await registerDriverWithVehicle(adminToken);
  const owner = await registerOwner('QA Bootstrap Owner List');
  const business = await registerBusiness();
  const trip = await createRequestedTrip(passenger.token);
  return { passenger, driverId, owner, business, trip };
}
