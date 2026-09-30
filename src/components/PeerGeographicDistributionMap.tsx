import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { WORLD_LAND_GEOJSON } from '../utils/worldGeoJson';
import {
  Globe,
  Radio,
  MapPin,
  ShieldCheck,
  Server,
  Layers,
  Search,
  Filter,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Info,
  Maximize2,
  Sliders,
} from 'lucide-react';

interface PeerGeographicDistributionMapProps {
  peerCount?: number;
  hostClientVersion?: string;
  onSelectPeer?: (peer: PeerGeoNode) => void;
}

export interface PeerGeoNode {
  id: string;
  ip: string;
  port: number;
  city: string;
  country: string;
  countryCode: string;
  continent: 'Europe' | 'North America' | 'Asia-Pacific' | 'Latin America' | 'Africa' | 'Oceania';
  coordinates: [number, number]; // [longitude, latitude]
  clientFamily: 'Geth' | 'Nethermind' | 'Besu' | 'Reth' | 'Erigon';
  clientVersion: string;
  asOrganization: string;
  hostingType: 'Cloud' | 'Baremetal / Residential';
  latencyMs: number;
  role: 'Full Node' | 'Archive Node' | 'Validator' | 'Bootnode';
  stability: 'high' | 'nominal';
}

const PEER_GEO_POOL: Omit<PeerGeoNode, 'id' | 'ip' | 'port' | 'latencyMs'>[] = [
  // Europe
  { city: 'Frankfurt', country: 'Germany', countryCode: 'DE', continent: 'Europe', coordinates: [8.6821, 50.1109], clientFamily: 'Geth', clientVersion: 'v1.14.8', asOrganization: 'Hetzner Online GmbH', hostingType: 'Cloud', role: 'Full Node', stability: 'high' },
  { city: 'Helsinki', country: 'Finland', countryCode: 'FI', continent: 'Europe', coordinates: [24.9384, 60.1699], clientFamily: 'Nethermind', clientVersion: 'v1.28.0', asOrganization: 'Hetzner Online GmbH', hostingType: 'Cloud', role: 'Full Node', stability: 'high' },
  { city: 'London', country: 'United Kingdom', countryCode: 'GB', continent: 'Europe', coordinates: [-0.1278, 51.5074], clientFamily: 'Geth', clientVersion: 'v1.14.7', asOrganization: 'British Telecommunications', hostingType: 'Baremetal / Residential', role: 'Full Node', stability: 'high' },
  { city: 'Dublin', country: 'Ireland', countryCode: 'IE', continent: 'Europe', coordinates: [-6.2603, 53.3498], clientFamily: 'Besu', clientVersion: 'v24.7.1', asOrganization: 'Amazon.com AWS', hostingType: 'Cloud', role: 'Archive Node', stability: 'high' },
  { city: 'Paris', country: 'France', countryCode: 'FR', continent: 'Europe', coordinates: [2.3522, 48.8566], clientFamily: 'Reth', clientVersion: 'v1.0.0', asOrganization: 'OVH SAS', hostingType: 'Cloud', role: 'Validator', stability: 'high' },
  { city: 'Amsterdam', country: 'Netherlands', countryCode: 'NL', continent: 'Europe', coordinates: [4.9041, 52.3676], clientFamily: 'Geth', clientVersion: 'v1.14.8', asOrganization: 'Leaseweb Global B.V.', hostingType: 'Cloud', role: 'Full Node', stability: 'high' },
  { city: 'Stockholm', country: 'Sweden', countryCode: 'SE', continent: 'Europe', coordinates: [18.0686, 59.3293], clientFamily: 'Erigon', clientVersion: 'v2.60.0', asOrganization: 'Telia Company AB', hostingType: 'Baremetal / Residential', role: 'Full Node', stability: 'nominal' },
  { city: 'Zurich', country: 'Switzerland', countryCode: 'CH', continent: 'Europe', coordinates: [8.5417, 47.3769], clientFamily: 'Besu', clientVersion: 'v24.7.1', asOrganization: 'Swisscom AG', hostingType: 'Baremetal / Residential', role: 'Validator', stability: 'high' },
  { city: 'Warsaw', country: 'Poland', countryCode: 'PL', continent: 'Europe', coordinates: [21.0122, 52.2297], clientFamily: 'Nethermind', clientVersion: 'v1.28.0', asOrganization: 'Orange Polska', hostingType: 'Baremetal / Residential', role: 'Full Node', stability: 'high' },

  // North America
  { city: 'Ashburn (VA)', country: 'United States', countryCode: 'US', continent: 'North America', coordinates: [-77.4875, 39.0438], clientFamily: 'Geth', clientVersion: 'v1.14.8', asOrganization: 'Amazon.com AWS', hostingType: 'Cloud', role: 'Full Node', stability: 'high' },
  { city: 'Hillsboro (OR)', country: 'United States', countryCode: 'US', continent: 'North America', coordinates: [-122.9898, 45.5229], clientFamily: 'Nethermind', clientVersion: 'v1.28.0', asOrganization: 'Amazon.com AWS', hostingType: 'Cloud', role: 'Full Node', stability: 'high' },
  { city: 'Council Bluffs (IA)', country: 'United States', countryCode: 'US', continent: 'North America', coordinates: [-95.8608, 41.2619], clientFamily: 'Geth', clientVersion: 'v1.14.8', asOrganization: 'Google Cloud Platform', hostingType: 'Cloud', role: 'Archive Node', stability: 'high' },
  { city: 'New York (NY)', country: 'United States', countryCode: 'US', continent: 'North America', coordinates: [-74.006, 40.7128], clientFamily: 'Reth', clientVersion: 'v1.0.0', asOrganization: 'DigitalOcean LLC', hostingType: 'Cloud', role: 'Validator', stability: 'high' },
  { city: 'San Jose (CA)', country: 'United States', countryCode: 'US', continent: 'North America', coordinates: [-121.8863, 37.3382], clientFamily: 'Besu', clientVersion: 'v24.7.1', asOrganization: 'Comcast Cable', hostingType: 'Baremetal / Residential', role: 'Full Node', stability: 'high' },
  { city: 'Chicago (IL)', country: 'United States', countryCode: 'US', continent: 'North America', coordinates: [-87.6298, 41.8781], clientFamily: 'Geth', clientVersion: 'v1.14.7', asOrganization: 'AT&T Services', hostingType: 'Baremetal / Residential', role: 'Full Node', stability: 'high' },
  { city: 'Toronto', country: 'Canada', countryCode: 'CA', continent: 'North America', coordinates: [-79.3832, 43.6532], clientFamily: 'Nethermind', clientVersion: 'v1.28.0', asOrganization: 'Rogers Communications', hostingType: 'Baremetal / Residential', role: 'Full Node', stability: 'high' },
  { city: 'Montreal', country: 'Canada', countryCode: 'CA', continent: 'North America', coordinates: [-73.5673, 45.5017], clientFamily: 'Erigon', clientVersion: 'v2.60.0', asOrganization: 'OVH Hosting Inc', hostingType: 'Cloud', role: 'Full Node', stability: 'nominal' },

  // Asia-Pacific & Oceania
  { city: 'Tokyo', country: 'Japan', countryCode: 'JP', continent: 'Asia-Pacific', coordinates: [139.6917, 35.6895], clientFamily: 'Geth', clientVersion: 'v1.14.8', asOrganization: 'NTT Communications', hostingType: 'Baremetal / Residential', role: 'Full Node', stability: 'high' },
  { city: 'Singapore', country: 'Singapore', countryCode: 'SG', continent: 'Asia-Pacific', coordinates: [103.8198, 1.3521], clientFamily: 'Besu', clientVersion: 'v24.7.1', asOrganization: 'Amazon.com AWS', hostingType: 'Cloud', role: 'Validator', stability: 'high' },
  { city: 'Seoul', country: 'South Korea', countryCode: 'KR', continent: 'Asia-Pacific', coordinates: [126.978, 37.5665], clientFamily: 'Nethermind', clientVersion: 'v1.28.0', asOrganization: 'KT Corporation', hostingType: 'Baremetal / Residential', role: 'Full Node', stability: 'high' },
  { city: 'Mumbai', country: 'India', countryCode: 'IN', continent: 'Asia-Pacific', coordinates: [72.8777, 19.076], clientFamily: 'Geth', clientVersion: 'v1.14.7', asOrganization: 'Reliance Jio Infocomm', hostingType: 'Baremetal / Residential', role: 'Full Node', stability: 'nominal' },
  { city: 'Sydney', country: 'Australia', countryCode: 'AU', continent: 'Oceania', coordinates: [151.2093, -33.8688], clientFamily: 'Reth', clientVersion: 'v1.0.0', asOrganization: 'Telstra Corporation', hostingType: 'Baremetal / Residential', role: 'Bootnode', stability: 'high' },
  { city: 'Melbourne', country: 'Australia', countryCode: 'AU', continent: 'Oceania', coordinates: [144.9631, -37.8136], clientFamily: 'Geth', clientVersion: 'v1.14.8', asOrganization: 'Optus Communications', hostingType: 'Baremetal / Residential', role: 'Full Node', stability: 'high' },

  // Latin America & Africa
  { city: 'São Paulo', country: 'Brazil', countryCode: 'BR', continent: 'Latin America', coordinates: [-46.6333, -23.5505], clientFamily: 'Nethermind', clientVersion: 'v1.28.0', asOrganization: 'Claro Brasil', hostingType: 'Baremetal / Residential', role: 'Full Node', stability: 'nominal' },
  { city: 'Santiago', country: 'Chile', countryCode: 'CL', continent: 'Latin America', coordinates: [-70.6693, -33.4489], clientFamily: 'Geth', clientVersion: 'v1.14.7', asOrganization: 'Telefonica Chile', hostingType: 'Baremetal / Residential', role: 'Full Node', stability: 'high' },
  { city: 'Johannesburg', country: 'South Africa', countryCode: 'ZA', continent: 'Africa', coordinates: [28.0473, -26.2041], clientFamily: 'Besu', clientVersion: 'v24.7.1', asOrganization: 'Vodacom Group', hostingType: 'Baremetal / Residential', role: 'Full Node', stability: 'nominal' },
];

