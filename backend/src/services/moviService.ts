import type { DriverSession, UserRole } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { issueRefreshToken } from '../lib/refreshToken';
import { signAuthToken } from '../lib/jwt';
import {
  duiMatches,
  generateDriverPublicId,
  generateUnitId,
  namesMatch,
  normalizeDui,
  normalizePhone,
  parseJsonField,
  stringifyJsonField,
  toAuthUser,
} from '../utils/normalize';
import { assertPhoneVerifiedForRegistration, consumeVerifiedOtp } from './otpService';
import { validatePasswordStrength, hashPassword } from './password.service';
import { canDriverOperate } from './subscription.service';
import { recordDriverLocation } from './providerEligibility.service';
import { assignUserRole } from './users.service';
import { findUserByPhone } from './ensure-super-admin.service';
import {
  buildInvitePreview,
  createVehicleInvite,
  markInviteUsed,
  validateVehicleInvite,
} from './vehicle-invite.service';
import { enrichDriverRecord } from './driver-approval.service';
import {
  getDriverLicenseUrls,
  upsertDriverLicenseDocuments,
} from '../utils/driver-license-docs';
import {
  hasRegistrationCardDocument,
  pickRegistrationCardUrl,
} from '../utils/vehicle-documents';

async function issueAuthBundle(userId: string, role: string) {
  const authToken = signAuthToken({ userId, role });
  const refresh = await issueRefreshToken(userId);
  return { authToken, refreshToken: refresh.refreshToken };
}

function getFirstBillingDate(registeredAt: Date): Date {
  return new Date(registeredAt.getFullYear(), registeredAt.getMonth() + 1, 1);
}

async function createDriverSubscription(driverId: string, registeredAt = new Date()) {
  const trialEnds = getFirstBillingDate(registeredAt);
  return prisma.driverSubscription.create({
    data: {
      driverId,
      trialEndsAt: trialEnds,
      nextBillingAt: trialEnds,
    },
  });
}

async function resolveRegistrationPassword(password: string) {
  const error = validatePasswordStrength(password);
  if (error) return { ok: false as const, error };
  const passwordHash = await hashPassword(password);
  return { ok: true as const, passwordHash };
}

export async function loginWithOtp(phone: string, dui: string | undefined, code: string) {
  const { loginWithOtpAdmin } = await import('./auth.service');
  return loginWithOtpAdmin(phone, dui, code);
}

export async function registerPassenger(phone: string, fullName: string, password: string) {
  const otpCheck = await assertPhoneVerifiedForRegistration(phone);
  if (!otpCheck.ok) return otpCheck;

  const pwCheck = await resolveRegistrationPassword(password);
  if (!pwCheck.ok) return pwCheck;

  const phoneNumber = normalizePhone(phone);
  const existing = await prisma.user.findUnique({ where: { phoneNumber } });
  if (existing) return { ok: false as const, error: 'Este teléfono ya está registrado.' };

  const user = await prisma.user.create({
    data: {
      fullName,
      phoneNumber,
      duiNumber: null,
      role: 'passenger',
      phoneVerified: true,
      passwordHash: pwCheck.passwordHash,
      passwordSetAt: new Date(),
    },
  });

  await consumeVerifiedOtp(phone);

  const authUser = toAuthUser(user);
  await assignUserRole(user.id, 'passenger');
  const tokens = await issueAuthBundle(user.id, user.role);
  return { ok: true as const, user: authUser, ...tokens };
}

export async function registerOwner(
  phone: string,
  firstName: string,
  lastName: string,
  dui: string,
  password: string,
  email?: string,
  documentType?: 'DUI' | 'LICENSE'
) {
  const otpCheck = await assertPhoneVerifiedForRegistration(phone);
  if (!otpCheck.ok) return otpCheck;

  const pwCheck = await resolveRegistrationPassword(password);
  if (!pwCheck.ok) return pwCheck;

  const phoneNumber = normalizePhone(phone);
  const existing = await prisma.user.findUnique({ where: { phoneNumber } });
  if (existing) return { ok: false as const, error: 'Este teléfono ya está registrado.' };

  const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();

  const user = await prisma.user.create({
    data: {
      fullName,
      phoneNumber,
      email: email?.trim() || null,
      duiNumber: normalizeDui(dui),
      role: 'owner',
      phoneVerified: true,
      passwordHash: pwCheck.passwordHash,
      passwordSetAt: new Date(),
      owner: {
        create: {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          name: fullName,
          phone: phoneNumber,
          email: email?.trim() || null,
          dui: normalizeDui(dui),
          documentType: documentType ?? 'DUI',
        },
      },
    },
    include: { owner: true },
  });

  await consumeVerifiedOtp(phone);

  const authUser = toAuthUser(user);
  await assignUserRole(user.id, 'owner');
  const tokens = await issueAuthBundle(user.id, user.role);
  return {
    ok: true as const,
    user: authUser,
    owner: {
      ...user.owner!,
      documents: parseJsonField(user.owner!.documentsJson, {}),
      createdAt: user.owner!.createdAt.toISOString(),
    },
    ...tokens,
  };
}

