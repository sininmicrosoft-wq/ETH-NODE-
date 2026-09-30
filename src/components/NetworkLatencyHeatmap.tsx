import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import {
  Activity,
  Globe,
  Radio,
  Zap,
  RefreshCw,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Info,
  Server,
  Layers,
} from 'lucide-react';

interface NetworkLatencyHeatmapProps {
  peerCount?: number;
  clientVersion?: string;
}

interface PeerGroup {
  id: string;
  name: string;
  category: 'EL' | 'CL' | 'Infra';
}

interface NetworkSegment {
  id: string;
  name: string;
  continent: 'NA' | 'EU' | 'AP' | 'OTHER';
  baseLatencyMs: number;
}

const PEER_GROUPS: PeerGroup[] = [
  { id: 'geth', name: 'Geth (Go)', category: 'EL' },
  { id: 'nethermind', name: 'Nethermind (C#)', category: 'EL' },
  { id: 'besu', name: 'Besu (Java)', category: 'EL' },
  { id: 'reth', name: 'Reth (Rust)', category: 'EL' },
  { id: 'erigon', name: 'Erigon (Go)', category: 'EL' },
  { id: 'lighthouse', name: 'Lighthouse (CL)', category: 'CL' },
  { id: 'prysm', name: 'Prysm (CL)', category: 'CL' },
  { id: 'relays', name: 'MEV Relays & Boot', category: 'Infra' },
];

const NETWORK_SEGMENTS: NetworkSegment[] = [
  { id: 'us-east', name: 'NA-East (N. Virginia)', continent: 'NA', baseLatencyMs: 38 },
  { id: 'us-west', name: 'NA-West (Oregon)', continent: 'NA', baseLatencyMs: 64 },
  { id: 'eu-central', name: 'EU-Central (Frankfurt)', continent: 'EU', baseLatencyMs: 22 },
  { id: 'eu-west', name: 'EU-West (Dublin)', continent: 'EU', baseLatencyMs: 34 },
  { id: 'ap-east', name: 'AP-East (Tokyo)', continent: 'AP', baseLatencyMs: 142 },
  { id: 'ap-south', name: 'AP-South (Singapore)', continent: 'AP', baseLatencyMs: 168 },
  { id: 'sa-east', name: 'SA-East (São Paulo)', continent: 'OTHER', baseLatencyMs: 184 },
  { id: 'oc-south', name: 'OC-South (Sydney)', continent: 'OTHER', baseLatencyMs: 228 },
];

interface CellData {
  segmentId: string;
  segmentName: string;
  peerGroupId: string;
  peerGroupName: string;
  latencyMs: number;
  jitterMs: number;
  packetLossPercent: number;
  activePeers: number;
}

