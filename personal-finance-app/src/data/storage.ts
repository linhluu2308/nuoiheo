// Temporary persistence in the browser. design.md requires shared online data with login;
// that backend replaces this module — the rest of the app only sees load/save.

import type { AppData } from '../lib/types'
import { seedData } from './seed'

const KEY = 'pfm-data-v1'

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as AppData
      if (parsed.version === 1) return parsed
    }
  } catch {
    // unreadable or blocked storage → start fresh
  }
  return seedData()
}

export function saveData(data: AppData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data))
  } catch {
    // storage full or blocked; the in-memory state still works for this session
  }
}
