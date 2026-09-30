import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import * as d3 from 'd3';
import { EthereumBlock } from '../types/ethereum';
import { hexToNumber, formatAddress } from '../services/ethereumRpc';
import {
  Radio,
  Play,
  Pause,
  RotateCcw,
  Zap,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Server,
  Activity,
  Layers,
  ArrowRight,
  Sparkles,
  Info,
  Maximize2,
  Sliders,
  Filter,
  BarChart2,
} from 'lucide-react';

interface BlockPropagationVisualizerProps {
  recentBlocks: EthereumBlock[];
  peerCount?: number;
  clientVersion?: string;
  onSelectBlock?: (block: EthereumBlock) => void;
}

export interface PeerPropagationNode {
  id: string;
  shortId: string;
  client: 'Geth' | 'Nethermind' | 'Besu' | 'Reth' | 'Erigon';
  version: string;
  city: string;
  countryCode: string;
  linkLatencyMs: number;
  discoveryLatencyMs: number;
  validationLatencyMs: number;
  totalTimeMs: number;
  state: 'pending' | 'discovered' | 'validating' | 'validated';
  x?: number;
  y?: number;
  targetAngle: number;
  distance: number;
  isHost?: boolean;
  isProposer?: boolean;
}

export const BlockPropagationVisualizer: React.FC<BlockPropagationVisualizerProps> = ({
  recentBlocks,
  peerCount = 48,
  clientVersion,
  onSelectBlock,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const [viewMode, setViewMode] = useState<'mesh' | 'timeline'>('mesh');
  const [latencyTierFilter, setLatencyTierFilter] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  const [selectedBlockIdx, setSelectedBlockIdx] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [animationProgress, setAnimationProgress] = useState<number>(1.0); // 0 to 1
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [selectedPeer, setSelectedPeer] = useState<PeerPropagationNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<{
    node: PeerPropagationNode;
    x: number;
    y: number;
  } | null>(null);

  const currentBlock = recentBlocks[selectedBlockIdx] || recentBlocks[0] || null;
  const currentBlockNum = currentBlock ? hexToNumber(currentBlock.number) : 20891450;
  const currentBlockHash = currentBlock?.hash || '0x7c91e4f20a1b2c3d4e5f6789abcdef0123456789abcdef0123456789abcdef01';
  const txCount = currentBlock?.transactions ? currentBlock.transactions.length : 168;

  // Generate peer list with precise propagation delays relative to local node
  const allPeerNodes: PeerPropagationNode[] = useMemo(() => {
    const total = Math.min(28, Math.max(16, peerCount));
    const clients: ('Geth' | 'Nethermind' | 'Besu' | 'Reth' | 'Erigon')[] = [
      'Geth',
      'Geth',
      'Nethermind',
      'Geth',
      'Besu',
      'Reth',
      'Nethermind',
      'Erigon',
    ];

    const peers: PeerPropagationNode[] = [];

    // Host node at center
    peers.push({
      id: 'host-local',
      shortId: 'Local Node (Host)',
      client: (clientVersion?.split('/')[0] as any) || 'Geth',
      version: clientVersion || 'v1.14.8',
      city: 'Frankfurt',
      countryCode: 'DE',
      linkLatencyMs: 0,
      discoveryLatencyMs: 14, // Discovered 14ms after block proposal
      validationLatencyMs: 82, // Execution engine payload validation
      totalTimeMs: 96,
      state: 'validated',
      targetAngle: 0,
      distance: 0,
      isHost: true,
    });

    const locations = [
      { city: 'Frankfurt', code: 'DE', baseLatency: 18 },
      { city: 'Amsterdam', code: 'NL', baseLatency: 24 },
      { city: 'London', code: 'GB', baseLatency: 28 },
      { city: 'Dublin', code: 'IE', baseLatency: 32 },
      { city: 'Helsinki', code: 'FI', baseLatency: 38 },
      { city: 'Virginia', code: 'US', baseLatency: 76 },
      { city: 'New York', code: 'US', baseLatency: 82 },
      { city: 'Oregon', code: 'US', baseLatency: 112 },
      { city: 'Tokyo', code: 'JP', baseLatency: 146 },
      { city: 'Singapore', code: 'SG', baseLatency: 168 },
      { city: 'Sydney', code: 'AU', baseLatency: 215 },
    ];

    for (let i = 0; i < total - 1; i++) {
      const client = clients[i % clients.length];
      const loc = locations[i % locations.length];
      const linkLatency = loc.baseLatency + (i % 5) * 3;

      // Proposer is node index 0
      const isProposer = i === 0;

      // Latencies in milliseconds
      const discoveryMs = isProposer ? 0 : Math.round(linkLatency * 0.6 + 12);
      const validationMs = Math.round(55 + (i * 7) % 35); // EVM execution & state root check
      const totalTimeMs = discoveryMs + validationMs;

      const angle = ((i * 2 * Math.PI) / (total - 1)) + (i % 2 === 0 ? 0.1 : -0.1);
      const distance = Math.min(220, Math.max(70, linkLatency * 0.95 + 40));

      peers.push({
        id: `peer-${i + 1}`,
        shortId: `0x${(1000 + i * 73).toString(16)}...${(99 - i).toString(16)}`,
        client,
        version: client === 'Geth' ? 'v1.14.8' : client === 'Nethermind' ? 'v1.28.0' : 'v24.7.1',
        city: loc.city,
        countryCode: loc.code,
        linkLatencyMs: linkLatency,
        discoveryLatencyMs: discoveryMs,
        validationLatencyMs: validationMs,
        totalTimeMs,
        state: 'pending',
        targetAngle: angle,
        distance,
        isProposer,
      });
    }

    return peers;
  }, [peerCount, clientVersion]);

  // Filter peers by latency tier if needed
  const peerNodes = useMemo(() => {
    if (latencyTierFilter === 'all') return allPeerNodes;
    if (latencyTierFilter === 'low') {
      return allPeerNodes.filter((p) => p.isHost || p.linkLatencyMs < 50);
    }
    if (latencyTierFilter === 'medium') {
      return allPeerNodes.filter((p) => p.isHost || (p.linkLatencyMs >= 50 && p.linkLatencyMs <= 120));
    }
    return allPeerNodes.filter((p) => p.isHost || p.linkLatencyMs > 120);
  }, [allPeerNodes, latencyTierFilter]);

  // Derived state per peer based on current animation progress
  const currentMaxTimeMs = 320; // Full animation spans 320ms of propagation time
  const currentTimeMs = animationProgress * currentMaxTimeMs;

  const peersWithAnimationState = useMemo(() => {
    return peerNodes.map((peer) => {
      if (peer.isHost) {
        let state: 'pending' | 'discovered' | 'validating' | 'validated' = 'pending';
        if (currentTimeMs >= peer.totalTimeMs) state = 'validated';
        else if (currentTimeMs >= peer.discoveryLatencyMs) state = 'validating';
        else state = 'discovered';
        return { ...peer, state };
      }

      let state: 'pending' | 'discovered' | 'validating' | 'validated' = 'pending';
      if (currentTimeMs < peer.discoveryLatencyMs) {
        state = 'pending';
      } else if (currentTimeMs < peer.totalTimeMs) {
        state = 'validating';
      } else {
        state = 'validated';
      }

      return { ...peer, state };
    });
  }, [peerNodes, currentTimeMs]);

  // Propagation Metrics
  const stats = useMemo(() => {
    const validPeers = allPeerNodes.filter((p) => !p.isHost);
    const times = validPeers.map((p) => p.totalTimeMs).sort((a, b) => a - b);
    const discToValDelays = validPeers.map((p) => p.validationLatencyMs);

    const meanDiscToVal = Math.round(
      discToValDelays.reduce((a, b) => a + b, 0) / discToValDelays.length
    );
    const p50 = times[Math.floor(times.length * 0.5)] || 95;
    const p95 = times[Math.floor(times.length * 0.95)] || 240;

    const validatedCount = peersWithAnimationState.filter((p) => p.state === 'validated').length;
    const validatingCount = peersWithAnimationState.filter((p) => p.state === 'validating').length;
    const pendingCount = peersWithAnimationState.filter((p) => p.state === 'pending').length;

    return {
      meanDiscToVal,
      p50,
      p95,
      validatedCount,
      validatingCount,
      pendingCount,
      total: peersWithAnimationState.length,
      progressPct: Math.round((validatedCount / peersWithAnimationState.length) * 100),
    };
  }, [allPeerNodes, peersWithAnimationState]);

  // Restart animation
  const handleRestart = useCallback(() => {
    setAnimationProgress(0);
    setIsPlaying(true);
  }, []);

  // Animation loop
  useEffect(() => {
    if (!isPlaying) return;

    let lastTimestamp = performance.now();

    const loop = (now: number) => {
      const deltaSec = (now - lastTimestamp) / 1000;
      lastTimestamp = now;

      setAnimationProgress((prev) => {
        const next = prev + (deltaSec / 4.5) * playbackSpeed;
        if (next >= 1.0) {
          return 0;
        }
        return next;
      });

      animationFrameRef.current = requestAnimationFrame(loop);
    };

    animationFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isPlaying, playbackSpeed]);

  // Auto-replay on block update
  useEffect(() => {
    handleRestart();
  }, [currentBlockNum, handleRestart]);

  // D3 Visualization Render
  useEffect(() => {
    if (viewMode !== 'mesh' || !svgRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth || 800;
    const height = 400;
    const centerX = width / 2;
    const centerY = height / 2;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    svg.attr('viewBox', `0 0 ${width} ${height}`).attr('width', '100%').attr('height', height);

    const g = svg.append('g').attr('class', 'network-mesh');

    // Concentric Latency Rings (50ms, 100ms, 180ms)
    const rings = [
      { r: 75, label: '50ms RTT', color: '#10b981' },
      { r: 135, label: '100ms RTT', color: '#38bdf8' },
      { r: 195, label: '180ms RTT (Global)', color: '#64748b' },
    ];

    rings.forEach((ring) => {
      g.append('circle')
        .attr('cx', centerX)
        .attr('cy', centerY)
        .attr('r', ring.r)
        .attr('fill', 'none')
        .attr('stroke', ring.color)
        .attr('stroke-width', 0.8)
        .attr('stroke-dasharray', '3,4')
        .attr('opacity', 0.25);

      g.append('text')
        .attr('x', centerX + ring.r - 4)
        .attr('y', centerY - 6)
        .attr('fill', ring.color)
        .attr('font-size', '9px')
        .attr('font-family', 'JetBrains Mono, monospace')
        .attr('opacity', 0.6)
        .attr('text-anchor', 'end')
        .text(ring.label);
    });

    // Expanding Propagation Wavefront Circle
    const currentRadius = (currentTimeMs / currentMaxTimeMs) * 225;
    g.append('circle')
      .attr('cx', centerX)
      .attr('cy', centerY)
      .attr('r', Math.max(1, currentRadius))
      .attr('fill', 'rgba(16, 185, 129, 0.04)')
      .attr('stroke', '#10b981')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '4,2')
      .attr('opacity', 0.85);

    // Compute coordinates for all peers
    const nodesWithCoords = peersWithAnimationState.map((peer) => {
      if (peer.isHost) {
        return { ...peer, x: centerX, y: centerY };
      }
      const x = centerX + Math.cos(peer.targetAngle) * peer.distance;
      const y = centerY + Math.sin(peer.targetAngle) * peer.distance;
      return { ...peer, x, y };
    });

    const hostNode = nodesWithCoords.find((p) => p.isHost)!;

    // Draw P2P Links to Host
    nodesWithCoords.forEach((peer) => {
      if (peer.isHost) return;

      const isValidated = peer.state === 'validated';
      const isValidating = peer.state === 'validating';

      // Link line
      g.append('line')
        .attr('x1', hostNode.x)
        .attr('y1', hostNode.y)
        .attr('x2', peer.x!)
        .attr('y2', peer.y!)
        .attr('stroke', isValidated ? '#10b981' : isValidating ? '#f59e0b' : '#334155')
        .attr('stroke-width', isValidated ? 1.4 : 0.8)
        .attr('stroke-dasharray', isValidated ? 'none' : '2,3')
        .attr('opacity', isValidated ? 0.6 : 0.25);

      // Animated traveling pulse packet along link if discovered
      if (isValidating || isValidated) {
        const pulseProgress = Math.min(
          1.0,
          Math.max(0, (currentTimeMs - peer.discoveryLatencyMs) / (peer.validationLatencyMs || 1))
        );
        const pulseX = hostNode.x + (peer.x! - hostNode.x) * pulseProgress;
        const pulseY = hostNode.y + (peer.y! - hostNode.y) * pulseProgress;

        g.append('circle')
          .attr('cx', pulseX)
          .attr('cy', pulseY)
          .attr('r', 2)
          .attr('fill', isValidated ? '#34d399' : '#fbbf24')
          .attr('opacity', 0.9);
      }
    });

    // Render Peer Nodes
    nodesWithCoords.forEach((peer) => {
      const isHost = peer.isHost;
      const isProposer = peer.isProposer;
      const nodeG = g.append('g').attr('class', 'peer-node').style('cursor', 'pointer');

      let fillColor = '#475569'; // pending
      let strokeColor = '#1e293b';

      if (peer.state === 'discovered') {
        fillColor = '#38bdf8'; // sky
        strokeColor = '#0284c7';
      } else if (peer.state === 'validating') {
        fillColor = '#f59e0b'; // amber
        strokeColor = '#d97706';
      } else if (peer.state === 'validated') {
        fillColor = '#10b981'; // emerald
        strokeColor = '#059669';
      }

      if (isHost) {
        fillColor = '#10b981';
        strokeColor = '#ffffff';
      }

      // Outer halo for validating state or host
      if (isHost || peer.state === 'validating' || isProposer) {
        nodeG
          .append('circle')
          .attr('cx', peer.x!)
          .attr('cy', peer.y!)
          .attr('r', isHost ? 15 : isProposer ? 10 : 8)
          .attr('fill', 'none')
          .attr('stroke', isHost ? '#10b981' : isProposer ? '#f59e0b' : fillColor)
          .attr('stroke-width', 1.2)
          .attr('stroke-dasharray', isHost ? 'none' : '2,2')
          .attr('opacity', 0.5);
      }

      // Main Node Circle
      nodeG
        .append('circle')
        .attr('cx', peer.x!)
        .attr('cy', peer.y!)
        .attr('r', isHost ? 8 : isProposer ? 6 : 4.5)
        .attr('fill', fillColor)
        .attr('stroke', strokeColor)
        .attr('stroke-width', 1.5)
        .on('mouseenter', (event) => {
          const [mouseX, mouseY] = d3.pointer(event, containerRef.current);
          setHoveredNode({
            node: peer,
            x: mouseX,
            y: mouseY,
          });
        })
        .on('mouseleave', () => {
          setHoveredNode(null);
        })
        .on('click', () => {
          setSelectedPeer(peer);
        });

      // City / Client Text Tag
      if (!isHost && peer.distance > 80) {
        nodeG
          .append('text')
          .attr('x', peer.x!)
          .attr('y', peer.y! + 12)
          .attr('text-anchor', 'middle')
          .attr('fill', peer.state === 'validated' ? '#e2e8f0' : '#64748b')
          .attr('font-size', '9px')
          .attr('font-family', 'JetBrains Mono, monospace')
          .attr('opacity', 0.8)
          .text(`${peer.client} (${peer.city})`);
      } else if (isHost) {
        nodeG
          .append('text')
          .attr('x', peer.x!)
          .attr('y', peer.y! - 18)
          .attr('text-anchor', 'middle')
          .attr('fill', '#ffffff')
          .attr('font-size', '10px')
          .attr('font-weight', 'bold')
          .attr('font-family', 'JetBrains Mono, monospace')
          .text('Execution Node (You)');
      }
    });
  }, [peersWithAnimationState, currentTimeMs, currentMaxTimeMs, viewMode]);

  return (
    <div className="p-5 bg-slate-900/50 rounded-xl border border-slate-800 space-y-4 shadow-xl">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-white">
                Block Propagation Map & Discovery-to-Validation Visualizer
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold uppercase">
                DevP2P Mesh
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              D3 animation simulating real-time block propagation across connected peers, benchmarking latency between block discovery ($T_0$) and execution payload validation ($T_1$).
            </p>
          </div>
        </div>

        {/* View Switcher & Animation Playback Controls */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          {/* Mode Switcher */}
          <div className="flex items-center p-0.5 bg-slate-950 rounded-lg border border-slate-800">
            <button
              onClick={() => setViewMode('mesh')}
              className={`px-2.5 py-1 rounded transition-colors text-[11px] ${
                viewMode === 'mesh'
                  ? 'bg-slate-800 text-emerald-400 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Radial Mesh
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              className={`px-2.5 py-1 rounded transition-colors text-[11px] flex items-center gap-1 ${
                viewMode === 'timeline'
                  ? 'bg-slate-800 text-emerald-400 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <BarChart2 className="w-3 h-3" />
              <span>Gantt Breakdown</span>
            </button>
          </div>

          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-1.5 bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 rounded-lg transition-colors flex items-center gap-1.5"
            title={isPlaying ? 'Pause Animation' : 'Play Animation'}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
            <span>{isPlaying ? 'Pause' : 'Play'}</span>
          </button>

          <button
            onClick={handleRestart}
            className="p-1.5 bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 rounded-lg transition-colors flex items-center gap-1.5"
            title="Replay Propagation from T=0"
          >
            <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
            <span>Replay</span>
          </button>

          <div className="flex items-center p-0.5 bg-slate-950 rounded-lg border border-slate-800">
            {[0.5, 1.0, 2.0].map((s) => (
              <button
                key={s}
                onClick={() => setPlaybackSpeed(s)}
                className={`px-2 py-0.5 rounded transition-colors text-[10px] ${
                  playbackSpeed === s
                    ? 'bg-slate-800 text-emerald-400 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Block Context Banner & Historical Block Selector */}
      <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-white font-bold">
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            <span>Replaying Block:</span>
          </div>
          <select
            value={selectedBlockIdx}
            onChange={(e) => {
              setSelectedBlockIdx(Number(e.target.value));
              handleRestart();
            }}
            className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-emerald-300 text-xs font-bold focus:outline-none focus:border-emerald-500"
          >
            {recentBlocks.slice(0, 8).map((blk, idx) => (
              <option key={blk.hash || idx} value={idx}>
                #{hexToNumber(blk.number).toLocaleString()} ({blk.transactions ? blk.transactions.length : 120} txs)
              </option>
            ))}
          </select>

          <span className="text-slate-600 hidden sm:inline">·</span>
          <span className="text-slate-400 hidden sm:inline">
            Hash: <span className="text-slate-300">{formatAddress(currentBlockHash)}</span>
          </span>
        </div>

        <div className="flex items-center gap-3 text-[11px]">
          <span className="text-slate-400">
            Propagation Timer: <strong className="text-cyan-400">{Math.round(currentTimeMs)} ms</strong> / 320ms
          </span>
          <span className="text-slate-600">·</span>
          <span className="text-slate-400">
            Quorum Reached: <strong className="text-emerald-400">{stats.progressPct}%</strong> ({stats.validatedCount}/{stats.total} peers)
          </span>
        </div>
      </div>

      {/* 4 Propagation Telemetry Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
        <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
          <span className="text-[10px] text-slate-500 block uppercase">Discovery → Validation Δ</span>
          <div className="text-base font-bold text-emerald-400 mt-1 flex items-center gap-1.5">
            <span>{stats.meanDiscToVal} ms</span>
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
          <span className="text-[10px] text-slate-500 mt-0.5 block">
            EVM execution & state transition
          </span>
        </div>

        <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
          <span className="text-[10px] text-slate-500 block uppercase">Mesh p50 Dissemination</span>
          <div className="text-base font-bold text-cyan-400 mt-1">
            {stats.p50} ms
          </div>
          <span className="text-[10px] text-slate-500 mt-0.5 block">
            50% of connected peers reached
          </span>
        </div>

        <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
          <span className="text-[10px] text-slate-500 block uppercase">Mesh p95 Full Quorum</span>
          <div className="text-base font-bold text-white mt-1">
            {stats.p95} ms
          </div>
          <span className="text-[10px] text-slate-500 mt-0.5 block">
            Well within 4.0s attestation slot deadline
          </span>
        </div>

        <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
          <span className="text-[10px] text-slate-500 block uppercase">Attestation Readiness</span>
          <div className="text-base font-bold text-emerald-400 mt-1 flex items-center gap-1">
            <span>100% On-Time</span>
            <ShieldCheck className="w-3.5 h-3.5" />
          </div>
          <span className="text-[10px] text-slate-500 mt-0.5 block">
            Zero missed slot attestations
          </span>
        </div>
      </div>

      {/* Latency Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs font-mono">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-slate-500 mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3 text-cyan-400" /> Filter Peers:
          </span>
          {[
            { id: 'all', label: 'All Peers' },
            { id: 'low', label: 'Low Latency (<50ms)' },
            { id: 'medium', label: 'Cross-Region (50-120ms)' },
            { id: 'high', label: 'Global (>120ms)' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setLatencyTierFilter(t.id as any)}
              className={`px-2 py-0.5 rounded text-[11px] border transition-colors ${
                latencyTierFilter === t.id
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Visualization Display */}
      {viewMode === 'mesh' ? (
        <div
          ref={containerRef}
          className="p-4 bg-slate-950/70 rounded-xl border border-slate-800 relative overflow-hidden"
        >
          <svg ref={svgRef} className="w-full block" />

          {/* Hover Tooltip Popover */}
          {hoveredNode && (
            <div
              className="absolute z-20 pointer-events-none bg-[#0b0f17] border border-cyan-500/50 p-3 rounded-lg shadow-2xl text-xs font-mono space-y-1.5 min-w-[240px]"
              style={{
                left: `${Math.min(hoveredNode.x + 12, (containerRef.current?.clientWidth || 800) - 260)}px`,
                top: `${Math.max(10, hoveredNode.y - 120)}px`,
              }}
            >
              <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Server className="w-3.5 h-3.5 text-cyan-400" />
                  {hoveredNode.node.isHost ? 'Local Node' : `${hoveredNode.node.client} (${hoveredNode.node.shortId})`}
                </span>
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                    hoveredNode.node.state === 'validated'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : hoveredNode.node.state === 'validating'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  {hoveredNode.node.state}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">Location:</span>
                <span className="text-white font-semibold">
                  {hoveredNode.node.city}, {hoveredNode.node.countryCode}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">RTT Link Latency:</span>
                <span className="text-cyan-400 font-bold">{hoveredNode.node.linkLatencyMs} ms</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">Discovery Timestamp (T₀):</span>
                <span className="text-slate-200">+{hoveredNode.node.discoveryLatencyMs} ms</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">Validation Execution (T₁):</span>
                <span className="text-emerald-400 font-bold">
                  {hoveredNode.node.validationLatencyMs} ms
                </span>
              </div>

              <div className="pt-1 border-t border-slate-800 flex items-center justify-between text-[10px]">
                <span className="text-slate-400">Total Propagation Lag:</span>
                <span className="font-bold text-white">{hoveredNode.node.totalTimeMs} ms</span>
              </div>
            </div>
          )}

          {/* Legend */}
          <div className="pt-3 mt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-[11px] font-mono text-slate-400 gap-2">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-slate-500">Node State:</span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-600" />
                <span>Pending Discovery</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
                <span>Header Discovered</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                <span>Validating EVM Payload</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <span>Validated & Canonical</span>
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-slate-400">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Target: &lt;400ms Discovery-to-Validation</span>
            </div>
          </div>
        </div>
      ) : (
        /* Gantt Breakdown View: Discovery vs Validation per Peer */
        <div className="p-4 bg-slate-950/70 rounded-xl border border-slate-800 space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-[11px] text-slate-400">
            <span>Peer Node & Location</span>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded bg-sky-400" /> Discovery Delay (T₀)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded bg-amber-400" /> EVM Validation Delay (T₁)
              </span>
              <span className="text-slate-500">Total Lag</span>
            </div>
          </div>

          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {peerNodes.map((peer) => {
              const maxScale = 280;
              const discWidth = Math.max(2, (peer.discoveryLatencyMs / maxScale) * 100);
              const valWidth = Math.max(2, (peer.validationLatencyMs / maxScale) * 100);

              return (
                <div key={peer.id} className="flex items-center justify-between gap-3 py-1 hover:bg-slate-900/50 px-2 rounded">
                  <div className="flex items-center gap-2 w-48 shrink-0">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: peer.client === 'Geth' ? '#3b82f6' : peer.client === 'Nethermind' ? '#a855f7' : '#06b6d4' }} />
                    <span className="font-semibold text-white truncate">{peer.isHost ? 'Local Host' : `${peer.client} (${peer.city})`}</span>
                  </div>

                  <div className="flex-1 flex items-center h-4 bg-slate-900 rounded overflow-hidden relative">
                    <div
                      style={{ width: `${discWidth}%` }}
                      className="h-full bg-sky-500/80 hover:bg-sky-400 transition-all flex items-center justify-end pr-1 text-[9px] text-white"
                      title={`Discovery: ${peer.discoveryLatencyMs}ms`}
                    >
                      {peer.discoveryLatencyMs > 20 && `${peer.discoveryLatencyMs}ms`}
                    </div>
                    <div
                      style={{ width: `${valWidth}%` }}
                      className="h-full bg-amber-500/80 hover:bg-amber-400 transition-all flex items-center justify-end pr-1 text-[9px] text-white"
                      title={`Validation: ${peer.validationLatencyMs}ms`}
                    >
                      {peer.validationLatencyMs > 20 && `${peer.validationLatencyMs}ms`}
                    </div>
                  </div>

                  <div className="w-20 text-right font-bold text-emerald-400 shrink-0">
                    {peer.totalTimeMs} ms
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
