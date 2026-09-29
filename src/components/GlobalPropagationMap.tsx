import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { TelemetryLatencyLog } from '../types/ethereum';
import { Globe, Radio, Zap, ShieldCheck, RefreshCw, Layers } from 'lucide-react';

export interface GlobalNodeHub {
  id: string;
  name: string;
  country: string;
  region: string;
  coordinates: [number, number]; // [longitude, latitude]
  latencyFactor: number;
  activeNodes: number;
  clientMix: string;
  isHost?: boolean;
}

export interface GlobalNodeHubWithTelemetry extends GlobalNodeHub {
  estimatedDelayMs: number;
  statusColor: string;
  tier: string;
}

const GLOBAL_HUBS: GlobalNodeHub[] = [
  {
    id: 'frankfurt',
    name: 'Frankfurt',
    country: 'Germany',
    region: 'Europe Central',
    coordinates: [8.6821, 50.1109],
    latencyFactor: 0.85,
    activeNodes: 1420,
    clientMix: 'Geth 48% · Nethermind 32% · Besu 12%',
    isHost: true,
  },
  {
    id: 'london',
    name: 'London',
    country: 'United Kingdom',
    region: 'Europe West',
    coordinates: [-0.1278, 51.5074],
    latencyFactor: 0.95,
    activeNodes: 980,
    clientMix: 'Geth 55% · Nethermind 25% · Reth 12%',
  },
  {
    id: 'helsinki',
    name: 'Helsinki',
    country: 'Finland',
    region: 'Europe North',
    coordinates: [24.9384, 60.1699],
    latencyFactor: 1.05,
    activeNodes: 610,
    clientMix: 'Geth 40% · Nethermind 35% · Besu 15%',
  },
  {
    id: 'virginia',
    name: 'N. Virginia',
    country: 'United States',
    region: 'North America East',
    coordinates: [-77.4875, 39.0438],
    latencyFactor: 1.25,
    activeNodes: 1850,
    clientMix: 'Geth 58% · Nethermind 22% · Reth 10%',
  },
  {
    id: 'oregon',
    name: 'Oregon',
    country: 'United States',
    region: 'North America West',
    coordinates: [-120.5542, 43.8041],
    latencyFactor: 1.65,
    activeNodes: 1120,
    clientMix: 'Geth 52% · Nethermind 28% · Besu 11%',
  },
  {
    id: 'tokyo',
    name: 'Tokyo',
    country: 'Japan',
    region: 'Asia East',
    coordinates: [139.6917, 35.6895],
    latencyFactor: 2.2,
    activeNodes: 790,
    clientMix: 'Geth 62% · Nethermind 20% · Erigon 8%',
  },
  {
    id: 'singapore',
    name: 'Singapore',
    country: 'Singapore',
    region: 'Asia Southeast',
    coordinates: [103.8198, 1.3521],
    latencyFactor: 2.05,
    activeNodes: 830,
    clientMix: 'Geth 50% · Nethermind 30% · Besu 12%',
  },
  {
    id: 'mumbai',
    name: 'Mumbai',
    country: 'India',
    region: 'Asia South',
    coordinates: [72.8777, 19.076],
    latencyFactor: 1.85,
    activeNodes: 420,
    clientMix: 'Geth 56% · Nethermind 24% · Reth 8%',
  },
  {
    id: 'saopaulo',
    name: 'São Paulo',
    country: 'Brazil',
    region: 'South America',
    coordinates: [-46.6333, -23.5505],
    latencyFactor: 2.4,
    activeNodes: 310,
    clientMix: 'Geth 54% · Nethermind 26% · Besu 10%',
  },
  {
    id: 'sydney',
    name: 'Sydney',
    country: 'Australia',
    region: 'Oceania',
    coordinates: [151.2093, -33.8688],
    latencyFactor: 2.75,
    activeNodes: 360,
    clientMix: 'Geth 60% · Nethermind 22% · Reth 10%',
  },
];