export async function registerBusiness(
  phone: string,
  fullName: string,
  dui: string,
  password: string,
  data: {
    businessName: string;
    businessType: string;
    businessPhone: string;
    nit?: string;
    latitude: number;
    longitude: number;
    addressLabel: string;
  }
) {
  const otpCheck = await assertPhoneVerifiedForRegistration(phone);
  if (!otpCheck.ok) return otpCheck;

  const pwCheck = await resolveRegistrationPassword(password);
  if (!pwCheck.ok) return pwCheck;

  const phoneNumber = normalizePhone(phone);
  const existing = await prisma.user.findUnique({ where: { phoneNumber } });
  if (existing) return { ok: false as const, error: 'Este teléfono ya está registrado.' };

  const user = await prisma.user.create({
    data: {
      fullName,
      phoneNumber,
      duiNumber: normalizeDui(dui),
      role: 'business',
      phoneVerified: true,
      passwordHash: pwCheck.passwordHash,
      passwordSetAt: new Date(),
      business: {
        create: {
          businessName: data.businessName,
          businessType: data.businessType as never,
          responsibleDui: normalizeDui(dui),
          businessPhone: normalizePhone(data.businessPhone),
          nit: data.nit,
          latitude: data.latitude,
          longitude: data.longitude,
          addressLabel: data.addressLabel,
          status: 'approved',
        },
      },
    },
    include: { business: true },
  });

  await consumeVerifiedOtp(phone);

  const authUser = toAuthUser(user);
  await assignUserRole(user.id, 'business');
  const tokens = await issueAuthBundle(user.id, user.role);
  const business = user.business!;
  return {
    ok: true as const,
    user: authUser,
    business: {
      id: business.id,
      userId: business.userId,
      businessName: business.businessName,
      businessType: business.businessType,
      responsibleDui: business.responsibleDui,
      businessPhone: business.businessPhone,
      nit: business.nit ?? undefined,
      coordinates: { latitude: business.latitude, longitude: business.longitude },
      addressLabel: business.addressLabel,
      status: business.status,
      rating: business.rating,
      totalDeliveries: business.totalDeliveries,
      createdAt: business.createdAt.toISOString(),
    },
    ...tokens,
  };
}

export async function checkPlate(plate: string) {
  const normalized = plate.toUpperCase().trim();
  const existing = await prisma.vehicle.findFirst({
    where: {
      plateNumber: normalized,
      status: { not: 'deleted' },
      deletedAt: null,
    },
  });
  if (existing) {
    return {
      ok: true as const,
      data: {
        available: false,
        message: 'Esta unidad ya está registrada por otro dueño.',
        existingOwnerId: existing.ownerId,
      },
    };
  }
  return { ok: true as const, data: { available: true } };
}

export async function registerVehicle(
  ownerId: string,
  data: {
    unitNumber: string;
    plateNumber: string;
    associationName: string;
    vehicleType?: string;
    registrationName?: string;
    maxLoadKg?: number;
    bedLengthM?: number;
    hasCargoCover?: boolean;
    brand?: string;
    model?: string;
    year?: number;
    color?: string;
  }
) {
  const plateCheck = await checkPlate(data.plateNumber);
  if (!plateCheck.data?.available) {
    return { ok: false as const, error: plateCheck.data?.message ?? 'Placa no disponible' };
  }

  const owner = await prisma.owner.findUnique({ where: { id: ownerId } });
  if (!owner) return { ok: false as const, error: 'Dueño no encontrado' };

  const count = await prisma.vehicle.count();
  const unitId = generateUnitId(count);

  const vehicle = await prisma.vehicle.create({
    data: {
      unitId,
      ownerId,
      unitNumber: data.unitNumber,
      plateNumber: data.plateNumber.toUpperCase(),
      registrationName: data.registrationName,
      associationName: data.associationName,
      vehicleType: (data.vehicleType ?? 'mototaxi') as never,
      maxLoadKg: data.maxLoadKg,
      bedLengthM: data.bedLengthM,
      hasCargoCover: data.hasCargoCover,
      brand: data.brand?.trim() || null,
      model: data.model?.trim() || null,
      year: data.year ?? null,
      color: data.color?.trim() || null,
    },
  });

  return {
    ok: true as const,
    vehicle: {
      vehicleId: vehicle.id,
      unitId: vehicle.unitId,
      ownerId: vehicle.ownerId,
      unitNumber: vehicle.unitNumber,
      plateNumber: vehicle.plateNumber,
      registrationName: vehicle.registrationName ?? undefined,
      associationName: vehicle.associationName,
      vehicleType: vehicle.vehicleType,
      status: vehicle.status,
      documents: parseJsonField(vehicle.documentsJson, {}),
      maxLoadKg: vehicle.maxLoadKg ?? undefined,
      bedLengthM: vehicle.bedLengthM ?? undefined,
      hasCargoCover: vehicle.hasCargoCover ?? undefined,
      brand: vehicle.brand ?? undefined,
      model: vehicle.model ?? undefined,
      year: vehicle.year ?? undefined,
      color: vehicle.color ?? undefined,
      createdAt: vehicle.createdAt.toISOString(),
    },
  };
}

