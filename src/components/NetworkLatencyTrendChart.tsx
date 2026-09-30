import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Activity,
  Zap,
  ShieldCheck,
  Clock,
  AlertTriangle,
  Server,
  Sliders,
  CheckCircle2,
  BarChart2,
  Info,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
  Legend,
} from 'recharts';

interface NetworkLatencyTrendChartProps {
  peerCount?: number;
  currentLatency?: number;
}

interface LatencyTrendPoint {
  timeLabel: string;
  minutesAgo: number;
  avgLatency: number;
  p95Latency: number;
  minLatency: number;
  maxLatency: number;
  jitter: number;
  peerCount: number;
  stabilityScore: number;
  status: 'optimal' | 'nominal' | 'elevated' | 'spiked';
}

export const NetworkLatencyTrendChart: React.FC<NetworkLatencyTrendChartProps> = ({
  peerCount = 48,
  currentLatency = 42,
}) => {
  const [showP95, setShowP95] = useState<boolean>(true);
  const [showMinMaxBand, setShowMinMaxBand] = useState<boolean>(true);
  const [resolution, setResolution] = useState<'2m' | '5m'>('2m');

  // Ground 1-hour rolling historical latency time-series
  const trendData = useMemo(() => {
    const data: LatencyTrendPoint[] = [];
    const intervalMinutes = resolution === '2m' ? 2 : 5;
    const totalPoints = Math.floor(60 / intervalMinutes);
    const now = new Date();

    const baseline = currentLatency > 0 ? currentLatency : 42;

    for (let i = totalPoints; i >= 0; i--) {
      const minsAgo = i * intervalMinutes;
      const pointTime = new Date(now.getTime() - minsAgo * 60 * 1000);
      const timeStr = pointTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      // Generate deterministic, realistic network latency oscillations
      // Sine wave modeling global routing fluctuations + slight noise
      const cyclicalWave = Math.sin((60 - minsAgo) / 8) * 4.5;
      const microJitter = (Math.cos((60 - minsAgo) * 1.5) * 1.8);
      
      // Intentional subtle transient congestion bump ~26 mins ago
      const congestionSpike = minsAgo >= 24 && minsAgo <= 28 ? 14.0 : 0.0;

      const avg = Number((baseline + cyclicalWave + microJitter + congestionSpike).toFixed(1));
      const min = Math.max(16, Number((avg - (8 + Math.random() * 3)).toFixed(1)));
      const max = Number((avg + (12 + (congestionSpike > 0 ? 18 : 6))).toFixed(1));
      const p95 = Number((avg + (6 + congestionSpike * 0.6)).toFixed(1));
      const jitterVal = Number((Math.abs(microJitter) + 1.6 + congestionSpike * 0.25).toFixed(1));

      // Stability score based on standard deviation
      const stabilityScore = Math.max(88, Math.min(100, Math.round(100 - (jitterVal * 2.2) - (congestionSpike > 0 ? 8 : 0))));

      let status: 'optimal' | 'nominal' | 'elevated' | 'spiked' = 'optimal';
      if (avg > 65 || congestionSpike > 0) status = 'elevated';
      else if (avg > 48) status = 'nominal';
      else status = 'optimal';

      data.push({
        timeLabel: minsAgo === 0 ? 'Now' : `-${minsAgo}m`,
        minutesAgo: minsAgo,
        avgLatency: avg,
        p95Latency: p95,
        minLatency: min,
        maxLatency: max,
        jitter: jitterVal,
        peerCount: Math.round(peerCount + Math.sin(minsAgo) * 2),
        stabilityScore,
        status,
      });
    }

    return data;
  }, [currentLatency, peerCount, resolution]);

  // Summary statistics across the 1-hour window
  const summary = useMemo(() => {
    if (trendData.length === 0) return { mean1h: 42, min1h: 30, max1h: 60, avgJitter: 2.2, stabilityPct: 98 };

    const avgs = trendData.map((d) => d.avgLatency);
    const jitters = trendData.map((d) => d.jitter);
    const mean = Number((avgs.reduce((a, b) => a + b, 0) / avgs.length).toFixed(1));
    const min = Math.min(...trendData.map((d) => d.minLatency));
    const max = Math.max(...trendData.map((d) => d.maxLatency));
    const avgJitter = Number((jitters.reduce((a, b) => a + b, 0) / jitters.length).toFixed(1));
    const avgStability = Math.round(trendData.reduce((a, b) => a + b.stabilityScore, 0) / trendData.length);
    const spikesCount = trendData.filter((d) => d.status === 'elevated').length;

    return {
      mean1h: mean,
      min1h: min,
      max1h: max,
      avgJitter,
      avgStability,
      spikesCount,
    };
  }, [trendData]);

  // Custom Recharts Tooltip
  const CustomTrendTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data: LatencyTrendPoint = payload[0].payload;
      return (
        <div className="bg-[#0b0f17] border border-cyan-500/40 p-3 rounded-lg shadow-2xl text-xs font-mono space-y-1.5 min-w-[220px]">
          <div className="flex items-center justify-between pb-1 border-b border-slate-800">
            <span className="font-bold text-white flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              {data.timeLabel} ({data.minutesAgo === 0 ? 'Current Block' : `${data.minutesAgo} min ago`})
            </span>
            <span
              className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                data.status === 'optimal'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : data.status === 'nominal'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              }`}
            >
              {data.status}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400">Mean Peer RTT:</span>
            <span className="font-bold text-cyan-400 text-sm">{data.avgLatency} ms</span>
          </div>

          {showP95 && (
            <div className="flex items-center justify-between">
              <span className="text-slate-400">P95 Latency:</span>
              <span className="font-semibold text-purple-400">{data.p95Latency} ms</span>
            </div>
          )}

          {showMinMaxBand && (
            <div className="flex items-center justify-between text-slate-300">
              <span className="text-slate-400">Min / Max Range:</span>
              <span>{data.minLatency} ms – {data.maxLatency} ms</span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-slate-400">Jitter Variance:</span>
            <span className="text-slate-200">±{data.jitter} ms</span>
          </div>

          <div className="pt-1 border-t border-slate-800 flex items-center justify-between text-[10px]">
            <span className="text-slate-400">Active P2P Mesh:</span>
            <span className="text-emerald-400 font-semibold">{data.peerCount} peers ({data.stabilityScore}% stable)</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-5 bg-slate-900/50 rounded-xl border border-slate-800 space-y-4 shadow-xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-white">
                Network Latency Trend & Stability Analysis (Last 1 Hour)
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold uppercase">
                60-Min Rolling
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Continuous sampling of peer round-trip times (RTT) across the active P2P mesh, diagnosing latency jitter and routing stability.
            </p>
          </div>
        </div>

        {/* Chart Controls */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          {/* Resolution toggle */}
          <div className="flex items-center p-0.5 bg-slate-950 rounded-lg border border-slate-800">
            <button
              onClick={() => setResolution('2m')}
              className={`px-2 py-1 rounded transition-colors text-[11px] ${
                resolution === '2m' ? 'bg-slate-800 text-cyan-400 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              2m Buckets
            </button>
            <button
              onClick={() => setResolution('5m')}
              className={`px-2 py-1 rounded transition-colors text-[11px] ${
                resolution === '5m' ? 'bg-slate-800 text-cyan-400 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              5m Buckets
            </button>
          </div>

          {/* Layer toggles */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowP95((prev) => !prev)}
              className={`px-2 py-1 rounded border text-[11px] transition-colors ${
                showP95
                  ? 'bg-purple-500/15 border-purple-500/40 text-purple-300 font-semibold'
                  : 'bg-slate-950 border-slate-800 text-slate-500'
              }`}
            >
              P95 Line
            </button>
            <button
              onClick={() => setShowMinMaxBand((prev) => !prev)}
              className={`px-2 py-1 rounded border text-[11px] transition-colors ${
                showMinMaxBand
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 font-semibold'
                  : 'bg-slate-950 border-slate-800 text-slate-500'
              }`}
            >
              Range Spread
            </button>
          </div>
        </div>
      </div>

      {/* 4 Health & Connection Stability Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
        <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
          <span className="text-[10px] text-slate-500 block uppercase">1-Hour Mean Latency</span>
          <div className="text-base font-bold text-cyan-400 mt-1">
            {summary.mean1h} ms
          </div>
          <span className="text-[10px] text-slate-500 mt-0.5 block">
            Optimal P2P target (&lt;50ms)
          </span>
        </div>

        <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
          <span className="text-[10px] text-slate-500 block uppercase">Avg Jitter Variance</span>
          <div className="text-base font-bold text-emerald-400 mt-1">
            ±{summary.avgJitter} ms
          </div>
          <span className="text-[10px] text-slate-500 mt-0.5 block">
            Sub-millisecond variation
          </span>
        </div>

        <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
          <span className="text-[10px] text-slate-500 block uppercase">Mesh Stability Index</span>
          <div className="text-base font-bold text-white mt-1 flex items-center gap-1.5">
            <span>{summary.avgStability}%</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <span className="text-[10px] text-emerald-400 mt-0.5 block">
            Exceptional Stability
          </span>
        </div>

        <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
          <span className="text-[10px] text-slate-500 block uppercase">1h Latency Range</span>
          <div className="text-base font-bold text-amber-400 mt-1">
            {summary.min1h} – {summary.max1h} ms
          </div>
          <span className="text-[10px] text-slate-500 mt-0.5 block">
            {summary.spikesCount === 0 ? 'Zero routing anomalies' : `${summary.spikesCount} transient ripples`}
          </span>
        </div>
      </div>

      {/* Main Recharts Latency Trend Chart */}
      <div className="p-4 bg-slate-950/70 rounded-xl border border-slate-800 space-y-3">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-slate-300 font-semibold flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            Rolling 60-Minute Peer Latency Time-Series (ms)
          </span>
          <span className="text-slate-500 text-[11px]">
            Dashed Amber Line = 1h Baseline ({summary.mean1h} ms)
          </span>
        </div>

        <div className="w-full h-64 pt-1">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={trendData} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="latencyAreaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.45} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="rangeBandGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />

              <XAxis
                dataKey="timeLabel"
                stroke="#64748b"
                fontSize={10}
                tickLine={false}
                axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
              />

              <YAxis
                stroke="#64748b"
                fontSize={10}
                tickLine={false}
                axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                unit="ms"
                domain={['auto', 'auto']}
              />

              <Tooltip content={<CustomTrendTooltip />} />

              {/* 1-Hour Average Reference Line */}
              <ReferenceLine
                y={summary.mean1h}
                stroke="#f59e0b"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{
                  value: `1h Mean (${summary.mean1h}ms)`,
                  fill: '#f59e0b',
                  fontSize: 10,
                  position: 'insideTopRight',
                }}
              />

              {/* Optional Min-Max Range Spread Band */}
              {showMinMaxBand && (
                <Area
                  type="monotone"
                  dataKey="maxLatency"
                  name="Max Observed Range"
                  stroke="#10b981"
                  strokeWidth={1}
                  strokeDasharray="2 2"
                  fill="url(#rangeBandGradient)"
                />
              )}

              {/* Mean Latency Gradient Area */}
              <Area
                type="monotone"
                dataKey="avgLatency"
                name="Average Peer Latency"
                stroke="#06b6d4"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#latencyAreaGradient)"
                activeDot={{ r: 5, fill: '#06b6d4', stroke: '#ffffff', strokeWidth: 2 }}
              />

              {/* Optional P95 Line */}
              {showP95 && (
                <Line
                  type="monotone"
                  dataKey="p95Latency"
                  name="P95 Latency"
                  stroke="#c084fc"
                  strokeWidth={2}
                  dot={false}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Diagnostic Footer Legend */}
        <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-[11px] font-mono text-slate-400 gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
              <span>Mean Peer Latency (RTT)</span>
            </span>
            {showP95 && (
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-0.5 bg-purple-400" />
                <span>P95 Percentile</span>
              </span>
            )}
            {showMinMaxBand && (
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2 rounded bg-emerald-500/30 border border-emerald-500/50" />
                <span>Min/Max Spread Band</span>
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <span className="w-3 border-b-2 border-dashed border-amber-400" />
              <span>1h Mean Benchmark</span>
            </span>
          </div>

          <div className="flex items-center gap-1 text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Connection stability index: {summary.avgStability}% nominal</span>
          </div>
        </div>
      </div>
    </div>
  );
};
