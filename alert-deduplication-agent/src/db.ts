import Database from "better-sqlite3";
import { ConfigSettings, ManualRule, Incident } from "./types";

const db = new Database("sre_metrics.db");

// Initialize Database structures
db.exec(`
  CREATE TABLE IF NOT EXISTS config (
    id INTEGER PRIMARY KEY,
    time_window_min INTEGER,
    similarity_threshold REAL,
    enable_llm_reasoning INTEGER,
    auto_resolve_children INTEGER,
    blacklist TEXT
  );

  CREATE TABLE IF NOT EXISTS rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    condition TEXT,
    action TEXT,
    enabled INTEGER
  );

  CREATE TABLE IF NOT EXISTS incidents (
    id INTEGER PRIMARY KEY,
    title TEXT,
    severity TEXT,
    status TEXT,
    alert_count INTEGER,
    services TEXT,
    started_at TEXT,
    ai_summary TEXT,
    similarity_reason TEXT,
    timeline_data TEXT,
    child_alerts TEXT
  );

  CREATE TABLE IF NOT EXISTS feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    incident_id INTEGER,
    feedback TEXT,
    timestamp TEXT
  );

  CREATE TABLE IF NOT EXISTS stats (
    id INTEGER PRIMARY KEY,
    stats_raw_alerts_today INTEGER,
    stats_suppressed_today INTEGER,
    standalone_suppressed_count INTEGER
  );

  CREATE TABLE IF NOT EXISTS recent_actions (
    id TEXT PRIMARY KEY,
    time TEXT,
    parent_incident TEXT,
    parent_id INTEGER,
    child_added TEXT,
    confidence REAL,
    created_at INTEGER
  );
`);

// Prepopulate config if not exists
const rowConfig = db.prepare("SELECT count(*) as count FROM config").get() as { count: number };
if (rowConfig.count === 0) {
  const initialConfig: ConfigSettings = {
    time_window_min: 15,
    similarity_threshold: 0.82,
    enable_llm_reasoning: true,
    auto_resolve_children: true,
    blacklist: ["kube-system", "healthcheck-daemon", "prometheus-test"]
  };
  db.prepare(`
    INSERT INTO config (id, time_window_min, similarity_threshold, enable_llm_reasoning, auto_resolve_children, blacklist)
    VALUES (1, ?, ?, ?, ?, ?)
  `).run(
    initialConfig.time_window_min,
    initialConfig.similarity_threshold,
    initialConfig.enable_llm_reasoning ? 1 : 0,
    initialConfig.auto_resolve_children ? 1 : 0,
    JSON.stringify(initialConfig.blacklist)
  );
}

// Prepopulate rules if not exists
const rowRules = db.prepare("SELECT count(*) as count FROM rules").get() as { count: number };
if (rowRules.count === 0) {
  const initialRules: ManualRule[] = [
    { id: 1, name: "Ignore Ping Heartbeats", condition: "message contains 'ping' or 'heartbeat'", action: "suppress", enabled: true },
    { id: 2, name: "Escalate Postgres Failures", condition: "service == 'postgres-shard-3' or message contains 'FATAL'", action: "escalate to SEV-1", enabled: true },
    { id: 3, name: "Suppress Prometheus Scraping Fluctuations", condition: "service == 'healthcheck-daemon'", action: "suppress", enabled: false },
    { id: 4, name: "Flag Payment Retries", condition: "message contains 'stripe' or 'payment-gateway' and status == 'timeout'", action: "escalate to SEV-2", enabled: true }
  ];
  const insertRule = db.prepare(`
    INSERT INTO rules (id, name, condition, action, enabled)
    VALUES (?, ?, ?, ?, ?)
  `);
  for (const r of initialRules) {
    insertRule.run(r.id, r.name, r.condition, r.action, r.enabled ? 1 : 0);
  }
}

// Prepopulate stats if not exists with clean zeros
const rowStats = db.prepare("SELECT count(*) as count FROM stats").get() as { count: number };
if (rowStats.count === 0) {
  db.prepare(`
    INSERT INTO stats (id, stats_raw_alerts_today, stats_suppressed_today, standalone_suppressed_count)
    VALUES (1, 0, 0, 0)
  `).run();
}

// Database Helper Actions
export function getConfig(): ConfigSettings {
  const row = db.prepare("SELECT * FROM config WHERE id = 1").get() as any;
  if (!row) {
    return {
      time_window_min: 15,
      similarity_threshold: 0.82,
      enable_llm_reasoning: true,
      auto_resolve_children: true,
      blacklist: []
    };
  }
  return {
    time_window_min: row.time_window_min,
    similarity_threshold: row.similarity_threshold,
    enable_llm_reasoning: row.enable_llm_reasoning === 1,
    auto_resolve_children: row.auto_resolve_children === 1,
    blacklist: JSON.parse(row.blacklist || "[]")
  };
}

export function updateConfig(config: ConfigSettings): void {
  db.prepare(`
    UPDATE config
    SET time_window_min = ?, similarity_threshold = ?, enable_llm_reasoning = ?, auto_resolve_children = ?, blacklist = ?
    WHERE id = 1
  `).run(
    config.time_window_min,
    config.similarity_threshold,
    config.enable_llm_reasoning ? 1 : 0,
    config.auto_resolve_children ? 1 : 0,
    JSON.stringify(config.blacklist)
  );
}