export async function inviteDriver(
  vehicleId: string,
  requestingOwnerId?: string,
  actorUserId?: string
) {
  if (!requestingOwnerId) {
    return { ok: false as const, error: 'Dueño no autenticado.' };
  }
  const result = await createVehicleInvite(
    vehicleId,
    requestingOwnerId,
    actorUserId ?? requestingOwnerId
  );
  if (!result.ok) return result;
  return { ok: true as const, invite: result.invite };
}

export async function validateDriverInviteCode(code: string) {
  const check = await validateVehicleInvite(code);
  if (!check.ok) return check;
  return { ok: true as const, preview: buildInvitePreview(check) };
}

export async function registerDriverWithInvite(input: {
  phone: string;
  firstName: string;
  lastName: string;
  email?: string;
  birthDate?: string;
  code: string;
  licenseFront?: string;
  licenseBack?: string;
  password: string;
}) {
  const otpCheck = await assertPhoneVerifiedForRegistration(input.phone);
  if (!otpCheck.ok) return otpCheck;

  const pwCheck = await resolveRegistrationPassword(input.password);
  if (!pwCheck.ok) return pwCheck;

  if (!input.licenseFront || !input.licenseBack) {
    return { ok: false as const, error: 'Licencia de conducir (frontal y trasera) es obligatoria.' };
  }

  const inviteCheck = await validateVehicleInvite(input.code);
  if (!inviteCheck.ok) return inviteCheck;

  const phoneNumber = normalizePhone(input.phone);
  const existing = await prisma.user.findUnique({ where: { phoneNumber } });
  if (existing) return { ok: false as const, error: 'Este teléfono ya está registrado.' };

  const invite = inviteCheck.invite;
  const fullName = `${input.firstName.trim()} ${input.lastName.trim()}`.trim();
  const birthDate = input.birthDate ? new Date(input.birthDate) : null;

  const driverCount = await prisma.driver.count();
  const driverPublicId = generateDriverPublicId(driverCount);

  const user = await prisma.user.create({
    data: {
      fullName,
      phoneNumber,
      email: input.email?.trim() || null,
      role: 'driver',
      phoneVerified: true,
      passwordHash: pwCheck.passwordHash,
      passwordSetAt: new Date(),
      driver: {
        create: {
          id: driverPublicId,
          ownerId: invite.ownerId,
          vehicleId: invite.vehicleId,
          firstName: input.firstName.trim(),
          lastName: input.lastName.trim(),
          name: fullName,
          phone: phoneNumber,
          email: input.email?.trim() || null,
          birthDate,
          status: 'pending',
          source: 'INVITE',
          vehicleInviteId: invite.id,
          inviteCodeUsed: invite.inviteCode,
        },
      },
    },
    include: { driver: true },
  });

  await prisma.verificationDocument.createMany({
    data: [
      {
        driverId: user.driver!.id,
        userId: user.id,
        documentType: 'license_front',
        fileUrl: input.licenseFront,
        status: 'pending',
      },
      {
        driverId: user.driver!.id,
        userId: user.id,
        documentType: 'license_back',
        fileUrl: input.licenseBack,
        status: 'pending',
      },
    ],
  });

  await createDriverSubscription(user.driver!.id);
  await prisma.vehicleAssignment.create({
    data: {
      driverId: user.driver!.id,
      vehicleId: invite.vehicleId,
      inviteId: invite.id,
      isActive: true,
    },
  });
  await markInviteUsed(invite.id, user.driver!.id);

  const authUser = toAuthUser(user);
  await assignUserRole(user.id, 'driver');
  const tokens = await issueAuthBundle(user.id, user.role);
  const driver = user.driver!;

  await consumeVerifiedOtp(input.phone);

  return {
    ok: true as const,
    user: authUser,
    driver: enrichDriverRecord({
      id: driver.id,
      userId: driver.userId,
      ownerId: driver.ownerId,
      vehicleId: driver.vehicleId,
      firstName: driver.firstName,
      lastName: driver.lastName,
      name: driver.name,
      phone: driver.phone,
      email: driver.email ?? undefined,
      status: driver.status,
      source: driver.source,
      inviteCodeUsed: driver.inviteCodeUsed ?? undefined,
      rating: driver.rating,
      totalTrips: driver.totalTrips,
      createdAt: driver.createdAt.toISOString(),
    }),
    ...tokens,
  };
}

