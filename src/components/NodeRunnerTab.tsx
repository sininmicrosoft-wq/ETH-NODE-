import React, { useState } from 'react';
import {
  generateDockerCompose,
  generateSystemdUnit,
  generateSetupScript,
  estimateHardwareSpecs,
  NodeConfigOptions,
} from '../services/configGenerator';
import {
  HardDrive,
  Copy,
  Check,
  Server,
  Terminal,
  ShieldAlert,
  Download,
  Cpu,
  Layers,
  Sparkles,
  Zap,
} from 'lucide-react';

export const NodeRunnerTab: React.FC = () => {
  const [config, setConfig] = useState<NodeConfigOptions>({
    executionClient: 'Geth',
    consensusClient: 'Lighthouse',
    network: 'mainnet',
    syncMode: 'snap',
    enableMevBoost: true,
    enableMetrics: true,
    customMaxPeers: 50,
    dataDir: '/var/lib/ethereum',
  });

  const [activeOutputTab, setActiveOutputTab] = useState<'docker' | 'script' | 'systemd' | 'security'>('docker');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const hwSpecs = estimateHardwareSpecs(config.executionClient, config.syncMode);
  const dockerComposeCode = generateDockerCompose(config);
  const setupScriptCode = generateSetupScript(config);
  const systemdElCode = generateSystemdUnit(config.executionClient, 'execution', config.network);
  const systemdClCode = generateSystemdUnit(config.consensusClient, 'consensus', config.network);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  return (
    <div className="space-y-6">
      {/* Intro */}
      <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-emerald-400" />
            Ethereum Node Runner & Config Generator
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure, harden, and generate production scripts to run your own non-custodial Ethereum Execution and Consensus node.
          </p>
        </div>
        <div className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20">
          Pairing: {config.executionClient} + {config.consensusClient}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Stack Configuration (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 bg-slate-900/50 rounded-xl border border-slate-800 space-y-4">
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
              Client & Network Stack
            </h3>

            {/* Execution Client */}
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Execution Client (EL)</label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['Geth', 'Nethermind', 'Besu', 'Reth', 'Erigon'] as const).map((client) => (
                  <button
                    key={client}
                    onClick={() => setConfig({ ...config, executionClient: client })}
                    className={`py-2 px-2 text-xs font-medium rounded-lg border text-center transition-all ${
                      config.executionClient === client
                        ? 'bg-emerald-500/15 border-emerald-500/50 text-white font-semibold'
                        : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                    }`}
                  >
                    {client}
                  </button>
                ))}
              </div>
            </div>

            {/* Consensus Client */}
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Consensus Client (CL)</label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['Lighthouse', 'Prysm', 'Teku', 'Lodestar', 'Nimbus'] as const).map((client) => (
                  <button
                    key={client}
                    onClick={() => setConfig({ ...config, consensusClient: client })}
                    className={`py-2 px-2 text-xs font-medium rounded-lg border text-center transition-all ${
                      config.consensusClient === client
                        ? 'bg-blue-500/15 border-blue-500/50 text-white font-semibold'
                        : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                    }`}
                  >
                    {client}
                  </button>
                ))}
              </div>
            </div>

            {/* Network Selector */}
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Network Target</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'mainnet', label: 'Mainnet' },
                  { id: 'sepolia', label: 'Sepolia Testnet' },
                  { id: 'holesky', label: 'Holesky Testnet' },
                ].map((net) => (
                  <button
                    key={net.id}
                    onClick={() => setConfig({ ...config, network: net.id as any })}
                    className={`py-1.5 px-2 text-xs font-medium rounded-lg border text-center transition-all ${
                      config.network === net.id
                        ? 'bg-slate-800 border-emerald-500/40 text-white'
                        : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {net.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sync Mode */}
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Sync Mode</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setConfig({ ...config, syncMode: 'snap' })}
                  className={`p-2.5 text-left rounded-lg border text-xs transition-all ${
                    config.syncMode === 'snap'
                      ? 'bg-slate-800 border-emerald-500/40 text-white'
                      : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <div className="font-semibold text-slate-200">Snap Sync (Full Node)</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Recommended for 95% of node runners (~1.1TB)</div>
                </button>
                <button
                  onClick={() => setConfig({ ...config, syncMode: 'archive' })}
                  className={`p-2.5 text-left rounded-lg border text-xs transition-all ${
                    config.syncMode === 'archive'
                      ? 'bg-slate-800 border-emerald-500/40 text-white'
                      : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <div className="font-semibold text-slate-200">Archive Node</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Retains historical state from genesis (&gt;3TB)</div>
                </button>
              </div>
            </div>

            {/* Options Checkboxes */}
            <div className="space-y-2 pt-2 border-t border-slate-800/80">
              <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={config.enableMevBoost}
                  onChange={(e) => setConfig({ ...config, enableMevBoost: e.target.checked })}
                  className="rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-0"
                />
                <span>Include MEV-Boost sidecar container (Proposer-Builder Separation)</span>
              </label>

              <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={config.enableMetrics}
                  onChange={(e) => setConfig({ ...config, enableMetrics: e.target.checked })}
                  className="rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-0"
                />
                <span>Enable Prometheus metrics telemetry ports</span>
              </label>
            </div>
          </div>

          {/* Hardware & Resource Estimator */}
          <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-800 space-y-3">
            <h3 className="text-xs font-semibold text-white flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-blue-400" />
              Hardware Requirements Estimator
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Processor (CPU)</span>
                <span className="font-medium text-slate-200 text-right">{hwSpecs.cpu}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">System Memory</span>
                <span className="font-medium text-slate-200">{hwSpecs.ram}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">NVMe SSD Storage</span>
                <span className="font-medium text-emerald-400 text-right">{hwSpecs.storage}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Disk Space Needed</span>
                <span className="font-mono text-slate-200">{hwSpecs.approxDiskSize}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Network Bandwidth</span>
                <span className="font-medium text-slate-200">{hwSpecs.bandwidth}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-400">Initial Sync Cadence</span>
                <span className="text-emerald-400 text-right">{hwSpecs.syncTimeEstimate}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Code Output Viewer (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Subtabs for outputs */}
          <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
              <div className="flex items-center gap-1">
                {[
                  { id: 'docker', label: 'docker-compose.yml' },
                  { id: 'script', label: 'init-node.sh' },
                  { id: 'systemd', label: 'systemd Units' },
                  { id: 'security', label: 'Firewall & Security' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveOutputTab(tab.id as any)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      activeOutputTab === tab.id
                        ? 'bg-slate-800 text-white border border-slate-700'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {activeOutputTab !== 'security' && (
                <button
                  onClick={() => {
                    const textToCopy =
                      activeOutputTab === 'docker'
                        ? dockerComposeCode
                        : activeOutputTab === 'script'
                        ? setupScriptCode
                        : `${systemdElCode}\n\n# --- Consensus Unit ---\n\n${systemdClCode}`;
                    copyToClipboard(textToCopy, activeOutputTab);
                  }}
                  className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded transition-colors"
                >
                  {copiedKey === activeOutputTab ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>Copy File</span>
                </button>
              )}
            </div>

            {/* Code Box */}
            {activeOutputTab === 'docker' && (
              <pre className="p-4 bg-slate-950 rounded-lg border border-slate-800 font-mono text-xs text-emerald-300 overflow-x-auto max-h-[480px]">
                {dockerComposeCode}
              </pre>
            )}

            {activeOutputTab === 'script' && (
              <pre className="p-4 bg-slate-950 rounded-lg border border-slate-800 font-mono text-xs text-emerald-300 overflow-x-auto max-h-[480px]">
                {setupScriptCode}
              </pre>
            )}

            {activeOutputTab === 'systemd' && (
              <div className="space-y-4 max-h-[480px] overflow-y-auto">
                <div>
                  <div className="text-[11px] font-mono text-slate-400 mb-1">
                    /etc/systemd/system/execution.service ({config.executionClient})
                  </div>
                  <pre className="p-3 bg-slate-950 rounded border border-slate-800 font-mono text-xs text-emerald-300 overflow-x-auto">
                    {systemdElCode}
                  </pre>
                </div>
                <div>
                  <div className="text-[11px] font-mono text-slate-400 mb-1">
                    /etc/systemd/system/consensus.service ({config.consensusClient})
                  </div>
                  <pre className="p-3 bg-slate-950 rounded border border-slate-800 font-mono text-xs text-emerald-300 overflow-x-auto">
                    {systemdClCode}
                  </pre>
                </div>
              </div>
            )}

            {activeOutputTab === 'security' && (
              <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 text-xs space-y-4">
                <div className="flex items-start gap-2.5 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-300">
                  <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-amber-200">Critical Port Security Rule</div>
                    <div className="text-slate-300 text-[11px] mt-0.5">
                      NEVER expose port <strong>8545 (JSON-RPC)</strong> or port <strong>8551 (Engine API)</strong> to the public Internet without reverse-proxy authentication. Doing so allows attackers to drain signing accounts or manipulate fork choice.
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="font-semibold text-white">Recommended UFW Firewall Setup</div>
                  <pre className="p-3 bg-slate-900 rounded font-mono text-emerald-300 text-[11px]">
{`# 1. Allow SSH (Adjust port if non-standard)
sudo ufw allow 22/tcp

# 2. Allow DevP2P Execution Ports (Ingress & Egress)
sudo ufw allow 30303/tcp
sudo ufw allow 30303/udp

# 3. Allow Consensus Beacon P2P Ports
sudo ufw allow 9000/tcp
sudo ufw allow 9000/udp

# 4. Enable UFW firewall
sudo ufw enable
sudo ufw status verbose`}
                  </pre>
                </div>

                <div className="space-y-1.5 text-slate-300 text-[11px] leading-relaxed">
                  <div className="font-semibold text-white">Engine API Authentication (JWT Secret):</div>
                  <p>
                    The Execution and Consensus clients authenticate all block communications using a shared 32-byte secret stored in a local file (<code className="text-emerald-400">jwt.hex</code>). This prevents unauthorized processes on your machine from tampering with the state transition.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
