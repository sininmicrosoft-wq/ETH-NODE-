import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Terminal,
  Play,
  Pause,
  Copy,
  Check,
  Trash2,
  Search,
  Filter,
  ArrowDownCircle,
  Activity,
  Zap,
  Layers,
  Cpu,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';

export interface SystemLogEntry {
  id: string;
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ENGINE' | 'ATTEST';
  client: 'lighthouse' | 'prysm';
  slot: number;
  epoch: number;
  message: string;
  rawText: string;
}

interface SystemLogsCardProps {
  latestBlockNum: number;
  currentBaseFee: number;
  peerCount: number;
  clientVersion: string;
  safeBlockNum: number;
  finalizedBlockNum: number;
}

export const SystemLogsCard: React.FC<SystemLogsCardProps> = ({
  latestBlockNum,
  currentBaseFee,
  peerCount,
  clientVersion,
  safeBlockNum,
  finalizedBlockNum,
}) => {
  const [selectedClient, setSelectedClient] = useState<'all' | 'lighthouse' | 'prysm'>('lighthouse');
  const [logFilter, setLogFilter] = useState<'all' | 'INFO' | 'WARN' | 'ENGINE' | 'ATTEST'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isStreaming, setIsStreaming] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);
  const [copied, setCopied] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Generate initial log buffer
  const [logs, setLogs] = useState<SystemLogEntry[]>(() => {
    const baseSlot = 1048590;
    const baseEpoch = Math.floor(baseSlot / 32);
    const now = Date.now();

    const initialEntries: SystemLogEntry[] = [
      {
        id: 'log-0',
        timestamp: new Date(now - 45000).toISOString().replace('T', ' ').substring(0, 19),
        level: 'INFO',
        client: 'lighthouse',
        slot: baseSlot - 4,
        epoch: baseEpoch,
        message: `Synced slot: ${baseSlot - 4}, epoch: ${baseEpoch}, head: 0x8a1f...312e, peers: ${peerCount || 48}, exec_status: Valid, service: beacon`,
        rawText: `INFO Synced slot: ${baseSlot - 4}, epoch: ${baseEpoch}, head: 0x8a1f...312e, peers: ${peerCount || 48}, exec_status: Valid, service: beacon`,
      },
      {
        id: 'log-1',
        timestamp: new Date(now - 38000).toISOString().replace('T', ' ').substring(0, 19),
        level: 'ATTEST',
        client: 'lighthouse',
        slot: baseSlot - 3,
        epoch: baseEpoch,
        message: `Attestation published, subnet: 14, slot: ${baseSlot - 3}, committee_index: 3, delay: 142ms, validators: 64`,
        rawText: `ATTEST Attestation published, subnet: 14, slot: ${baseSlot - 3}, committee_index: 3, delay: 142ms, validators: 64`,
      },
      {
        id: 'log-2',
        timestamp: new Date(now - 30000).toISOString().replace('T', ' ').substring(0, 19),
        level: 'ENGINE',
        client: 'lighthouse',
        slot: baseSlot - 3,
        epoch: baseEpoch,
        message: `Engine API forkchoiceUpdatedV3, head_block: ${latestBlockNum - 2}, safe_block: ${safeBlockNum}, finalized_block: ${finalizedBlockNum}, latency: 14.2ms`,
        rawText: `ENGINE Engine API forkchoiceUpdatedV3, head_block: ${latestBlockNum - 2}, safe_block: ${safeBlockNum}, finalized_block: ${finalizedBlockNum}, latency: 14.2ms`,
      },
      {
        id: 'log-3',
        timestamp: new Date(now - 24000).toISOString().replace('T', ' ').substring(0, 19),
        level: 'INFO',
        client: 'prysm',
        slot: baseSlot - 2,
        epoch: baseEpoch,
        message: `blockchain: Finished processing block slot=${baseSlot - 2} epoch=${baseEpoch} root=0x41f9...e12a txs=148 duration=26.3ms`,
        rawText: `INFO blockchain: Finished processing block slot=${baseSlot - 2} epoch=${baseEpoch} root=0x41f9...e12a txs=148 duration=26.3ms`,
      },
      {
        id: 'log-4',
        timestamp: new Date(now - 18000).toISOString().replace('T', ' ').substring(0, 19),
        level: 'ENGINE',
        client: 'prysm',
        slot: baseSlot - 2,
        epoch: baseEpoch,
        message: `execution: Engine API call successful method=engine_newPayloadV3 status=VALID executionTime=18.4ms gasUsed=14.8M`,
        rawText: `ENGINE execution: Engine API call successful method=engine_newPayloadV3 status=VALID executionTime=18.4ms gasUsed=14.8M`,
      },
      {
        id: 'log-5',
        timestamp: new Date(now - 12000).toISOString().replace('T', ' ').substring(0, 19),
        level: 'WARN',
        client: 'lighthouse',
        slot: baseSlot - 1,
        epoch: baseEpoch,
        message: `Peer disconnected (dial timeout), peer_id: 16Uiu2HAm... [Nethermind/v1.26], active_peers: ${(peerCount || 48) - 1}`,
        rawText: `WARN Peer disconnected (dial timeout), peer_id: 16Uiu2HAm... [Nethermind/v1.26], active_peers: ${(peerCount || 48) - 1}`,
      },
      {
        id: 'log-6',
        timestamp: new Date(now - 6000).toISOString().replace('T', ' ').substring(0, 19),
        level: 'INFO',
        client: 'lighthouse',
        slot: baseSlot,
        epoch: baseEpoch,
        message: `Discv5 discovered 3 new peers, dialing tcp://198.51.100.42:9000... peer mesh active: ${peerCount || 48}`,
        rawText: `INFO Discv5 discovered 3 new peers, dialing tcp://198.51.100.42:9000... peer mesh active: ${peerCount || 48}`,
      },
      {
        id: 'log-7',
        timestamp: new Date(now).toISOString().replace('T', ' ').substring(0, 19),
        level: 'INFO',
        client: 'lighthouse',
        slot: baseSlot,
        epoch: baseEpoch,
        message: `Target epoch ${baseEpoch} finalized, checkpoint root: 0x9e12...44f0, participation_rate: 99.4%, sync_status: In-step (0 slot lag)`,
        rawText: `INFO Target epoch ${baseEpoch} finalized, checkpoint root: 0x9e12...44f0, participation_rate: 99.4%, sync_status: In-step (0 slot lag)`,
      },
    ];

    return initialEntries;
  });

  // Simulated live log generator
  useEffect(() => {
    if (!isStreaming) return;

    const interval = setInterval(() => {
      const now = new Date();
      const timeStr = now.toISOString().replace('T', ' ').substring(0, 19);
      const currentSlot = 1048590 + Math.floor((now.getTime() % 120000) / 12000);
      const currentEpoch = Math.floor(currentSlot / 32);

      const templates = [
        {
          level: 'INFO' as const,
          client: 'lighthouse' as const,
          msg: `Synced slot: ${currentSlot}, epoch: ${currentEpoch}, head: 0x${Math.random().toString(16).slice(2, 8)}...${Math.random().toString(16).slice(2, 6)}, peers: ${peerCount || 48}, exec_status: Valid, service: beacon`,
        },
        {
          level: 'ATTEST' as const,
          client: 'lighthouse' as const,
          msg: `Attestation published, subnet: ${Math.floor(Math.random() * 64)}, slot: ${currentSlot}, committee_index: ${Math.floor(Math.random() * 8)}, delay: ${(110 + Math.floor(Math.random() * 80))}ms`,
        },
        {
          level: 'ENGINE' as const,
          client: 'lighthouse' as const,
          msg: `Engine API forkchoiceUpdatedV3, head_block: ${latestBlockNum}, safe_block: ${safeBlockNum}, finalized_block: ${finalizedBlockNum}, latency: ${(10 + Math.random() * 6).toFixed(1)}ms`,
        },
        {
          level: 'INFO' as const,
          client: 'prysm' as const,
          msg: `blockchain: Finished processing block slot=${currentSlot} epoch=${currentEpoch} root=0x${Math.random().toString(16).slice(2, 10)} txs=${140 + Math.floor(Math.random() * 50)} duration=22.1ms`,
        },
        {
          level: 'ENGINE' as const,
          client: 'prysm' as const,
          msg: `execution: Engine API call successful method=engine_newPayloadV3 status=VALID executionTime=${(14 + Math.random() * 8).toFixed(1)}ms gasUsed=14.9M`,
        },
        {
          level: 'WARN' as const,
          client: 'lighthouse' as const,
          msg: `Gossipsub message validation took ${(42 + Math.floor(Math.random() * 30))}ms, threshold: 50ms, topic: /eth2/beacon_block`,
        },
        {
          level: 'INFO' as const,
          client: 'prysm' as const,
          msg: `sync: Synced up to slot ${currentSlot} (0 slots behind beacon chain head), participation=${(99.2 + Math.random() * 0.6).toFixed(1)}%`,
        },
      ];

      const chosen = templates[Math.floor(Math.random() * templates.length)];
      const newEntry: SystemLogEntry = {
        id: `log-${Date.now()}-${Math.random()}`,
        timestamp: timeStr,
        level: chosen.level,
        client: chosen.client,
        slot: currentSlot,
        epoch: currentEpoch,
        message: chosen.msg,
        rawText: `${chosen.level} ${chosen.msg}`,
      };

      setLogs((prev) => {
        const next = [...prev, newEntry];
        return next.length > 100 ? next.slice(-100) : next;
      });
    }, 4500);

    return () => clearInterval(interval);
  }, [isStreaming, latestBlockNum, safeBlockNum, finalizedBlockNum, peerCount]);

  // Auto-scroll effect
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  // Filtered log entries
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // Client filter
      if (selectedClient !== 'all' && log.client !== selectedClient) {
        return false;
      }

      // Log Level filter
      if (logFilter !== 'all' && log.level !== logFilter) {
        return false;
      }

      // Search text query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          log.message.toLowerCase().includes(q) ||
          log.level.toLowerCase().includes(q) ||
          log.slot.toString().includes(q)
        );
      }

      return true;
    });
  }, [logs, selectedClient, logFilter, searchQuery]);

  const copyLogsToClipboard = () => {
    const text = filteredLogs
      .map((l) => `[${l.timestamp}] [${l.client.toUpperCase()}] [${l.level}] ${l.message}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <div className="bg-[#0b0f17] rounded-xl border border-slate-800 overflow-hidden shadow-2xl space-y-0">
      {/* Top Header */}
      <div className="p-5 border-b border-slate-800/80 bg-slate-900/60 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-white font-mono flex items-center gap-2">
                  Consensus Client System Logs
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase font-bold flex items-center gap-1">
                  <span className={`w-1.5 h-1.5 rounded-full bg-emerald-400 ${isStreaming ? 'animate-pulse' : ''}`} />
                  {isStreaming ? 'Live Stream' : 'Paused'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Simulated real-time terminal outputs from beacon consensus client for operator diagnostic visibility.
              </p>
            </div>
          </div>
        </div>

        {/* Client Switcher & Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Client format selector */}
          <div className="flex items-center p-0.5 bg-slate-950 rounded-lg border border-slate-800 text-xs font-medium font-mono">
            <button
              onClick={() => setSelectedClient('lighthouse')}
              className={`px-2.5 py-1 rounded transition-colors ${
                selectedClient === 'lighthouse'
                  ? 'bg-slate-800 text-emerald-400 font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Lighthouse (Rust)
            </button>
            <button
              onClick={() => setSelectedClient('prysm')}
              className={`px-2.5 py-1 rounded transition-colors ${
                selectedClient === 'prysm'
                  ? 'bg-slate-800 text-cyan-400 font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Prysm (Go)
            </button>
            <button
              onClick={() => setSelectedClient('all')}
              className={`px-2.5 py-1 rounded transition-colors ${
                selectedClient === 'all'
                  ? 'bg-slate-800 text-white font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All Clients
            </button>
          </div>

          {/* Pause / Resume Button */}
          <button
            onClick={() => setIsStreaming((prev) => !prev)}
            className={`p-1.5 rounded-lg border text-xs font-mono transition-colors flex items-center gap-1.5 ${
              isStreaming
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
            }`}
            title={isStreaming ? 'Pause streaming' : 'Resume live stream'}
          >
            {isStreaming ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isStreaming ? 'Pause' : 'Resume'}</span>
          </button>

          {/* Auto Scroll Toggle */}
          <button
            onClick={() => setAutoScroll((prev) => !prev)}
            className={`p-1.5 rounded-lg border text-xs font-mono transition-colors flex items-center gap-1.5 ${
              autoScroll
                ? 'bg-slate-800 border-slate-700 text-slate-200'
                : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'
            }`}
            title="Toggle Auto-Scroll"
          >
            <ArrowDownCircle className={`w-3.5 h-3.5 ${autoScroll ? 'text-emerald-400' : ''}`} />
            <span>Scroll</span>
          </button>

          {/* Copy Logs */}
          <button
            onClick={copyLogsToClipboard}
            className="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white text-xs font-mono transition-colors flex items-center gap-1.5"
            title="Copy logs to clipboard"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied!' : 'Copy'}</span>
          </button>

          {/* Clear Buffer */}
          <button
            onClick={clearLogs}
            className="p-1.5 rounded-lg bg-slate-950 hover:bg-rose-950/40 border border-slate-800 hover:border-rose-500/30 text-slate-400 hover:text-rose-300 text-xs font-mono transition-colors"
            title="Clear log buffer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Diagnostic Telemetry Sub-header Strip */}
      <div className="px-5 py-2.5 bg-slate-950 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-slate-400">
        <div className="flex flex-wrap items-center gap-4 text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Consensus Engine:</span>
            <span className="text-white font-semibold">
              {selectedClient === 'prysm' ? 'Prysm v5.0.4 (Go 1.22)' : 'Lighthouse v5.2.0 (Rust)'}
            </span>
          </div>
          <span className="text-slate-700">|</span>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Engine API:</span>
            <span className="text-emerald-400 font-semibold">v3 (Nominal ~14ms)</span>
          </div>
          <span className="text-slate-700">|</span>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Participation:</span>
            <span className="text-cyan-400 font-semibold">99.4%</span>
          </div>
          <span className="text-slate-700">|</span>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Active Peers:</span>
            <span className="text-white font-semibold">{peerCount || 48}</span>
          </div>
        </div>

        {/* Search & Log Filter Pills */}
        <div className="flex items-center gap-2">
          {/* Level Filter */}
          <div className="flex items-center p-0.5 bg-slate-900 rounded border border-slate-800 text-[10px] font-mono">
            {(['all', 'INFO', 'ENGINE', 'ATTEST', 'WARN'] as const).map((lvl) => (
              <button
                key={lvl}
                onClick={() => setLogFilter(lvl)}
                className={`px-2 py-0.5 rounded transition-colors ${
                  logFilter === lvl
                    ? 'bg-slate-800 text-emerald-400 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>

          {/* Quick Search Input */}
          <div className="relative flex items-center">
            <Search className="w-3 h-3 text-slate-500 absolute left-2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Grep logs..."
              className="pl-6 pr-2 py-1 bg-slate-900 border border-slate-800 rounded text-[11px] font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 w-28 sm:w-36 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Terminal Viewport */}
      <div className="p-4 bg-[#080c14] font-mono text-xs">
        {/* Terminal Window Header Bar */}
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/60 text-[10px] text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
            <span className="ml-2 text-slate-400">
              beacon-chain.service — journalctl -u {selectedClient === 'prysm' ? 'prysm-beacon' : 'lighthouse-bn'} -f
            </span>
          </div>
          <div>
            <span>UTF-8 · Live stdout / stderr</span>
          </div>
        </div>

        {/* Scrollable Log Output */}
        <div
          ref={scrollRef}
          className="space-y-1.5 max-h-[320px] overflow-y-auto pr-1 select-text scrollbar-thin scrollbar-thumb-slate-800"
        >
          {filteredLogs.length === 0 ? (
            <div className="py-12 text-center text-slate-600 text-xs">
              No log messages matching filter criteria. Clear filter or resume stream.
            </div>
          ) : (
            filteredLogs.map((entry) => {
              const isInfo = entry.level === 'INFO';
              const isWarn = entry.level === 'WARN';
              const isEngine = entry.level === 'ENGINE';
              const isAttest = entry.level === 'ATTEST';

              return (
                <div
                  key={entry.id}
                  className="flex items-start gap-2.5 hover:bg-slate-900/50 py-0.5 px-1 rounded transition-colors group"
                >
                  {/* Timestamp */}
                  <span className="text-slate-500 text-[10px] shrink-0 select-none">
                    {entry.timestamp}
                  </span>

                  {/* Client Tag */}
                  <span
                    className={`text-[9px] uppercase px-1 py-0.2 rounded font-bold shrink-0 ${
                      entry.client === 'lighthouse'
                        ? 'bg-blue-500/10 text-blue-300 border border-blue-500/20'
                        : 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/20'
                    }`}
                  >
                    {entry.client}
                  </span>

                  {/* Level Tag */}
                  <span
                    className={`text-[10px] font-bold px-1.5 rounded shrink-0 ${
                      isInfo
                        ? 'text-cyan-400 bg-cyan-950/40'
                        : isWarn
                        ? 'text-amber-400 bg-amber-950/40'
                        : isEngine
                        ? 'text-emerald-400 bg-emerald-950/40'
                        : 'text-purple-400 bg-purple-950/40'
                    }`}
                  >
                    {entry.level}
                  </span>

                  {/* Log Message Content */}
                  <span
                    className={`leading-relaxed break-all text-[11px] ${
                      isWarn
                        ? 'text-amber-200/90'
                        : isEngine
                        ? 'text-emerald-200/90'
                        : isAttest
                        ? 'text-purple-200/90'
                        : 'text-slate-300'
                    }`}
                  >
                    {entry.message}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Terminal Footer Bar */}
        <div className="pt-2.5 mt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-500">
          <div className="flex items-center gap-3">
            <span>Buffer: <strong className="text-slate-400">{filteredLogs.length} lines</strong> ({logs.length} in ring buffer)</span>
            <span className="text-slate-700">·</span>
            <span>Gossipsub: <strong className="text-emerald-400">Healthy (0 stalled topics)</strong></span>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Process Status: <strong className="text-slate-300">Active (PID 14892, 0.4% CPU, 1.8GB RAM)</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
};