/** Owner opera su propio vehículo aprobado (misma persona = dueño + conductor). */
export async function selfAssignOwnerAsDriver(
  userId: string,
  vehicleId: string,
  license?: { licenseFront: string; licenseBack: string }
) {
  const owner = await prisma.owner.findUnique({ where: { userId } });
  if (!owner) return { ok: false as const, error: 'Perfil de dueño no encontrado.' };
  if (owner.status !== 'approved') {
    return { ok: false as const, error: 'El dueño debe estar aprobado.' };
  }

  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, ownerId: owner.id, deletedAt: null },
  });
  if (!vehicle) return { ok: false as const, error: 'Vehículo no encontrado.' };
  if (vehicle.status !== 'approved') {
    return { ok: false as const, error: 'La unidad debe estar aprobada.' };
  }

  const driverOnVehicle = await prisma.driver.findFirst({
    where: { vehicleId, status: { in: ['approved', 'pending'] }, deletedAt: null },
  });
  const existingDriver = await prisma.driver.findUnique({ where: { userId } });

  if (driverOnVehicle && driverOnVehicle.userId !== userId) {
    return { ok: false as const, error: 'Esta unidad ya tiene conductor asignado.' };
  }

  if (!license?.licenseFront || !license?.licenseBack) {
    return { ok: false as const, error: 'Licencia de conducir (frontal y trasera) es obligatoria.' };
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { ok: false as const, error: 'Usuario no encontrado.' };

  if (existingDriver) {
    if (existingDriver.vehicleId !== vehicleId) {
      return { ok: false as const, error: 'Ya tienes perfil de conductor en otra unidad.' };
    }
    if (existingDriver.status === 'approved') {
      const licenseUrls = await getDriverLicenseUrls(existingDriver.id);
      return {
        ok: true as const,
        alreadyRegistered: true,
        message: 'Perfil de conductor ya aprobado.',
        driver: enrichDriverRecord({
          id: existingDriver.id,
          userId: existingDriver.userId,
          ownerId: existingDriver.ownerId,
          vehicleId: existingDriver.vehicleId,
          firstName: existingDriver.firstName,
          lastName: existingDriver.lastName,
          name: existingDriver.name,
          phone: existingDriver.phone,
          email: existingDriver.email ?? undefined,
          status: existingDriver.status,
          source: existingDriver.source,
          inviteCodeUsed: existingDriver.inviteCodeUsed ?? undefined,
          rating: existingDriver.rating,
          totalTrips: existingDriver.totalTrips,
          createdAt: existingDriver.createdAt.toISOString(),
          ...licenseUrls,
        }),
      };
    }

    await upsertDriverLicenseDocuments(existingDriver.id, userId, license);
    const updated = await prisma.driver.update({
      where: { id: existingDriver.id },
      data: { status: 'pending' },
    });

    const existingSub = await prisma.driverSubscription.findUnique({
      where: { driverId: existingDriver.id },
    });
    if (!existingSub) {
      await createDriverSubscription(existingDriver.id);
    }

    const activeAssignment = await prisma.vehicleAssignment.findFirst({
      where: { driverId: existingDriver.id, vehicleId, isActive: true },
    });
    if (!activeAssignment) {
      await prisma.vehicleAssignment.create({
        data: { driverId: existingDriver.id, vehicleId, isActive: true, notes: 'SELF_OWNER' },
      });
    }

    await assignUserRole(userId, 'driver');

    const licenseUrls = await getDriverLicenseUrls(updated.id);
    return {
      ok: true as const,
      message: 'Licencia actualizada. Pendiente de aprobación.',
      driver: enrichDriverRecord({
        id: updated.id,
        userId: updated.userId,
        ownerId: updated.ownerId,
        vehicleId: updated.vehicleId,
        firstName: updated.firstName,
        lastName: updated.lastName,
        name: updated.name,
        phone: updated.phone,
        email: updated.email ?? undefined,
        status: updated.status,
        source: updated.source,
        inviteCodeUsed: updated.inviteCodeUsed ?? undefined,
        rating: updated.rating,
        totalTrips: updated.totalTrips,
        createdAt: updated.createdAt.toISOString(),
        ...licenseUrls,
      }),
    };
  }

  const driverCount = await prisma.driver.count();
  const driverPublicId = generateDriverPublicId(driverCount);

  const driver = await prisma.driver.create({
    data: {
      id: driverPublicId,
      userId,
      ownerId: owner.id,
      vehicleId,
      firstName: owner.firstName || owner.name.split(' ')[0],
      lastName: owner.lastName || owner.name.split(' ').slice(1).join(' '),
      name: user.fullName,
      phone: user.phoneNumber,
      email: owner.email ?? user.email,
      status: 'pending',
      source: 'SELF_OWNER',
      inviteCodeUsed: 'SELF_OWNER',
    },
  });

  await upsertDriverLicenseDocuments(driver.id, userId, license);

  await createDriverSubscription(driver.id);
  await prisma.vehicleAssignment.create({
    data: { driverId: driver.id, vehicleId, isActive: true, notes: 'SELF_OWNER' },
  });
  await assignUserRole(userId, 'driver');

  const licenseUrls = await getDriverLicenseUrls(driver.id);
  return {
    ok: true as const,
    message: 'Perfil de conductor creado. Pendiente de aprobación.',
    driver: enrichDriverRecord({
      id: driver.id,
      userId: driver.userId,
      ownerId: driver.ownerId,
      vehicleId: driver.vehicleId,
      firstName: driver.firstName,
      lastName: driver.lastName,
      name: driver.name,
      phone: driver.phone,
      email: driver.email ?? undefined,
      status: driver.status,
      source: driver.source,
      inviteCodeUsed: driver.inviteCodeUsed ?? undefined,
      rating: driver.rating,
      totalTrips: driver.totalTrips,
      createdAt: driver.createdAt.toISOString(),
      ...licenseUrls,
    }),
  };
}

