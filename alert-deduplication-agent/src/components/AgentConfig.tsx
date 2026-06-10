import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import axios from "axios";
import toast from "react-hot-toast";
import { 
  Sliders, ShieldCheck, Trash2, ListChecks, Info, 
  Lightbulb, HelpCircle, Save, Settings, Play, 
  ArrowRight, ShieldBan, ToggleLeft, ToggleRight 
} from "lucide-react";
import { ConfigSettings, ManualRule } from "../types";

export default function AgentConfig() {
  const [loading, setLoading] = useState(true);
  const [blacklist, setBlacklist] = useState<string[]>([]);
  const [blacklistInput, setBlacklistInput] = useState("");
  const [manualRules, setManualRules] = useState<ManualRule[]>([]);
  
  // What-If Simulator States
  const [simulationThreshold, setSimulationThreshold] = useState<number>(0.82);
  const [simResults, setSimResults] = useState<{
    before_incident_count: number;
    after_incident_count: number;
    noise_reduction_before: number;
    noise_reduction_after: number;
  } | null>(null);
  const [simulating, setSimulating] = useState(false);

  // Initialize react-hook-form
  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<ConfigSettings>({
    defaultValues: {
      time_window_min: 15,
      similarity_threshold: 0.82,
      enable_llm_reasoning: true,
      auto_resolve_children: true,
    }
  });

  const activeSimilarityThreshold = watch("similarity_threshold");

  // Fetch initial parameters from Express backend
  const fetchConfigAndRules = async () => {
    try {
      setLoading(true);
      const [configRes, rulesRes] = await Promise.all([
        axios.get("/api/config"),
        axios.get("/api/rules")
      ]);

      if (configRes.data) {
        reset({
          time_window_min: configRes.data.time_window_min,
          similarity_threshold: configRes.data.similarity_threshold,
          enable_llm_reasoning: configRes.data.enable_llm_reasoning,
          auto_resolve_children: configRes.data.auto_resolve_children,
        });
        setBlacklist(configRes.data.blacklist || []);
      }
      if (rulesRes.data) {
        setManualRules(rulesRes.data);
      }
    } catch (err) {
      console.warn("Express backend unresponsive, operating with default config state details.", err);
      // Hard fallback details
      setManualRules([
        { id: 1, name: "Ignore Ping Heartbeats", condition: "message contains 'ping' or 'heartbeat'", action: "suppress", enabled: true },
        { id: 2, name: "Escalate Postgres Failures", condition: "service == 'postgres-shard-3' or message contains 'FATAL'", action: "escalate to SEV-1", enabled: true },
        { id: 3, name: "Suppress Prometheus Scraping Fluctuations", condition: "service == 'healthcheck-daemon'", action: "suppress", enabled: false },
      ]);
      setBlacklist(["kube-system", "healthcheck-daemon"]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigAndRules();
  }, []);

  // Section 2: Service Blacklist Add/Remove
  const handleAddBlacklist = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = blacklistInput.trim();
    if (!clean) return;
    if (blacklist.includes(clean)) {
      toast.error("That node or service identifier is already blacklisted!");
      return;
    }
    setBlacklist([...blacklist, clean]);
    setBlacklistInput("");
    toast.success(`Service match criteria '${clean}' added to draft table.`);
  };

  const handleRemoveBlacklist = (item: string) => {
    setBlacklist(blacklist.filter(b => b !== item));
    toast.success(`Removed '${item}' from draft filters.`);
  };

  // Section 3: Toggle Manual Rules Status Checks
  const handleToggleRule = async (ruleId: number) => {
    try {
      const response = await axios.post(`/api/rules/${ruleId}/toggle`);
      const updatedRule = response.data.rule;
      
      setManualRules(manualRules.map(r => r.id === ruleId ? { ...r, enabled: updatedRule.enabled } : r));
      toast.success(`Successfully toggled Rule INC-${ruleId}!`);
    } catch (err) {
      // In-Memory dynamic toggle fallback if backend restricted
      setManualRules(manualRules.map(r => r.id === ruleId ? { ...r, enabled: !r.enabled } : r));
      toast.success(`Toggled Rule INC-${ruleId}! (Local View)`);
    }
  };

  // Section 4: What-If simulation request
  const handleSimulate = async () => {
    setSimulating(true);
    try {
      const response = await axios.post("/api/simulate", {
        new_threshold: simulationThreshold
      });
      setSimResults(response.data);
      toast.success("What-If ingestion simulation query compiled fine!", {
        icon: "🔬"
      });
    } catch (err) {
      console.error(err);
      toast.error("Simulation engine load timeout.");
    } finally {
      setSimulating(false);
    }
  };

  // Submit complete config POST
  const onSaveConfig = async (formData: any) => {
    try {
      const payload = {
        ...formData,
        blacklist // Merge with local state array
      };

      const response = await axios.post("/api/config", payload);
      toast.success("Config details pushed successfully to backend config!", {
        icon: "💾"
      });
    } catch (err) {
      console.error(err);
      toast.error("Configuration local storage save failed.");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-6 bg-zinc-200 rounded w-1/3"></div>
        <div className="h-48 bg-zinc-100 rounded-xl"></div>
        <div className="h-48 bg-zinc-100 rounded-xl"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      
      {/* Title */}
      <div className="border-b border-zinc-200 pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 flex items-center gap-2">
          <Settings className="text-indigo-600" />
          <span>Agent Settings & Rules</span>
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Configure agent classification sensitivity parameters, define raw telemetry blacklists, and toggle deterministic manual override schemas.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSaveConfig)} className="space-y-6">

        {/* Section 1: Core settings card */}
        <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm space-y-5">
          <div className="flex items-center gap-2 border-b border-zinc-100 pb-3">
            <Sliders size={18} className="text-indigo-600" />
            <span className="font-bold text-zinc-900 text-sm">Section 1: AI Cluster Core Tuning Settings</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Slider 1: time window */}
            <div className="space-y-2">
              <div className="flex justify-between items-baseline">
                <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider block">
                  Similarity Scan Window (Minutes)
                </label>
                <span className="bg-indigo-50 border border-indigo-150 text-indigo-700 font-mono text-xs font-bold px-1.5 py-0.5 rounded">
                  {watch("time_window_min")} Mins
                </span>
              </div>
              <input
                type="range"
                min="5"
                max="60"
                step="5"
                {...register("time_window_min")}
                className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-zinc-200 rounded-lg appearance-none"
              />
              <p className="text-[10px] text-zinc-400">
                Determines how far back the system will scan for existing similar events to group with (Defaults to 15m).
              </p>
            </div>

            {/* Slider 2: similarity-threshold */}
            <div className="space-y-2">
              <div className="flex justify-between items-baseline">
                <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider block">
                  Deduplication Cosine Threshold
                </label>
                <span className="bg-indigo-50 border border-indigo-150 text-indigo-700 font-mono text-xs font-bold px-1.5 py-0.5 rounded">
                  {Math.round(activeSimilarityThreshold * 100)}% Match
                </span>
              </div>
              <input
                type="range"
                min="0.70"
                max="0.95"
                step="0.01"
                {...register("similarity_threshold", { min: 0.70, max: 0.95 })}
                className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-zinc-200 rounded-lg appearance-none"
              />
              <p className="text-[10px] text-zinc-400">
                Minimum similarity log overlap percentage required for alert clustering matching (Must be of limits 0.70-0.95).
              </p>
              {errors.similarity_threshold && (
                <span className="text-xs font-bold text-red-500 block">Cosine weights boundary strict to 0.7 - 0.95</span>
              )}
            </div>

            {/* Toggle 3: LLM reasoning */}
            <label className="flex items-center justify-between p-3 bg-zinc-50 border border-zinc-150 rounded-xl select-none cursor-pointer hover:border-zinc-250 transition-colors">
              <div className="max-w-[80%]">
                <span className="text-xs font-bold text-zinc-800 block uppercase tracking-wide">
                  Enable SRE LLM Reasoning
                </span>
                <span className="text-[10px] text-zinc-400 mt-1 block">
                  Generates full-sentence deep reasoning and summary paragraphs for incoming alert streams using server-side Gemini intelligence.
                </span>
              </div>
              <input
                type="checkbox"
                {...register("enable_llm_reasoning")}
                className="sr-only peer"
              />
              <div className="peer-checked:hidden text-zinc-400">
                <ToggleLeft size={36} />
              </div>
              <div className="hidden peer-checked:block text-indigo-600">
                <ToggleRight size={36} />
              </div>
            </label>

            {/* Toggle 4: auto_resolve_children */}
            <label className="flex items-center justify-between p-3 bg-zinc-50 border border-zinc-150 rounded-xl select-none cursor-pointer hover:border-zinc-250 transition-colors">
              <div className="max-w-[80%]">
                <span className="text-xs font-bold text-zinc-800 block uppercase tracking-wide">
                  Auto-Resolve Child Alerts
                </span>
                <span className="text-[10px] text-zinc-400 mt-1 block">
                  Automatically clears or resolves child elements associated with a grouping cascade when the active parent incident is closed.
                </span>
              </div>
              <input
                type="checkbox"
                {...register("auto_resolve_children")}
                className="sr-only peer"
              />
              <div className="peer-checked:hidden text-zinc-400">
                <ToggleLeft size={36} />
              </div>
              <div className="hidden peer-checked:block text-indigo-600">
                <ToggleRight size={36} />
              </div>
            </label>
          </div>
        </div>

        {/* Section 2: Service Blacklist */}
        <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-zinc-100 pb-3">
            <ShieldBan size={18} className="text-indigo-600" />
            <span className="font-bold text-zinc-900 text-sm">Section 2: Filter Blacklist Pools</span>
          </div>

          <div className="space-y-4 text-xs font-sans">
            <p className="text-zinc-500">
              Services or modules registered in this blacklist are immediately dropped and ignored during raw alert ingestion.
            </p>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. kube-system"
                value={blacklistInput}
                onChange={(e) => setBlacklistInput(e.target.value)}
                className="bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-600 focus:bg-white text-zinc-800 flex-grow font-semibold"
              />
              <button
                type="button"
                onClick={handleAddBlacklist}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-1.5 rounded-lg border-indigo-700 hover:border-indigo-600 transition-colors cursor-pointer"
              >
                Add Filter Rule
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {blacklist.map((item, index) => (
                <span 
                  key={index} 
                  className="bg-zinc-100 border border-zinc-200 text-zinc-700 py-1 pl-3 pr-2 rounded-full inline-flex items-center gap-1.5 text-xs font-mono font-semibold"
                >
                  <span>{item}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveBlacklist(item)}
                    className="hover:text-red-600 hover:bg-zinc-200 p-0.5 rounded-full transition-colors cursor-pointer"
                  >
                    <Trash2 size={12} />
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Section 3: Manual Rules Table */}
        <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-zinc-100 pb-3">
            <ListChecks size={18} className="text-indigo-600" />
            <span className="font-bold text-zinc-900 text-sm">Section 3: Deterministic Manual Rules Table</span>
          </div>

          <p className="text-xs text-zinc-500 leading-relaxed font-sans">
            Explicit matching filters that override vector cosine similarity calculations to enforce strict SRE operational guidelines.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-sans text-xs">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-bold uppercase text-[10px]">
                  <th className="py-2 px-3">Rule ID</th>
                  <th className="py-2 px-3">Rule Identifier</th>
                  <th className="py-2 px-3">Boolean Match Condition</th>
                  <th className="py-2 px-3">Enforcement Action</th>
                  <th className="py-2 px-3 text-center">Status Toggle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 font-semibold text-zinc-750">
                {manualRules.map((rule) => (
                  <tr key={rule.id}>
                    <td className="py-3 px-3 font-mono text-zinc-500">RU-{rule.id}</td>
                    <td className="py-3 px-3 font-bold text-zinc-905">{rule.name}</td>
                    <td className="py-3 px-3 font-mono text-[10px] text-zinc-600">{rule.condition}</td>
                    <td className="py-3 px-3 uppercase text-[10px]">
                      <span className={`px-2 py-0.5 rounded font-bold ${
                        rule.action.includes("suppress") 
                          ? "bg-amber-50 text-amber-700 border border-amber-200" 
                          : "bg-red-50 text-red-700 border border-red-200"
                      }`}>
                        {rule.action}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleRule(rule.id)}
                        className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer border ${
                          rule.enabled 
                            ? "bg-emerald-50 text-emerald-700 border-emerald-250 hover:bg-emerald-100" 
                            : "bg-zinc-50 text-zinc-400 border-zinc-200 hover:bg-zinc-100"
                        }`}
                      >
                        {rule.enabled ? "ACTIVE" : "DISABLED"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 4: What-If Simulator */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 text-white shadow-xl space-y-4">
          <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
            <Settings className="text-purple-400 animate-spin" size={18} />
            <span className="font-bold text-purple-300 text-sm">Section 4: What-If Boundary Simulator</span>
          </div>

          <p className="text-xs text-zinc-350 leading-relaxed font-mono">
            Evaluate a dry-run threshold modification. Simulation results and dynamic counts are forecasted against current historical signals.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4 bg-zinc-950 border border-zinc-800 rounded-xl p-4">
            <div className="w-full sm:w-1/3 space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Configure Forecast Cosine Match</label>
              <select
                value={simulationThreshold}
                onChange={(e) => setSimulationThreshold(parseFloat(e.target.value))}
                className="w-full bg-zinc-900 border border-zinc-700 rounded p-1.5 focus:outline-none focus:border-purple-500 font-bold font-mono text-xs text-zinc-200 cursor-pointer"
              >
                <option value="0.70">0.70 (Aggressive Clustering)</option>
                <option value="0.75">0.75 (High Clustering)</option>
                <option value="0.80">0.80 (Standard Clustering)</option>
                <option value="0.82">0.82 (Dynamic Default)</option>
                <option value="0.85">0.85 (High Precision)</option>
                <option value="0.90">0.90 (Max Precision)</option>
                <option value="0.95">0.95 (Exact Signature)</option>
              </select>
            </div>

            <button
              type="button"
              onClick={handleSimulate}
              disabled={simulating}
              className="w-full sm:w-auto bg-purple-600 hover:bg-purple-500 font-bold text-xs py-2 px-5 border border-purple-700 hover:border-purple-600 cursor-pointer transition-colors mt-4 sm:mt-5 shrink-0 flex items-center justify-center gap-1.5 rounded-lg uppercase tracking-wider"
            >
              <Play size={12} className={simulating ? "animate-ping" : ""} />
              <span>{simulating ? "Compiling stats..." : "Forecast outcomes"}</span>
            </button>
          </div>

          {simResults && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-center font-mono animate-fadeIn">
              <div>
                <p className="text-[10px] text-zinc-400 uppercase font-medium">Incident Count (Previous)</p>
                <h4 className="text-xl md:text-2xl font-bold text-zinc-300 mt-1">{simResults.before_incident_count} active</h4>
              </div>
              <div className="border-l border-zinc-800">
                <p className="text-[9px] uppercase font-bold text-purple-400">Incident Count (Forecasted)</p>
                <h4 className="text-xl md:text-2xl font-bold text-white mt-1">{simResults.after_incident_count} active</h4>
              </div>
              <div className="border-l border-zinc-800">
                <p className="text-[10px] text-zinc-400 uppercase font-medium">Deduplication % (Previous)</p>
                <h4 className="text-xl md:text-2xl font-bold text-zinc-350 mt-1">{simResults.noise_reduction_before}%</h4>
              </div>
              <div className="border-l border-zinc-800">
                <p className="text-[9px] uppercase font-bold text-purple-400">Deduplication % (Forecasted)</p>
                <h4 className="text-xl md:text-2xl font-bold text-purple-400 mt-1">{simResults.noise_reduction_after}%</h4>
              </div>
            </div>
          )}
        </div>

        {/* Core Submission Actions */}
        <div className="flex justify-end gap-3 border-t border-zinc-150 pt-5">
          <button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm px-6 py-2.5 rounded-xl flex items-center gap-1.5 border border-indigo-700 hover:border-indigo-600 transition-colors shadow-lg shadow-indigo-600/10 cursor-pointer select-none"
          >
            <Save size={16} />
            <span>Store Settings</span>
          </button>
        </div>

      </form>
    </div>
  );
}
