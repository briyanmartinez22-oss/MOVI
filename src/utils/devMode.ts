/** MOVI Diagnostics / herramientas DX solo en desarrollo local. */
export function isDevDiagnosticsEnabled(): boolean {
  return __DEV__ === true && process.env.NODE_ENV === 'development';
}
