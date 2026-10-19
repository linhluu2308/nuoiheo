// crypto.randomUUID only exists on secure origins; opening the dev server from a phone
// over the LAN (http://192.168.x.x) is not one, so fall back to random hex.
export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return Array.from({ length: 4 }, () => Math.random().toString(16).slice(2, 10)).join('')
}
