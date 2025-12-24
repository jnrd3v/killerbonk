import * as THREE from 'three';

/**
 * Utilitários matemáticos
 */

/**
 * Distância entre dois Vector3 (apenas XZ)
 */
export function distanceXZ(a: THREE.Vector3, b: THREE.Vector3): number {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dz * dz);
}

/**
 * Distância 3D entre dois pontos
 */
export function distance3D(a: THREE.Vector3, b: THREE.Vector3): number {
  return a.distanceTo(b);
}

/**
 * Verifica se um ponto está dentro de um cone
 * @param origin Origem do cone
 * @param direction Direção do cone (normalizada)
 * @param target Ponto a verificar
 * @param angle Ângulo do cone em radianos (metade do cone total)
 * @param range Alcance máximo do cone
 */
export function isInCone(
  origin: THREE.Vector3,
  direction: THREE.Vector3,
  target: THREE.Vector3,
  angle: number,
  range: number
): boolean {
  const toTarget = new THREE.Vector3().subVectors(target, origin);
  const dist = toTarget.length();
  
  if (dist > range) return false;
  if (dist < 0.01) return true;
  
  toTarget.normalize();
  const dot = direction.dot(toTarget);
  const coneAngleCos = Math.cos(angle);
  
  return dot >= coneAngleCos;
}

/**
 * Gera um ponto aleatório em um anel ao redor de um centro
 */
export function randomPointInRing(
  center: THREE.Vector3,
  minRadius: number,
  maxRadius: number,
  y: number = 0
): THREE.Vector3 {
  const angle = Math.random() * Math.PI * 2;
  const radius = minRadius + Math.random() * (maxRadius - minRadius);
  
  return new THREE.Vector3(
    center.x + Math.cos(angle) * radius,
    y,
    center.z + Math.sin(angle) * radius
  );
}

/**
 * Lerp suave
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Clamp um valor entre min e max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Retorna um número aleatório entre min e max
 */
export function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/**
 * Retorna um elemento aleatório de um array
 */
export function randomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Embaralha um array (Fisher-Yates)
 */
export function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

