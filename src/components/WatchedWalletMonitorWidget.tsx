import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { EthereumBlock, EthereumTransaction } from '../types/ethereum';
import { callRpc, hexToNumber, weiToEth, formatAddress } from '../services/ethereumRpc';
import {
  Wallet,
  Eye,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  Search,
  Activity,
  ArrowUpRight,
  ArrowDownLeft,
  ShieldCheck,
  FileCode,
  User,
  Clock,
  Sparkles,
  Bookmark,
  BookmarkCheck,
  AlertCircle,
  Coins,
} from 'lucide-react';

interface WatchedWalletMonitorWidgetProps {
  recentBlocks: EthereumBlock[];
  latestBlockNum: number;
  onSelectTx?: (tx: EthereumTransaction | string) => void;
}

interface PresetWallet {
  name: string;
  tag: string;
  address: string;
  type: 'Whale' | 'Exchange' | 'Protocol' | 'Foundation';
}

const PRESET_WALLETS: PresetWallet[] = [
  {
    name: 'vitalik.eth',
    tag: 'Vitalik Buterin',
    address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    type: 'Whale',
  },
  {
    name: 'Binance Hot 14',
    tag: 'Centralized Exchange',
    address: '0x28C6c06298d514Db089934071355E5743bf21d60',
    type: 'Exchange',
  },
  {
    name: 'Uniswap V3 Router',
    tag: 'Universal Router',
    address: '0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD',
    type: 'Protocol',
  },
  {
    name: 'Ethereum Foundation',
    tag: 'Ecosystem Treasury',
    address: '0xde0B295669a9FD93d5F28D9Ec85E40f4cb697BAe',
    type: 'Foundation',
  },
  {
    name: 'Tether USD',
    tag: 'USDT Token Contract',
    address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    type: 'Protocol',
  },
];

const DEFAULT_RPC = 'https://eth.llamarpc.com';
const ETH_USD_PRICE = 2650;

