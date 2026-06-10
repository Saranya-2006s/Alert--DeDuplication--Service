import React, { useState } from "react";
import axios from "axios";
import { Terminal, Send, CheckCircle, PlusCircle, AlertTriangle, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface AlertIngesterProps {
  onIngestSuccess: () => void;
}

export default function AlertIngester({ onIngestSuccess }: AlertIngesterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [service, setService] = useState("payment-service");
  const [severity, setSeverity] = useState("SEV-3");
  const [host, setHost] = useState("prod-app-server-04");
  const [loading, setLoading] = useState(false);
  
  interface IngestResult {
    status: string;
    incident_id: number | null;
    action: string;
    confidence: number;
    reason: string;
    rule_name?: string;
  }
  
  const [result, setResult] = useState<IngestResult | null>(null);

  // Suggested quick SRE alerts for testing
  const suggestions = [
    { text: "FATAL: remaining connection slots reserved for non-superuser", svc: "postgres-shard-3", sev: "SEV-1" },
    { text: "Redis Cache memory full: command not allowed when maxmemory met", svc: "redis-cache-prd", sev: "SEV-2" },
    { text: "HTTP_504: timeout on POST /cart/checkout payload response", svc: "cart-service", sev: "SEV-1" },
    { text: "Kafka lag critical on telemetry events topic partition 2", svc: "analytics-pipeline", sev: "SEV-3" },
    { text: "CPU usage spiked to 99% on cluster auth node", svc: "auth-session-manager", sev: "SEV-2" },
    { text: "Ignore ping timeout heartbeat check-in ping payload", svc: "healthcheck-daemon", sev: "SEV-3" },
  ];

  const handleIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message || !service) return;

    setLoading(true);
    setResult(null);

    try {
      // Direct POST to out dynamic ingest endpoint
      const response = await axios.post("/api/ingest", {
        message,
        service,
        severity,
        host
      });
      setResult(response.data);
      onIngestSuccess();
    } catch (err) {
      console.error("Alert ingestion pipeline failed", err);
    } finally {
      setLoading(false);
    }
  };

  const applySuggestion = (sug: typeof suggestions[0]) => {
    setMessage(sug.text);
    setService(sug.svc);
    setSeverity(sug.sev);
  };

  return (
    <div className="relative z-40 bg-zinc-900 border border-zinc-800 rounded-xl p-4 shadow-xl">
      {/* Toggle simulation drawer on click */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 text-sm font-semibold text-zinc-100 hover:text-white transition-all w-full text-left"
        >
          <Terminal size={16} className="text-purple-400" />
          <span>Ingest Raw Alert Node</span>
          <span className="ml-auto bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded text-[10px] font-mono font-medium">
            SIMULATE
          </span>
        </button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mt-4 pt-4 border-t border-zinc-800 space-y-4 text-xs"
          >
            <p className="text-zinc-400 text-[11px] leading-relaxed">
              Type or select an alert below to trigger the ingestion pipeline. The deduplication engine automatically analyzes existing incidents to either aggregate the alert or create a new tracking incident!
            </p>

            {/* Quick SRE suggestions checklist */}
            <div className="space-y-1">
              <label className="text-zinc-500 font-medium block">SRE Preset Outage Examples:</label>
              <div className="flex flex-wrap gap-1">
                {suggestions.map((sug, i) => (
                  <button
                    key={i}
                    onClick={() => applySuggestion(sug)}
                    className="bg-zinc-800/60 hover:bg-zinc-800 text-zinc-300 border border-zinc-700/50 hover:border-zinc-700 px-2 py-1 rounded text-[10px] text-left transition-all max-w-full truncate"
                  >
                    {sug.text}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleIngest} className="space-y-3">
              <div>
                <label className="text-zinc-400 font-medium block mb-1">Alert Message Log:</label>
                <textarea
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="e.g. FATAL: remaining connection slots reserved..."
                  rows={2}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-zinc-100 focus:outline-none focus:border-purple-600 font-mono text-[11px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-zinc-400 font-medium block mb-1">Target Service:</label>
                  <input
                    required
                    type="text"
                    value={service}
                    onChange={(e) => setService(e.target.value)}
                    placeholder="payment-service"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded p-1.5 text-zinc-100 focus:outline-none focus:border-purple-600"
                  />
                </div>
                <div>
                  <label className="text-zinc-400 font-medium block mb-1">Host node:</label>
                  <input
                    type="text"
                    value={host}
                    onChange={(e) => setHost(e.target.value)}
                    placeholder="prod-app-server-04"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded p-1.5 text-zinc-100 focus:outline-none focus:border-purple-600"
                  />
                </div>
              </div>

              <div>
                <label className="text-zinc-400 font-medium block mb-1">Default Criticality:</label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded p-1.5 text-zinc-100 focus:outline-none focus:border-purple-600"
                >
                  <option value="SEV-1">SEV-1 (Critical Blockers)</option>
                  <option value="SEV-2">SEV-2 (High Degradation)</option>
                  <option value="SEV-3">SEV-3 (Warning)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-medium p-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-purple-600/20"
              >
                {loading ? (
                  <span>Processing Log...</span>
                ) : (
                  <>
                    <Send size={12} />
                    <span>Trigger Alert Pipeline</span>
                  </>
                )}
              </button>
            </form>

            <AnimatePresence>
              {result && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-zinc-950 border border-zinc-800 rounded p-3 space-y-2 mt-2 leading-relaxed"
                >
                  <div className="flex items-center gap-1.5 font-bold text-[11px] uppercase tracking-wider">
                    {(result.status === "Deduplicated" || result.status.startsWith("dup-of-")) && (
                      <>
                        <CheckCircle size={14} className="text-emerald-400" />
                        <span className="text-emerald-400">Deduplicated!</span>
                      </>
                    )}
                    {(result.status === "CreatedIncident" || result.status === "new") && (
                      <>
                        <PlusCircle size={14} className="text-purple-400" />
                        <span className="text-purple-400">Incident Created!</span>
                      </>
                    )}
                    {result.status === "Filtered" && (
                      <>
                        <X size={14} className="text-rose-400" />
                        <span className="text-rose-400">Blacklisted!</span>
                      </>
                    )}
                    {result.status === "Suppressed" && (
                      <>
                        <AlertTriangle size={14} className="text-amber-500" />
                        <span className="text-amber-500">Suppressed!</span>
                      </>
                    )}
                  </div>

                  <p className="text-zinc-300 text-[11px]">
                    <strong className="text-zinc-100">Outcome Action:</strong> {result.action}
                  </p>
                  <p className="text-zinc-300 text-[11px]">
                    <strong className="text-zinc-100">Confidence Match:</strong> {Math.round(result.confidence * 100)}%
                  </p>
                  <p className="text-zinc-400 text-[10px] border-t border-zinc-800/80 pt-1.5">
                    <strong className="text-zinc-300 block mb-0.5">Deduplication reasoning:</strong>
                    {result.reason}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