export async function uploadOwnerDocuments(ownerId: string, docs: Record<string, unknown>) {
  const owner = await prisma.owner.findUnique({ where: { id: ownerId } });
  if (!owner) return { ok: false as const, error: 'Dueño no encontrado' };

  const merged = { ...parseJsonField(owner.documentsJson, {}), ...docs };
  const updated = await prisma.owner.update({
    where: { id: ownerId },
    data: {
      documentsJson: stringifyJsonField(merged),
      status: docs.selfie ? 'under_review' : 'documents_uploaded',
    },
  });

  return {
    ok: true as const,
    owner: {
      ...updated,
      documents: merged,
      createdAt: updated.createdAt.toISOString(),
    },
  };
}

export async function submitOwnerVerification(
  ownerId: string,
  specialCase?: string,
  ownershipProofImage?: string
) {
  const updated = await prisma.owner.update({
    where: { id: ownerId },
    data: { status: 'under_review', specialCase, ownershipProofImage },
  }).catch(() => null);

  if (!updated) return { ok: false as const, error: 'Dueño no encontrado' };
  return {
    ok: true as const,
    owner: {
      ...updated,
      documents: parseJsonField(updated.documentsJson, {}),
      createdAt: updated.createdAt.toISOString(),
    },
  };
}

export async function uploadVehicleDocuments(
  vehicleId: string,
  docs: Record<string, unknown> & { registrationName?: string },
  requestingOwnerId?: string
) {
  const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
  if (!vehicle) return { ok: false as const, error: 'Vehículo no encontrado' };
  if (requestingOwnerId && vehicle.ownerId !== requestingOwnerId) {
    return { ok: false as const, error: 'No autorizado para esta unidad.' };
  }

  const merged = { ...parseJsonField(vehicle.documentsJson, {}), ...docs };
  const registrationCardUrl = pickRegistrationCardUrl(merged, vehicle.registrationCard);
  const updateData: {
    documentsJson: string;
    registrationName?: string | null;
    registrationCard?: string | null;
    status?: 'documents_uploaded';
  } = {
    documentsJson: stringifyJsonField(merged),
    registrationName: (docs.registrationName as string | undefined) ?? vehicle.registrationName,
    registrationCard: registrationCardUrl ?? vehicle.registrationCard,
  };
  if (vehicle.status !== 'approved') {
    updateData.status = 'documents_uploaded';
  }

  const updated = await prisma.vehicle.update({
    where: { id: vehicleId },
    data: updateData,
  });

  return {
    ok: true as const,
    vehicle: {
      vehicleId: updated.id,
      unitId: updated.unitId,
      ownerId: updated.ownerId,
      unitNumber: updated.unitNumber,
      plateNumber: updated.plateNumber,
      registrationName: updated.registrationName ?? undefined,
      associationName: updated.associationName,
      vehicleType: updated.vehicleType,
      status: updated.status,
      documents: merged,
      createdAt: updated.createdAt.toISOString(),
    },
  };
}