export const NetworkLatencyHeatmap: React.FC<NetworkLatencyHeatmapProps> = ({
  peerCount = 48,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [metricMode, setMetricMode] = useState<'latency' | 'jitter' | 'loss'>('latency');
  const [continentFilter, setContinentFilter] = useState<'ALL' | 'NA' | 'EU' | 'AP' | 'OTHER'>('ALL');
  const [hoveredCell, setHoveredCell] = useState<CellData | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const [isPinging, setIsPinging] = useState<boolean>(true);
  const [pingJitterFactor, setPingJitterFactor] = useState<number>(0);

  // Periodic simulated live ping jitter updates
  useEffect(() => {
    if (!isPinging) return;
    const interval = setInterval(() => {
      setPingJitterFactor((Math.random() - 0.5) * 6);
    }, 3500);
    return () => clearInterval(interval);
  }, [isPinging]);

  // Filtered segments
  const activeSegments = useMemo(() => {
    if (continentFilter === 'ALL') return NETWORK_SEGMENTS;
    return NETWORK_SEGMENTS.filter((s) => s.continent === continentFilter);
  }, [continentFilter]);

  // Matrix cell data generation
  const matrixData: CellData[] = useMemo(() => {
    const data: CellData[] = [];

    activeSegments.forEach((segment) => {
      PEER_GROUPS.forEach((peerGroup, pIdx) => {
        // Compute pseudo-stable latency with client optimization offsets
        let clientOffset = 0;
        if (peerGroup.id === 'reth') clientOffset = -4; // High-perf Rust
        if (peerGroup.id === 'nethermind') clientOffset = -2;
        if (peerGroup.id === 'besu') clientOffset = +5;
        if (peerGroup.id === 'relays') clientOffset = -8; // Direct co-located relays

        const base = Math.max(12, Math.round(segment.baseLatencyMs + clientOffset + pingJitterFactor));
        const jitter = Number((1.2 + (base * 0.04) + Math.abs(pingJitterFactor * 0.3)).toFixed(1));
        const loss = base > 180 ? Number(((base - 180) * 0.015).toFixed(2)) : 0.0;
        const peersInGroup = Math.max(1, Math.round((peerCount / (PEER_GROUPS.length * activeSegments.length)) * 6 + ((pIdx + segment.name.length) % 4)));

        data.push({
          segmentId: segment.id,
          segmentName: segment.name,
          peerGroupId: peerGroup.id,
          peerGroupName: peerGroup.name,
          latencyMs: base,
          jitterMs: jitter,
          packetLossPercent: loss,
          activePeers: peersInGroup,
        });
      });
    });

    return data;
  }, [activeSegments, pingJitterFactor, peerCount]);

  // Summary statistics
  const summaryStats = useMemo(() => {
    if (matrixData.length === 0) return { avgLatency: 0, minLatency: 0, maxLatency: 0, healthyRatio: 100 };
    const latencies = matrixData.map((d) => d.latencyMs);
    const avg = Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length);
    const min = Math.min(...latencies);
    const max = Math.max(...latencies);
    const healthyCount = matrixData.filter((d) => d.latencyMs < 120).length;
    const ratio = Math.round((healthyCount / matrixData.length) * 100);

    return {
      avgLatency: avg,
      minLatency: min,
      maxLatency: max,
      healthyRatio: ratio,
    };
  }, [matrixData]);

  // D3 Color Scales
  const colorScaleLatency = useMemo(() => {
    return d3
      .scaleLinear<string>()
      .domain([15, 45, 85, 140, 200, 260])
      .range(['#10b981', '#06b6d4', '#3b82f6', '#f59e0b', '#f97316', '#ef4444'])
      .clamp(true);
  }, []);

  const colorScaleJitter = useMemo(() => {
    return d3
      .scaleLinear<string>()
      .domain([1.0, 3.0, 6.0, 10.0])
      .range(['#10b981', '#06b6d4', '#f59e0b', '#ef4444'])
      .clamp(true);
  }, []);

  const colorScaleLoss = useMemo(() => {
    return d3
      .scaleLinear<string>()
      .domain([0.0, 0.2, 0.6, 1.5])
      .range(['#10b981', '#3b82f6', '#f59e0b', '#ef4444'])
      .clamp(true);
  }, []);

  // Main D3 Render Effect
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // clear canvas

    const width = 860;
    const margin = { top: 75, right: 30, bottom: 25, left: 165 };
    const rowHeight = 36;
    const height = margin.top + activeSegments.length * rowHeight + margin.bottom;

    svg.attr('viewBox', `0 0 ${width} ${height}`);

    const innerWidth = width - margin.left - margin.right;
    const colWidth = innerWidth / PEER_GROUPS.length;

    const g = svg.append('g').attr('transform', `translate(${margin.left}, ${margin.top})`);

    // Column Headers (Peer Groups)
    const colHeaders = svg
      .append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top - 12})`);

    PEER_GROUPS.forEach((pg, i) => {
      const colG = colHeaders.append('g').attr('transform', `translate(${i * colWidth + colWidth / 2}, 0)`);

      // Category Pill badge
      colG
        .append('rect')
        .attr('x', -24)
        .attr('y', -42)
        .attr('width', 48)
        .attr('height', 14)
        .attr('rx', 4)
        .attr('fill', pg.category === 'EL' ? 'rgba(59, 130, 246, 0.15)' : pg.category === 'CL' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)')
        .attr('stroke', pg.category === 'EL' ? 'rgba(59, 130, 246, 0.4)' : pg.category === 'CL' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(245, 158, 11, 0.4)');

      colG
        .append('text')
        .attr('x', 0)
        .attr('y', -32)
        .attr('text-anchor', 'middle')
        .attr('fill', pg.category === 'EL' ? '#60a5fa' : pg.category === 'CL' ? '#34d399' : '#fbbf24')
        .attr('font-size', '8.5px')
        .attr('font-weight', 'bold')
        .attr('font-family', 'ui-monospace, monospace')
        .text(pg.category);

      // Peer Group Name Text
      colG
        .append('text')
        .attr('x', 0)
        .attr('y', -10)
        .attr('text-anchor', 'middle')
        .attr('fill', '#cbd5e1')
        .attr('font-size', '10px')
        .attr('font-weight', '600')
        .attr('font-family', 'ui-monospace, monospace')
        .text(pg.name);
    });

    // Row Headers (Network Segments)
    const rowHeaders = svg.append('g').attr('transform', `translate(12, ${margin.top})`);

    activeSegments.forEach((segment, i) => {
      const rowG = rowHeaders.append('g').attr('transform', `translate(0, ${i * rowHeight + rowHeight / 2})`);

      // Region flag/marker
      rowG
        .append('circle')
        .attr('cx', 6)
        .attr('cy', 0)
        .attr('r', 3)
        .attr('fill', segment.continent === 'EU' ? '#34d399' : segment.continent === 'NA' ? '#38bdf8' : segment.continent === 'AP' ? '#fbbf24' : '#f472b6');

      rowG
        .append('text')
        .attr('x', 16)
        .attr('y', 3.5)
        .attr('fill', '#f1f5f9')
        .attr('font-size', '10.5px')
        .attr('font-family', 'ui-monospace, monospace')
        .attr('font-weight', '500')
        .text(segment.name);
    });

    // Grid Matrix Cells
    activeSegments.forEach((segment, rIdx) => {
      PEER_GROUPS.forEach((peerGroup, cIdx) => {
        const cell = matrixData.find(
          (d) => d.segmentId === segment.id && d.peerGroupId === peerGroup.id
        );
        if (!cell) return;

        const cellG = g
          .append('g')
          .attr('transform', `translate(${cIdx * colWidth}, ${rIdx * rowHeight})`)
          .attr('cursor', 'pointer');

        let cellColor = '#10b981';
        let cellText = `${cell.latencyMs}ms`;

        if (metricMode === 'latency') {
          cellColor = colorScaleLatency(cell.latencyMs);
          cellText = `${cell.latencyMs}ms`;
        } else if (metricMode === 'jitter') {
          cellColor = colorScaleJitter(cell.jitterMs);
          cellText = `±${cell.jitterMs}ms`;
        } else {
          cellColor = colorScaleLoss(cell.packetLossPercent);
          cellText = cell.packetLossPercent > 0 ? `${cell.packetLossPercent}%` : '0%';
        }

        // Cell background rect
        const rect = cellG
          .append('rect')
          .attr('x', 3)
          .attr('y', 3)
          .attr('width', colWidth - 6)
          .attr('height', rowHeight - 6)
          .attr('rx', 5)
          .attr('fill', cellColor)
          .attr('fill-opacity', 0.22)
          .attr('stroke', cellColor)
          .attr('stroke-width', 1.2)
          .attr('stroke-opacity', 0.55)
          .style('transition', 'all 0.2s ease');

        // Cell value text
        const text = cellG
          .append('text')
          .attr('x', colWidth / 2)
          .attr('y', rowHeight / 2 + 3.5)
          .attr('text-anchor', 'middle')
          .attr('fill', '#ffffff')
          .attr('font-size', '10.5px')
          .attr('font-weight', 'bold')
          .attr('font-family', 'ui-monospace, monospace')
          .text(cellText);

        // Hover events
        cellG
          .on('mouseenter', function (event) {
            rect
              .attr('fill-opacity', 0.5)
              .attr('stroke-width', 2)
              .attr('stroke-opacity', 1.0)
              .attr('filter', 'drop-shadow(0 0 6px rgba(255,255,255,0.4))');
            text.attr('font-size', '11.5px');

            if (containerRef.current) {
              const bounds = containerRef.current.getBoundingClientRect();
              setTooltipPos({
                x: event.clientX - bounds.left,
                y: event.clientY - bounds.top,
              });
              setHoveredCell(cell);
            }
          })
          .on('mousemove', function (event) {
            if (containerRef.current) {
              const bounds = containerRef.current.getBoundingClientRect();
              setTooltipPos({
                x: event.clientX - bounds.left,
                y: event.clientY - bounds.top,
              });
            }
          })
          .on('mouseleave', function () {
            rect
              .attr('fill-opacity', 0.22)
              .attr('stroke-width', 1.2)
              .attr('stroke-opacity', 0.55)
              .attr('filter', null);
            text.attr('font-size', '10.5px');
            setHoveredCell(null);
          });
      });
    });
  }, [matrixData, activeSegments, metricMode, colorScaleLatency, colorScaleJitter, colorScaleLoss]);

  return (
    <div className="p-5 bg-slate-900/50 rounded-xl border border-slate-800 space-y-4 shadow-xl">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-white">
                Network Latency Heatmap (D3 Peer Groups Grid)
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold uppercase flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full bg-emerald-400 ${isPinging ? 'animate-ping' : ''}`} />
                {isPinging ? 'Live P2P Mesh' : 'Frozen'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              D3 color-coded matrix tracking round-trip latency, jitter, and packet drop across global network segments and peer software implementations.
            </p>
          </div>
        </div>

        {/* View & Metric Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Metric Mode Toggle */}
          <div className="flex items-center p-0.5 bg-slate-950 rounded-lg border border-slate-800 text-xs font-mono">
            <button
              onClick={() => setMetricMode('latency')}
              className={`px-2.5 py-1 rounded transition-colors ${
                metricMode === 'latency'
                  ? 'bg-slate-800 text-emerald-400 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              RTT (ms)
            </button>
            <button
              onClick={() => setMetricMode('jitter')}
              className={`px-2.5 py-1 rounded transition-colors ${
                metricMode === 'jitter'
                  ? 'bg-slate-800 text-cyan-400 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Jitter (ms)
            </button>
            <button
              onClick={() => setMetricMode('loss')}
              className={`px-2.5 py-1 rounded transition-colors ${
                metricMode === 'loss'
                  ? 'bg-slate-800 text-rose-400 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Loss (%)
            </button>
          </div>

          {/* Region Continent Filter */}
          <div className="flex items-center p-0.5 bg-slate-950 rounded-lg border border-slate-800 text-xs font-mono">
            {(['ALL', 'NA', 'EU', 'AP', 'OTHER'] as const).map((cont) => (
              <button
                key={cont}
                onClick={() => setContinentFilter(cont)}
                className={`px-2 py-1 rounded transition-colors ${
                  continentFilter === cont
                    ? 'bg-slate-800 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {cont === 'ALL' ? 'Global' : cont}
              </button>
            ))}
          </div>

          {/* Ping Simulator Toggle */}
          <button
            onClick={() => setIsPinging((prev) => !prev)}
            className={`p-1.5 rounded-lg border text-xs font-mono transition-colors flex items-center gap-1.5 ${
              isPinging
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-slate-950 border-slate-800 text-slate-500'
            }`}
            title="Toggle Live Ping Telemetry"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isPinging ? 'animate-spin' : ''}`} style={{ animationDuration: '6s' }} />
            <span>{isPinging ? 'Ping Active' : 'Paused'}</span>
          </button>
        </div>
      </div>

      {/* Summary Telemetry Strip */}
      <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
        <div>
          <span className="text-[10px] text-slate-500 block uppercase">Global Mean Latency</span>
          <span className="text-sm font-bold text-emerald-400 mt-0.5 block">{summaryStats.avgLatency} ms</span>
          <span className="text-[10px] text-slate-500">Across {matrixData.length} peer groups</span>
        </div>

        <div>
          <span className="text-[10px] text-slate-500 block uppercase">Optimal Segment</span>
          <span className="text-sm font-bold text-white mt-0.5 block">EU-Central ({summaryStats.minLatency} ms)</span>
          <span className="text-[10px] text-slate-500">Fast intra-continental</span>
        </div>

        <div>
          <span className="text-[10px] text-slate-500 block uppercase">Max Trans-Oceanic</span>
          <span className="text-sm font-bold text-amber-400 mt-0.5 block">OC-South ({summaryStats.maxLatency} ms)</span>
          <span className="text-[10px] text-slate-500">Subsea cable propagation</span>
        </div>

        <div>
          <span className="text-[10px] text-slate-500 block uppercase">Mesh Health (&lt;120ms)</span>
          <span className="text-sm font-bold text-cyan-400 mt-0.5 block">{summaryStats.healthyRatio}%</span>
          <span className="text-[10px] text-slate-500">Low jitter propagation</span>
        </div>
      </div>

      {/* D3 Heatmap SVG Viewport Container */}
      <div
        ref={containerRef}
        className="relative bg-slate-950/70 rounded-xl border border-slate-800/80 p-2 overflow-x-auto"
      >
        <svg
          ref={svgRef}
          className="w-full h-auto min-w-[760px] max-h-[460px] block"
        />

        {/* Floating Custom Tooltip */}
        {hoveredCell && tooltipPos && (
          <div
            className="absolute z-30 pointer-events-none p-3 bg-[#0b0f17] border border-emerald-500/40 rounded-lg shadow-2xl text-xs font-mono space-y-1 min-w-[220px]"
            style={{
              left: `${Math.min(tooltipPos.x + 15, (containerRef.current?.clientWidth || 800) - 235)}px`,
              top: `${Math.max(10, tooltipPos.y - 70)}px`,
            }}
          >
            <div className="flex items-center justify-between pb-1 border-b border-slate-800">
              <span className="font-bold text-white">{hoveredCell.segmentName}</span>
              <span className="text-[9px] bg-slate-800 text-slate-300 px-1.5 py-0.2 rounded">
                {hoveredCell.peerGroupName.split(' ')[0]}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">RTT Latency:</span>
              <span
                className={`font-bold ${
                  hoveredCell.latencyMs < 50
                    ? 'text-emerald-400'
                    : hoveredCell.latencyMs < 120
                    ? 'text-cyan-400'
                    : hoveredCell.latencyMs < 190
                    ? 'text-amber-400'
                    : 'text-rose-400'
                }`}
              >
                {hoveredCell.latencyMs} ms
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Packet Jitter:</span>
              <span className="text-slate-200">±{hoveredCell.jitterMs} ms</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Packet Loss:</span>
              <span className="text-slate-200">{hoveredCell.packetLossPercent}%</span>
            </div>

            <div className="pt-1 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
              <span>Peers in Group:</span>
              <strong className="text-white">{hoveredCell.activePeers} connected</strong>
            </div>
          </div>
        )}
      </div>

      {/* D3 Color-Coded Gradient Legend */}
      <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-[11px]">Latency Scale:</span>
          {/* Multi-step gradient bar */}
          <div className="w-48 h-2.5 rounded-full bg-gradient-to-r from-emerald-500 via-cyan-500 via-blue-500 via-amber-500 to-rose-500" />
        </div>

        <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-400">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>&lt;35ms (Intra-DC)</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <span>35–85ms (Continental)</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>85–180ms (Intercontinental)</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-400" />
            <span>&gt;180ms (Oceanic)</span>
          </span>
        </div>
      </div>
    </div>
  );
};