// Simplified GeoJSON coordinates for global landmasses
const WORLD_LAND_GEOJSON: any = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { name: 'North America' },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-168, 70], [-160, 60], [-140, 60], [-130, 50], [-124, 48],
            [-120, 34], [-115, 30], [-105, 20], [-90, 16], [-80, 8],
            [-77, 9], [-75, 12], [-82, 24], [-80, 26], [-76, 35],
            [-70, 42], [-65, 45], [-60, 50], [-64, 60], [-80, 65],
            [-95, 70], [-120, 72], [-140, 72], [-168, 70],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      properties: { name: 'South America' },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-80, 10], [-74, 11], [-60, 8], [-50, -2], [-35, -5],
            [-37, -12], [-40, -22], [-48, -28], [-55, -35], [-65, -55],
            [-75, -50], [-72, -40], [-70, -25], [-76, -14], [-80, -2],
            [-80, 10],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      properties: { name: 'Eurasia' },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-10, 36], [0, 40], [10, 45], [20, 40], [30, 32],
            [35, 30], [50, 26], [60, 24], [70, 20], [80, 10],
            [90, 20], [100, 10], [105, 2], [110, 20], [120, 24],
            [122, 32], [130, 35], [140, 45], [145, 55], [170, 65],
            [180, 70], [170, 72], [140, 74], [100, 76], [70, 74],
            [40, 70], [25, 71], [15, 60], [5, 55], [-5, 50],
            [-10, 44], [-10, 36],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      properties: { name: 'Africa' },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-17, 30], [-5, 36], [10, 37], [25, 32], [32, 30],
            [40, 20], [51, 12], [45, 0], [40, -10], [35, -25],
            [28, -34], [18, -34], [12, -20], [10, 0], [2, 6],
            [-15, 12], [-17, 20], [-17, 30],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      properties: { name: 'Australia' },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [114, -22], [122, -18], [130, -12], [136, -12], [142, -10],
            [146, -18], [152, -25], [153, -32], [148, -38], [138, -36],
            [130, -32], [118, -35], [114, -30], [114, -22],
          ],
        ],
      },
    },
  ],
};

interface GlobalPropagationMapProps {
  latencyLogs: TelemetryLatencyLog[];
  hostClientVersion?: string;
}

