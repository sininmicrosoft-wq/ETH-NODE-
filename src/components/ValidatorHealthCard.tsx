import React, { useState, useMemo, useEffect } from 'react';
import {
  ShieldCheck,
  Activity,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Radio,
  Zap,
  TrendingUp,
  RefreshCw,
  Users,
  Eye,
} from 'lucide-react';

interface ValidatorHealthCardProps {
  latestBlockNum: number;
}

export const ValidatorHealthCard: React.FC<ValidatorHealthCardProps> = ({
  latestBlockNum,
}) => {
  const [selectedEpochView, setSelectedEpochView] = useState<'current' | 'previous'>('current');
  const [isLiveGossipActive, setIsLiveGossipActive] = useState<boolean>(true);

  // Derive current beacon epoch & slot numbers
  const currentSlot = latestBlockNum > 0 ? 1048592 + (latestBlockNum % 32) : 1048592;
  const currentEpoch = Math.floor(currentSlot / 32);
  const slotInEpoch = currentSlot % 32; // 0 to 31

  // Dynamic simulation for pending attestations pool
  const [pendingAttestations, setPendingAttestations] = useState<number>(384);

  useEffect(() => {
    if (!isLiveGossipActive) return;
    const interval = setInterval(() => {
      // Simulate live gossipsub fluctuation as attestations arrive and are packed into blocks
      setPendingAttestations((prev) => {
        const delta = Math.floor(Math.random() * 21) - 10;
        return Math.min(512, Math.max(128, prev + delta));
      });
    }, 3000);
    return () => clearInterval(interval);
  }, [isLiveGossipActive]);

  // Participation rate metrics
  const participationMetrics = useMemo(() => {
    const isCurr = selectedEpochView === 'current';
    const participationRate = isCurr ? 99.42 : 99.68;
    const sourceRate = isCurr ? 99.85 : 99.92;
    const targetRate = isCurr ? 99.42 : 99.68;
    const headRate = isCurr ? 98.91 : 99.14;

    const totalActiveValidators = 1048576;
    const activeVoters = Math.round(totalActiveValidators * (participationRate / 100));
    const totalStakedEth = (totalActiveValidators * 32).toLocaleString();

    // Attestation statistics per epoch (32 slots * 64 committees = 2,048 aggregate attestations)
    const totalExpectedAttestations = 2048;
    const slotsProcessed = isCurr ? Math.max(1, slotInEpoch) : 32;
    const expectedAttestationsSoFar = Math.round((slotsProcessed / 32) * totalExpectedAttestations);
    const includedAttestations = Math.round(expectedAttestationsSoFar * (participationRate / 100));

    return {
      participationRate,
      sourceRate,
      targetRate,
      headRate,
      totalActiveValidators,
      activeVoters,
      totalStakedEth,
      totalExpectedAttestations,
      slotsProcessed,
      includedAttestations,
      inclusionDelay: isCurr ? 1.06 : 1.04,
      syncCommitteeRate: 99.7, // 511/512 active
    };
  }, [selectedEpochView, slotInEpoch]);

  // Visual Gauge Parameters for Participation Rate
  const radius = 54;
  const strokeWidth = 9;
  const circumference = 2 * Math.PI * radius; // ~339.29
  const strokeDashoffset = circumference - (participationMetrics.participationRate / 100) * circumference;

  return (
    <div className="p-5 bg-gradient-to-r from-slate-900/80 via-slate-900/60 to-emerald-950/20 rounded-xl border border-emerald-500/30 relative overflow-hidden space-y-4">
      {/* Ambient background glow */}
      <div className="absolute -top-10 -right-10 w-44 h-44 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-white">
                Validator Health & Beacon Attestation Monitor
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold uppercase">
                Consensus Optimal
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Monitors real-time beacon chain participation rate, Casper-FFG justification threshold, and pending epoch attestations.
            </p>
          </div>
        </div>

        {/* Epoch Selector Switcher */}
        <div className="flex items-center gap-2">
          <div className="flex items-center p-0.5 bg-slate-950 rounded-lg border border-slate-800 text-xs font-medium font-mono">
            <button
              onClick={() => setSelectedEpochView('current')}
              className={`px-2.5 py-1 rounded transition-colors ${
                selectedEpochView === 'current'
                  ? 'bg-slate-800 text-emerald-400 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Epoch #{currentEpoch} (Current)
            </button>
            <button
              onClick={() => setSelectedEpochView('previous')}
              className={`px-2.5 py-1 rounded transition-colors ${
                selectedEpochView === 'previous'
                  ? 'bg-slate-800 text-emerald-400 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Epoch #{currentEpoch - 1} (Finalized)
            </button>
          </div>

          {/* Gossipsub simulation toggle */}
          <button
            onClick={() => setIsLiveGossipActive((prev) => !prev)}
            className={`p-1.5 rounded-lg border text-xs font-mono transition-colors flex items-center gap-1 ${
              isLiveGossipActive
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-slate-950 border-slate-800 text-slate-500'
            }`}
            title="Toggle Live Gossipsub Telemetry"
          >
            <Radio className={`w-3.5 h-3.5 ${isLiveGossipActive ? 'animate-pulse text-emerald-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Grid: Participation Ring + Pending Attestation Pool + Key Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
        {/* Col 1: Circular Participation Rate Gauge (4 cols) */}
        <div className="lg:col-span-4 p-4 bg-slate-950/70 rounded-xl border border-slate-800 flex flex-col items-center justify-center relative">
          <div className="relative flex items-center justify-center w-36 h-36">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 130 130">
              {/* Background Track Circle */}
              <circle
                cx="65"
                cy="65"
                r={radius}
                stroke="#1e293b"
                strokeWidth={strokeWidth}
                fill="none"
              />
              {/* Supermajority Threshold Marker Indicator (66.7%) */}
              <circle
                cx="65"
                cy="65"
                r={radius}
                stroke="#38bdf8"
                strokeWidth={strokeWidth}
                strokeDasharray="2 12"
                fill="none"
                opacity={0.4}
              />
              {/* Active Progress Circle */}
              <circle
                cx="65"
                cy="65"
                r={radius}
                stroke="#10b981"
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="none"
                className="transition-all duration-700 ease-out drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]"
              />
            </svg>

            {/* Center Typography Overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
              <span className="text-[9px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
                Participation
              </span>
              <div className="text-2xl font-extrabold font-mono text-emerald-400 tracking-tight">
                {participationMetrics.participationRate}%
              </div>
              <span className="text-[9px] text-slate-400 font-mono">
                Target: &gt;66.7%
              </span>
            </div>
          </div>

          {/* Sub-label */}
          <div className="w-full mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>Active Stake: <strong className="text-white">~33.5M ETH</strong></span>
            <span className="text-emerald-400 font-semibold">Supermajority Safe</span>
          </div>
        </div>

        {/* Col 2: Pending Attestations Pool & Queue (4 cols) */}
        <div className="lg:col-span-4 p-4 bg-slate-950/70 rounded-xl border border-slate-800 space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
                Pending Attestation Pool
              </span>
              <span className="text-cyan-400 font-bold">
                {pendingAttestations} in gossipsub
              </span>
            </div>

            {/* Ingestion Progress Bar */}
            <div className="space-y-1.5 mt-2">
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                <span>In-flight Attestations:</span>
                <span className="text-slate-200">{pendingAttestations} / 512 capacity</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (pendingAttestations / 512) * 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Attestation Inclusion stats */}
          <div className="grid grid-cols-2 gap-2 text-[11px] font-mono pt-2 border-t border-slate-800/80">
            <div>
              <span className="text-slate-500 block text-[10px]">Included this Epoch:</span>
              <span className="text-white font-bold">{participationMetrics.includedAttestations.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">Avg Inclusion Delay:</span>
              <span className="text-emerald-400 font-bold">{participationMetrics.inclusionDelay} slots</span>
            </div>
          </div>

          <div className="text-[10px] font-mono text-slate-500 flex items-center justify-between">
            <span>Committees: <strong className="text-slate-400">64 subnets active</strong></span>
            <span>Sync Committee: <strong className="text-emerald-400">{participationMetrics.syncCommitteeRate}%</strong></span>
          </div>
        </div>

        {/* Col 3: Attestation Effectiveness Breakdown (4 cols) */}
        <div className="lg:col-span-4 p-4 bg-slate-950/70 rounded-xl border border-slate-800 space-y-2.5">
          <div className="text-xs font-semibold text-white font-mono flex items-center justify-between">
            <span>Vote Target Effectiveness</span>
            <span className="text-[10px] text-slate-400 font-normal">Casper-FFG</span>
          </div>

          <div className="space-y-2 text-xs font-mono">
            {/* Source Vote */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Source Vote (FFG Start):</span>
                <span className="text-emerald-400 font-bold">{participationMetrics.sourceRate}%</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-400 rounded-full"
                  style={{ width: `${participationMetrics.sourceRate}%` }}
                />
              </div>
            </div>

            {/* Target Vote */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Target Vote (FFG Epoch):</span>
                <span className="text-cyan-400 font-bold">{participationMetrics.targetRate}%</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-cyan-400 rounded-full"
                  style={{ width: `${participationMetrics.targetRate}%` }}
                />
              </div>
            </div>

            {/* Head Vote */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Head Vote (LMD-GHOST):</span>
                <span className="text-purple-400 font-bold">{participationMetrics.headRate}%</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-400 rounded-full"
                  style={{ width: `${participationMetrics.headRate}%` }}
                />
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-500">
            <span>Slashed: <strong className="text-emerald-400">0 in epoch</strong></span>
            <span>Inactivity Leak: <strong className="text-slate-400">0 (Normal)</strong></span>
          </div>
        </div>
      </div>

      {/* Epoch Slot Progression Matrix (32 Slots of Active Epoch) */}
      <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-slate-400 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            Epoch #{currentEpoch} Slot Progression (32 Slots)
          </span>
          <span className="text-[11px] text-slate-400">
            Current Slot: <strong className="text-emerald-400">#{currentSlot}</strong> ({slotInEpoch + 1}/32)
          </span>
        </div>

        {/* 32 Slot Grid */}
        <div className="grid grid-cols-16 sm:grid-cols-32 gap-1 pt-1">
          {Array.from({ length: 32 }).map((_, idx) => {
            const isCompleted = selectedEpochView === 'previous' || idx < slotInEpoch;
            const isCurrent = selectedEpochView === 'current' && idx === slotInEpoch;

            return (
              <div
                key={idx}
                title={`Slot #${currentSlot - slotInEpoch + idx} (Epoch slot ${idx})`}
                className={`h-5 rounded flex items-center justify-center text-[9px] font-mono font-bold transition-all cursor-default ${
                  isCurrent
                    ? 'bg-amber-500 text-black shadow-[0_0_8px_rgba(245,158,11,0.8)] animate-pulse'
                    : isCompleted
                    ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/40'
                    : 'bg-slate-900 text-slate-600 border border-slate-800/60'
                }`}
              >
                {idx + 1}
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-between text-[10px] font-mono text-slate-500 pt-1">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded bg-emerald-500/40" />
              <span>Attested Slot</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded bg-amber-500" />
              <span>Active Slot</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded bg-slate-900 border border-slate-800" />
              <span>Upcoming</span>
            </span>
          </div>
          <span>Active Validator Committee: 64 subnets / slot</span>
        </div>
      </div>
    </div>
  );
};
