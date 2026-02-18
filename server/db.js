import pg from "pg";

const { Pool } = pg;

let pool = null;

function getPool() {
  if (!pool) {
    if (process.env.DATABASE_URL) {
      pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_SSL !== "false" ? { rejectUnauthorized: false } : undefined,
      });
    }
  }
  return pool;
}

// Fallback in-memory storage when no DB is configured
const memoryStore = {
  estimates: [],
  nextId: 1,
};

export async function initDb() {
  const p = getPool();
  if (!p) {
    console.log("No DATABASE_URL set — using in-memory storage (data will not persist across restarts)");
    return;
  }

  try {
    await p.query(`
      CREATE TABLE IF NOT EXISTS estimates (
        id BIGSERIAL PRIMARY KEY,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        user_id TEXT,
        agent_label TEXT,
        job_type TEXT NOT NULL,
        dumpster_size INT,
        truck_size INT DEFAULT 15,
        vendor_claim TEXT,
        notes TEXT,
        photo_count INT NOT NULL DEFAULT 0,
        reference_object TEXT,
        result_json TEXT NOT NULL,
        confidence TEXT,
        low_cy NUMERIC(8,2),
        likely_cy NUMERIC(8,2),
        high_cy NUMERIC(8,2),
        actual_volume NUMERIC(8,2)
      );

      CREATE INDEX IF NOT EXISTS estimates_created_at_idx ON estimates (created_at DESC);
      CREATE INDEX IF NOT EXISTS estimates_job_type_idx ON estimates (job_type);
      CREATE INDEX IF NOT EXISTS estimates_agent_label_idx ON estimates (agent_label);
    `);
    console.log("Database initialized");
  } catch (err) {
    console.error("DB init error:", err.message);
    console.log("Falling back to in-memory storage");
    pool = null;
  }
}

export async function insertEstimate(row) {
  const p = getPool();
  if (!p) {
    const record = {
      id: memoryStore.nextId++,
      created_at: new Date().toISOString(),
      ...row,
    };
    memoryStore.estimates.unshift(record);
    return { id: record.id, created_at: record.created_at };
  }

  const q = `
    INSERT INTO estimates
      (user_id, agent_label, job_type, dumpster_size, truck_size, vendor_claim,
       notes, photo_count, reference_object, result_json, confidence, low_cy, likely_cy, high_cy)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
    RETURNING id, created_at
  `;
  const vals = [
    row.user_id, row.agent_label, row.job_type, row.dumpster_size, row.truck_size,
    row.vendor_claim, row.notes, row.photo_count, row.reference_object,
    row.result_json, row.confidence, row.low_cy, row.likely_cy, row.high_cy,
  ];
  const r = await p.query(q, vals);
  return r.rows[0];
}

export async function listEstimates(limit = 100) {
  const p = getPool();
  if (!p) {
    return memoryStore.estimates.slice(0, limit).map((e) => ({
      id: e.id,
      created_at: e.created_at,
      agent_label: e.agent_label,
      job_type: e.job_type,
      dumpster_size: e.dumpster_size,
      truck_size: e.truck_size,
      vendor_claim: e.vendor_claim,
      photo_count: e.photo_count,
      confidence: e.confidence,
      low_cy: e.low_cy,
      likely_cy: e.likely_cy,
      high_cy: e.high_cy,
      actual_volume: e.actual_volume,
      result_json: e.result_json,
    }));
  }

  const r = await p.query(
    `SELECT id, created_at, agent_label, job_type, dumpster_size, truck_size,
            vendor_claim, photo_count, confidence, low_cy, likely_cy, high_cy,
            actual_volume, result_json
     FROM estimates
     ORDER BY created_at DESC
     LIMIT $1`,
    [limit]
  );
  return r.rows;
}

export async function getEstimate(id) {
  const p = getPool();
  if (!p) {
    return memoryStore.estimates.find((e) => e.id === parseInt(id)) || null;
  }

  const r = await p.query(`SELECT * FROM estimates WHERE id = $1`, [id]);
  return r.rows[0] || null;
}

export async function updateEstimate(id, updates) {
  const p = getPool();
  if (!p) {
    const idx = memoryStore.estimates.findIndex((e) => e.id === parseInt(id));
    if (idx === -1) throw new Error("Not found");
    memoryStore.estimates[idx] = { ...memoryStore.estimates[idx], ...updates };
    return memoryStore.estimates[idx];
  }

  const sets = [];
  const vals = [];
  let i = 1;

  for (const [key, value] of Object.entries(updates)) {
    sets.push(`${key} = $${i}`);
    vals.push(value);
    i++;
  }

  vals.push(id);
  const r = await p.query(
    `UPDATE estimates SET ${sets.join(", ")} WHERE id = $${i} RETURNING *`,
    vals
  );
  return r.rows[0];
}

export async function getStats() {
  const p = getPool();
  if (!p) {
    const all = memoryStore.estimates;
    const calibrated = all.filter((e) => e.actual_volume != null);
    let avgError = null;
    if (calibrated.length > 0) {
      const totalErr = calibrated.reduce((sum, e) => {
        return sum + Math.abs(e.likely_cy - e.actual_volume) / Math.max(e.actual_volume, 0.1);
      }, 0);
      avgError = (totalErr / calibrated.length) * 100;
    }
    return { total: all.length, calibrated: calibrated.length, avgError };
  }

  const r = await p.query(`
    SELECT
      COUNT(*)::int AS total,
      COUNT(actual_volume)::int AS calibrated,
      CASE WHEN COUNT(actual_volume) > 0
        THEN ROUND(AVG(ABS(likely_cy - actual_volume) / GREATEST(actual_volume, 0.1)) * 100, 1)
        ELSE NULL
      END AS avg_error
    FROM estimates
  `);
  return r.rows[0] || { total: 0, calibrated: 0, avg_error: null };
}