export const GlobalPropagationMap: React.FC<GlobalPropagationMapProps> = ({
  latencyLogs,
  hostClientVersion = 'Geth/v1.14.8',
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hoveredHub, setHoveredHub] = useState<GlobalNodeHubWithTelemetry | null>(null);
  const [isSimulatingWave, setIsSimulatingWave] = useState<boolean>(true);
  const [waveCounter, setWaveCounter] = useState<number>(0);

  // Compute baseline latency from logs
  const baseLatencyMs = useMemo(() => {
    if (latencyLogs.length > 0) {
      const valid = latencyLogs.map((l) => l.latencyMs).filter((v) => v > 0);
      if (valid.length > 0) {
        return Math.round(valid.reduce((a, b) => a + b, 0) / valid.length);
      }
    }
    return 65; // fallback nominal RPC latency
  }, [latencyLogs]);

  // Compute propagation hubs with estimated delay
  const hubsWithTelemetry = useMemo(() => {
    return GLOBAL_HUBS.map((hub) => {
      const estimatedDelayMs = Math.round(baseLatencyMs * hub.latencyFactor);
      let statusColor = '#10b981'; // fast (<80ms)
      let tier = 'Fast Path';
      if (estimatedDelayMs > 200) {
        statusColor = '#f43f5e'; // long-haul (>200ms)
        tier = 'Intercontinental';
      } else if (estimatedDelayMs > 130) {
        statusColor = '#f59e0b'; // moderate (130-200ms)
        tier = 'Cross-Oceanic';
      } else if (estimatedDelayMs > 80) {
        statusColor = '#38bdf8'; // medium (80-130ms)
        tier = 'Regional Core';
      }

      return {
        ...hub,
        estimatedDelayMs,
        statusColor,
        tier,
      };
    });
  }, [baseLatencyMs]);

  // Global summary metrics
  const avgPropagationMs = Math.round(
    hubsWithTelemetry.reduce((acc, h) => acc + h.estimatedDelayMs, 0) / hubsWithTelemetry.length
  );
  const fastestHub = hubsWithTelemetry.reduce((prev, curr) =>
    curr.estimatedDelayMs < prev.estimatedDelayMs ? curr : prev
  );
  const slowestHub = hubsWithTelemetry.reduce((prev, curr) =>
    curr.estimatedDelayMs > prev.estimatedDelayMs ? curr : prev
  );

  // Render D3 Map
  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth || 800;
    const height = Math.max(340, Math.min(420, width * 0.45));

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    svg.attr('viewBox', `0 0 ${width} ${height}`).attr('width', '100%').attr('height', height);

    // Natural Earth projection
    const projection = d3
      .geoNaturalEarth1()
      .scale(width / 5.8)
      .translate([width / 2, height / 1.85]);

    const pathGenerator = d3.geoPath().projection(projection);

    const g = svg.append('g').attr('class', 'map-stage');

    // Graticule lines (Latitude / Longitude grid)
    const graticule = d3.geoGraticule().step([30, 30]);
    g.append('path')
      .datum(graticule)
      .attr('class', 'graticule')
      .attr('d', pathGenerator)
      .attr('fill', 'none')
      .attr('stroke', 'rgba(255, 255, 255, 0.05)')
      .attr('stroke-width', 0.6)
      .attr('stroke-dasharray', '2,3');

    // Draw Continents / Landmasses
    g.selectAll('.land-feature')
      .data(WORLD_LAND_GEOJSON.features)
      .enter()
      .append('path')
      .attr('class', 'land-feature')
      .attr('d', (d: any) => pathGenerator(d))
      .attr('fill', '#111827')
      .attr('stroke', '#1f2937')
      .attr('stroke-width', 1.2)
      .attr('opacity', 0.85);

    // Host location coordinates (Frankfurt)
    const hostHub = hubsWithTelemetry.find((h) => h.isHost) || hubsWithTelemetry[0];
    const hostPos = projection(hostHub.coordinates) || [width / 2, height / 2];

    // Connecting Geodesic Arcs from Host to other Global Hubs
    hubsWithTelemetry.forEach((hub) => {
      if (hub.id === hostHub.id) return;
      const targetPos = projection(hub.coordinates);
      if (!targetPos) return;

      const [x1, y1] = hostPos;
      const [x2, y2] = targetPos;

      // Generate curved arc line
      const dx = x2 - x1;
      const dy = y2 - y1;
      const dr = Math.sqrt(dx * dx + dy * dy) * 1.15;

      const arcPath = `M ${x1} ${y1} A ${dr} ${dr} 0 0,${x1 < x2 ? 1 : 0} ${x2} ${y2}`;

      // Background subtle path
      g.append('path')
        .attr('d', arcPath)
        .attr('fill', 'none')
        .attr('stroke', hub.statusColor)
        .attr('stroke-width', 1)
        .attr('stroke-opacity', 0.22)
        .attr('stroke-dasharray', '4 4');

      // Animated traveling wave particle
      if (isSimulatingWave) {
        const particle = g
          .append('circle')
          .attr('r', 2)
          .attr('fill', hub.statusColor)
          .attr('filter', 'drop-shadow(0 0 4px currentColor)');

        // Transition along arc
        const animateParticle = () => {
          const pathNode = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          pathNode.setAttribute('d', arcPath);
          const totalLength = pathNode.getTotalLength();

          particle
            .transition()
            .duration(Math.max(1200, hub.estimatedDelayMs * 14))
            .ease(d3.easeLinear)
            .attrTween('transform', () => {
              return (t) => {
                const point = pathNode.getPointAtLength(t * totalLength);
                return `translate(${point.x}, ${point.y})`;
              };
            })
            .on('end', () => {
              particle.attr('transform', `translate(${x1}, ${y1})`);
              animateParticle();
            });
        };

        animateParticle();
      }
    });

    // Render Hub Node Markers
    hubsWithTelemetry.forEach((hub) => {
      const pos = projection(hub.coordinates);
      if (!pos) return;
      const [cx, cy] = pos;

      const hubGroup = g
        .append('g')
        .attr('class', 'hub-node cursor-pointer')
        .attr('transform', `translate(${cx}, ${cy})`)
        .on('mouseenter', () => setHoveredHub(hub))
        .on('mouseleave', () => setHoveredHub(null));

      // Outer Pulse Ring
      hubGroup
        .append('circle')
        .attr('r', hub.isHost ? 8 : 6)
        .attr('fill', hub.statusColor)
        .attr('opacity', 0.2)
        .attr('class', 'animate-ping')
        .style('animation-duration', `${Math.max(1.5, hub.estimatedDelayMs / 70)}s`);

      // Middle Ring
      hubGroup
        .append('circle')
        .attr('r', hub.isHost ? 5 : 4)
        .attr('fill', hub.statusColor)
        .attr('opacity', 0.85);

      // Core Solid Center
      hubGroup
        .append('circle')
        .attr('r', hub.isHost ? 2.5 : 2)
        .attr('fill', '#ffffff');

      // Hub Label Text
      hubGroup
        .append('text')
        .attr('x', 7)
        .attr('y', 3)
        .text(hub.name)
        .attr('fill', '#cbd5e1')
        .attr('font-size', '9px')
        .attr('font-family', 'JetBrains Mono, monospace')
        .attr('font-weight', hub.isHost ? 'bold' : 'normal');

      // Latency tag below label
      hubGroup
        .append('text')
        .attr('x', 7)
        .attr('y', 13)
        .text(`${hub.estimatedDelayMs}ms`)
        .attr('fill', hub.statusColor)
        .attr('font-size', '8px')
        .attr('font-family', 'JetBrains Mono, monospace');
    });
  }, [hubsWithTelemetry, isSimulatingWave, waveCounter]);

  return (
    <div className="p-5 bg-slate-900/50 rounded-xl border border-slate-800 space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-white">
              Global Node Propagation & Network Latency Map
            </h3>
            <span className="text-[11px] text-slate-400 font-sans">
              (D3 Projected Topography)
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            D3 Natural Earth projection plotting estimated block broadcast delays across 10 major global validator hubs.
          </p>
        </div>

        {/* Unboxed Statistics */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <span>Global Mean: <strong className="text-emerald-400 font-semibold">{avgPropagationMs}ms</strong></span>
            <span className="text-slate-600">·</span>
            <span>Fastest: <span className="text-white">{fastestHub.name} ({fastestHub.estimatedDelayMs}ms)</span></span>
            <span className="text-slate-600">·</span>
            <span>Slowest: <span className="text-amber-400">{slowestHub.name} ({slowestHub.estimatedDelayMs}ms)</span></span>
          </div>

          <button
            onClick={() => {
              setWaveCounter((prev) => prev + 1);
            }}
            title="Broadcast test propagation wave"
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded bg-slate-950 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-colors"
          >
            <RefreshCw className="w-3 h-3 text-emerald-400" />
            <span>Broadcast Wave</span>
          </button>
        </div>
      </div>

      {/* D3 Map Canvas Container */}
      <div ref={containerRef} className="relative w-full rounded-xl bg-slate-950/80 border border-slate-800/80 overflow-hidden">
        <svg ref={svgRef} className="w-full block" />

        {/* Hover Popover Modal Overlay */}
        {hoveredHub && (
          <div
            className="absolute top-3 right-3 bg-[#111827]/95 border border-slate-700 p-3 rounded-xl shadow-2xl backdrop-blur text-xs font-sans space-y-1.5 min-w-[230px] animate-in fade-in duration-150"
          >
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
              <span className="font-bold text-white flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: hoveredHub.statusColor }}
                />
                {hoveredHub.name}, {hoveredHub.country}
              </span>
              {hoveredHub.isHost && (
                <span className="text-[9px] uppercase font-mono font-bold bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded border border-emerald-500/30">
                  Host Node
                </span>
              )}
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Estimated Delay:</span>
              <span className="font-mono font-bold text-white text-sm" style={{ color: hoveredHub.statusColor }}>
                {hoveredHub.estimatedDelayMs} ms
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Propagation Tier:</span>
              <span className="font-mono text-slate-300">{hoveredHub.tier}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Active Node Hubs:</span>
              <span className="font-mono text-emerald-400">~{hoveredHub.activeNodes.toLocaleString()} nodes</span>
            </div>

            <div className="pt-1 border-t border-slate-800/80 text-[10px] text-slate-400">
              <span className="text-slate-500 block mb-0.5">Client Mix:</span>
              <span className="font-mono text-slate-300">{hoveredHub.clientMix}</span>
            </div>
          </div>
        )}

        {/* Bottom Legend Overlay */}
        <div className="absolute bottom-2 left-3 right-3 flex flex-wrap items-center justify-between text-[11px] text-slate-400 font-mono pointer-events-none gap-2">
          <div className="flex items-center gap-3">
            <span className="text-slate-500">Propagation Scale:</span>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>&lt;80ms Fast</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-sky-400" />
              <span>80-130ms Core</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>130-200ms Oceanic</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-400" />
              <span>&gt;200ms Intercontinental</span>
            </div>
          </div>

          <div className="hidden sm:block text-slate-500">
            Target Slot Broadcast &lt;400ms (100% Attestation Window)
          </div>
        </div>
      </div>
    </div>
  );
};