export async function submitVehicleVerification(vehicleId: string, requestingOwnerId?: string) {
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
    include: { owner: true },
  });
  if (!vehicle) return { ok: false as const, error: 'Vehículo no encontrado' };
  if (requestingOwnerId && vehicle.ownerId !== requestingOwnerId) {
    return { ok: false as const, error: 'No autorizado para esta unidad.' };
  }

  if (vehicle.status === 'approved') {
    const docs = parseJsonField<Record<string, unknown>>(vehicle.documentsJson, {});
    return {
      ok: true as const,
      alreadyApproved: true,
      message: 'Vehículo ya aprobado',
      vehicle: {
        vehicleId: vehicle.id,
        unitId: vehicle.unitId,
        ownerId: vehicle.ownerId,
        unitNumber: vehicle.unitNumber,
        plateNumber: vehicle.plateNumber,
        registrationName: vehicle.registrationName ?? undefined,
        associationName: vehicle.associationName,
        vehicleType: vehicle.vehicleType,
        status: vehicle.status,
        documents: docs,
        createdAt: vehicle.createdAt.toISOString(),
      },
    };
  }

  const docs = parseJsonField<Record<string, unknown>>(vehicle.documentsJson, {});
  const missingCritical: string[] = [];
  if (!hasRegistrationCardDocument(docs, vehicle.registrationCard)) {
    missingCritical.push('tarjeta de circulación');
  }

  if (missingCritical.length > 0) {
    await prisma.vehicle.update({
      where: { id: vehicleId },
      data: {
        status: 'incomplete',
        rejectReason: `Faltan documentos: ${missingCritical.join(', ')}`,
        autoRejected: false,
      },
    });
    return {
      ok: false as const,
      error: `Completa los documentos obligatorios (${missingCritical.join(', ')}) antes de enviar a revisión.`,
    };
  }

  const regName = vehicle.registrationName ?? '';
  if (regName && !namesMatch(vehicle.owner.name, regName)) {
    await prisma.vehicle.update({
      where: { id: vehicleId },
      data: {
        status: 'incomplete',
        rejectReason:
          'El nombre en la tarjeta de circulación no coincide con el DUI del dueño. Revisa los datos o contacta soporte.',
        autoRejected: false,
      },
    });
    return {
      ok: false as const,
      error:
        'El nombre en tarjeta de circulación no coincide con el registrado. Corrige los datos y vuelve a enviar.',
    };
  }

  const registrationCardUrl = pickRegistrationCardUrl(docs, vehicle.registrationCard);
  const updated = await prisma.vehicle.update({
    where: { id: vehicleId },
    data: {
      status: 'under_review',
      rejectReason: null,
      autoRejected: false,
      ...(registrationCardUrl ? { registrationCard: registrationCardUrl } : {}),
    },
  });

  return {
    ok: true as const,
    vehicle: {
      vehicleId: updated.id,
      unitId: updated.unitId,
      ownerId: updated.ownerId,
      unitNumber: updated.unitNumber,
      plateNumber: updated.plateNumber,
      registrationName: updated.registrationName ?? undefined,
      associationName: updated.associationName,
      vehicleType: updated.vehicleType,
      status: updated.status,
      documents: parseJsonField(updated.documentsJson, {}),
      createdAt: updated.createdAt.toISOString(),
    },
  };
}

