import React, { useState, useEffect } from "react";
import axios from "axios";
import { 
  Terminal, Send, CheckCircle2, PlusCircle, AlertTriangle, Play,
  Cpu, Code2, Database, ShieldAlert, Sparkles, RefreshCw, FileJson, Clock, Check, HelpCircle, Copy
} from "lucide-react";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "motion/react";

interface AlertPlaygroundProps {
  onIngestSuccess: () => void;
  onViewIncident: (id: number) => void;
}

interface IngestResult {
  status: string;
  incident_id: number | null;
  action: string;
  confidence: number;
  reason: string;
  rule_name?: string;
  legacy_status?: string;
}

export default function AlertPlayground({ onIngestSuccess, onViewIncident }: AlertPlaygroundProps) {
  // Input fields state
  const [message, setMessage] = useState("FATAL: remaining connection slots reserved for non-superuser connections");
  const [service, setService] = useState("postgres-shard-3");
  const [severity, setSeverity] = useState("SEV-1");
  const [host, setHost] = useState("prod-db-replica-01");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<IngestResult | null>(null);
  const [rawRequestPayload, setRawRequestPayload] = useState<any>(null);
  const [rawResponsePayload, setRawResponsePayload] = useState<any>(null);
  const [errorText, setErrorText] = useState("");

  // Daily summary states
  const [digest, setDigest] = useState<any>(null);
  const [loadingDigest, setLoadingDigest] = useState(false);
  const [copiedAlertIdx, setCopiedAlertIdx] = useState<number | null>(null);

  // Predefined SRE Outage categories containing lists of sub-alerts from database requirements
  const SRE_OUTAGE_PINPOINTS = [
    {
      title: "🔥 Database (db-01)",
      description: "Critical pool exhaustion and timeouts on db-01",
      service: "payment-api",
      severity: "SEV-1",
      host: "db-01",
      alerts: [
        "ERROR: Connection timeout to db-01:5432 from payment-api",
        "CRITICAL: pg_isready failed on db-01 after 30s",
        "WARNING: Connection pool exhausted for service order-api targeting db-01",
        "ERROR: FATAL: could not connect to server db-01 from checkout-service",
        "ALERT: Database connection refused from inventory-api to db-01",
        "ERROR: timeout expired when connecting to PostgreSQL db-01",
        "CRITICAL: Health check failed: db-01 not responding",
        "ERROR: Npgsql.NpgsqlException: Exception while connecting to db-01",
        "WARNING: Slow query detected, possible db-01 saturation",
        "ERROR: Failed to acquire connection from pool - db-01",
        "ALERT: Replication lag critical on db-01 replica",
        "ERROR: 500 Internal Server Error - database unavailable db-01"
      ]
    },
    {
      title: "💳 Stripe Gateway",
      description: "High latency & timeout on external api.stripe.com endpoints",
      service: "payment-service",
      severity: "SEV-1",
      host: "stripe-api-gateway",
      alerts: [
        "ERROR: Stripe API returned 503 Service Unavailable from payment-service",
        "ALERT: Payment processing failed: Gateway timeout stripe.com",
        "CRITICAL: 100% payment failures in last 5 min - Stripe",
        "ERROR: Webhook delivery failed from Stripe - 502 Bad Gateway",
        "WARNING: Increased latency to api.stripe.com - 8s response",
        "ERROR: StripeException: Connection to stripe API failed",
        "ALERT: Checkout blocked - cannot reach payment gateway",
        "ERROR: Refund API failing - Stripe 504 Gateway Timeout",
        "CRITICAL: Payment service circuit breaker OPEN for Stripe",
        "ERROR: Unable to create Stripe customer - service down"
      ]
    },
    {
      title: "⚡ CPU Saturation",
      description: "Compute bottlenecks under heavy traffic loads on worker nodes",
      service: "prod-namespace",
      severity: "SEV-2",
      host: "k8s-worker-03",
      alerts: [
        "WARNING: CPU usage 95% on k8s-worker-03 for 10m",
        "CRITICAL: Node k8s-worker-03 NotReady - CPU pressure",
        "ALERT: Pod evictions started on k8s-worker-03 due to CPU",
        "WARNING: CPU throttling on namespace prod, node k8s-worker-03",
        "ERROR: Failed to schedule pods - insufficient CPU k8s-worker-03",
        "ALERT: Load average 24.5 on k8s-worker-03, expected <8",
        "WARNING: CPU usage 92% on k8s-worker-05",
        "CRITICAL: Node k8s-worker-05 memory + CPU pressure",
        "ALERT: HorizontalPodAutoscaler failed - no CPU available",
        "WARNING: Container restart count high on k8s-worker-03 - OOMKill",
        "ERROR: Liveness probe failed due to CPU starvation node-03",
        "ALERT: kubelet CPU usage 80% on k8s-worker-03",
        "WARNING: Node k8s-worker-04 CPU 88% sustained",
        "CRITICAL: Cluster CPU utilization 85% - scale up needed",
        "ALERT: Prometheus alert: NodeCPUHigh on k8s-worker-03"
      ]
    },
    {
      title: "⚙️ auth-service Crash",
      description: "Looping container failures blocked user identity access",
      service: "auth-service",
      severity: "SEV-1",
      host: "auth-pod-7d8f9",
      alerts: [
        "ERROR: Pod auth-service-7d8f9 crashed - Exit Code 1",
        "WARNING: auth-service restarting - CrashLoopBackOff detected",
        "CRITICAL: auth-service deployment has 0/3 pods ready",
        "ERROR: Panic in auth-service: nil pointer dereference",
        "ALERT: Failed to pull image auth-service:v2.4.1",
        "ERROR: Liveness probe failed auth-service port 8080",
        "WARNING: Readiness probe failed - /health returning 500",
        "ALERT: OOMKilled: auth-service exceeded 512Mi limit",
        "ERROR: ConfigMap auth-config not found - pod crash",
        "CRITICAL: All login attempts failing - auth service down",
        "ERROR: JWT validation service unreachable - auth pod down"
      ]
    },
    {
      title: "📡 AWS us-east-1a",
      description: "Structural VPC network packet loss in Availability Zone us-east-1a",
      service: "vpc-peering",
      severity: "SEV-1",
      host: "us-east-1a-routing",
      alerts: [
        "ALERT: Packet loss 40% from instances in us-east-1a",
        "ERROR: EC2 instance i-0abc123 unreachable - us-east-1a",
        "WARNING: High network latency us-east-1a to us-east-1b - 300ms",
        "CRITICAL: ELB health checks failing for 1a targets",
        "ERROR: RDS connection timeout - endpoint in us-east-1a",
        "ALERT: S3 API errors from us-east-1a - 503 Slow Down",
        "WARNING: VPN tunnel down to us-east-1a VPC",
        "ERROR: DNS resolution failed for internal services in 1a",
        "ALERT: NAT Gateway us-east-1a degraded performance",
        "CRITICAL: Cross-AZ traffic from 1a dropping packets",
        "ERROR: EKS node group 1a nodes NotReady",
        "WARNING: CloudWatch metrics delayed from us-east-1a",
        "ALERT: Intermittent connectivity to us-east-1a resources"
      ]
    }
  ];

  const [selectedCategoryIdx, setSelectedCategoryIdx] = useState<number>(0);

  const applyPreset = (idx: number, optAlert?: string) => {
    setSelectedCategoryIdx(idx);
    const cat = SRE_OUTAGE_PINPOINTS[idx];
    const pickedAlert = optAlert || cat.alerts[0];
    setMessage(pickedAlert);
    setService(cat.service);
    setSeverity(cat.severity);
    setHost(cat.host);
    setResult(null);
    setRawResponsePayload(null);
    setErrorText("");
  };

  const handleTriggerPipeline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message || !service) return;

    setLoading(true);
    setResult(null);
    setRawResponsePayload(null);
    setErrorText("");

    const reqPayload = {
      message,
      service,
      severity,
      host
    };
    setRawRequestPayload(reqPayload);

    try {
      const response = await axios.post("/api/ingest", reqPayload);
      setResult(response.data);
      setRawResponsePayload(response.data);
      onIngestSuccess();
      // Freshly fetch digest since stats updated
      fetchDigestReport();
    } catch (err: any) {
      console.error("Alert ingestion workspace error", err);
      setErrorText("API request failed. Verify that server database or connection is online.");
      setRawResponsePayload(err.response?.data || { error: "Network/Server Connection Error" });
    } finally {
      setLoading(false);
    }
  };

  const fetchDigestReport = async () => {
    setLoadingDigest(true);
    try {
      const resp = await axios.get(`/api/digest?_cb=${Date.now()}`);
      setDigest(resp.data);
    } catch (err) {
      console.error("Could not fetch daily digest", err);
    } finally {
      setLoadingDigest(false);
    }
  };

  const handleWorkspaceRefresh = async () => {
    setLoadingDigest(true);
    // 1. Clear previous result states to reset terminals
    setResult(null);
    setErrorText("");
    setRawResponsePayload(null);
    
    try {
      // 2. Fetch fresh stats/digest
      const resp = await axios.get(`/api/digest?_cb=${Date.now()}`);
      setDigest(resp.data);
      
      // 3. Re-trigger global app states
      onIngestSuccess();
      
      toast.success("Workspace metrics and SRE analytics successfully refreshed!", {
        icon: "🔄"
      });
    } catch (err) {
      console.error("Could not fetch daily digest on refresh", err);
      toast.error("Failed to sync updated dashboard telemetry.");
    } finally {
      setLoadingDigest(false);
    }
  };

  useEffect(() => {
    fetchDigestReport();
    // Pre-populate raw request schema visually
    setRawRequestPayload({
      message,
      service,
      severity,
      host
    });
  }, []);

  // Update request payload representation on local editing
  useEffect(() => {
    setRawRequestPayload({
      message,
      service,
      severity,
      host
    });
  }, [message, service, severity, host]);

  return (
    <div className="space-y-8 font-sans">
      
      {/* Visual Header */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-full bg-gradient-to-r from-transparent to-zinc-50 pointer-events-none opacity-40"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                Interactive Workspace
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span className="text-zinc-500 text-[11px] font-medium font-mono">POST /api/ingest</span>
            </div>
            <h1 className="text-2xl font-black text-zinc-950 tracking-tight mt-1">
              Alert Ingestion Playground
            </h1>
            <p className="text-sm text-zinc-500 mt-1 max-w-2xl">
              Inject custom raw alert messages, inspect how the pgvector similarity module categorizes incoming signals, and evaluate simulated SRE outcomes.
            </p>
          </div>
          <div>
            <button
              onClick={handleWorkspaceRefresh}
              disabled={loadingDigest}
              className="flex items-center gap-1.5 bg-zinc-900 text-zinc-100 hover:text-white px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all border border-zinc-800 shadow-sm"
            >
              {loadingDigest ? (
                <RefreshCw className="animate-spin text-zinc-400" size={14} />
              ) : (
                <RefreshCw size={14} />
              )}
              <span>Refresh Ingest Workspace</span>
            </button>
          </div>
        </div>
      </div>

      {/* Preset Library Grid */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="text-indigo-600" size={16} />
          <h2 className="text-sm font-bold text-zinc-800 uppercase tracking-widest">
            SRE Simulated Outage Presets
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          {SRE_OUTAGE_PINPOINTS.map((preset, idx) => (
            <button
              key={idx}
              onClick={() => applyPreset(idx)}
              className={`border rounded-xl p-4 text-left cursor-pointer transition-colors flex flex-col justify-between h-full group shadow-3xs ${
                selectedCategoryIdx === idx
                  ? "bg-indigo-50/70 border-indigo-400 text-zinc-950 ring-2 ring-indigo-100"
                  : "bg-white hover:bg-zinc-50 border-zinc-200 hover:border-zinc-300 text-zinc-805"
              }`}
            >
              <div>
                <span className={`text-xs font-bold block ${
                  selectedCategoryIdx === idx ? "text-indigo-700" : "text-zinc-900 group-hover:text-indigo-600"
                }`}>
                  {preset.title}
                </span>
                <p className="text-[10px] text-zinc-500 leading-relaxed mt-1">
                  {preset.description}
                </p>
              </div>
              <div className="flex items-center justify-between mt-3 pt-2 border-t border-zinc-100 w-full text-[9px] font-mono font-medium text-zinc-450">
                <span>{preset.service}</span>
                <span className={`px-1 rounded ${
                  preset.severity === "SEV-1" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-700"
                }`}>
                  {preset.severity}
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* Dynamic sub-alerts list switcher */}
        <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 space-y-3 shadow-2xs">
          <div className="flex items-center justify-between gap-2 border-b border-zinc-200 pb-2">
            <div className="flex items-center gap-2">
              <Code2 size={14} className="text-indigo-600 animate-pulse" />
              <span className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                Select sub-alert from category: <b className="text-indigo-700">{SRE_OUTAGE_PINPOINTS[selectedCategoryIdx].title}</b>
              </span>
            </div>
            <span className="text-[10px] bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded-full">
              {SRE_OUTAGE_PINPOINTS[selectedCategoryIdx].alerts.length} Standard Alerts Loaded
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
            {SRE_OUTAGE_PINPOINTS[selectedCategoryIdx].alerts.map((alt, altIdx) => (
              <div 
                key={altIdx} 
                className="flex items-center gap-1.5 relative w-full group"
              >
                <button
                  type="button"
                  onClick={() => applyPreset(selectedCategoryIdx, alt)}
                  className={`w-full text-[11px] font-mono p-2.5 rounded-lg cursor-pointer text-left transition-all border leading-relaxed pr-10 ${
                    message === alt
                      ? "bg-indigo-600 text-white border-indigo-600 font-bold shadow-xs whitespace-pre-wrap"
                      : "bg-white text-zinc-600 hover:bg-zinc-50 border-zinc-200 whitespace-pre-wrap"
                  }`}
                >
                  {altIdx + 1}. {alt}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(alt);
                    toast.success("Sub-alert text copied to clipboard!");
                    setCopiedAlertIdx(altIdx);
                    setTimeout(() => setCopiedAlertIdx(null), 2000);
                  }}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md hover:bg-zinc-100 transition-colors cursor-pointer text-zinc-400 hover:text-indigo-600 z-10 ${
                    message === alt ? "text-indigo-200 hover:bg-indigo-750 hover:text-white" : ""
                  }`}
                  title="Copy alert text"
                >
                  {copiedAlertIdx === altIdx ? (
                    <Check size={13} className="text-emerald-400" />
                  ) : (
                    <Copy size={13} />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Interactive Dual-Pane Terminal */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side Grid: Inputs */}
        <div className="lg:col-span-5 bg-white border border-zinc-200 rounded-2xl shadow-sm flex flex-col overflow-hidden">
          <div className="bg-zinc-50 px-4 py-3 border-b border-zinc-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database size={15} className="text-zinc-600" />
              <span className="text-xs font-bold uppercase text-zinc-700 tracking-wider">Alert Input Console</span>
            </div>
            <span className="bg-zinc-200 text-zinc-600 font-mono text-[9px] px-2 py-0.5 rounded font-bold">
              JSON TEMPLATE
            </span>
          </div>

          <form onSubmit={handleTriggerPipeline} className="p-5 space-y-4 flex-grow flex flex-col justify-between">
            <div className="space-y-4">
              {/* Alert message field */}
              <div>
                <label className="text-[11px] font-bold text-zinc-650 uppercase tracking-wider block mb-1">
                  1. Alert Log Text
                </label>
                <textarea
                  required
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Paste raw log string or error payload here..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-zinc-100 focus:outline-none focus:border-indigo-500 font-mono text-xs leading-relaxed placeholder-zinc-600"
                />
              </div>

              {/* Service Mapping */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-zinc-650 uppercase tracking-wider block mb-1">
                    2. Service Component
                  </label>
                  <input
                    required
                    type="text"
                    value={service}
                    onChange={(e) => setService(e.target.value)}
                    placeholder="payment-service"
                    className="w-full bg-zinc-50 border border-zinc-250 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 font-semibold text-zinc-800"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-zinc-650 uppercase tracking-wider block mb-1">
                    3. Cluster Host
                  </label>
                  <input
                    type="text"
                    value={host}
                    onChange={(e) => setHost(e.target.value)}
                    placeholder="prod-app-server-04"
                    className="w-full bg-zinc-50 border border-zinc-250 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 font-semibold text-zinc-800"
                  />
                </div>
              </div>

              {/* Severity critical weight */}
              <div>
                <label className="text-[11px] font-bold text-zinc-650 uppercase tracking-wider block mb-1">
                  4. Telemetry Severity Weight
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {["SEV-1", "SEV-2", "SEV-3"].map((sev) => (
                    <button
                      key={sev}
                      type="button"
                      onClick={() => setSeverity(sev)}
                      className={`py-1.5 rounded-lg border text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                        severity === sev 
                          ? sev === "SEV-1" 
                            ? "bg-red-50 text-red-600 border-red-500 font-bold"
                            : sev === "SEV-2"
                              ? "bg-amber-50 text-amber-700 border-amber-500 font-bold"
                              : "bg-zinc-900 text-zinc-100 border-zinc-900 font-bold"
                          : "bg-white text-zinc-500 border-zinc-250 hover:bg-zinc-50"
                      }`}
                    >
                      {sev}
                    </button>
                  ))}
                </div>
              </div>

              {/* LIVE PLAYLOAD PREVIEW */}
              <div className="pt-2">
                <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-widest block mb-1.5 flex items-center gap-1.5">
                  <FileJson size={11} /> Request HTTP Payload Schema
                </span>
                <pre className="p-3 bg-zinc-900 text-[11px] text-zinc-300 rounded-lg overflow-x-auto font-mono">
                  {JSON.stringify(rawRequestPayload, null, 2)}
                </pre>
              </div>
            </div>

            <div className="pt-6 border-t border-zinc-200 mt-6">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-550 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/20 active:scale-[0.99]"
              >
                {loading ? (
                  <>
                    <RefreshCw className="animate-spin" size={16} />
                    <span>ENGINE EVALUATING SEMANTICS...</span>
                  </>
                ) : (
                  <>
                    <Play size={14} className="fill-current" />
                    <span>TRIGGER PIPELINE & EVALUATE</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Right Side Grid: Interactive AI Responses */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          
          {/* Active outcome container */}
          <div className="bg-zinc-950 text-white border border-zinc-800 rounded-2xl shadow-xl flex flex-col overflow-hidden">
            <div className="bg-zinc-900 px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu size={15} className="text-purple-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-200">AI SRE Response Workspace</span>
              </div>
              <span className="bg-purple-950 text-purple-400 border border-purple-900 font-mono text-[9px] px-2 py-0.5 rounded font-bold">
                REAL-TIME OUTCOME
              </span>
            </div>

            {/* Ingestion results and raw JSON toggle */}
            <div className="p-6 flex-grow flex flex-col justify-center min-h-[420px]">
              <AnimatePresence mode="wait">
                {loading ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center text-center space-y-4"
                  >
                    <div className="relative flex items-center justify-center">
                      <div className="absolute w-12 h-12 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin"></div>
                      <Cpu size={24} className="text-indigo-400 animate-pulse" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-zinc-100 font-mono">POST /api/ingest active</p>
                      <p className="text-xs text-zinc-400 mt-1 max-w-sm">
                        Calculating embeddings inside PostgreSQL using pgvector, running custom blacklists, and querying Gemini LLM for reasoning...
                      </p>
                    </div>
                  </motion.div>
                ) : result ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="space-y-6"
                  >
                    {/* Badge alert outcome banner */}
                    <div className="flex items-start md:items-center justify-between gap-4 p-4 rounded-xl bg-zinc-900 border border-zinc-800 relative overflow-hidden">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-lg bg-zinc-950">
                          {(result.status === "Deduplicated" || result.status.startsWith("dup-of-") || result.legacy_status === "Deduplicated" || result.legacy_status === "deduplicated") ? (
                            <CheckCircle2 size={24} className="text-emerald-400" />
                          ) : (
                            <PlusCircle size={24} className="text-indigo-400" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-zinc-400 text-[10px] font-mono leading-none">PIPELINE ACTION</span>
                            <span className="text-zinc-650">•</span>
                            <span className="text-[10px] uppercase font-bold text-zinc-100 bg-zinc-800 px-1.5 py-0.5 rounded leading-none font-mono">
                              {result.status}
                            </span>
                          </div>
                          <h3 className="text-lg font-extrabold text-white tracking-tight mt-1">
                            {result.action}
                          </h3>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <span className="text-zinc-500 text-[10px] uppercase block leading-none">Similarity</span>
                        <span className="text-xl font-mono font-black text-white mt-1 block">
                          {Math.round(result.confidence * 100)}%
                        </span>
                      </div>
                    </div>

                    {/* AI explanation and logic container */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-extrabold text-indigo-400 uppercase tracking-widest block">
                        Deduplication Agent Reasoning
                      </span>
                      <p className="text-sm text-zinc-200 bg-zinc-900 border border-zinc-800/80 p-4 rounded-xl leading-relaxed font-sans">
                        {result.reason}
                      </p>
                    </div>

                    {/* Meta statistics and links buttons */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-zinc-900/40 rounded-xl border border-zinc-805">
                        <span className="text-zinc-500 text-[10px] uppercase block">Assigned Track ID</span>
                        <span className="text-sm font-bold text-zinc-200 mt-1 block font-mono">
                          {result.incident_id ? `incident-id: ${result.incident_id}` : "N/A"}
                        </span>
                      </div>
                      <div className="p-3 bg-zinc-900/40 rounded-xl border border-zinc-805">
                        <span className="text-zinc-400 text-[10px] uppercase block">Deduplication Impact</span>
                        <span className="text-sm font-bold text-emerald-400 mt-1 block font-mono">
                          {(result.status === "Deduplicated" || result.status.startsWith("dup-of-") || result.legacy_status === "deduplicated" || result.legacy_status === "Deduplicated") 
                            ? "Noise Filtered (Suppressed)" 
                            : "New Escalation Logged"}
                        </span>
                      </div>
                    </div>

                    {/* Action navigation link row */}
                    {result.incident_id && (
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => onViewIncident(result.incident_id as number)}
                          className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-350 font-bold transition-colors cursor-pointer bg-indigo-950/40 hover:bg-indigo-950/80 px-3 py-1.5 rounded-lg border border-indigo-900"
                        >
                          <span>Go to Incident Details Page</span>
                          <span>→</span>
                        </button>
                      </div>
                    )}

                    {/* JSON Response console pane */}
                    <div className="pt-2">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-widest flex items-center gap-1 text-left">
                          <Code2 size={12} /> Response payload returned from SRE Agent
                        </span>
                        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/50 border border-emerald-900/30 px-1.5 py-0.2 rounded font-bold">
                          HTTP 200 OK
                        </span>
                      </div>
                      <pre className="p-3 bg-zinc-900/90 text-[11px] text-zinc-300 rounded-lg overflow-x-auto font-mono border border-zinc-800">
                        {JSON.stringify(rawResponsePayload, null, 2)}
                      </pre>
                    </div>

                  </motion.div>
                ) : errorText ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-4 bg-red-950/40 border border-red-900 text-red-100 rounded-xl space-y-2"
                  >
                    <div className="flex items-center gap-2 text-red-400">
                      <ShieldAlert size={16} />
                      <span className="font-bold text-sm">Pipeline Error</span>
                    </div>
                    <p className="text-xs">{errorText}</p>
                    <pre className="bg-zinc-905 p-3 rounded text-[11px] font-mono text-zinc-400 overflow-x-auto">
                      {JSON.stringify(rawResponsePayload, null, 2)}
                    </pre>
                  </motion.div>
                ) : (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center text-center p-6 space-y-4 text-zinc-500"
                  >
                    <Terminal size={40} className="text-zinc-600 stroke-[1.5]" />
                    <div>
                      <p className="text-sm font-semibold text-zinc-300">Workspace Execution Idle</p>
                      <p className="text-xs text-zinc-500 mt-1 max-w-sm">
                        Select an outage preset or enter your custom live alerts details on the left, then click <strong>Trigger Pipeline & Evaluate</strong> to witness the real-time AI outcome.
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Daily Summary Preview */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-xs">
            <h3 className="text-sm font-black text-zinc-900 flex items-center gap-1.5">
              <Sparkles className="text-indigo-600" size={15} />
              <span>Agent Daily Operational Summary Report</span>
            </h3>
            <p className="text-xs text-zinc-500 mt-1">
              Active daily digest generated using server-side Gemini intelligence over all current cluster incidents.
            </p>

            <div className="mt-4">
              {loadingDigest ? (
                <div className="flex items-center gap-2 justify-center py-6 text-zinc-450 text-xs">
                  <RefreshCw className="animate-spin text-indigo-500" size={15} />
                  <span>Generating daily SRE summary...</span>
                </div>
              ) : digest ? (
                <div className="space-y-4">
                  <div className="bg-indigo-55/45 border border-indigo-50/80 rounded-xl p-4 text-xs font-serif italic text-zinc-800 leading-relaxed">
                    "{digest.summary || 'Operational clusters are stabilized and monitored regularly.'}"
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="p-2 bg-zinc-50 rounded-lg">
                      <span className="text-[10px] text-zinc-450 block uppercase font-mono">Telemetry</span>
                      <span className="text-sm font-bold text-zinc-850 mt-0.5 block">{digest.total_alerts}</span>
                    </div>
                    <div className="p-2 bg-zinc-50 rounded-lg">
                      <span className="text-[10px] text-zinc-450 block uppercase font-mono">Suppressed</span>
                      <span className="text-sm font-bold text-zinc-850 mt-0.5 block">{digest.suppressed}</span>
                    </div>
                    <div className="p-2 bg-zinc-50 rounded-lg">
                      <span className="text-[10px] text-zinc-450 block uppercase font-mono">Incidents</span>
                      <span className="text-sm font-bold text-zinc-850 mt-0.5 block">{digest.incidents_created}</span>
                    </div>
                    <div className="p-2 bg-zinc-50 rounded-lg">
                      <span className="text-[10px] text-zinc-450 block uppercase font-mono">Efficiency</span>
                      <span className="text-sm font-bold text-emerald-600 mt-0.5 block">{digest.noise_reduction_pct}%</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-xs text-zinc-400">
                  No active incidents detected for daily summary.
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
