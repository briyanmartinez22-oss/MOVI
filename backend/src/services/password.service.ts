import bcrypt from 'bcryptjs';

const BCRYPT_ROUNDS = 12;

const PASSWORD_MIN_LENGTH = 8;

export function validatePasswordStrength(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return 'La contraseña debe tener al menos 8 caracteres.';
  }
  if (!/[a-zA-Z]/.test(password)) {
    return 'La contraseña debe incluir al menos una letra.';
  }
  if (!/\d/.test(password)) {
    return 'La contraseña debe incluir al menos un número.';
  }
  return null;
}

export function validatePasswordPair(password: string, confirmPassword: string): string | null {
  const strengthError = validatePasswordStrength(password);
  if (strengthError) return strengthError;
  if (password !== confirmPassword) {
    return 'Las contraseñas no coinciden.';
  }
  return null;
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
