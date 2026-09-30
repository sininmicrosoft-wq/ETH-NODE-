import React, { useState, useMemo } from 'react';
import {
  Fuel,
  Timer,
  Zap,
  TrendingUp,
  Sliders,
  Calculator,
  Coins,
  CheckCircle2,
  AlertTriangle,
  Flame,
  ArrowRightLeft,
  Copy,
  Check,
  RefreshCw,
} from 'lucide-react';

interface Eip1559FeeEstimatorCardProps {
  currentBaseFee: number; // in Gwei
  latestBlockNum: number;
}

type SpeedPreset = 'urgent' | 'fast' | 'normal' | 'eco' | 'custom';
type TxPreset = 'eth' | 'erc20' | 'swap' | 'nft' | 'deploy';

const TX_TYPES: Record<TxPreset, { name: string; gas: number; icon: string }> = {
  eth: { name: 'ETH Transfer', gas: 21000, icon: 'Ξ' },
  erc20: { name: 'ERC-20 Token', gas: 65000, icon: '🪙' },
  swap: { name: 'Uniswap V3 Swap', gas: 185000, icon: '🦄' },
  nft: { name: 'NFT Mint/Trade', gas: 160000, icon: '🎨' },
  deploy: { name: 'Contract Deploy', gas: 500000, icon: '📄' },
};

