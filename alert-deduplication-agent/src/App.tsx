import React, { useState, useRef } from "react";
import { Toaster } from "react-hot-toast";
import { 
  Activity, Radio, TrendingUp, Sliders, ShieldCheck, 
  Terminal, Server, Box, Globe, Cpu, RefreshCw, BarChart2,
  ListCheck, Sparkles, LogOut, ChevronRight
} from "lucide-react";
import IncidentsFeed from "./components/IncidentsFeed";
import IncidentDetail from "./components/IncidentDetail";
import StatsDashboard from "./components/StatsDashboard";
import AgentConfig from "./components/AgentConfig";
import AlertIngester from "./components/AlertIngester";
import AlertPlayground from "./components/AlertPlayground";

type ActivePage = "incidents" | "incident-detail" | "performance" | "config" | "playground";

export default function App() {
  const [activePage, setActivePage] = useState<ActivePage>("incidents");
  const [selectedIncidentId, setSelectedIncidentId] = useState<number | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Home route detail redirection handler
  const handleNavigateDetail = (id: number) => {
    setSelectedIncidentId(id);
    setActivePage("incident-detail");
  };

  const handleNavigateFeed = () => {
    setSelectedIncidentId(null);
    setActivePage("incidents");
  };

  // Re-trigger callbacks when a raw alert is successfully ingested 
  const handleOnAlertIngested = () => {
    console.log("New raw alert successfully ingested! Re-triggering API calls...");
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col font-sans text-zinc-900 antialiased selection:bg-indigo-600 selection:text-white">
      {/* Toast provider */}
      <Toaster position="top-right" reverseOrder={false} />

      {/* Top Professional SRE Margin Bar */}
      <div className="bg-zinc-950 text-zinc-400 text-[11px] font-mono py-1 px-4 flex items-center justify-between border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Deduplication Agent Online
          </span>
          <span className="hidden sm:inline text-zinc-600">|</span>
          <span className="hidden sm:inline">Engine: pgvector-v0.2.0 + ollama-llama3</span>
        </div>
        <div className="flex items-center gap-3 font-medium">
          <span className="hidden md:inline">User Session: dharanithasekar23@gmail.com</span>
          <span className="text-zinc-650">|</span>
          <span className="text-zinc-300">Local Space</span>
        </div>
      </div>

      {/* Main Container Assembly */}
      <div className="flex flex-col lg:flex-row flex-grow">
        
        {/* Left Side Dashboard Rail Drawer (Persistent on Desktop, Adaptive Header on mobile) */}
        <aside className="w-full lg:w-72 bg-zinc-950 text-white flex-shrink-0 flex flex-col border-r border-zinc-800">
          
          {/* Brand Header */}
          <div className="p-5 border-b border-zinc-900 flex items-center gap-2.5">
            <div className="p-2 bg-indigo-600 text-white rounded-lg shadow-md shadow-indigo-600/20">
              <Activity size={20} className="stroke-[2.5]" />
            </div>
            <div>
              <h1 className="font-extrabold tracking-tight text-sm font-mono text-white">ALERT-DEDUPE AI</h1>
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider font-sans mt-0.5">SRE AGENT v1.02</p>
            </div>
          </div>

          {/* Navigation Links Assembly */}
          <nav className="p-4 space-y-1.5 flex-grow">
            
            {/* Nav 1: Live Incidents */}
            <button
              onClick={handleNavigateFeed}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all text-left cursor-pointer select-none ${
                activePage === "incidents" || activePage === "incident-detail"
                  ? "bg-zinc-900 border-l-4 border-indigo-500 text-zinc-100 font-bold shadow-xs"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-900/50"
              }`}
            >
              <Radio size={15} className="text-indigo-400" />
              <span>Live Incidents</span>
              <span className="ml-auto bg-red-950 text-red-400 border border-red-900 px-1.5 py-0.5 rounded text-[9px] font-mono">
                LIVE
              </span>
            </button>

            {/* Nav 1B: Interactive Alert Ingest Playground */}
            <button
              onClick={() => { setSelectedIncidentId(null); setActivePage("playground"); }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all text-left cursor-pointer select-none ${
                activePage === "playground"
                  ? "bg-zinc-900 border-l-4 border-indigo-500 text-zinc-100 font-extrabold shadow-sm"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-900/50"
              }`}
            >
              <Terminal size={15} className="text-emerald-400" />
              <span>Ingest Workspace</span>
              <span className="ml-auto bg-emerald-950 text-emerald-400 border border-emerald-900 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold">
                NEW
              </span>
            </button>

            {/* Nav 2: Agent Performance Stats */}
            <button
              onClick={() => { setSelectedIncidentId(null); setActivePage("performance"); }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all text-left cursor-pointer select-none ${
                activePage === "performance"
                  ? "bg-zinc-900 border-l-4 border-indigo-500 text-zinc-100 font-bold shadow-xs"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-900/50"
              }`}
            >
              <BarChart2 size={15} className="text-purple-400" />
              <span>Performance Metrics</span>
            </button>

            {/* Nav 3: Tuning Rules Config */}
            <button
              onClick={() => { setSelectedIncidentId(null); setActivePage("config"); }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all text-left cursor-pointer select-none ${
                activePage === "config"
                  ? "bg-zinc-900 border-l-4 border-indigo-500 text-zinc-100 font-bold shadow-xs"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-900/50"
              }`}
            >
              <Sliders size={15} className="text-amber-400" />
              <span>Config & Rules</span>
            </button>

            {/* Spacer dividing simulator tool */}
            <div className="pt-6 border-t border-zinc-900 my-4">
              <span className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-widest px-3 block mb-3">SRE Testing Suite</span>
              
              {/* Floating Alert Ingestion simulated trigger */}
              <AlertIngester onIngestSuccess={handleOnAlertIngested} />
            </div>

          </nav>

          {/* System status details at bottom */}
          <div className="p-4 bg-zinc-950 border-t border-zinc-900">
            <div className="bg-zinc-900 rounded-lg p-3 text-zinc-400 flex flex-col gap-2 font-mono text-[10px]">
              <div className="flex justify-between">
                <span>Ingestion Node:</span>
                <span className="text-zinc-200">Express Server</span>
              </div>
              <div className="flex justify-between">
                <span>Status:</span>
                <span className="text-emerald-400 font-bold">HEALTHY</span>
              </div>
              <div className="flex justify-between">
                <span>FastAPI Replica:</span>
                <span className="text-indigo-400 underline">app.py Code</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Right Side Main Stage */}
        <main className="flex-grow p-4 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
          
          {/* Active Navigation Render Stage */}
          <div className="animate-fadeIn">
            {activePage === "incidents" && (
              <IncidentsFeed 
                refreshTrigger={refreshTrigger} 
                onNavigateDetail={handleNavigateDetail} 
              />
            )}

            {activePage === "incident-detail" && selectedIncidentId !== null && (
              <IncidentDetail 
                incidentId={selectedIncidentId} 
                onNavigateHome={handleNavigateFeed} 
              />
            )}

            {activePage === "performance" && (
              <StatsDashboard />
            )}

            {activePage === "config" && (
              <AgentConfig />
            )}

            {activePage === "playground" && (
              <AlertPlayground 
                onIngestSuccess={handleOnAlertIngested} 
                onViewIncident={handleNavigateDetail} 
              />
            )}
          </div>

        </main>
      </div>

      {/* SRE Professional Footer */}
      <footer className="bg-white border-t border-zinc-200 text-zinc-450 text-[11px] font-medium py-3 px-6 text-center shadow-xs">
        This unified AI Alert Deduplication Agent system automatically evaluates real-time telemetry clusters using advanced SRE patterns.
      </footer>
    </div>
  );
}
