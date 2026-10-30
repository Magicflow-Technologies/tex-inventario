/**
 * Generador de UUIDv4 compatible con navegadores y Node.js
 * Cumple con el requisito de llaves primarias UUIDv4 para migración limpia a Supabase/PostgreSQL
 */

export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback RFC4122 v4
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Genera un código de rollo secuencial estándar (ej. ROL-2026-00019)
 */
export function generateCodigoRollo(existingRollCount: number): string {
  const year = new Date().getFullYear();
  const seq = String(existingRollCount + 1).padStart(5, '0');
  return `ROL-${year}-${seq}`;
}