export async function startDriverSession(
  driverId: string,
  vehicleId: string,
  location?: { latitude: number; longitude: number }
) {
  const driver = await prisma.driver.findUnique({ where: { id: driverId } });
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
    include: { owner: true },
  });

  if (!driver || driver.status !== 'approved') {
    return { ok: false as const, error: 'Conductor no aprobado.' };
  }
  if (driver.vehicleId !== vehicleId) {
    return { ok: false as const, error: 'Vehículo no asignado a este conductor.' };
  }
  if (!vehicle || vehicle.status !== 'approved') {
    return { ok: false as const, error: 'Unidad no aprobada.' };
  }
  if (!vehicle.owner || vehicle.owner.status !== 'approved') {
    return { ok: false as const, error: 'Dueño no aprobado.' };
  }
  if (!driver.inviteCodeUsed) {
    return { ok: false as const, error: 'Conductor no invitado.' };
  }

  const subCheck = await canDriverOperate(driverId);
  if (!subCheck.ok) {
    return { ok: false as const, error: subCheck.reason ?? 'Suscripción vencida.' };
  }

  const active = await prisma.driverSession.findFirst({
    where: { driverId, disconnectedAt: null },
  });
  if (active) {
    if (location && Number.isFinite(location.latitude) && Number.isFinite(location.longitude)) {
      await recordDriverLocation(driverId, driver.userId, location.latitude, location.longitude);
    }
    return {
      ok: true as const,
      session: {
        sessionId: active.sessionId,
        driverId: active.driverId,
        vehicleId: active.vehicleId,
        connectedAt: active.connectedAt.toISOString(),
        disconnectedAt: active.disconnectedAt?.toISOString() ?? null,
        durationMinutes: active.durationMinutes,
        totalTrips: active.totalTrips,
        totalKm: active.totalKm,
        totalCashCollected: active.totalCashCollected,
      },
    };
  }

  const session = await prisma.driverSession.create({
    data: { driverId, vehicleId },
  });

  if (location && Number.isFinite(location.latitude) && Number.isFinite(location.longitude)) {
    await recordDriverLocation(driverId, driver.userId, location.latitude, location.longitude);
  }

  return {
    ok: true as const,
    session: {
      sessionId: session.sessionId,
      driverId: session.driverId,
      vehicleId: session.vehicleId,
      connectedAt: session.connectedAt.toISOString(),
      disconnectedAt: null,
      durationMinutes: null,
      totalTrips: session.totalTrips,
      totalKm: session.totalKm,
      totalCashCollected: session.totalCashCollected,
    },
  };
}

export async function endDriverSession(
  driverId: string,
  stats?: { totalTrips?: number; totalKm?: number; totalCashCollected?: number }
) {
  const active = await prisma.driverSession.findFirst({
    where: { driverId, disconnectedAt: null },
    orderBy: { connectedAt: 'desc' },
  });
  if (!active) return { ok: false as const, error: 'No hay sesión activa.' };

  const disconnectedAt = new Date();
  const durationMinutes = Math.round(
    (disconnectedAt.getTime() - active.connectedAt.getTime()) / 60000
  );

  const updated = await prisma.driverSession.update({
    where: { sessionId: active.sessionId },
    data: {
      disconnectedAt,
      durationMinutes,
      totalTrips: stats?.totalTrips ?? active.totalTrips,
      totalKm: stats?.totalKm ?? active.totalKm,
      totalCashCollected: stats?.totalCashCollected ?? active.totalCashCollected,
    },
  });

  return {
    ok: true as const,
    session: {
      sessionId: updated.sessionId,
      driverId: updated.driverId,
      vehicleId: updated.vehicleId,
      connectedAt: updated.connectedAt.toISOString(),
      disconnectedAt: updated.disconnectedAt?.toISOString() ?? null,
      durationMinutes: updated.durationMinutes,
      totalTrips: updated.totalTrips,
      totalKm: updated.totalKm,
      totalCashCollected: updated.totalCashCollected,
    },
  };
}

export async function setAdminApproval(
  entity: 'owner' | 'vehicle' | 'driver',
  id: string,
  action: 'approve' | 'reject'
) {
  const status = action === 'approve' ? 'approved' : 'rejected';

  if (entity === 'owner') {
    const updated = await prisma.owner.update({ where: { id }, data: { status } }).catch(() => null);
    if (!updated) return { ok: false as const, error: 'Dueño no encontrado' };
    return {
      ok: true as const,
      data: { ...updated, documents: parseJsonField(updated.documentsJson, {}), createdAt: updated.createdAt.toISOString() },
    };
  }

  if (entity === 'vehicle') {
    const updated = await prisma.vehicle.update({ where: { id }, data: { status } }).catch(() => null);
    if (!updated) return { ok: false as const, error: 'Vehículo no encontrado' };
    return {
      ok: true as const,
      data: {
        vehicleId: updated.id,
        unitId: updated.unitId,
        ownerId: updated.ownerId,
        unitNumber: updated.unitNumber,
        plateNumber: updated.plateNumber,
        registrationName: updated.registrationName ?? undefined,
        associationName: updated.associationName,
        vehicleType: updated.vehicleType,
        status: updated.status,
        documents: parseJsonField(updated.documentsJson, {}),
        createdAt: updated.createdAt.toISOString(),
      },
    };
  }

  const updated = await prisma.driver.update({ where: { id }, data: { status } }).catch(() => null);
  if (!updated) return { ok: false as const, error: 'Conductor no encontrado' };
  return {
    ok: true as const,
    data: {
      id: updated.id,
      userId: updated.userId,
      ownerId: updated.ownerId,
      vehicleId: updated.vehicleId,
      name: updated.name,
      phone: updated.phone,
      status: updated.status,
      inviteCodeUsed: updated.inviteCodeUsed ?? undefined,
      rating: updated.rating,
      totalTrips: updated.totalTrips,
      createdAt: updated.createdAt.toISOString(),
    },
  };
}

