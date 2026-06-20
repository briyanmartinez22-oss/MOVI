import type { VerificationDocumentType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { getStorageProvider, type StorageUploadResult } from './storageProvider';

export type DocumentOwnerRef = {
  userId?: string;
  ownerId?: string;
  driverId?: string;
  vehicleId?: string;
};

export type StoredDocumentRecord = {
  id: string;
  url: string;
  storageKey: string;
  mimeType: string;
  size: number;
  provider: StorageUploadResult['provider'];
  documentType: VerificationDocumentType;
  ownerId: string | null;
  createdAt: string;
};

export async function uploadAndStoreDocument(
  buffer: Buffer,
  filename: string,
  mimeType: string,
  documentType: VerificationDocumentType,
  owner: DocumentOwnerRef
): Promise<StoredDocumentRecord> {
  const storage = await getStorageProvider();
  const uploaded: StorageUploadResult = await storage.uploadFile(buffer, filename, mimeType);

  const doc = await prisma.verificationDocument.create({
    data: {
      userId: owner.userId,
      ownerId: owner.ownerId,
      driverId: owner.driverId,
      vehicleId: owner.vehicleId,
      documentType,
      fileUrl: uploaded.url,
      storageKey: uploaded.key,
      mimeType: uploaded.mimeType,
      sizeBytes: uploaded.size,
      metadataJson: JSON.stringify({
        provider: uploaded.provider,
        originalFilename: filename,
      }),
    },
  });

  return {
    id: doc.id,
    url: uploaded.url,
    storageKey: uploaded.key,
    mimeType: uploaded.mimeType,
    size: uploaded.size,
    provider: uploaded.provider,
    documentType,
    ownerId: owner.ownerId ?? owner.userId ?? owner.driverId ?? owner.vehicleId ?? null,
    createdAt: doc.uploadedAt.toISOString(),
  };
}

export function mapDocumentType(fieldName: string): VerificationDocumentType | null {
  const map: Record<string, VerificationDocumentType> = {
    duiFront: 'dui_front',
    duiBack: 'dui_back',
    dui_front: 'dui_front',
    dui_back: 'dui_back',
    licenseFront: 'license_front',
    licenseBack: 'license_back',
    license_front: 'license_front',
    license_back: 'license_back',
    license: 'license_front',
    profilePhoto: 'selfie',
    profile_photo: 'selfie',
    selfie: 'selfie',
    vehiclePhoto: 'other',
    vehicle_photo: 'other',
    vehicleRegistration: 'vehicle_registration',
    vehicle_registration: 'vehicle_registration',
    registrationCard: 'vehicle_registration',
    registrationCardImage: 'vehicle_registration',
    circulationCard: 'vehicle_registration',
    permitImage: 'other',
    insuranceImage: 'vehicle_insurance',
    platePhoto: 'other',
    unitPhoto: 'other',
    fullVehiclePhoto: 'other',
    ownershipProofImage: 'ownership_proof',
    servicePhoto: 'other',
  };
  return map[fieldName] ?? null;
}