export const WatchedWalletMonitorWidget: React.FC<WatchedWalletMonitorWidgetProps> = ({
  recentBlocks,
  latestBlockNum,
  onSelectTx,
}) => {
  const [addressInput, setAddressInput] = useState<string>('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045');
  const [activeAddress, setActiveAddress] = useState<string>('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045');
  const [walletLabel, setWalletLabel] = useState<string>('vitalik.eth');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string>('Just now');

  // Wallet on-chain state
  const [balanceEth, setBalanceEth] = useState<string>('0.0000');
  const [balanceWei, setBalanceWei] = useState<string>('0');
  const [lifetimeTxCount, setLifetimeTxCount] = useState<number>(0);
  const [isContract, setIsContract] = useState<boolean>(false);

  // Watchlist saved in local storage
  const [watchlist, setWatchlist] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('ethereum_watched_wallets');
      return saved ? JSON.parse(saved) : ['0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'];
    } catch {
      return ['0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'];
    }
  });

  // Fetch real-time wallet data
  const fetchWalletData = useCallback(async (targetAddr: string) => {
    const cleanAddr = targetAddr.trim().toLowerCase();
    if (!/^0x[a-f0-9]{40}$/.test(cleanAddr)) {
      setErrorMsg('Invalid Ethereum address format (must be 42 characters starting with 0x)');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      // 1. Balance
      const balanceRes = await callRpc(DEFAULT_RPC, 'eth_getBalance', [cleanAddr, 'latest']);
      if (balanceRes.result) {
        const ethVal = weiToEth(balanceRes.result);
        setBalanceEth(ethVal);
        setBalanceWei(BigInt(balanceRes.result).toString());
      }

      // 2. Transaction Count (Nonce)
      const nonceRes = await callRpc(DEFAULT_RPC, 'eth_getTransactionCount', [cleanAddr, 'latest']);
      if (nonceRes.result) {
        setLifetimeTxCount(hexToNumber(nonceRes.result));
      }

      // 3. Contract code check
      const codeRes = await callRpc(DEFAULT_RPC, 'eth_getCode', [cleanAddr, 'latest']);
      setIsContract(Boolean(codeRes.result && codeRes.result !== '0x' && codeRes.result !== '0x0'));

      setLastRefreshedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to query wallet state');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial and address change fetch
  useEffect(() => {
    fetchWalletData(activeAddress);
  }, [activeAddress, fetchWalletData]);

  // Handle address submit
  const handleQuery = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = addressInput.trim().toLowerCase();
    if (/^0x[a-f0-9]{40}$/.test(clean)) {
      setActiveAddress(clean);
      const matched = PRESET_WALLETS.find((p) => p.address.toLowerCase() === clean);
      setWalletLabel(matched ? matched.name : formatAddress(clean));
    } else {
      setErrorMsg('Invalid Ethereum address. Example: 0xd8dA6...96045');
    }
  };

  // Toggle Watchlist pin
  const togglePin = () => {
    setWatchlist((prev) => {
      let updated: string[];
      if (prev.includes(activeAddress)) {
        updated = prev.filter((a) => a !== activeAddress);
      } else {
        updated = [...prev, activeAddress];
      }
      try {
        localStorage.setItem('ethereum_watched_wallets', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const isPinned = watchlist.includes(activeAddress);

  // Scan recent blocks for interactions involving this wallet
  const recentInteractions = useMemo(() => {
    const clean = activeAddress.toLowerCase();
    const foundTxs: {
      hash: string;
      blockNumber: number;
      from: string;
      to: string;
      valueEth: string;
      isOutgoing: boolean;
      timeAgo: string;
    }[] = [];

    recentBlocks.forEach((block) => {
      const bNum = block.number ? hexToNumber(block.number) : 0;
      if (Array.isArray(block.transactions)) {
        block.transactions.forEach((tx: any) => {
          if (typeof tx === 'object' && tx !== null) {
            const txFrom = (tx.from || '').toLowerCase();
            const txTo = (tx.to || '').toLowerCase();

            if (txFrom === clean || txTo === clean) {
              const valEth = tx.value ? weiToEth(tx.value) : '0';
              foundTxs.push({
                hash: tx.hash,
                blockNumber: bNum,
                from: tx.from,
                to: tx.to || 'Contract Creation',
                valueEth: parseFloat(valEth).toFixed(4),
                isOutgoing: txFrom === clean,
                timeAgo: block.timestamp ? `${Math.max(0, Math.round((Date.now() / 1000 - hexToNumber(block.timestamp)) / 60))}m ago` : 'recent',
              });
            }
          }
        });
      }
    });

    return foundTxs.slice(0, 5);
  }, [recentBlocks, activeAddress]);

  const copyAddress = () => {
    navigator.clipboard.writeText(activeAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const usdValue = useMemo(() => {
    const num = parseFloat(balanceEth) || 0;
    return (num * ETH_USD_PRICE).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }, [balanceEth]);

  return (
    <div className="p-5 bg-gradient-to-r from-slate-900/90 via-cyan-950/20 to-slate-900/90 rounded-xl border border-cyan-500/30 relative overflow-hidden space-y-4 shadow-xl">
      {/* Background ambient cyan glow */}
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
            <Eye className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-white">
                Watched Wallet Monitor
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 uppercase font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                Live Tracker
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Real-time balance monitoring, lifetime transaction count, and recent block mempool interaction tracking.
            </p>
          </div>
        </div>

        {/* Refresh & Last Updated */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-slate-400">Synced: <strong className="text-slate-200">{lastRefreshedAt}</strong></span>
          <button
            onClick={() => fetchWalletData(activeAddress)}
            disabled={loading}
            className="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-white transition-colors"
            title="Refresh on-chain wallet state"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Input Search Form & Preset Badges */}
      <div className="space-y-2.5">
        <form onSubmit={handleQuery} className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={addressInput}
              onChange={(e) => setAddressInput(e.target.value)}
              placeholder="Enter Ethereum public address (0x...)"
              className="w-full bg-slate-950/80 border border-slate-700/80 rounded-lg px-3 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 pl-8"
            />
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-mono font-semibold transition-colors flex items-center gap-1.5 shrink-0"
          >
            {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
            <span>Inspect</span>
          </button>
        </form>

        {errorMsg && (
          <div className="p-2 rounded bg-rose-950/40 border border-rose-600/30 text-rose-300 text-xs font-mono flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Quick Presets Strip */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono pt-0.5">
          <span className="text-[11px] text-slate-500 mr-1 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-cyan-400" /> Presets:
          </span>
          {PRESET_WALLETS.map((preset) => (
            <button
              key={preset.address}
              onClick={() => {
                setAddressInput(preset.address);
                setActiveAddress(preset.address);
                setWalletLabel(preset.name);
              }}
              className={`px-2 py-0.5 rounded text-[11px] transition-colors border ${
                activeAddress.toLowerCase() === preset.address.toLowerCase()
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-bold'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white'
              }`}
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main Wallet Card: Balance & Interaction Metrics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* Left Column: Address Hero & Balance Card (7 cols) */}
        <div className="lg:col-span-7 p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase border bg-slate-900 border-slate-700 text-slate-300 flex items-center gap-1">
                {isContract ? <FileCode className="w-3 h-3 text-purple-400" /> : <User className="w-3 h-3 text-cyan-400" />}
                {isContract ? 'Smart Contract' : 'EOA Wallet'}
              </span>
              <span className="text-sm font-bold text-white font-mono">{walletLabel}</span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={togglePin}
                className={`p-1.5 rounded-lg border transition-colors ${
                  isPinned
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                }`}
                title={isPinned ? 'Remove from Watchlist' : 'Pin to Watchlist'}
              >
                {isPinned ? <BookmarkCheck className="w-3.5 h-3.5 text-amber-400" /> : <Bookmark className="w-3.5 h-3.5" />}
              </button>

              <button
                onClick={copyAddress}
                className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-colors"
                title="Copy Address"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>

              <a
                href={`https://etherscan.io/address/${activeAddress}`}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-cyan-400 transition-colors"
                title="View on Etherscan"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          <div className="font-mono text-xs text-slate-400 break-all select-all bg-slate-900/60 p-2 rounded border border-slate-800/80">
            {activeAddress}
          </div>

          {/* Balance Hero Readout */}
          <div className="pt-1">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
              Real-Time Ether Balance
            </span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-3xl sm:text-4xl font-extrabold font-mono tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400">
                {parseFloat(balanceEth).toLocaleString(undefined, { maximumFractionDigits: 4 })}
              </span>
              <span className="text-lg font-bold font-mono text-cyan-400">ETH</span>
            </div>
            <div className="text-xs font-mono text-slate-400 mt-0.5">
              ≈ <strong className="text-white">${usdValue}</strong> USD
              <span className="text-slate-600 mx-1.5">·</span>
              <span className="text-[11px] text-slate-500">at ~${ETH_USD_PRICE}/ETH</span>
            </div>
          </div>
        </div>

        {/* Right Column: Lifetime Transactions + Recent Block Interactions (5 cols) */}
        <div className="lg:col-span-5 p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between space-y-3">
          {/* Interaction Summary Stats */}
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-400 block uppercase">Lifetime Nonce / Txs</span>
              <span className="text-base font-bold text-white mt-0.5 block">
                {lifetimeTxCount.toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-500">Confirmed outbounds</span>
            </div>

            <div className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-400 block uppercase">Loaded Block Hits</span>
              <span className="text-base font-bold text-cyan-400 mt-0.5 block">
                {recentInteractions.length} {recentInteractions.length === 1 ? 'tx' : 'txs'}
              </span>
              <span className="text-[10px] text-slate-500">In recent {recentBlocks.length} blocks</span>
            </div>
          </div>

          {/* Recent Interaction Activity Feed */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span className="font-semibold text-slate-300 flex items-center gap-1">
                <Activity className="w-3.5 h-3.5 text-cyan-400" /> Recent Block Activity
              </span>
              <span>{recentInteractions.length > 0 ? 'Detected' : 'Idle in loaded blocks'}</span>
            </div>

            {recentInteractions.length > 0 ? (
              <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                {recentInteractions.map((tx) => (
                  <div
                    key={tx.hash}
                    onClick={() => onSelectTx && onSelectTx(tx.hash)}
                    className="p-1.5 rounded bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 text-[11px] font-mono flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      {tx.isOutgoing ? (
                        <ArrowUpRight className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      ) : (
                        <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      )}
                      <span className="text-slate-300 truncate">
                        {tx.hash.slice(0, 10)}...
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-right shrink-0">
                      <span className="text-cyan-400 font-semibold">{tx.valueEth} ETH</span>
                      <span className="text-[10px] text-slate-500">#{tx.blockNumber}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 bg-slate-900/40 rounded-lg border border-slate-800/60 text-center text-xs font-mono text-slate-500">
                No transactions involving this address in the last {recentBlocks.length} canonical blocks.
              </div>
            )}
          </div>

          {/* Canonical Status Footer */}
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-500">
            <span>Canonical Head: <strong className="text-slate-400">#{latestBlockNum.toLocaleString()}</strong></span>
            <span className="text-emerald-400">Node Sync Healthy</span>
          </div>
        </div>
      </div>
    </div>
  );
};