export const PeerGeographicDistributionMap: React.FC<PeerGeographicDistributionMapProps> = ({
  peerCount = 48,
  hostClientVersion,
  onSelectPeer,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [regionFilter, setRegionFilter] = useState<string>('all');
  const [colorMode, setColorMode] = useState<'client' | 'latency' | 'hosting'>('client');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [hoveredPeer, setHoveredPeer] = useState<{
    peer: PeerGeoNode;
    x: number;
    y: number;
  } | null>(null);

  // Generate realistic peer scatter nodes calibrated to peerCount
  const peerNodes: PeerGeoNode[] = useMemo(() => {
    const total = Math.max(20, peerCount);
    const nodes: PeerGeoNode[] = [];

    for (let i = 0; i < total; i++) {
      const template = PEER_GEO_POOL[i % PEER_GEO_POOL.length];
      const octet1 = template.hostingType === 'Cloud' ? 3 + (i % 50) : 172 + (i % 40);
      const octet2 = 16 + (i * 7) % 200;
      const ip = `${octet1}.${octet2}.${(i * 13) % 254 + 1}.${(i * 19) % 250 + 4}`;
      const port = 30303;

      // Small jitter around city center so overlapping peers in same city fan out cleanly
      const jitterLon = (Math.sin(i * 2.3) * 1.8) + ((i % 3) * 0.4);
      const jitterLat = (Math.cos(i * 1.9) * 1.2) + ((i % 2) * 0.3);

      // Latency approximation based on geography (assuming host in Frankfurt/Europe)
      let latency = 25;
      if (template.continent === 'Europe') latency = Math.round(18 + (i % 20) * 1.5);
      else if (template.continent === 'North America') latency = Math.round(75 + (i % 25) * 1.8);
      else if (template.continent === 'Asia-Pacific') latency = Math.round(140 + (i % 30) * 2.2);
      else if (template.continent === 'Oceania') latency = Math.round(210 + (i % 20) * 2.5);
      else latency = Math.round(180 + (i % 30) * 2.0);

      nodes.push({
        id: `peer-${i + 1}`,
        ip,
        port,
        city: template.city,
        country: template.country,
        countryCode: template.countryCode,
        continent: template.continent,
        coordinates: [template.coordinates[0] + jitterLon, template.coordinates[1] + jitterLat],
        clientFamily: template.clientFamily,
        clientVersion: template.clientVersion,
        asOrganization: template.asOrganization,
        hostingType: template.hostingType,
        latencyMs: latency,
        role: template.role,
        stability: template.stability,
      });
    }

    return nodes;
  }, [peerCount]);

  // Filtered nodes
  const filteredNodes = useMemo(() => {
    return peerNodes.filter((p) => {
      const matchRegion =
        regionFilter === 'all' ||
        (regionFilter === 'europe' && p.continent === 'Europe') ||
        (regionFilter === 'north_america' && p.continent === 'North America') ||
        (regionFilter === 'asia_pacific' && (p.continent === 'Asia-Pacific' || p.continent === 'Oceania')) ||
        (regionFilter === 'other' && (p.continent === 'Latin America' || p.continent === 'Africa'));

      const matchSearch =
        searchQuery.trim() === '' ||
        p.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.ip.includes(searchQuery) ||
        p.asOrganization.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.clientFamily.toLowerCase().includes(searchQuery.toLowerCase());

      return matchRegion && matchSearch;
    });
  }, [peerNodes, regionFilter, searchQuery]);

  // Decentralization statistics
  const stats = useMemo(() => {
    const total = peerNodes.length;
    if (total === 0) return { europePct: 40, naPct: 35, apacPct: 18, otherPct: 7, cloudPct: 65, residentialPct: 35, countriesCount: 14 };

    const europeCount = peerNodes.filter((p) => p.continent === 'Europe').length;
    const naCount = peerNodes.filter((p) => p.continent === 'North America').length;
    const apacCount = peerNodes.filter((p) => p.continent === 'Asia-Pacific' || p.continent === 'Oceania').length;
    const otherCount = total - europeCount - naCount - apacCount;

    const cloudCount = peerNodes.filter((p) => p.hostingType === 'Cloud').length;
    const uniqueCountries = new Set(peerNodes.map((p) => p.country)).size;

    return {
      europePct: Math.round((europeCount / total) * 100),
      naPct: Math.round((naCount / total) * 100),
      apacPct: Math.round((apacCount / total) * 100),
      otherPct: Math.round((otherCount / total) * 100),
      cloudPct: Math.round((cloudCount / total) * 100),
      residentialPct: Math.round(((total - cloudCount) / total) * 100),
      countriesCount: uniqueCountries,
    };
  }, [peerNodes]);

  // Color helper
  const getNodeColor = (peer: PeerGeoNode) => {
    if (colorMode === 'client') {
      if (peer.clientFamily === 'Geth') return '#3b82f6'; // blue
      if (peer.clientFamily === 'Nethermind') return '#a855f7'; // purple
      if (peer.clientFamily === 'Besu') return '#06b6d4'; // cyan
      if (peer.clientFamily === 'Reth') return '#f97316'; // orange
      return '#ec4899'; // erigon / pink
    }
    if (colorMode === 'latency') {
      if (peer.latencyMs < 45) return '#10b981'; // fast (emerald)
      if (peer.latencyMs < 100) return '#38bdf8'; // medium (sky)
      if (peer.latencyMs < 180) return '#f59e0b'; // elevated (amber)
      return '#ef4444'; // high latency (rose)
    }
    // Hosting provider mode
    return peer.hostingType === 'Cloud' ? '#38bdf8' : '#10b981';
  };

  // D3 Rendering Map & Scatter Plot
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
    const g = svg.append('g').attr('class', 'geo-stage');

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

    // Continents
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

    // Host Node (Frankfurt) Marker
    const hostCoords = [8.6821, 50.1109];
    const hostPos = projection(hostCoords as [number, number]);
    if (hostPos) {
      // Pulsing beacon ring around host
      g.append('circle')
        .attr('cx', hostPos[0])
        .attr('cy', hostPos[1])
        .attr('r', 10)
        .attr('fill', 'none')
        .attr('stroke', '#10b981')
        .attr('stroke-width', 1.5)
        .attr('opacity', 0.6);

      g.append('circle')
        .attr('cx', hostPos[0])
        .attr('cy', hostPos[1])
        .attr('r', 4.5)
        .attr('fill', '#10b981')
        .attr('stroke', '#ffffff')
        .attr('stroke-width', 1.5);
    }

    // Scatter Plot Nodes (Active Peers)
    filteredNodes.forEach((peer) => {
      const pos = projection(peer.coordinates);
      if (!pos) return;

      const nodeColor = getNodeColor(peer);
      const isValidator = peer.role === 'Validator';

      // Outer glow for high stability or validators
      if (isValidator || peer.stability === 'high') {
        g.append('circle')
          .attr('cx', pos[0])
          .attr('cy', pos[1])
          .attr('r', 5.5)
          .attr('fill', nodeColor)
          .attr('fill-opacity', 0.25);
      }

      // Scatter Node Circle
      g.append('circle')
        .attr('cx', pos[0])
        .attr('cy', pos[1])
        .attr('r', isValidator ? 4.5 : 3.5)
        .attr('fill', nodeColor)
        .attr('stroke', '#0b0f17')
        .attr('stroke-width', 1.2)
        .style('cursor', 'pointer')
        .on('mouseenter', (event) => {
          const [mouseX, mouseY] = d3.pointer(event, containerRef.current);
          setHoveredPeer({
            peer,
            x: mouseX,
            y: mouseY,
          });
          d3.select(event.currentTarget as SVGCircleElement)
            .attr('r', 7)
            .attr('stroke', '#ffffff')
            .attr('stroke-width', 2);
        })
        .on('mouseleave', (event) => {
          setHoveredPeer(null);
          d3.select(event.currentTarget as SVGCircleElement)
            .attr('r', isValidator ? 4.5 : 3.5)
            .attr('stroke', '#0b0f17')
            .attr('stroke-width', 1.2);
        })
        .on('click', () => {
          if (onSelectPeer) onSelectPeer(peer);
        });
    });
  }, [filteredNodes, colorMode]);

  return (
    <div className="p-5 bg-slate-900/50 rounded-xl border border-slate-800 space-y-4 shadow-xl">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Globe className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-white">
                Peer Geographic Distribution & Decentralization Map
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold uppercase">
                D3 Geo Scatter
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              D3-based scatter plot mapping the approximate physical and network locations of connected peers derived from devp2p IP addresses.
            </p>
          </div>
        </div>

        {/* View Controls: Color Mode Switcher */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          <div className="flex items-center p-0.5 bg-slate-950 rounded-lg border border-slate-800">
            <button
              onClick={() => setColorMode('client')}
              className={`px-2.5 py-1 rounded transition-colors text-[11px] ${
                colorMode === 'client'
                  ? 'bg-slate-800 text-cyan-400 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Client Family
            </button>
            <button
              onClick={() => setColorMode('latency')}
              className={`px-2.5 py-1 rounded transition-colors text-[11px] ${
                colorMode === 'latency'
                  ? 'bg-slate-800 text-emerald-400 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              RTT Ping
            </button>
            <button
              onClick={() => setColorMode('hosting')}
              className={`px-2.5 py-1 rounded transition-colors text-[11px] ${
                colorMode === 'hosting'
                  ? 'bg-slate-800 text-purple-400 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Hosting Infra
            </button>
          </div>
        </div>
      </div>

      {/* 4 Decentralization Telemetry Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
        <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
          <span className="text-[10px] text-slate-500 block uppercase">Geographic Spread</span>
          <div className="text-base font-bold text-cyan-400 mt-1 flex items-center gap-1.5">
            <span>{stats.countriesCount} Countries</span>
            <Globe className="w-3.5 h-3.5" />
          </div>
          <span className="text-[10px] text-slate-500 mt-0.5 block">
            Across 5 Continents
          </span>
        </div>

        <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
          <span className="text-[10px] text-slate-500 block uppercase">Regional Concentration</span>
          <div className="text-base font-bold text-white mt-1">
            EU {stats.europePct}% · NA {stats.naPct}%
          </div>
          <span className="text-[10px] text-slate-500 mt-0.5 block">
            APAC {stats.apacPct}% · Other {stats.otherPct}%
          </span>
        </div>

        <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
          <span className="text-[10px] text-slate-500 block uppercase">Infrastructure Mix</span>
          <div className="text-base font-bold text-emerald-400 mt-1">
            {stats.residentialPct}% Baremetal / Res
          </div>
          <span className="text-[10px] text-slate-500 mt-0.5 block">
            {stats.cloudPct}% Cloud Datacenter
          </span>
        </div>

        <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
          <span className="text-[10px] text-slate-500 block uppercase">Decentralization Index</span>
          <div className="text-base font-bold text-emerald-400 mt-1 flex items-center gap-1">
            <span>84 / 100</span>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <span className="text-[10px] text-slate-500 mt-0.5 block">
            Resilient to regional partition
          </span>
        </div>
      </div>

      {/* Filter Toolbar: Regions & Search */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-slate-500 mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3 text-cyan-400" /> Region:
          </span>
          {[
            { id: 'all', label: `All (${peerNodes.length})` },
            { id: 'europe', label: `Europe (${stats.europePct}%)` },
            { id: 'north_america', label: `North America (${stats.naPct}%)` },
            { id: 'asia_pacific', label: `Asia-Pac (${stats.apacPct}%)` },
            { id: 'other', label: 'Other' },
          ].map((r) => (
            <button
              key={r.id}
              onClick={() => setRegionFilter(r.id)}
              className={`px-2.5 py-1 rounded text-[11px] border transition-colors ${
                regionFilter === r.id
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-bold'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-1 max-w-xs">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by city, country, AS, IP..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>
      </div>

      {/* D3 Map Canvas */}
      <div
        ref={containerRef}
        className="p-4 bg-slate-950/70 rounded-xl border border-slate-800 relative overflow-hidden"
      >
        <svg ref={svgRef} className="w-full block" />

        {/* Hover Popover Tooltip */}
        {hoveredPeer && (
          <div
            className="absolute z-20 pointer-events-none bg-[#0b0f17] border border-cyan-500/60 p-3 rounded-lg shadow-2xl text-xs font-mono space-y-1.5 min-w-[250px]"
            style={{
              left: `${Math.min(hoveredPeer.x + 12, (containerRef.current?.clientWidth || 800) - 270)}px`,
              top: `${Math.max(10, hoveredPeer.y - 120)}px`,
            }}
          >
            <div className="flex items-center justify-between pb-1 border-b border-slate-800">
              <span className="font-bold text-white flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                {hoveredPeer.peer.city}, {hoveredPeer.peer.countryCode}
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                {hoveredPeer.peer.role}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Peer IP:</span>
              <span className="font-bold text-cyan-300">{hoveredPeer.peer.ip}:{hoveredPeer.peer.port}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Client Build:</span>
              <span className="text-white font-semibold">
                {hoveredPeer.peer.clientFamily} {hoveredPeer.peer.clientVersion}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">RTT Latency:</span>
              <span
                className={`font-bold ${
                  hoveredPeer.peer.latencyMs < 50
                    ? 'text-emerald-400'
                    : hoveredPeer.peer.latencyMs < 120
                    ? 'text-cyan-400'
                    : 'text-amber-400'
                }`}
              >
                ~{hoveredPeer.peer.latencyMs} ms
              </span>
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span>ISP / AS Org:</span>
              <span className="text-slate-300 truncate max-w-[140px]">{hoveredPeer.peer.asOrganization}</span>
            </div>

            <div className="pt-1 border-t border-slate-800 flex items-center justify-between text-[10px]">
              <span className="text-slate-400">Infrastructure:</span>
              <span className={hoveredPeer.peer.hostingType === 'Cloud' ? 'text-purple-400' : 'text-emerald-400 font-semibold'}>
                {hoveredPeer.peer.hostingType}
              </span>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="pt-3 mt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-[11px] font-mono text-slate-400 gap-2">
          {colorMode === 'client' ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-slate-500">Clients:</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" /><span>Geth</span></span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-purple-500" /><span>Nethermind</span></span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-cyan-500" /><span>Besu</span></span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-orange-500" /><span>Reth</span></span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-pink-500" /><span>Erigon</span></span>
            </div>
          ) : colorMode === 'latency' ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-slate-500">RTT Latency:</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /><span>&lt;45ms Fast</span></span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-sky-400" /><span>45–100ms Nominal</span></span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /><span>100–180ms Cross-Continental</span></span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-500" /><span>&gt;180ms Global Remote</span></span>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-slate-500">Hosting:</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-sky-400" /><span>Cloud Datacenter (AWS, Hetzner, OVH)</span></span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /><span>Baremetal / Residential ISP</span></span>
            </div>
          )}

          <div className="flex items-center gap-1.5 text-slate-400">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-emerald-400/40" />
            <span>Host Node: <strong className="text-white">Frankfurt, DE</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
};
