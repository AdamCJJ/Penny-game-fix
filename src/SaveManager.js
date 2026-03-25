import { SAVE_KEY, ITEM_COUNT } from './constants.js';

const DEFAULT_GARDEN = Array.from({ length: 3 }, () => ({ stage: 0, water: 0, flower: 0 }));
const DEFAULTS = { outfit: 0, wings: 0, crown: 0, background: 0, garden: DEFAULT_GARDEN };

function normalizeValue(value, fallback) {
  if (!Number.isInteger(value)) return fallback;
  return ((value % ITEM_COUNT) + ITEM_COUNT) % ITEM_COUNT;
}

function cloneGarden(garden) {
  return garden.map((plot) => ({
    stage: plot.stage,
    water: plot.water,
    flower: plot.flower,
  }));
}

function normalizeGarden(value) {
  if (!Array.isArray(value)) {
    return cloneGarden(DEFAULT_GARDEN);
  }

  return DEFAULT_GARDEN.map((fallback, index) => {
    const plot = value[index] ?? {};
    return {
      stage: Math.max(0, Math.min(4, Number.isInteger(plot.stage) ? plot.stage : fallback.stage)),
      water: Math.max(0, Math.min(2, Number.isInteger(plot.water) ? plot.water : fallback.water)),
      flower: normalizeValue(plot.flower, fallback.flower),
    };
  });
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
            key === 'garden'
              ? normalizeGarden(parsed?.[key])
              : normalizeValue(parsed?.[key], fallback),
          ]),
        );
      }
    } catch {
      this._state = { ...DEFAULTS, garden: cloneGarden(DEFAULT_GARDEN) };
    }
  }

  _save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this._state));
    } catch { /* ignore */ }
  }

  get(key) {
    if (key === 'garden') {
      return cloneGarden(this._state.garden ?? DEFAULT_GARDEN);
    }
    return this._state[key] ?? DEFAULTS[key] ?? 0;
  }

  set(key, value) {
    this._state[key] = key === 'garden' ? normalizeGarden(value) : value;
    this._save();
  }

  reset() {
    this._state = { ...DEFAULTS, garden: cloneGarden(DEFAULT_GARDEN) };
    this._save();
  }

  getAll() {
    return { ...this._state, garden: cloneGarden(this._state.garden ?? DEFAULT_GARDEN) };
  }
}
