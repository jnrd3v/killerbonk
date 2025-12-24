import * as THREE from 'three';

/**
 * Utilitários de raycasting
 */

const raycaster = new THREE.Raycaster();

/**
 * Realiza um raycast e retorna o primeiro hit
 */
export function raycast(
  origin: THREE.Vector3,
  direction: THREE.Vector3,
  objects: THREE.Object3D[],
  maxDistance: number = Infinity
): THREE.Intersection | null {
  raycaster.set(origin, direction.normalize());
  raycaster.far = maxDistance;
  
  const hits = raycaster.intersectObjects(objects, true);
  return hits.length > 0 ? hits[0] : null;
}

/**
 * Realiza um raycast em múltiplos objetos e retorna todos os hits
 */
export function raycastAll(
  origin: THREE.Vector3,
  direction: THREE.Vector3,
  objects: THREE.Object3D[],
  maxDistance: number = Infinity
): THREE.Intersection[] {
  raycaster.set(origin, direction.normalize());
  raycaster.far = maxDistance;
  
  return raycaster.intersectObjects(objects, true);
}

/**
 * Raycast para o chão (plano Y=0)
 */
export function raycastGround(
  origin: THREE.Vector3,
  direction: THREE.Vector3 = new THREE.Vector3(0, -1, 0)
): number | null {
  // Plano Y=0
  if (direction.y === 0) return null;
  
  const t = -origin.y / direction.y;
  if (t < 0) return null;
  
  return origin.y - t * direction.y;
}

/**
 * Verifica colisão esférica simples
 */
export function sphereCollision(
  pos1: THREE.Vector3,
  radius1: number,
  pos2: THREE.Vector3,
  radius2: number
): boolean {
  const dist = pos1.distanceTo(pos2);
  return dist < radius1 + radius2;
}

/**
 * Retorna a direção de knockback entre dois pontos
 */
export function getKnockbackDirection(
  from: THREE.Vector3,
  to: THREE.Vector3
): THREE.Vector3 {
  const dir = new THREE.Vector3().subVectors(to, from);
  dir.y = 0; // Manter horizontal
  dir.normalize();
  return dir;
}

