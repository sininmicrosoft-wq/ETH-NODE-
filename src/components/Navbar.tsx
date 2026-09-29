import React from 'react';
import { RpcEndpoint, NodeMetrics } from '../types/ethereum';
import { Server, RefreshCw, Activity, Layers, Terminal, Cpu, HardDrive, Search } from 'lucide-react';

interface NavbarProps {
  currentEndpoint: RpcEndpoint;
  metrics: NodeMetrics | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenNetworkModal: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentEndpoint,
  metrics,
  activeTab,
  setActiveTab,
  onOpenNetworkModal,
  onRefresh,
  isRefreshing,
}) => {
  const tabs = [
    { id: 'overview', label: 'Telemetry & Blocks', icon: Activity },
    { id: 'console', label: 'JSON-RPC Console', icon: Terminal },
    { id: 'architecture', label: 'PoS Architecture', icon: Layers },
    { id: 'runner', label: 'Node Runner Config', icon: HardDrive },
    { id: 'state', label: 'State & Gas', icon: Search },
  ];

  return (
    <header className="border-b border-slate-800/80 bg-[#0d131f] sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Zone 1: Wordmark */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('overview')}
              className="text-left group flex items-center gap-2.5 focus:outline-none"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:border-emerald-500/50 transition-colors">
                <Cpu className="w-4 h-4" />
              </div>
              <div>
                <span className="text-base font-bold tracking-tight text-white font-mono flex items-center gap-1.5">
                  EtherNode
                  <span className="text-[10px] uppercase tracking-wider text-emerald-400 font-sans font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                    Live
                  </span>
                </span>
              </div>
            </button>
          </div>

          {/* Zone 2: Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Actions & Active Endpoint */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              title="Refresh telemetry"
              className="p-2 text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 rounded-md transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
            </button>

            <button
              onClick={onOpenNetworkModal}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/70 hover:bg-slate-800 border border-slate-700 rounded-md transition-colors group"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)] animate-pulse" />
              <span className="truncate max-w-[130px] sm:max-w-[170px] text-left">
                {currentEndpoint.name.split(' (')[0]}
              </span>
              <span className="font-mono text-[11px] text-slate-400 border-l border-slate-700 pl-2">
                {metrics ? `${metrics.latencyMs}ms` : 'Connecting'}
              </span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="flex md:hidden overflow-x-auto py-2 gap-1 border-t border-slate-800/60">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded whitespace-nowrap ${
                  isActive
                    ? 'bg-slate-800 text-white border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3 h-3" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
