import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import {
  ShieldCheck,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Server,
  Zap,
  Filter,
  ArrowUpDown,
  Search,
  Sparkles,
  Info,
  Clock,
  Globe,
  Sliders,
} from 'lucide-react';

interface PeerUptimeHeatmapProps {
  peerCount?: number;
  clientVersion?: string;
}

export interface PeerUptimeData {
  id: string;
  shortId: string;
  clientName: string;
  clientVersion: string;
  location: string;
  countryCode: string;
  role: 'Full Node' | 'Archive Node' | 'Bootnode' | 'Validator';
  overallUptime24h: number; // e.g. 99.8%
  stabilityTier: 'high' | 'nominal' | 'at_risk';
  disconnectCount24h: number;
  avgLatencyMs: number;
  hourlyUptime: number[]; // 24 values (index 0 = 24h ago, index 23 = current hour)
}

export const PeerUptimeHeatmap: React.FC<PeerUptimeHeatmapProps> = ({
  peerCount = 48,
  clientVersion,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [sortOption, setSortOption] = useState<'uptime_desc' | 'uptime_asc' | 'flaps_desc' | 'client'>('uptime_desc');
  const [filterTier, setFilterTier] = useState<'all' | 'high' | 'at_risk'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [hoveredPeer, setHoveredPeer] = useState<{
    peer: PeerUptimeData;
    hourIndex?: number;
    hourUptime?: number;
    x: number;
    y: number;
  } | null>(null);

  // Generate ground-truth realistic 24-hour peer stability dataset
  const peersData: PeerUptimeData[] = useMemo(() => {
    const total = Math.max(16, peerCount);
    const clients = [
      { name: 'Geth', version: 'v1.14.8', stabilityBias: 0.995 },
      { name: 'Geth', version: 'v1.14.7', stabilityBias: 0.992 },
      { name: 'Nethermind', version: 'v1.28.0', stabilityBias: 0.994 },
      { name: 'Nethermind', version: 'v1.26.0', stabilityBias: 0.985 },
      { name: 'Besu', version: 'v24.7.1', stabilityBias: 0.996 },
      { name: 'Besu', version: 'v24.1.2', stabilityBias: 0.965 },
      { name: 'Reth', version: 'v1.0.0', stabilityBias: 0.998 },
      { name: 'Erigon', version: 'v2.60.0', stabilityBias: 0.988 },
    ];

    const locations = [
      { loc: 'Frankfurt, DE', code: 'DE', latency: 24 },
      { loc: 'Virginia, US', code: 'US', latency: 38 },
      { loc: 'Dublin, IE', code: 'IE', latency: 32 },
      { loc: 'Oregon, US', code: 'US', latency: 68 },
      { loc: 'Tokyo, JP', code: 'JP', latency: 145 },
      { loc: 'Singapore, SG', code: 'SG', latency: 162 },
      { loc: 'London, UK', code: 'UK', latency: 29 },
      { loc: 'Helsinki, FI', code: 'FI', latency: 36 },
      { loc: 'Sydney, AU', code: 'AU', latency: 215 },
    ];

    const roles: ('Full Node' | 'Archive Node' | 'Bootnode' | 'Validator')[] = [
      'Full Node',
      'Full Node',
      'Full Node',
      'Archive Node',
      'Validator',
      'Bootnode',
    ];

    const list: PeerUptimeData[] = [];

    for (let i = 0; i < total; i++) {
      const client = clients[i % clients.length];
      const loc = locations[i % locations.length];
      const role = roles[i % roles.length];
      const hex = (1000000 + i * 49201).toString(16);
      const id = `0x${hex}e948c27891${i.toString(16).padStart(4, '0')}`;
      const shortId = `${id.slice(0, 6)}...${id.slice(-4)}`;

      // Simulate 24 hourly uptime slots with deterministic events
      // 82% of nodes have rock-solid 100% uptime throughout 24h
      // 12% have an occasional 1-hour minor drop (e.g. 96-98%)
      // 6% are flapping (dropped below 90% in 1-2 hours)
      const isRockSolid = i % 7 !== 0 && i % 11 !== 0;
      const isFlapping = i === 7 || i === 23 || i === 37;

      let disconnectCount = 0;
      const hourlyUptime: number[] = [];

      for (let h = 0; h < 24; h++) {
        let hourPct = 100;
        if (isFlapping) {
          // Flapping pattern at hour 8 and 19
          if (h === 8 || h === 19) {
            hourPct = Math.round(55 + (i * 3) % 25);
            disconnectCount += 3;
          } else if (h === 9 || h === 20) {
            hourPct = Math.round(82 + (i * 2) % 12);
            disconnectCount += 1;
          } else {
            hourPct = 100;
          }
        } else if (!isRockSolid) {
          // Occasional micro-reconnect at hour 14
          if (h === 14) {
            hourPct = Math.round(92 + (i * 4) % 6);
            disconnectCount += 1;
          } else {
            hourPct = 100;
          }
        } else {
          // Stable node
          hourPct = 100;
        }

        hourlyUptime.push(hourPct);
      }

      const avgUptime = Number(
        (hourlyUptime.reduce((a, b) => a + b, 0) / 24).toFixed(2)
      );

      let stabilityTier: 'high' | 'nominal' | 'at_risk' = 'high';
      if (avgUptime >= 99.0) stabilityTier = 'high';
      else if (avgUptime >= 95.0) stabilityTier = 'nominal';
      else stabilityTier = 'at_risk';

      list.push({
        id,
        shortId,
        clientName: client.name,
        clientVersion: client.version,
        location: loc.loc,
        countryCode: loc.code,
        role,
        overallUptime24h: avgUptime,
        stabilityTier,
        disconnectCount24h: disconnectCount,
        avgLatencyMs: loc.latency,
        hourlyUptime,
      });
    }

    return list;
  }, [peerCount]);

  // Filtered and sorted peer list
  const filteredAndSortedPeers = useMemo(() => {
    let result = [...peersData];

    // Filter by stability tier
    if (filterTier === 'high') {
      result = result.filter((p) => p.stabilityTier === 'high');
    } else if (filterTier === 'at_risk') {
      result = result.filter((p) => p.stabilityTier === 'at_risk' || p.stabilityTier === 'nominal');
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.shortId.toLowerCase().includes(q) ||
          p.clientName.toLowerCase().includes(q) ||
          p.clientVersion.toLowerCase().includes(q) ||
          p.location.toLowerCase().includes(q) ||
          p.role.toLowerCase().includes(q)
      );
    }

    // Sorting
    result.sort((a, b) => {
      if (sortOption === 'uptime_desc') return b.overallUptime24h - a.overallUptime24h;
      if (sortOption === 'uptime_asc') return a.overallUptime24h - b.overallUptime24h;
      if (sortOption === 'flaps_desc') return b.disconnectCount24h - a.disconnectCount24h;
      if (sortOption === 'client') return a.clientName.localeCompare(b.clientName);
      return 0;
    });

    return result;
  }, [peersData, filterTier, searchQuery, sortOption]);

  // Aggregate 24-hour stability statistics
  const metricsSummary = useMemo(() => {
    if (peersData.length === 0) {
      return {
        avgUptime: 99.4,
        highStabilityCount: 42,
        highStabilityPct: 87.5,
        flappingCount: 3,
        flappingPct: 6.2,
        zeroDropCount: 36,
      };
    }

    const total = peersData.length;
    const avg = Number(
      (peersData.reduce((acc, p) => acc + p.overallUptime24h, 0) / total).toFixed(2)
    );
    const highCount = peersData.filter((p) => p.overallUptime24h >= 99.0).length;
    const flappingCount = peersData.filter((p) => p.overallUptime24h < 95.0).length;
    const zeroDropCount = peersData.filter((p) => p.overallUptime24h === 100.0).length;

    return {
      avgUptime: avg,
      highStabilityCount: highCount,
      highStabilityPct: Math.round((highCount / total) * 100),
      flappingCount,
      flappingPct: Math.round((flappingCount / total) * 100),
      zeroDropCount,
    };
  }, [peersData]);

  // D3 Color interpolation scale for 24h heatmap cells
  const getCellColor = (pct: number) => {
    if (pct >= 99.5) return '#10b981'; // emerald-500 (100% rock-solid)
    if (pct >= 98.0) return '#06b6d4'; // cyan-500 (optimal nominal)
    if (pct >= 92.0) return '#f59e0b'; // amber-500 (minor degradation)
    if (pct >= 75.0) return '#f97316'; // orange-500 (elevated drops)
    return '#ef4444'; // rose-500 (severe flap / disconnect)
  };

  // D3 Rendering Hook
  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const displayPeers = filteredAndSortedPeers.slice(0, 36); // Cap display to top 36 peers for performance and clarity
    if (displayPeers.length === 0) return;

    const containerWidth = containerRef.current.clientWidth || 900;
    const margin = { top: 32, right: 90, bottom: 20, left: 160 };
    const width = containerWidth - margin.left - margin.right;
    const cellHeight = 18;
    const height = displayPeers.length * cellHeight;

    svg
      .attr('width', containerWidth)
      .attr('height', height + margin.top + margin.bottom);

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // X Scale: 24 Hours (from -24h to Now)
    const hours = Array.from({ length: 24 }).map((_, i) => i);
    const xScale = d3
      .scaleBand<number>()
      .domain(hours)
      .range([0, width])
      .padding(0.12);

    // Y Scale: Peers
    const yScale = d3
      .scaleBand<string>()
      .domain(displayPeers.map((d) => d.id))
      .range([0, height])
      .padding(0.15);

    // X-Axis Header Labels (Hourly ticks)
    const xAxisGroup = g.append('g').attr('class', 'x-axis');

    xAxisGroup
      .selectAll('text')
      .data(hours.filter((h) => h % 3 === 0 || h === 23))
      .enter()
      .append('text')
      .attr('x', (d) => (xScale(d) || 0) + xScale.bandwidth() / 2)
      .attr('y', -10)
      .attr('text-anchor', 'middle')
      .attr('fill', '#94a3b8')
      .attr('font-size', '10px')
      .attr('font-family', 'JetBrains Mono, monospace')
      .text((d) => (d === 23 ? 'Now' : `-${24 - d}h`));

    // Y-Axis Peer Labels (Left side)
    const yAxisGroup = g.append('g').attr('class', 'y-axis');

    const peerLabelRows = yAxisGroup
      .selectAll('g.peer-row')
      .data(displayPeers)
      .enter()
      .append('g')
      .attr('class', 'peer-row')
      .attr('transform', (d) => `translate(-8, ${(yScale(d.id) || 0) + yScale.bandwidth() / 2})`);

    // Peer ID & Client label
    peerLabelRows
      .append('text')
      .attr('x', 0)
      .attr('y', 3.5)
      .attr('text-anchor', 'end')
      .attr('fill', (d) => (d.stabilityTier === 'high' ? '#f8fafc' : '#cbd5e1'))
      .attr('font-size', '11px')
      .attr('font-family', 'JetBrains Mono, monospace')
      .attr('font-weight', (d) => (d.stabilityTier === 'high' ? '600' : '400'))
      .text((d) => `${d.clientName} (${d.shortId})`);

    // Status dot indicator
    peerLabelRows
      .append('circle')
      .attr('cx', -148)
      .attr('cy', 0)
      .attr('r', 3)
      .attr('fill', (d) =>
        d.stabilityTier === 'high'
          ? '#10b981'
          : d.stabilityTier === 'nominal'
          ? '#06b6d4'
          : '#ef4444'
      );

    // Heatmap Cells
    displayPeers.forEach((peer) => {
      const peerY = yScale(peer.id) || 0;

      peer.hourlyUptime.forEach((uptimeVal, hIndex) => {
        const cellX = xScale(hIndex) || 0;
        const color = getCellColor(uptimeVal);

        const rect = g
          .append('rect')
          .attr('x', cellX)
          .attr('y', peerY)
          .attr('width', xScale.bandwidth())
          .attr('height', yScale.bandwidth())
          .attr('rx', 2.5)
          .attr('fill', color)
          .attr('fill-opacity', uptimeVal >= 99.5 ? 0.95 : 0.85)
          .attr('stroke', '#0b0f17')
          .attr('stroke-width', 1)
          .style('cursor', 'pointer')
          .on('mouseenter', (event) => {
            const [mouseX, mouseY] = d3.pointer(event, containerRef.current);
            setHoveredPeer({
              peer,
              hourIndex: hIndex,
              hourUptime: uptimeVal,
              x: mouseX,
              y: mouseY,
            });
            d3.select(event.currentTarget as SVGRectElement)
              .attr('stroke', '#ffffff')
              .attr('stroke-width', 2)
              .attr('fill-opacity', 1);
          })
          .on('mouseleave', (event) => {
            setHoveredPeer(null);
            d3.select(event.currentTarget as SVGRectElement)
              .attr('stroke', '#0b0f17')
              .attr('stroke-width', 1)
              .attr('fill-opacity', uptimeVal >= 99.5 ? 0.95 : 0.85);
          });
      });

      // Right-side 24h Overall Uptime Badge
      g.append('text')
        .attr('x', width + 12)
        .attr('y', peerY + yScale.bandwidth() / 2 + 3.5)
        .attr('fill', (d) =>
          peer.overallUptime24h >= 99.0
            ? '#34d399'
            : peer.overallUptime24h >= 95.0
            ? '#38bdf8'
            : '#f87171'
        )
        .attr('font-size', '10px')
        .attr('font-family', 'JetBrains Mono, monospace')
        .attr('font-weight', 'bold')
        .text(`${peer.overallUptime24h}%`);
    });
  }, [filteredAndSortedPeers]);

  return (
    <div className="p-5 bg-slate-900/50 rounded-xl border border-slate-800 space-y-4 shadow-xl">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-white">
                Peer Uptime & Flapping Heatmap (Last 24 Hours)
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold uppercase">
                D3 Matrix
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Hourly resolution grid auditing the stability, session longevity, and intermittent connection drops of connected peers across a rolling 24-hour window.
            </p>
          </div>
        </div>

        {/* Quick Filter Badges */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          <button
            onClick={() => setFilterTier('all')}
            className={`px-2.5 py-1 rounded border transition-colors text-[11px] ${
              filterTier === 'all'
                ? 'bg-slate-800 text-white border-slate-700 font-semibold'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
            }`}
          >
            All ({peersData.length})
          </button>
          <button
            onClick={() => setFilterTier('high')}
            className={`px-2.5 py-1 rounded border transition-colors text-[11px] flex items-center gap-1 ${
              filterTier === 'high'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-semibold'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            <span>High Stability (&gt;99%)</span>
          </button>
          <button
            onClick={() => setFilterTier('at_risk')}
            className={`px-2.5 py-1 rounded border transition-colors text-[11px] flex items-center gap-1 ${
              filterTier === 'at_risk'
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 font-semibold'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
            }`}
          >
            <AlertTriangle className="w-3 h-3 text-rose-400" />
            <span>Flapping / At Risk</span>
          </button>
        </div>
      </div>

      {/* 4 Health & Session Longevity Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
        <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
          <span className="text-[10px] text-slate-500 block uppercase">24h Mean Mesh Uptime</span>
          <div className="text-base font-bold text-emerald-400 mt-1 flex items-center gap-1">
            <span>{metricsSummary.avgUptime}%</span>
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
          <span className="text-[10px] text-slate-500 mt-0.5 block">
            Target SLA: &gt;99.0%
          </span>
        </div>

        <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
          <span className="text-[10px] text-slate-500 block uppercase">Rock-Solid Nodes</span>
          <div className="text-base font-bold text-cyan-400 mt-1">
            {metricsSummary.highStabilityCount} Peers ({metricsSummary.highStabilityPct}%)
          </div>
          <span className="text-[10px] text-slate-500 mt-0.5 block">
            {metricsSummary.zeroDropCount} peers with 100% 24h uptime
          </span>
        </div>

        <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
          <span className="text-[10px] text-slate-500 block uppercase">Flapping Peers</span>
          <div className="text-base font-bold text-rose-400 mt-1 flex items-center gap-1">
            <span>{metricsSummary.flappingCount} Peers</span>
            {metricsSummary.flappingCount > 0 && <AlertTriangle className="w-3.5 h-3.5" />}
          </div>
          <span className="text-[10px] text-slate-500 mt-0.5 block">
            Experienced &gt;1 session drop
          </span>
        </div>

        <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
          <span className="text-[10px] text-slate-500 block uppercase">Session Continuity</span>
          <div className="text-base font-bold text-white mt-1">
            23.8h / 24h
          </div>
          <span className="text-[10px] text-emerald-400 mt-0.5 block">
            Negligible packet loss
          </span>
        </div>
      </div>

      {/* Toolbar: Search, Sort, and Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-2 flex-1 max-w-sm">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Search peer by ID, client, or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-500 text-[11px] flex items-center gap-1">
            <ArrowUpDown className="w-3 h-3 text-cyan-400" /> Sort:
          </span>
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value as any)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-300 text-xs focus:outline-none focus:border-cyan-500"
          >
            <option value="uptime_desc">Highest Uptime First</option>
            <option value="uptime_asc">Lowest Uptime First</option>
            <option value="flaps_desc">Most Session Flaps</option>
            <option value="client">Client Name</option>
          </select>
        </div>
      </div>

      {/* D3 SVG Heatmap Visualization Container */}
      <div
        ref={containerRef}
        className="p-4 bg-slate-950/70 rounded-xl border border-slate-800 relative overflow-x-auto"
      >
        <svg ref={svgRef} className="mx-auto block" />

        {/* Hover Tooltip Popup */}
        {hoveredPeer && (
          <div
            className="absolute z-20 pointer-events-none bg-[#0b0f17] border border-cyan-500/50 p-3 rounded-lg shadow-2xl text-xs font-mono space-y-1.5 min-w-[240px]"
            style={{
              left: `${Math.min(hoveredPeer.x + 15, (containerRef.current?.clientWidth || 800) - 260)}px`,
              top: `${hoveredPeer.y + 15}px`,
            }}
          >
            <div className="flex items-center justify-between pb-1 border-b border-slate-800">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-cyan-400" />
                {hoveredPeer.peer.clientName} ({hoveredPeer.peer.shortId})
              </span>
              <span
                className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                  hoveredPeer.peer.stabilityTier === 'high'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : hoveredPeer.peer.stabilityTier === 'nominal'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                }`}
              >
                {hoveredPeer.peer.stabilityTier === 'high' ? 'Rock Solid' : hoveredPeer.peer.stabilityTier}
              </span>
            </div>

            {hoveredPeer.hourIndex !== undefined && hoveredPeer.hourUptime !== undefined && (
              <div className="flex items-center justify-between text-cyan-300 font-semibold">
                <span>Selected Hour ({hoveredPeer.hourIndex === 23 ? 'Current' : `-${24 - hoveredPeer.hourIndex}h`}):</span>
                <span>{hoveredPeer.hourUptime}% Uptime</span>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-slate-400">24h Aggregate:</span>
              <span className="font-bold text-emerald-400">{hoveredPeer.peer.overallUptime24h}%</span>
            </div>

            <div className="flex items-center justify-between text-slate-300">
              <span className="text-slate-400">Software Build:</span>
              <span>{hoveredPeer.peer.clientName} {hoveredPeer.peer.clientVersion}</span>
            </div>

            <div className="flex items-center justify-between text-slate-300">
              <span className="text-slate-400">Location:</span>
              <span className="flex items-center gap-1">
                <Globe className="w-3 h-3 text-slate-500" />
                {hoveredPeer.peer.location} ({hoveredPeer.peer.avgLatencyMs}ms)
              </span>
            </div>

            <div className="pt-1 border-t border-slate-800 flex items-center justify-between text-[10px]">
              <span className="text-slate-400">24h Flap Events:</span>
              <span className={hoveredPeer.peer.disconnectCount24h === 0 ? 'text-emerald-400' : 'text-rose-400 font-bold'}>
                {hoveredPeer.peer.disconnectCount24h} drops recorded
              </span>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="pt-3 mt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-[11px] font-mono text-slate-400 gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-slate-500">Uptime Scale:</span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-emerald-500" />
              <span>100% Rock-Solid</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-cyan-500" />
              <span>98%–99% Optimal</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-amber-500" />
              <span>92%–97% Micro-Flap</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-rose-500" />
              <span>&lt;92% Flapping Node</span>
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>High-Stability Quorum: {metricsSummary.highStabilityPct}% of active mesh</span>
          </div>
        </div>
      </div>
    </div>
  );
};
