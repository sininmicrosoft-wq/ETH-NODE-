import React, { useState, useEffect } from 'react';
import { RpcEndpoint } from '../types/ethereum';
import { callRpc, hexToNumber, weiToEth, weiToGwei, formatAddress } from '../services/ethereumRpc';
import { StakingRewardEstimator } from './StakingRewardEstimator';
import {
  Search,
  Wallet,
  Code,
  ArrowRightLeft,
  Fuel,
  Coins,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';

interface StateExplorerTabProps {
  currentEndpoint: RpcEndpoint;
  liveBaseFeeGwei: number;
}

export const StateExplorerTab: React.FC<StateExplorerTabProps> = ({
  currentEndpoint,
  liveBaseFeeGwei,
}) => {
  const [address, setAddress] = useState('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'); // Vitalik Buterin
  const [loading, setLoading] = useState(false);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [estimatorBalance, setEstimatorBalance] = useState<string>('32');

  const [accountData, setAccountData] = useState<{
    balanceWei: string;
    balanceEth: string;
    nonce: number;
    isContract: boolean;
    codeByteLength: number;
    latencyMs: number;
  } | null>(null);

  // Unit Converter State
  const [converterValue, setConverterValue] = useState('1');
  const [converterUnit, setConverterUnit] = useState<'eth' | 'gwei' | 'wei'>('eth');

  const presetAddresses = [
    { label: 'Vitalik Buterin (vitalik.eth)', address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045' },
    { label: 'Uniswap V3 Factory', address: '0x1F98431c8aD98523631AE4a59f267346ea31F984' },
    { label: 'Tether USD (USDT)', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7' },
    { label: 'Beacon Deposit Contract', address: '0x00000000219ab540356cBB839Cbe05303d7705Fa' },
  ];

  const handleQuery = async (targetAddr = address) => {
    const cleanAddr = targetAddr.trim();
    if (!cleanAddr.startsWith('0x') || cleanAddr.length !== 42) {
      setQueryError('Please enter a valid 42-character Ethereum address (0x...)');
      return;
    }

    setLoading(true);
    setQueryError(null);

    const [balanceRes, nonceRes, codeRes] = await Promise.all([
      callRpc(currentEndpoint.url, 'eth_getBalance', [cleanAddr, 'latest']),
      callRpc(currentEndpoint.url, 'eth_getTransactionCount', [cleanAddr, 'latest']),
      callRpc(currentEndpoint.url, 'eth_getCode', [cleanAddr, 'latest']),
    ]);

    setLoading(false);

    if (balanceRes.error) {
      setQueryError(balanceRes.error);
      return;
    }

    const code = codeRes.result || '0x';
    const isContract = code !== '0x' && code !== '0x0' && code.length > 2;
    const codeByteLength = isContract ? (code.length - 2) / 2 : 0;

    setAccountData({
      balanceWei: balanceRes.result || '0x0',
      balanceEth: weiToEth(balanceRes.result, 6),
      nonce: hexToNumber(nonceRes.result),
      isContract,
      codeByteLength,
      latencyMs: balanceRes.latencyMs,
    });
  };

  useEffect(() => {
    handleQuery(address);
  }, [currentEndpoint.id]);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  // Convert units
  const calculateUnits = () => {
    try {
      const num = parseFloat(converterValue) || 0;
      if (converterUnit === 'eth') {
        const eth = num;
        const gwei = num * 1e9;
        const wei = BigInt(Math.floor(num * 1e18)).toString();
        return { eth: eth.toString(), gwei: gwei.toLocaleString(), wei };
      } else if (converterUnit === 'gwei') {
        const eth = num / 1e9;
        const gwei = num;
        const wei = BigInt(Math.floor(num * 1e9)).toString();
        return { eth: eth.toFixed(9), gwei: gwei.toString(), wei };
      } else {
        const wei = BigInt(Math.floor(num));
        const gwei = Number(wei) / 1e9;
        const eth = Number(wei) / 1e18;
        return { eth: eth.toFixed(18), gwei: gwei.toFixed(9), wei: wei.toString() };
      }
    } catch {
      return { eth: '0', gwei: '0', wei: '0' };
    }
  };

  const units = calculateUnits();

  // Gas cost calculations with current live base fee
  const gasScenarios = [
    { label: 'ETH Transfer', gas: 21000, desc: 'Standard EOA to EOA transfer' },
    { label: 'ERC-20 Transfer', gas: 65000, desc: 'e.g. USDT, USDC transfer()' },
    { label: 'Uniswap V3 Swap', gas: 155000, desc: 'Exact input single-hop swap' },
    { label: 'NFT Mint (ERC-721)', gas: 140000, desc: 'Standard safeMint execution' },
    { label: 'Aave Supply / Borrow', gas: 260000, desc: 'Multi-step contract interaction' },
  ];

  return (
    <div className="space-y-6">
      {/* Intro */}
      <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Search className="w-4 h-4 text-emerald-400" />
            Account State & EVM Gas Estimator
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Query live balances, nonce records, and smart contract bytecode directly from the connected Ethereum node.
          </p>
        </div>
        <div className="text-xs font-mono text-slate-400">
          Base Fee: <span className="text-amber-400 font-semibold">{liveBaseFeeGwei.toFixed(2)} Gwei</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Account Inspector (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-5 bg-slate-900/50 rounded-xl border border-slate-800 space-y-4">
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
              Ethereum Account Query
            </h3>

            {/* Presets */}
            <div className="flex flex-wrap gap-1.5">
              {presetAddresses.map((p) => (
                <button
                  key={p.address}
                  onClick={() => {
                    setAddress(p.address);
                    handleQuery(p.address);
                  }}
                  className={`px-2.5 py-1 text-[11px] rounded border transition-colors ${
                    address.toLowerCase() === p.address.toLowerCase()
                      ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                      : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Search Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleQuery();
              }}
              className="flex gap-2"
            >
              <div className="relative flex-1">
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="0x..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50 cursor-pointer shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Query</span>
              </button>
            </form>

            {queryError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{queryError}</span>
              </div>
            )}

            {/* Results Grid */}
            {accountData && (
              <div className="space-y-3 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 bg-slate-950 rounded-lg border border-slate-800 flex flex-col justify-between">
                    <div>
                      <div className="text-[11px] text-slate-400">ETH Balance</div>
                      <div className="text-lg font-bold font-mono text-emerald-400 mt-1 truncate">
                        {accountData.balanceEth}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5 truncate">
                        {accountData.balanceWei} wei
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        const cleanEth = parseFloat(accountData.balanceEth) > 0 ? accountData.balanceEth : '32';
                        setEstimatorBalance(cleanEth);
                        const el = document.getElementById('staking-estimator-section');
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="mt-2 text-[10px] text-emerald-400 hover:text-emerald-300 font-mono flex items-center gap-1 transition-colors pt-1 border-t border-slate-800/60"
                      title="Simulate staking yield with this balance"
                    >
                      <TrendingUp className="w-3 h-3" />
                      <span>Estimate Staking Yield →</span>
                    </button>
                  </div>

                  <div className="p-3.5 bg-slate-950 rounded-lg border border-slate-800">
                    <div className="text-[11px] text-slate-400">Transactions Nonce</div>
                    <div className="text-lg font-bold font-mono text-white mt-1">
                      #{accountData.nonce.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      Confirmed sent transactions
                    </div>
                  </div>

                  <div className="p-3.5 bg-slate-950 rounded-lg border border-slate-800">
                    <div className="text-[11px] text-slate-400">Account Type</div>
                    <div className="text-lg font-bold font-mono text-white mt-1 flex items-center gap-1.5">
                      {accountData.isContract ? (
                        <>
                          <Code className="w-4 h-4 text-purple-400" />
                          <span className="text-purple-400">Contract</span>
                        </>
                      ) : (
                        <>
                          <Wallet className="w-4 h-4 text-emerald-400" />
                          <span className="text-emerald-400">EOA User</span>
                        </>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                      {accountData.isContract
                        ? `${accountData.codeByteLength.toLocaleString()} bytes bytecode`
                        : 'Standard Private Key Wallet'}
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Queried Address:</span>
                    <span className="font-mono text-slate-200 truncate max-w-xs">{address}</span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(address, 'addr')}
                    className="text-slate-400 hover:text-white p-1"
                  >
                    {copiedKey === 'addr' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* EVM Units Converter */}
          <div className="p-5 bg-slate-900/50 rounded-xl border border-slate-800 space-y-3">
            <h3 className="text-xs font-semibold text-white flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              EVM Denomination Converter
            </h3>

            <div className="flex gap-2">
              <input
                type="number"
                value={converterValue}
                onChange={(e) => setConverterValue(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
              />
              <select
                value={converterUnit}
                onChange={(e) => setConverterUnit(e.target.value as any)}
                className="bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-sans"
              >
                <option value="eth">Ether (ETH)</option>
                <option value="gwei">Gwei (10^9 wei)</option>
                <option value="wei">Wei (10^0)</option>
              </select>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 text-xs">
              <div className="p-2.5 bg-slate-950 rounded border border-slate-800/80">
                <div className="text-[10px] text-slate-500 uppercase font-mono">Ether</div>
                <div className="font-mono text-white text-xs mt-1 truncate">{units.eth}</div>
              </div>
              <div className="p-2.5 bg-slate-950 rounded border border-slate-800/80">
                <div className="text-[10px] text-slate-500 uppercase font-mono">Gwei</div>
                <div className="font-mono text-amber-300 text-xs mt-1 truncate">{units.gwei}</div>
              </div>
              <div className="p-2.5 bg-slate-950 rounded border border-slate-800/80">
                <div className="text-[10px] text-slate-500 uppercase font-mono">Wei</div>
                <div className="font-mono text-emerald-300 text-xs mt-1 truncate">{units.wei}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Gas Price Estimator (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 bg-slate-900/50 rounded-xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-white flex items-center gap-1.5">
                <Fuel className="w-3.5 h-3.5 text-amber-400" />
                Live Transaction Cost Calculator
              </h3>
              <span className="text-[10px] text-slate-400 font-mono">
                Gas: {liveBaseFeeGwei.toFixed(1)} + 1.5 Gwei tip
              </span>
            </div>

            <div className="divide-y divide-slate-800/80">
              {gasScenarios.map((scenario) => {
                const totalGwei = liveBaseFeeGwei + 1.5;
                const costEth = (scenario.gas * totalGwei) / 1e9;
                const costUsd = costEth * 3150; // Reference ETH price estimate

                return (
                  <div key={scenario.label} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-white">{scenario.label}</div>
                      <div className="text-[11px] text-slate-400">{scenario.desc}</div>
                      <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                        {scenario.gas.toLocaleString()} gas units
                      </div>
                    </div>

                    <div className="text-right shrink-0 font-mono">
                      <div className="text-emerald-400 font-medium">
                        {costEth < 0.0001 ? '<0.0001' : costEth.toFixed(4)} ETH
                      </div>
                      <div className="text-[11px] text-slate-400">
                        ≈ ${costUsd.toFixed(2)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/80 text-[11px] text-slate-400 leading-relaxed">
              <strong>EIP-1559 Formula:</strong> <br />
              <code className="text-emerald-400 font-mono">Cost = Gas Used × (Base Fee + Priority Fee)</code><br />
              The base fee is burned by the protocol, while the priority fee is awarded to the block builder/validator.
            </div>
          </div>
        </div>
      </div>

      {/* Staking Reward & Compounding Estimator */}
      <div id="staking-estimator-section">
        <StakingRewardEstimator
          currentBaseFeeGwei={liveBaseFeeGwei}
          initialEthBalance={estimatorBalance}
        />
      </div>
    </div>
  );
};
