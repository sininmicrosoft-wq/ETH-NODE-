import React, { useState, useMemo, useCallback } from 'react';
import {
  Download,
  FileJson,
  FileSpreadsheet,
  Copy,
  Check,
  Filter,
  Eye,
  EyeOff,
  Server,
  Activity,
  ShieldCheck,
  Search,
  Globe,
  Sliders,
  CheckCircle2,
  Clock,
  ExternalLink,
} from 'lucide-react';

interface PeerDataExportCardProps {
  peerCount?: number;
  clientVersion?: string;
}

export interface PeerExportRecord {
  peer_id: string;
  ip_address: string;
  port: number;
  client_family: string;
  client_version: string;
  full_client_string: string;
  country: string;
  city: string;
  latency_ms: number;
  uptime_pct_24h: number;
  flaps_count_24h: number;
  role: 'Full Node' | 'Archive Node' | 'Validator' | 'Bootnode';
  direction: 'Inbound' | 'Outbound';
  protocols: string;
  traffic_in_mb: number;
  traffic_out_mb: number;
  last_seen_iso: string;
}

export const PeerDataExportCard: React.FC<PeerDataExportCardProps> = ({
  peerCount = 48,
  clientVersion = 'Geth/v1.14.8-stable/linux-amd64',
}) => {
  const [exportFormat, setExportFormat] = useState<'json' | 'csv'>('json');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showPreview, setShowPreview] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Generate deterministic realistic peer export records
  const allPeers: PeerExportRecord[] = useMemo(() => {
    const total = Math.max(16, peerCount);

    const clients = [
      { family: 'Geth', ver: 'v1.14.8', full: 'Geth/v1.14.8-stable-e948c278/linux-amd64/go1.22.4' },
      { family: 'Geth', ver: 'v1.14.7', full: 'Geth/v1.14.7-stable-35607e42/linux-amd64/go1.22.3' },
      { family: 'Nethermind', ver: 'v1.28.0', full: 'Nethermind/v1.28.0+5b42d13/linux-x64/dotnet8.0' },
      { family: 'Nethermind', ver: 'v1.26.0', full: 'Nethermind/v1.26.0+90cfa11/linux-x64/dotnet8.0' },
      { family: 'Besu', ver: 'v24.7.1', full: 'besu/v24.7.1/linux-x86_64/openjdk-21' },
      { family: 'Reth', ver: 'v1.0.0', full: 'reth/v1.0.0-f89a19/x86_64-unknown-linux-gnu' },
      { family: 'Erigon', ver: 'v2.60.0', full: 'erigon/v2.60.0/linux-amd64/go1.22.2' },
    ];

    const locations = [
      { city: 'Frankfurt', country: 'Germany', basePing: 18 },
      { city: 'Helsinki', country: 'Finland', basePing: 34 },
      { city: 'London', country: 'United Kingdom', basePing: 26 },
      { city: 'Dublin', country: 'Ireland', basePing: 32 },
      { city: 'Amsterdam', country: 'Netherlands', basePing: 22 },
      { city: 'Ashburn (VA)', country: 'United States', basePing: 76 },
      { city: 'Oregon (OR)', country: 'United States', basePing: 112 },
      { city: 'Council Bluffs (IA)', country: 'United States', basePing: 88 },
      { city: 'Tokyo', country: 'Japan', basePing: 146 },
      { city: 'Singapore', country: 'Singapore', basePing: 168 },
      { city: 'Sydney', country: 'Australia', basePing: 215 },
    ];

    const roles: ('Full Node' | 'Archive Node' | 'Validator' | 'Bootnode')[] = [
      'Full Node',
      'Full Node',
      'Full Node',
      'Archive Node',
      'Validator',
      'Bootnode',
    ];

    const now = new Date();
    const records: PeerExportRecord[] = [];

    for (let i = 0; i < total; i++) {
      const client = clients[i % clients.length];
      const loc = locations[i % locations.length];
      const role = roles[i % roles.length];
      const direction: 'Inbound' | 'Outbound' = i % 3 === 0 ? 'Inbound' : 'Outbound';

      // IP address generation
      const octet1 = i % 2 === 0 ? 3 + (i % 50) : 172 + (i % 40);
      const ip = `${octet1}.${(16 + i * 9) % 254}.${(i * 17) % 254 + 1}.${(i * 31) % 250 + 2}`;
      const port = 30303;

      const hex = (1000000 + i * 49201).toString(16);
      const peerId = `enode://${hex}e948c27891${i.toString(16).padStart(4, '0')}@${ip}:${port}`;

      // Uptime and latency
      const isUnstable = i === 7 || i === 23;
      const uptime = isUnstable ? 93.4 : Number((98.5 + (i % 15) * 0.1).toFixed(2));
      const flaps = isUnstable ? 4 : i % 8 === 0 ? 1 : 0;
      const ping = loc.basePing + (i % 7) * 2;

      records.push({
        peer_id: peerId,
        ip_address: ip,
        port,
        client_family: client.family,
        client_version: client.ver,
        full_client_string: client.full,
        country: loc.country,
        city: loc.city,
        latency_ms: ping,
        uptime_pct_24h: Math.min(100, uptime),
        flaps_count_24h: flaps,
        role,
        direction,
        protocols: 'eth/68, eth/67, snap/1',
        traffic_in_mb: Number((120 + (i * 37) % 450).toFixed(1)),
        traffic_out_mb: Number((80 + (i * 29) % 320).toFixed(1)),
        last_seen_iso: new Date(now.getTime() - (i % 12) * 1000 * 60).toISOString(),
      });
    }

    return records;
  }, [peerCount]);

  // Filtered peer list based on UI controls
  const filteredPeers = useMemo(() => {
    return allPeers.filter((p) => {
      const matchRole =
        filterRole === 'all' ||
        (filterRole === 'validator' && p.role === 'Validator') ||
        (filterRole === 'full' && p.role === 'Full Node') ||
        (filterRole === 'archive' && p.role === 'Archive Node') ||
        (filterRole === 'unstable' && p.flaps_count_24h > 0);

      const matchSearch =
        searchQuery.trim() === '' ||
        p.ip_address.includes(searchQuery) ||
        p.client_family.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.country.toLowerCase().includes(searchQuery.toLowerCase());

      return matchRole && matchSearch;
    });
  }, [allPeers, filterRole, searchQuery]);

  // Generate CSV String
  const csvContent = useMemo(() => {
    const headers = [
      'peer_id',
      'ip_address',
      'port',
      'client_family',
      'client_version',
      'city',
      'country',
      'latency_ms',
      'uptime_pct_24h',
      'flaps_count_24h',
      'role',
      'direction',
      'protocols',
      'traffic_in_mb',
      'traffic_out_mb',
      'last_seen_iso',
      'full_client_string',
    ];

    const rows = filteredPeers.map((p) => [
      `"${p.peer_id}"`,
      p.ip_address,
      p.port,
      p.client_family,
      p.client_version,
      `"${p.city}"`,
      `"${p.country}"`,
      p.latency_ms,
      p.uptime_pct_24h,
      p.flaps_count_24h,
      p.role,
      p.direction,
      `"${p.protocols}"`,
      p.traffic_in_mb,
      p.traffic_out_mb,
      p.last_seen_iso,
      `"${p.full_client_string}"`,
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }, [filteredPeers]);

  // Generate Formatted JSON String
  const jsonContent = useMemo(() => {
    const exportPayload = {
      export_metadata: {
        timestamp_iso: new Date().toISOString(),
        host_client: clientVersion,
        total_peers_exported: filteredPeers.length,
        filter_applied: filterRole,
        mean_latency_ms: Math.round(
          filteredPeers.reduce((acc, p) => acc + p.latency_ms, 0) / (filteredPeers.length || 1)
        ),
        mean_uptime_pct: Number(
          (
            filteredPeers.reduce((acc, p) => acc + p.uptime_pct_24h, 0) / (filteredPeers.length || 1)
          ).toFixed(2)
        ),
      },
      peers: filteredPeers,
    };
    return JSON.stringify(exportPayload, null, 2);
  }, [filteredPeers, clientVersion, filterRole]);

  // Download Trigger Function
  const handleDownload = useCallback(() => {
    const isJson = exportFormat === 'json';
    const content = isJson ? jsonContent : csvContent;
    const mimeType = isJson ? 'application/json' : 'text/csv;charset=utf-8;';
    const fileExtension = isJson ? 'json' : 'csv';
    const timestampStr = new Date().toISOString().slice(0, 10);
    const fileName = `ethereum-peers-audit-${timestampStr}.${fileExtension}`;

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [exportFormat, jsonContent, csvContent]);

  // Copy to Clipboard
  const handleCopy = useCallback(() => {
    const content = exportFormat === 'json' ? jsonContent : csvContent;
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [exportFormat, jsonContent, csvContent]);

  // Summary Metrics
  const summaryMetrics = useMemo(() => {
    if (filteredPeers.length === 0) return { avgPing: 0, avgUptime: 0, highStabilityCount: 0 };
    const avgPing = Math.round(
      filteredPeers.reduce((acc, p) => acc + p.latency_ms, 0) / filteredPeers.length
    );
    const avgUptime = Number(
      (
        filteredPeers.reduce((acc, p) => acc + p.uptime_pct_24h, 0) / filteredPeers.length
      ).toFixed(2)
    );
    const highStabilityCount = filteredPeers.filter((p) => p.uptime_pct_24h >= 99.0).length;
    return { avgPing, avgUptime, highStabilityCount };
  }, [filteredPeers]);

  return (
    <div className="p-5 bg-slate-900/50 rounded-xl border border-slate-800 space-y-4 shadow-xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Download className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-white">
                Peer Connection Audit & Data Export
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold uppercase">
                CSV / JSON
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Export comprehensive snapshot metrics (IP, Latency, Client Version, 24h Uptime, Disconnects) for offline network auditing and reporting.
            </p>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          {/* Format selector */}
          <div className="flex items-center p-0.5 bg-slate-950 rounded-lg border border-slate-800">
            <button
              onClick={() => setExportFormat('json')}
              className={`px-2.5 py-1 rounded transition-colors text-[11px] flex items-center gap-1.5 ${
                exportFormat === 'json'
                  ? 'bg-slate-800 text-cyan-400 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileJson className="w-3.5 h-3.5" />
              <span>JSON</span>
            </button>
            <button
              onClick={() => setExportFormat('csv')}
              className={`px-2.5 py-1 rounded transition-colors text-[11px] flex items-center gap-1.5 ${
                exportFormat === 'csv'
                  ? 'bg-slate-800 text-emerald-400 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>
          </div>

          {/* Copy Button */}
          <button
            onClick={handleCopy}
            className="px-2.5 py-1.5 bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 rounded-lg transition-colors flex items-center gap-1.5 text-xs"
            title="Copy formatted export data to clipboard"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-semibold">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>Copy</span>
              </>
            )}
          </button>

          {/* Download Button */}
          <button
            onClick={handleDownload}
            className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg transition-colors flex items-center gap-1.5 text-xs shadow-lg shadow-cyan-500/10"
            title={`Download as .${exportFormat} file`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download {exportFormat.toUpperCase()}</span>
          </button>
        </div>
      </div>

      {/* 4 Export Summary Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
        <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
          <span className="text-[10px] text-slate-500 block uppercase">Peers in Export Set</span>
          <div className="text-base font-bold text-white mt-1 flex items-center gap-1.5">
            <span>{filteredPeers.length} Peers</span>
            <Server className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <span className="text-[10px] text-slate-500 mt-0.5 block">
            {allPeers.length - filteredPeers.length === 0 ? '100% of mesh' : `${allPeers.length - filteredPeers.length} filtered out`}
          </span>
        </div>

        <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
          <span className="text-[10px] text-slate-500 block uppercase">Mean Latency</span>
          <div className="text-base font-bold text-cyan-400 mt-1">
            {summaryMetrics.avgPing} ms
          </div>
          <span className="text-[10px] text-slate-500 mt-0.5 block">
            Cross-peer RTT average
          </span>
        </div>

        <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
          <span className="text-[10px] text-slate-500 block uppercase">Aggregate Uptime</span>
          <div className="text-base font-bold text-emerald-400 mt-1 flex items-center gap-1">
            <span>{summaryMetrics.avgUptime}%</span>
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
          <span className="text-[10px] text-slate-500 mt-0.5 block">
            {summaryMetrics.highStabilityCount} peers &gt;99% stability
          </span>
        </div>

        <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
          <span className="text-[10px] text-slate-500 block uppercase">Payload Footprint</span>
          <div className="text-base font-bold text-white mt-1">
            ~{Math.round((exportFormat === 'json' ? jsonContent.length : csvContent.length) / 1024)} KB
          </div>
          <span className="text-[10px] text-slate-500 mt-0.5 block">
            Offline audit ready
          </span>
        </div>
      </div>

      {/* Filter Toolbar & Live Preview Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-slate-500 mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3 text-cyan-400" /> Filter:
          </span>
          {[
            { id: 'all', label: `All (${allPeers.length})` },
            { id: 'validator', label: 'Validators' },
            { id: 'full', label: 'Full Nodes' },
            { id: 'archive', label: 'Archive' },
            { id: 'unstable', label: 'Flapping Peers' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilterRole(f.id)}
              className={`px-2.5 py-1 rounded text-[11px] border transition-colors ${
                filterRole === f.id
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-bold'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search IP, client, location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-500 w-48 sm:w-56"
            />
          </div>

          <button
            onClick={() => setShowPreview(!showPreview)}
            className={`px-2.5 py-1 rounded border transition-colors flex items-center gap-1 text-[11px] ${
              showPreview
                ? 'bg-slate-800 text-cyan-400 border-slate-700 font-bold'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
            }`}
          >
            {showPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{showPreview ? 'Hide Preview' : 'Preview Data'}</span>
          </button>
        </div>
      </div>

      {/* Collapsible Live Data Preview Box */}
      {showPreview && (
        <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2 font-mono text-xs animate-in fade-in duration-150">
          <div className="flex items-center justify-between text-slate-400 pb-1.5 border-b border-slate-800">
            <span className="font-semibold text-white flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              Live Export Buffer ({exportFormat.toUpperCase()} Format)
            </span>
            <span className="text-[11px] text-slate-500">
              Showing first 500 lines
            </span>
          </div>

          <pre className="max-h-64 overflow-y-auto overflow-x-auto p-2 bg-[#0b0f17] rounded-lg text-[11px] text-slate-300 leading-relaxed font-mono">
            {exportFormat === 'json' ? jsonContent : csvContent}
          </pre>
        </div>
      )}
    </div>
  );
};