export async function setAdminSuspension(
  entity: 'owner' | 'vehicle' | 'driver',
  id: string
) {
  if (entity === 'owner') {
    const updated = await prisma.owner.update({ where: { id }, data: { status: 'suspended' } }).catch(() => null);
    if (!updated) return { ok: false as const, error: 'Dueño no encontrado' };
    return {
      ok: true as const,
      data: { ...updated, documents: parseJsonField(updated.documentsJson, {}), createdAt: updated.createdAt.toISOString() },
    };
  }

  if (entity === 'vehicle') {
    const updated = await prisma.vehicle.update({ where: { id }, data: { status: 'suspended' } }).catch(() => null);
    if (!updated) return { ok: false as const, error: 'Vehículo no encontrado' };
    return {
      ok: true as const,
      data: {
        vehicleId: updated.id,
        unitId: updated.unitId,
        ownerId: updated.ownerId,
        unitNumber: updated.unitNumber,
        plateNumber: updated.plateNumber,
        registrationName: updated.registrationName ?? undefined,
        associationName: updated.associationName,
        vehicleType: updated.vehicleType,
        status: updated.status,
        documents: parseJsonField(updated.documentsJson, {}),
        createdAt: updated.createdAt.toISOString(),
      },
    };
  }

  const updated = await prisma.driver.update({ where: { id }, data: { status: 'suspended' } }).catch(() => null);
  if (!updated) return { ok: false as const, error: 'Conductor no encontrado' };

  const active = await prisma.driverSession.findFirst({
    where: { driverId: id, disconnectedAt: null },
  });
  if (active) {
    await prisma.driverSession.update({
      where: { sessionId: active.sessionId },
      data: { disconnectedAt: new Date() },
    });
  }

  return {
    ok: true as const,
    data: {
      id: updated.id,
      userId: updated.userId,
      ownerId: updated.ownerId,
      vehicleId: updated.vehicleId,
      name: updated.name,
      phone: updated.phone,
      status: updated.status,
      inviteCodeUsed: updated.inviteCodeUsed ?? undefined,
      rating: updated.rating,
      totalTrips: updated.totalTrips,
      createdAt: updated.createdAt.toISOString(),
    },
  };
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { owner: true, driver: true, business: true },
  });
  if (!user) return null;
  const base = toAuthUser(user);
  if (user.role === 'admin') {
    const { getAdminStaffRole } = await import('./admin-staff.service');
    return { ...base, staffRole: await getAdminStaffRole(userId) };
  }
  return base;
}

export async function updateUserProfilePhoto(userId: string, profilePhoto: string) {
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { profilePhoto },
  });
  return toAuthUser(updated);
}

export async function getInvitePreview(code: string) {
  const check = await validateVehicleInvite(code);
  if (!check.ok) return null;
  return buildInvitePreview(check);
}

export async function getDriverSessionsList(driverId: string) {
  const sessions = await prisma.driverSession.findMany({
    where: { driverId },
    orderBy: { connectedAt: 'desc' },
  });

  return sessions.map((session: DriverSession) => ({
    sessionId: session.sessionId,
    driverId: session.driverId,
    vehicleId: session.vehicleId,
    connectedAt: session.connectedAt.toISOString(),
    disconnectedAt: session.disconnectedAt?.toISOString() ?? null,
    durationMinutes: session.durationMinutes,
    totalTrips: session.totalTrips,
    totalKm: session.totalKm,
    totalCashCollected: session.totalCashCollected,
  }));
}

export function getDemandZonesSeed() {
  return [
    {
      id: 'zone-1',
      latitude: 13.6929,
      longitude: -89.2182,
      intensity: 'high' as const,
      label: 'Centro San Salvador',
      serviceCategory: 'viaje' as const,
      vehicleType: 'mototaxi' as const,
    },
    {
      id: 'zone-2',
      latitude: 13.701,
      longitude: -89.224,
      intensity: 'medium' as const,
      label: 'Colonia Escalón',
      serviceCategory: 'entrega' as const,
    },
    {
      id: 'zone-3',
      latitude: 13.68,
      longitude: -89.21,
      intensity: 'low' as const,
      label: 'Mercado Central',
      serviceCategory: 'carga' as const,
      vehicleType: 'pickup' as const,
    },
  ];
}

export type { UserRole };
