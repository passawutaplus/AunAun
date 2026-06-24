export function saltToRollSeed(salt: string): number {
  let h = 0;
  for (let i = 0; i < salt.length; i++) {
    h = Math.imul(31, h) + salt.charCodeAt(i);
  }
  return Math.abs(h);
}
