import type { VerificationDocumentType } from '@prisma/client';
import { prisma } from '../lib/prisma';

const LICENSE_TYPES: VerificationDocumentType[] = ['license_front', 'license_back'];

export async function getDriverLicenseUrls(driverId: string) {
  const docs = await prisma.verificationDocument.findMany({
    where: { driverId, documentType: { in: LICENSE_TYPES } },
    orderBy: { uploadedAt: 'desc' },
  });
  const front = docs.find((d) => d.documentType === 'license_front');
  const back = docs.find((d) => d.documentType === 'license_back');
  return {
    licenseFront: front?.fileUrl ?? undefined,
    licenseBack: back?.fileUrl ?? undefined,
  };
}

export async function upsertDriverLicenseDocuments(
  driverId: string,
  userId: string,
  license: { licenseFront: string; licenseBack: string }
) {
  await prisma.verificationDocument.deleteMany({
    where: { driverId, documentType: { in: LICENSE_TYPES } },
  });
  await prisma.verificationDocument.createMany({
    data: [
      {
        driverId,
        userId,
        documentType: 'license_front',
        fileUrl: license.licenseFront,
        status: 'pending',
      },
      {
        driverId,
        userId,
        documentType: 'license_back',
        fileUrl: license.licenseBack,
        status: 'pending',
      },
    ],
  });
}
