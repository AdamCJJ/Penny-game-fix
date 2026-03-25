import { SAVE_KEY, ITEM_COUNT } from './constants.js';

const DEFAULTS = { outfit: 0, wings: 0, crown: 0, background: 0 };

function normalizeValue(value, fallback) {
  if (!Number.isInteger(value)) return fallback;
  return ((value % ITEM_COUNT) + ITEM_COUNT) % ITEM_COUNT;
}

export class SaveManager {
  constructor() {
    this._state = { ...DEFAULTS };
    this._load();
  }

  _load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        this._state = Object.fromEntries(
          Object.entries(DEFAULTS).map(([key, fallback]) => [
            key,
            normalizeValue(parsed?.[key], fallback),
          ]),
        );
      }
    } catch {
      this._state = { ...DEFAULTS };
    }
  }

  _save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this._state));
    } catch { /* ignore */ }
  }

  get(key) {
    return this._state[key] ?? DEFAULTS[key] ?? 0;
  }

  set(key, value) {
    this._state[key] = value;
    this._save();
  }

  reset() {
    this._state = { ...DEFAULTS };
    this._save();
  }

  getAll() {
    return { ...this._state };
  }
}