export function getRules(): ManualRule[] {
  const rows = db.prepare("SELECT * FROM rules").all() as any[];
  return rows.map(r => ({
    id: r.id,
    name: r.name,
    condition: r.condition,
    action: r.action,
    enabled: r.enabled === 1
  }));
}

export function toggleRule(id: number): ManualRule | null {
  const rule = db.prepare("SELECT * FROM rules WHERE id = ?").get(id) as any;
  if (!rule) return null;
  const newEnabled = rule.enabled === 1 ? 0 : 1;
  db.prepare("UPDATE rules SET enabled = ? WHERE id = ?").run(newEnabled, id);
  return {
    id: rule.id,
    name: rule.name,
    condition: rule.condition,
    action: rule.action,
    enabled: newEnabled === 1
  };
}

export function getStats(): { statsRawAlertsToday: number; statsSuppressedToday: number; standaloneSuppressedCount: number } {
  const row = db.prepare("SELECT * FROM stats WHERE id = 1").get() as any;
  if (!row) {
    return { statsRawAlertsToday: 0, statsSuppressedToday: 0, standaloneSuppressedCount: 0 };
  }
  return {
    statsRawAlertsToday: row.stats_raw_alerts_today,
    statsSuppressedToday: row.stats_suppressed_today,
    standaloneSuppressedCount: row.standalone_suppressed_count
  };
}

export function updateStats(statsRawAlertsToday: number, statsSuppressedToday: number, standaloneSuppressedCount: number): void {
  db.prepare(`
    UPDATE stats
    SET stats_raw_alerts_today = ?, stats_suppressed_today = ?, standalone_suppressed_count = ?
    WHERE id = 1
  `).run(statsRawAlertsToday, statsSuppressedToday, standaloneSuppressedCount);
}

export function getIncidents(): Incident[] {
  const rows = db.prepare("SELECT * FROM incidents ORDER BY id DESC").all() as any[];
  return rows.map(r => ({
    id: r.id,
    title: r.title,
    severity: r.severity,
    status: r.status,
    alert_count: r.alert_count,
    services: JSON.parse(r.services || "[]"),
    started_at: r.started_at,
    ai_summary: r.ai_summary,
    similarity_reason: JSON.parse(r.similarity_reason || "[]"),
    timeline_data: JSON.parse(r.timeline_data || "[]"),
    child_alerts: JSON.parse(r.child_alerts || "[]")
  }));
}

export function saveIncident(incident: Incident): void {
  const row = db.prepare("SELECT id FROM incidents WHERE id = ?").get(incident.id);
  if (row) {
    db.prepare(`
      UPDATE incidents
      SET title = ?, severity = ?, status = ?, alert_count = ?, services = ?, started_at = ?, ai_summary = ?, similarity_reason = ?, timeline_data = ?, child_alerts = ?
      WHERE id = ?
    `).run(
      incident.title,
      incident.severity,
      incident.status,
      incident.alert_count,
      JSON.stringify(incident.services),
      incident.started_at,
      incident.ai_summary,
      JSON.stringify(incident.similarity_reason || []),
      JSON.stringify(incident.timeline_data || []),
      JSON.stringify(incident.child_alerts || []),
      incident.id
    );
  } else {
    db.prepare(`
      INSERT INTO incidents (id, title, severity, status, alert_count, services, started_at, ai_summary, similarity_reason, timeline_data, child_alerts)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      incident.id,
      incident.title,
      incident.severity,
      incident.status,
      incident.alert_count,
      JSON.stringify(incident.services),
      incident.started_at,
      incident.ai_summary,
      JSON.stringify(incident.similarity_reason || []),
      JSON.stringify(incident.timeline_data || []),
      JSON.stringify(incident.child_alerts || []),
    );
  }
}

export function getFeedback(): any[] {
  return db.prepare("SELECT * FROM feedback ORDER BY id ASC").all();
}

export function saveFeedback(incident_id: number, feedback: string): any {
  const timestamp = new Date().toISOString();
  const info = db.prepare(`
    INSERT INTO feedback (incident_id, feedback, timestamp)
    VALUES (?, ?, ?)
  `).run(incident_id, feedback, timestamp);
  return {
    id: Number(info.lastInsertRowid),
    incident_id,
    feedback,
    timestamp
  };
}

export function getRecentActions(): any[] {
  const rows = db.prepare("SELECT * FROM recent_actions ORDER BY created_at DESC LIMIT 15").all() as any[];
  return rows.map(r => ({
    id: r.id,
    time: r.time,
    parent_incident: r.parent_incident,
    parent_id: r.parent_id,
    child_added: r.child_added,
    confidence: r.confidence
  }));
}

export function addRecentAction(action: any): void {
  db.prepare(`
    INSERT OR REPLACE INTO recent_actions (id, time, parent_incident, parent_id, child_added, confidence, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    action.id,
    action.time,
    action.parent_incident,
    action.parent_id,
    action.child_added,
    action.confidence,
    Date.now()
  );
}
