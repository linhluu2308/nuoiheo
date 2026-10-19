// Ids are created in the browser (so a new row shows instantly) and must be UUIDs for the database.
// crypto.randomUUID only exists on secure origins; opening the dev server from a phone
// over the LAN (http://192.168.x.x) is not one, so fall back to a random v4 UUID.
export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}