export const Eip1559FeeEstimatorCard: React.FC<Eip1559FeeEstimatorCardProps> = ({
  currentBaseFee,
  latestBlockNum,
}) => {
  const [selectedSpeed, setSelectedSpeed] = useState<SpeedPreset>('normal');
  const [selectedTxType, setSelectedTxType] = useState<TxPreset>('eth');
  const [baseFeeOverride, setBaseFeeOverride] = useState<number | null>(null);
  const [customPriorityFee, setCustomPriorityFee] = useState<number>(1.5);
  const [customMaxFee, setCustomMaxFee] = useState<number>(32.0);
  const [copied, setCopied] = useState<boolean>(false);

  const ethPriceUsd = 2650;
  const effectiveBaseFee = baseFeeOverride !== null ? baseFeeOverride : (currentBaseFee || 15.0);

  // Derive parameters based on preset
  const { priorityFee, maxFee, waitTimeText, waitTimeSec, blocksText, probability, statusColor } = useMemo(() => {
    let pFee = 1.0;
    let mFee = Number((effectiveBaseFee * 1.35 + 1.0).toFixed(2));
    let timeText = '~24 – 36s';
    let timeSec = 30;
    let bText = '2–3 blocks';
    let prob = 88;
    let color = 'text-emerald-400';

    if (selectedSpeed === 'urgent') {
      pFee = 2.5;
      mFee = Number((effectiveBaseFee * 2.0 + 2.5).toFixed(2));
      timeText = '~12s (Next Block)';
      timeSec = 12;
      bText = '1 block';
      prob = 99;
      color = 'text-amber-400';
    } else if (selectedSpeed === 'fast') {
      pFee = 1.5;
      mFee = Number((effectiveBaseFee * 1.5 + 1.5).toFixed(2));
      timeText = '~12 – 24s';
      timeSec = 18;
      bText = '1–2 blocks';
      prob = 94;
      color = 'text-emerald-400';
    } else if (selectedSpeed === 'normal') {
      pFee = 1.0;
      mFee = Number((effectiveBaseFee * 1.25 + 1.0).toFixed(2));
      timeText = '~24 – 48s';
      timeSec = 36;
      bText = '2–4 blocks';
      prob = 85;
      color = 'text-blue-400';
    } else if (selectedSpeed === 'eco') {
      pFee = 0.15;
      mFee = Number((effectiveBaseFee * 1.05 + 0.15).toFixed(2));
      timeText = '~1 – 3m';
      timeSec = 120;
      bText = '5–15 blocks';
      prob = 62;
      color = 'text-cyan-400';
    } else {
      // Custom mode
      pFee = customPriorityFee;
      mFee = customMaxFee;

      if (mFee < effectiveBaseFee) {
        timeText = 'Underpriced (Stalled)';
        timeSec = 9999;
        bText = 'Will not be included';
        prob = 0;
        color = 'text-rose-400';
      } else if (pFee >= 2.5) {
        timeText = '~12s (Next Block)';
        timeSec = 12;
        bText = '1 block';
        prob = 99;
        color = 'text-amber-400';
      } else if (pFee >= 1.5) {
        timeText = '~12 – 24s';
        timeSec = 18;
        bText = '1–2 blocks';
        prob = 94;
        color = 'text-emerald-400';
      } else if (pFee >= 0.8) {
        timeText = '~24 – 48s';
        timeSec = 36;
        bText = '2–4 blocks';
        prob = 85;
        color = 'text-blue-400';
      } else if (pFee >= 0.2) {
        timeText = '~1 – 3m';
        timeSec = 120;
        bText = '5–15 blocks';
        prob = 65;
        color = 'text-cyan-400';
      } else {
        timeText = '> 3m (Mempool queue)';
        timeSec = 240;
        bText = '> 15 blocks';
        prob = 35;
        color = 'text-slate-400';
      }
    }

    return {
      priorityFee: pFee,
      maxFee: mFee,
      waitTimeText: timeText,
      waitTimeSec: timeSec,
      blocksText: bText,
      probability: prob,
      statusColor: color,
    };
  }, [selectedSpeed, effectiveBaseFee, customPriorityFee, customMaxFee]);

  // Cost calculation for selected transaction type
  const costCalculation = useMemo(() => {
    const gas = TX_TYPES[selectedTxType].gas;
    const isUnderpriced = maxFee < effectiveBaseFee;

    // Actual execution price per gas = baseFee + min(priorityFee, maxFee - baseFee)
    const effectiveTip = isUnderpriced ? 0 : Math.min(priorityFee, Math.max(0, maxFee - effectiveBaseFee));
    const effectivePriceGwei = effectiveBaseFee + effectiveTip;

    const burnedEth = (gas * effectiveBaseFee * 1e9) / 1e18;
    const tipEth = (gas * effectiveTip * 1e9) / 1e18;
    const totalCostEth = (gas * effectivePriceGwei * 1e9) / 1e18;
    const maxCostEth = (gas * maxFee * 1e9) / 1e18;

    const totalCostUsd = totalCostEth * ethPriceUsd;
    const maxCostUsd = maxCostEth * ethPriceUsd;
    const refundUsd = Math.max(0, maxCostUsd - totalCostUsd);

    return {
      gas,
      isUnderpriced,
      effectiveTip,
      effectivePriceGwei,
      burnedEth,
      tipEth,
      totalCostEth,
      totalCostUsd,
      maxCostUsd,
      refundUsd,
      burnPercent: totalCostEth > 0 ? Math.round((burnedEth / totalCostEth) * 100) : 90,
    };
  }, [selectedTxType, effectiveBaseFee, priorityFee, maxFee, ethPriceUsd]);

  const copyConfigPayload = () => {
    const payload = {
      type: 2, // EIP-1559
      maxFeePerGas: `${Math.round(maxFee * 1e9)}`, // wei
      maxPriorityFeePerGas: `${Math.round(priorityFee * 1e9)}`, // wei
      gasLimit: costCalculation.gas,
      estimatedBaseFeeGwei: effectiveBaseFee,
      estimatedWaitTime: waitTimeText,
    };
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-5 bg-slate-900/50 rounded-xl border border-slate-800 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <Timer className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-white">
                EIP-1559 Fee Estimator & Inclusion Wait-Time Predictor
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold uppercase">
                Gas Oracle
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Calculates expected block inclusion delays and fee burn parameters based on current base fee and priority tip bids.
            </p>
          </div>
        </div>

        {/* Live Base Fee Tag & Reset */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-slate-400">Canonical Base Fee:</span>
          <span className="font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
            {effectiveBaseFee.toFixed(2)} Gwei
          </span>
          {baseFeeOverride !== null && (
            <button
              onClick={() => setBaseFeeOverride(null)}
              className="text-xs text-slate-400 hover:text-white p-1"
              title="Reset to live on-chain base fee"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Speed Presets Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        {[
          { key: 'urgent' as const, name: 'Urgent (Next)', sub: '1 block (~12s)', tip: '2.5 Gwei', badge: '99% conf' },
          { key: 'fast' as const, name: 'Fast (1–2 blk)', sub: '1–2 blks (~18s)', tip: '1.5 Gwei', badge: '94% conf' },
          { key: 'normal' as const, name: 'Normal (Standard)', sub: '2–4 blks (~36s)', tip: '1.0 Gwei', badge: '85% conf' },
          { key: 'eco' as const, name: 'Eco (Low Cost)', sub: '5–15 blks (~2m)', tip: '0.15 Gwei', badge: '62% conf' },
          { key: 'custom' as const, name: 'Custom Input', sub: 'Manual sliders', tip: 'User defined', badge: 'Manual' },
        ].map((preset) => (
          <button
            key={preset.key}
            onClick={() => setSelectedSpeed(preset.key)}
            className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
              selectedSpeed === preset.key
                ? 'bg-amber-500/15 border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.15)]'
                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-950'
            }`}
          >
            <div>
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                <span>{preset.badge}</span>
                {selectedSpeed === preset.key && (
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                )}
              </div>
              <div className="text-xs font-bold text-white font-mono mt-1">
                {preset.name}
              </div>
            </div>

            <div className="mt-2 pt-2 border-t border-slate-800/80 text-[10px] font-mono text-slate-400 flex items-center justify-between">
              <span>{preset.sub}</span>
              <span className="text-amber-400 font-semibold">{preset.tip}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Main 2-Column: Inclusion Wait Time Predictor + Interactive Sliders & Cost Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left: Wait-Time & Inclusion Confidence Card (5 cols) */}
        <div className="lg:col-span-5 p-4 bg-slate-950/80 rounded-xl border border-slate-800 flex flex-col justify-between space-y-4">
          <div>
            <span className="text-[10px] uppercase font-mono text-slate-400 tracking-wider block font-semibold">
              Estimated Transaction Wait Time
            </span>

            {/* Giant Estimated Time Display */}
            <div className="mt-2 flex items-baseline gap-2">
              <span className={`text-2xl sm:text-3xl font-extrabold font-mono tracking-tight ${statusColor}`}>
                {waitTimeText}
              </span>
            </div>

            <div className="flex items-center gap-2 mt-1 text-xs font-mono text-slate-400">
              <span>Expected: <strong className="text-white">{blocksText}</strong></span>
              <span className="text-slate-600">·</span>
              <span>Target: <strong className="text-slate-300">#{((latestBlockNum || 21000000) + 1).toLocaleString()}</strong></span>
            </div>
          </div>

          {/* Underpriced Warning if applicable */}
          {costCalculation.isUnderpriced ? (
            <div className="p-3 bg-rose-950/40 rounded-lg border border-rose-600/40 text-rose-300 text-xs font-mono flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-semibold">Underpriced Transaction</strong>
                <span className="text-[11px] text-rose-300/80">
                  Your Max Fee ({maxFee} Gwei) is lower than the canonical base fee ({effectiveBaseFee.toFixed(2)} Gwei). Ethereum miners and builders cannot execute this until the base fee decreases.
                </span>
              </div>
            </div>
          ) : (
            /* Inclusion Probability Meter */
            <div className="space-y-1.5 p-3 bg-slate-900/60 rounded-xl border border-slate-800/80">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-300 font-medium">Inclusion Probability</span>
                <span className={`font-bold ${statusColor}`}>{probability}%</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    probability >= 90
                      ? 'bg-amber-400'
                      : probability >= 75
                      ? 'bg-emerald-400'
                      : 'bg-blue-400'
                  }`}
                  style={{ width: `${probability}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                <span>Mempool depth nominal</span>
                <span>EIP-1559 Elastic 12s clock</span>
              </div>
            </div>
          )}

          {/* Copy EIP-1559 RPC Payload Button */}
          <button
            onClick={copyConfigPayload}
            className="w-full py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-xs font-mono text-slate-300 hover:text-white transition-colors flex items-center justify-center gap-2"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied EIP-1559 Payload!' : 'Copy Web3 SendTransaction Payload'}</span>
          </button>
        </div>

        {/* Right: Sliders + Fee Breakdown & Tx Type Cost Table (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Custom Sliders (Active in Custom Mode or Informative otherwise) */}
          <div className="p-3.5 bg-slate-950/70 rounded-xl border border-slate-800 space-y-3 text-xs font-mono">
            {/* Priority Fee Slider */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  Priority Tip (maxPriorityFeePerGas):
                </span>
                <span className="text-amber-400 font-bold">{priorityFee.toFixed(2)} Gwei</span>
              </div>
              <input
                type="range"
                min="0.05"
                max="8.0"
                step="0.05"
                value={priorityFee}
                onChange={(e) => {
                  setSelectedSpeed('custom');
                  setCustomPriorityFee(parseFloat(e.target.value));
                }}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>

            {/* Max Total Fee Slider */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                  <Fuel className="w-3.5 h-3.5 text-emerald-400" />
                  Max Total Fee Cap (maxFeePerGas):
                </span>
                <span className="text-emerald-400 font-bold">{maxFee.toFixed(2)} Gwei</span>
              </div>
              <input
                type="range"
                min="10.0"
                max="80.0"
                step="0.5"
                value={maxFee}
                onChange={(e) => {
                  setSelectedSpeed('custom');
                  setCustomMaxFee(parseFloat(e.target.value));
                }}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>

            {/* Simulated Base Fee Surge Slider */}
            <div className="space-y-1 pt-1 border-t border-slate-800/60">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400 flex items-center gap-1">
                  <Sliders className="w-3 h-3 text-slate-500" />
                  Test Base Fee Surge:
                </span>
                <span className="text-slate-300 font-mono">{effectiveBaseFee.toFixed(1)} Gwei</span>
              </div>
              <input
                type="range"
                min="5.0"
                max="80.0"
                step="1.0"
                value={effectiveBaseFee}
                onChange={(e) => setBaseFeeOverride(parseFloat(e.target.value))}
                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-slate-400"
              />
            </div>
          </div>

          {/* Transaction Type Cost Breakdown */}
          <div className="p-3.5 bg-slate-950/70 rounded-xl border border-slate-800 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
              <span className="text-slate-300 font-semibold">Transaction Cost by Type:</span>
              {/* Type Pills */}
              <div className="flex flex-wrap items-center gap-1">
                {(Object.keys(TX_TYPES) as TxPreset[]).map((tKey) => (
                  <button
                    key={tKey}
                    onClick={() => setSelectedTxType(tKey)}
                    className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                      selectedTxType === tKey
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                        : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
                    }`}
                  >
                    {TX_TYPES[tKey].name.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>

            {/* Cost Details Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono pt-1">
              <div className="p-2 bg-slate-900/60 rounded-lg border border-slate-800/80">
                <span className="text-[10px] text-slate-500 block">Total Gas Allocated</span>
                <span className="text-white font-bold">{costCalculation.gas.toLocaleString()}</span>
              </div>

              <div className="p-2 bg-slate-900/60 rounded-lg border border-slate-800/80">
                <span className="text-[10px] text-slate-500 block flex items-center gap-1">
                  <Flame className="w-3 h-3 text-orange-400" />
                  Burned Base Fee
                </span>
                <span className="text-orange-400 font-bold">
                  {costCalculation.burnedEth.toFixed(5)} ETH
                </span>
                <span className="text-[9px] text-slate-500 block">
                  ${(costCalculation.burnedEth * ethPriceUsd).toFixed(2)} USD
                </span>
              </div>

              <div className="p-2 bg-slate-900/60 rounded-lg border border-slate-800/80">
                <span className="text-[10px] text-slate-500 block flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-400" />
                  Miner / Proposer Tip
                </span>
                <span className="text-amber-400 font-bold">
                  {costCalculation.tipEth.toFixed(5)} ETH
                </span>
                <span className="text-[9px] text-slate-500 block">
                  ${(costCalculation.tipEth * ethPriceUsd).toFixed(2)} USD
                </span>
              </div>

              <div className="p-2 bg-slate-900/60 rounded-lg border border-slate-800/80">
                <span className="text-[10px] text-slate-500 block">Estimated Cost</span>
                <span className="text-emerald-400 font-extrabold text-sm">
                  ${costCalculation.totalCostUsd.toFixed(2)}
                </span>
                <span className="text-[9px] text-slate-400 block truncate">
                  {costCalculation.totalCostEth.toFixed(5)} ETH
                </span>
              </div>
            </div>

            {/* EIP-1559 Refund Guarantee Notice */}
            <div className="pt-2 border-t border-slate-800/70 flex flex-wrap items-center justify-between text-[10px] font-mono text-slate-500">
              <span>
                Burned Ratio: <strong className="text-orange-400 font-semibold">{costCalculation.burnPercent}%</strong> of fee permanently burned
              </span>
              <span>
                Unspent Buffer: <strong className="text-emerald-400">${costCalculation.refundUsd.toFixed(2)}</strong> refunded to sender
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
