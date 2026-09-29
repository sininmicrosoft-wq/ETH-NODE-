import React, { useState } from 'react';
import { EXECUTION_CLIENTS, CONSENSUS_CLIENTS, ClientSpec } from '../data/nodeArchitectures';
import {
  Layers,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  Cpu,
  Key,
  Zap,
  Lock,
  GitBranch,
  Clock,
  Compass,
} from 'lucide-react';

export const ArchitectureTab: React.FC = () => {
  const [activeClientType, setActiveClientType] = useState<'execution' | 'consensus'>('execution');
  const [selectedClient, setSelectedClient] = useState<ClientSpec>(EXECUTION_CLIENTS[0]);

  const activeClients = activeClientType === 'execution' ? EXECUTION_CLIENTS : CONSENSUS_CLIENTS;

  return (
    <div className="space-y-6">
      {/* Overview header */}
      <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-400" />
            Proof-of-Stake Node Architecture & Engine API
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Since The Merge, every Ethereum node consists of two decoupled clients communicating via the authenticated Engine API.
          </p>
        </div>
        <div className="text-xs font-mono text-slate-400 flex items-center gap-2">
          <span>Engine Port:</span>
          <span className="text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
            8551 (JWT Auth)
          </span>
        </div>
      </div>

      {/* Visual Flow Diagram */}
      <div className="p-6 bg-slate-900/40 rounded-xl border border-slate-800 overflow-x-auto">
        <div className="min-w-[700px] flex items-center justify-between gap-4 relative">
          {/* Box 1: Consensus Layer */}
          <div className="flex-1 p-4 bg-slate-950/80 rounded-xl border border-blue-500/30">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-400 font-mono">Consensus Layer (CL)</span>
              <span className="text-[10px] text-slate-400 bg-blue-500/10 px-1.5 py-0.5 rounded">Port 9000 P2P</span>
            </div>
            <div className="text-sm font-semibold text-white mt-1">Beacon Node & Validator</div>
            <ul className="text-[11px] text-slate-400 mt-2.5 space-y-1 list-disc list-inside">
              <li>P2P Discv5 & Gossipsub network</li>
              <li>Slot clock (12s) & Epoch accounting (32 slots)</li>
              <li>Attestations, Sync Committee & Slashing</li>
              <li>Fork choice rule (LMD-GHOST / Gasper)</li>
            </ul>
            <div className="mt-3 pt-2 border-t border-slate-800/80 text-[10px] text-slate-500">
              Clients: Lighthouse, Prysm, Teku, Lodestar, Nimbus
            </div>
          </div>

          {/* Engine API Bridge */}
          <div className="flex flex-col items-center justify-center px-2 py-4">
            <div className="flex items-center gap-1 text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 mb-1">
              <Key className="w-3 h-3" />
              <span>JWT Secret</span>
            </div>
            <div className="w-24 border-t-2 border-dashed border-slate-600 relative my-2">
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-slate-900 px-1 text-[9px] text-slate-400 font-mono">
                Port 8551
              </div>
            </div>
            <div className="text-[10px] text-slate-400 text-center font-mono">
              engine_newPayloadV3<br />engine_forkchoiceUpdated
            </div>
          </div>

          {/* Box 2: Execution Layer */}
          <div className="flex-1 p-4 bg-slate-950/80 rounded-xl border border-emerald-500/30">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-400 font-mono">Execution Layer (EL)</span>
              <span className="text-[10px] text-slate-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">Port 30303 P2P</span>
            </div>
            <div className="text-sm font-semibold text-white mt-1">EVM & State Trie Engine</div>
            <ul className="text-[11px] text-slate-400 mt-2.5 space-y-1 list-disc list-inside">
              <li>EVM execution, opcode processing, gas metering</li>
              <li>Account state tree & Merkle Patricia Trie</li>
              <li>Transaction mempool & validation</li>
              <li>JSON-RPC interface for dApps (Port 8545)</li>
            </ul>
            <div className="mt-3 pt-2 border-t border-slate-800/80 text-[10px] text-slate-500">
              Clients: Geth, Nethermind, Besu, Reth, Erigon
            </div>
          </div>

          {/* Optional: MEV Boost */}
          <div className="flex flex-col items-center justify-center px-1">
            <ArrowRight className="w-4 h-4 text-slate-600" />
          </div>

          {/* Box 3: MEV-Boost / Relays */}
          <div className="w-48 p-4 bg-slate-950/60 rounded-xl border border-purple-500/30">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-400 font-mono">MEV-Boost</span>
              <span className="text-[10px] text-slate-400">Port 18550</span>
            </div>
            <div className="text-xs font-semibold text-white mt-1">PBS Builder Auction</div>
            <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
              Connects validators to external block builders (Titan, Flashbots, Beaver) for maximum extraction and proposer rewards.
            </p>
          </div>
        </div>
      </div>

      {/* Client Diversity Section */}
      <div className="p-5 bg-slate-900/40 rounded-xl border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Client Diversity & Consensus Resilience
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Ethereum security requires that no single client implementation commands &gt;66% (supermajority) or &gt;33% of the network.
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="flex items-center gap-1 text-rose-400">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              &gt;66% Critical Slashing Risk
            </span>
            <span className="flex items-center gap-1 text-amber-400">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              &gt;33% Finality Risk
            </span>
          </div>
        </div>

        {/* Execution Client Diversity Bar */}
        <div>
          <div className="flex items-center justify-between text-xs text-slate-300 mb-1.5 font-medium">
            <span>Execution Layer (EL) Diversity</span>
            <span className="text-slate-400 text-[11px] font-mono">Geth target: &lt;33%</span>
          </div>
          <div className="w-full h-5 rounded-lg bg-slate-950 overflow-hidden flex text-[10px] font-mono text-white select-none">
            {EXECUTION_CLIENTS.map((c, i) => {
              const colors = [
                'bg-blue-600',
                'bg-emerald-600',
                'bg-purple-600',
                'bg-amber-600',
                'bg-cyan-600',
              ];
              return (
                <div
                  key={c.name}
                  style={{ width: `${c.marketShare}%` }}
                  title={`${c.name}: ${c.marketShare}%`}
                  className={`${colors[i % colors.length]} flex items-center justify-center px-1 font-semibold truncate hover:opacity-90 transition-opacity`}
                >
                  {c.marketShare >= 6 ? `${c.name} ${c.marketShare}%` : ''}
                </div>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-4 mt-2 text-[11px] text-slate-400">
            {EXECUTION_CLIENTS.map((c, i) => {
              const dots = ['bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-amber-500', 'bg-cyan-500'];
              return (
                <div key={c.name} className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${dots[i % dots.length]}`} />
                  <span className="text-slate-200">{c.name}</span>
                  <span className="font-mono text-slate-400">{c.marketShare}%</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Consensus Client Diversity Bar */}
        <div className="pt-2">
          <div className="flex items-center justify-between text-xs text-slate-300 mb-1.5 font-medium">
            <span>Consensus Layer (CL) Diversity</span>
            <span className="text-emerald-400 text-[11px] font-mono">Healthy (No supermajority)</span>
          </div>
          <div className="w-full h-5 rounded-lg bg-slate-950 overflow-hidden flex text-[10px] font-mono text-white select-none">
            {CONSENSUS_CLIENTS.map((c, i) => {
              const colors = [
                'bg-teal-600',
                'bg-indigo-600',
                'bg-pink-600',
                'bg-amber-600',
                'bg-emerald-600',
              ];
              return (
                <div
                  key={c.name}
                  style={{ width: `${c.marketShare}%` }}
                  title={`${c.name}: ${c.marketShare}%`}
                  className={`${colors[i % colors.length]} flex items-center justify-center px-1 font-semibold truncate hover:opacity-90 transition-opacity`}
                >
                  {c.marketShare >= 7 ? `${c.name} ${c.marketShare}%` : ''}
                </div>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-4 mt-2 text-[11px] text-slate-400">
            {CONSENSUS_CLIENTS.map((c, i) => {
              const dots = ['bg-teal-500', 'bg-indigo-500', 'bg-pink-500', 'bg-amber-500', 'bg-emerald-500'];
              return (
                <div key={c.name} className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${dots[i % dots.length]}`} />
                  <span className="text-slate-200">{c.name}</span>
                  <span className="font-mono text-slate-400">{c.marketShare}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Client Explorer Catalog */}
      <div className="p-5 bg-slate-900/40 rounded-xl border border-slate-800 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-semibold text-white">Ethereum Client Implementations</h3>
            <p className="text-xs text-slate-400">Compare languages, memory characteristics, and architectures.</p>
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800">
            <button
              onClick={() => {
                setActiveClientType('execution');
                setSelectedClient(EXECUTION_CLIENTS[0]);
              }}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                activeClientType === 'execution'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Execution Clients ({EXECUTION_CLIENTS.length})
            </button>
            <button
              onClick={() => {
                setActiveClientType('consensus');
                setSelectedClient(CONSENSUS_CLIENTS[0]);
              }}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                activeClientType === 'consensus'
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Consensus Clients ({CONSENSUS_CLIENTS.length})
            </button>
          </div>
        </div>

        {/* Client cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {activeClients.map((client) => {
            const isSelected = selectedClient.name === client.name;
            return (
              <div
                key={client.name}
                onClick={() => setSelectedClient(client)}
                className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-slate-850 border-emerald-500/50 shadow-md'
                    : 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                      <span>{client.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono font-normal">
                        ({client.language})
                      </span>
                    </h4>
                    <div className="text-[11px] text-slate-400 mt-0.5">{client.developer}</div>
                  </div>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                      client.status === 'Recommended'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : client.status === 'Majority'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        : 'bg-slate-800 text-slate-300 border-slate-700'
                    }`}
                  >
                    {client.status}
                  </span>
                </div>

                <p className="text-xs text-slate-300 mt-3 leading-relaxed line-clamp-3">
                  {client.description}
                </p>

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <div>
                    P2P: <span className="text-slate-200">:{client.defaultP2pPort}</span>
                  </div>
                  <div>
                    HTTP: <span className="text-slate-200">:{client.defaultHttpPort}</span>
                  </div>
                  <a
                    href={client.docsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1 text-emerald-400 hover:underline font-sans"
                  >
                    <span>Docs</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
