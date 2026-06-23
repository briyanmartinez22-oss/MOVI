/** Reglas mínimas de contraseña MOVI — deben coincidir con el backend. */
export function validatePasswordStrength(password: string): string | null {
  if (password.length < 8) return 'La contraseña debe tener al menos 8 caracteres.';
  if (!/[a-zA-Z]/.test(password)) return 'La contraseña debe incluir al menos una letra.';
  if (!/\d/.test(password)) return 'La contraseña debe incluir al menos un número.';
  return null;
}

export function validatePasswordPair(password: string, confirmPassword: string): string | null {
  const strength = validatePasswordStrength(password);
  if (strength) return strength;
  if (password !== confirmPassword) return 'Las contraseñas no coinciden.';
  return null;
}
