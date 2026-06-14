import { PrismaClient } from '@prisma/client';
import { normalizePhone } from '../src/utils/phone.js';

const prisma = new PrismaClient();

async function migratePhones(model: string, rows: { id: string; phone: string }[]) {
  for (const row of rows) {
    const canonical = normalizePhone(row.phone);
    if (!canonical || canonical === row.phone) continue;

    const conflict = await prisma.user.findUnique({ where: { phoneNumber: canonical } }).catch(() => null);
    if (conflict && model === 'User' && conflict.id !== row.id) {
      console.warn(`Skip User ${row.id}: ${row.phone} -> ${canonical} (conflict with ${conflict.id})`);
      continue;
    }

    console.log(`${model} ${row.id}: ${row.phone} -> ${canonical}`);
  }
}

async function main() {
  const users = await prisma.user.findMany({ select: { id: true, phoneNumber: true } });
  for (const user of users) {
    const canonical = normalizePhone(user.phoneNumber);
    if (!canonical || canonical === user.phoneNumber) continue;
    const conflict = await prisma.user.findUnique({ where: { phoneNumber: canonical } });
    if (conflict && conflict.id !== user.id) {
      console.warn(`Skip user ${user.id}: conflict at ${canonical}`);
      continue;
    }
    await prisma.user.update({ where: { id: user.id }, data: { phoneNumber: canonical } });
    console.log(`User ${user.id}: ${user.phoneNumber} -> ${canonical}`);
  }

  const owners = await prisma.owner.findMany({ select: { id: true, phone: true } });
  for (const owner of owners) {
    const canonical = normalizePhone(owner.phone);
    if (!canonical || canonical === owner.phone) continue;
    await prisma.owner.update({ where: { id: owner.id }, data: { phone: canonical } });
    console.log(`Owner ${owner.id}: ${owner.phone} -> ${canonical}`);
  }

  const drivers = await prisma.driver.findMany({ select: { id: true, phone: true } });
  for (const driver of drivers) {
    const canonical = normalizePhone(driver.phone);
    if (!canonical || canonical === driver.phone) continue;
    await prisma.driver.update({ where: { id: driver.id }, data: { phone: canonical } });
    console.log(`Driver ${driver.id}: ${driver.phone} -> ${canonical}`);
  }

  const businesses = await prisma.business.findMany({ select: { id: true, businessPhone: true } });
  for (const business of businesses) {
    const canonical = normalizePhone(business.businessPhone);
    if (!canonical || canonical === business.businessPhone) continue;
    await prisma.business.update({ where: { id: business.id }, data: { businessPhone: canonical } });
    console.log(`Business ${business.id}: ${business.businessPhone} -> ${canonical}`);
  }

  const otps = await prisma.otpChallenge.findMany({ select: { id: true, phoneNumber: true } });
  for (const otp of otps) {
    const canonical = normalizePhone(otp.phoneNumber);
    if (!canonical || canonical === otp.phoneNumber) continue;
    await prisma.otpChallenge.update({ where: { id: otp.id }, data: { phoneNumber: canonical } });
    console.log(`OtpChallenge ${otp.id}: ${otp.phoneNumber} -> ${canonical}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
