export interface ChildAlert {
  id: string;
  message: string;
  service: string;
  timestamp: string;
  similarity_score: number;
}

export interface Incident {
  id: number;
  title: string;
  severity: "SEV-1" | "SEV-2" | "SEV-3";
  status: string;
  alert_count: number;
  services: string[];
  started_at: string;
  ai_summary?: string;
  similarity_reason?: string[];
  timeline_data?: { time: string; count: number }[];
  child_alerts?: ChildAlert[];
}

export interface TopServiceMetric {
  service: string;
  raw_alerts: number;
  incidents: number;
  reduction_pct: number;
}

export interface RecentActionMetric {
  id: string;
  time: string;
  parent_incident: string;
  parent_id: number;
  child_added: string;
  confidence: number;
}

export interface StatsData {
  raw_alerts: number;
  suppressed: number;
  incidents_created: number;
  noise_reduction_pct: number;
  top_services: TopServiceMetric[];
  recent_actions: RecentActionMetric[];
}

export interface ConfigSettings {
  time_window_min: number;
  similarity_threshold: number;
  enable_llm_reasoning: boolean;
  auto_resolve_children: boolean;
  blacklist: string[];
}

export interface ManualRule {
  id: number;
  name: string;
  condition: string;
  action: string;
  enabled: boolean;
}
