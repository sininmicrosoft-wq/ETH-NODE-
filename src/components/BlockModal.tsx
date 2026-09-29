import React, { useState } from 'react';
import { EthereumBlock, EthereumTransaction } from '../types/ethereum';
import { hexToNumber, weiToEth, weiToGwei, formatAddress, decodeExtraData } from '../services/ethereumRpc';
import { X, Copy, Check, ExternalLink, Box, Fuel, ArrowRightLeft, Database } from 'lucide-react';

interface BlockModalProps {
  block: EthereumBlock | null;
  onClose: () => void;
  onSelectTx?: (tx: EthereumTransaction | string) => void;
}

export const BlockModal: React.FC<BlockModalProps> = ({ block, onClose, onSelectTx }) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [txSearch, setTxSearch] = useState('');

  if (!block) return null;

  const blockNum = hexToNumber(block.number);
  const gasLimit = hexToNumber(block.gasLimit);
  const gasUsed = hexToNumber(block.gasUsed);
  const gasPercentage = gasLimit > 0 ? ((gasUsed / gasLimit) * 100).toFixed(1) : '0';
  const baseFeeGwei = block.baseFeePerGas ? weiToGwei(block.baseFeePerGas).toFixed(2) : 'N/A';
  const timestamp = hexToNumber(block.timestamp);
  const dateFormatted = new Date(timestamp * 1000).toUTCString();
  const extraDataAscii = decodeExtraData(block.extraData);
  const txCount = block.transactions ? block.transactions.length : 0;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const filteredTxs = (block.transactions || []).filter((tx) => {
    if (!txSearch.trim()) return true;
    const query = txSearch.toLowerCase();
    if (typeof tx === 'string') return tx.toLowerCase().includes(query);
    return (
      tx.hash.toLowerCase().includes(query) ||
      tx.from.toLowerCase().includes(query) ||
      (tx.to && tx.to.toLowerCase().includes(query))
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="bg-[#111827] border border-slate-700/80 rounded-xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#0d131f]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Box className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white font-mono">
                  Block #{blockNum.toLocaleString()}
                </h3>
                <span className="text-xs text-slate-400">({dateFormatted})</span>
              </div>
              <div className="text-xs text-slate-400 font-mono truncate max-w-sm mt-0.5">
                {block.hash}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800">
              <div className="text-[11px] text-slate-400 font-medium">Gas Utilization</div>
              <div className="text-sm font-semibold text-white font-mono mt-1">
                {gasPercentage}%
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    Number(gasPercentage) > 85 ? 'bg-amber-400' : 'bg-emerald-400'
                  }`}
                  style={{ width: `${Math.min(100, Number(gasPercentage))}%` }}
                />
              </div>
              <div className="text-[10px] text-slate-500 font-mono mt-1">
                {(gasUsed / 1e6).toFixed(2)}M / {(gasLimit / 1e6).toFixed(1)}M
              </div>
            </div>

            <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800">
              <div className="text-[11px] text-slate-400 font-medium">Base Fee (EIP-1559)</div>
              <div className="text-sm font-semibold text-white font-mono mt-1">
                {baseFeeGwei} <span className="text-xs font-normal text-slate-400">Gwei</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-2">
                Target: 15M gas (50%)
              </div>
            </div>

            <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800">
              <div className="text-[11px] text-slate-400 font-medium">Transactions</div>
              <div className="text-sm font-semibold text-white font-mono mt-1">
                {txCount} <span className="text-xs font-normal text-slate-400">txs</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-2">
                In canonical block
              </div>
            </div>

            <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800">
              <div className="text-[11px] text-slate-400 font-medium">Block Builder / Miner</div>
              <div className="text-sm font-semibold text-emerald-400 font-mono truncate mt-1">
                {extraDataAscii !== 'N/A' && extraDataAscii !== 'Bytes'
                  ? extraDataAscii
                  : formatAddress(block.miner)}
              </div>
              <div className="text-[10px] text-slate-500 font-mono truncate mt-2">
                {formatAddress(block.miner)}
              </div>
            </div>
          </div>

          {/* Block Details List */}
          <div className="bg-slate-900/60 rounded-lg border border-slate-800 p-4 space-y-2.5 text-xs">
            <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400 font-medium">Block Hash</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-slate-200 select-all truncate max-w-xs sm:max-w-md">
                  {block.hash}
                </span>
                <button
                  onClick={() => copyToClipboard(block.hash, 'hash')}
                  className="text-slate-500 hover:text-slate-300 p-1"
                >
                  {copiedKey === 'hash' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400 font-medium">Parent Hash</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-slate-300 truncate max-w-xs sm:max-w-md">
                  {block.parentHash}
                </span>
                <button
                  onClick={() => copyToClipboard(block.parentHash, 'parent')}
                  className="text-slate-500 hover:text-slate-300 p-1"
                >
                  {copiedKey === 'parent' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400 font-medium">Fee Recipient / Proposer</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-slate-300">{block.miner}</span>
                <button
                  onClick={() => copyToClipboard(block.miner, 'miner')}
                  className="text-slate-500 hover:text-slate-300 p-1"
                >
                  {copiedKey === 'miner' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400 font-medium">State Root</span>
              <span className="font-mono text-slate-400 truncate max-w-xs">{block.stateRoot}</span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400 font-medium">Receipts Root</span>
              <span className="font-mono text-slate-400 truncate max-w-xs">{block.receiptsRoot}</span>
            </div>

            <div className="flex items-center justify-between py-1">
              <span className="text-slate-400 font-medium">Extra Data (Builder Tag)</span>
              <div className="text-right">
                <span className="font-mono text-emerald-300">{extraDataAscii}</span>
                <span className="block font-mono text-[10px] text-slate-500 truncate max-w-xs">
                  {block.extraData}
                </span>
              </div>
            </div>
          </div>

          {/* Transactions List */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-semibold text-white flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-emerald-400" />
                <span>Transactions in Block ({filteredTxs.length})</span>
              </div>
              <input
                type="text"
                value={txSearch}
                onChange={(e) => setTxSearch(e.target.value)}
                placeholder="Filter by hash or address..."
                className="bg-slate-900 border border-slate-700/80 rounded px-2.5 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 w-48 sm:w-64 font-mono"
              />
            </div>

            <div className="bg-slate-900/60 rounded-lg border border-slate-800 max-h-60 overflow-y-auto divide-y divide-slate-800/60">
              {filteredTxs.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500">
                  No matching transactions found in this block.
                </div>
              ) : (
                filteredTxs.slice(0, 100).map((tx, idx) => {
                  if (typeof tx === 'string') {
                    return (
                      <div
                        key={tx}
                        className="px-4 py-2 flex items-center justify-between hover:bg-slate-800/50 text-xs font-mono"
                      >
                        <span className="text-slate-300 truncate max-w-md">{tx}</span>
                        <button
                          onClick={() => copyToClipboard(tx, `tx-${idx}`)}
                          className="text-slate-500 hover:text-slate-300 p-1"
                        >
                          {copiedKey === `tx-${idx}` ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={tx.hash}
                      className="px-4 py-2.5 flex items-center justify-between hover:bg-slate-800/50 text-xs gap-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-emerald-400 truncate max-w-[140px] sm:max-w-[200px]">
                            {tx.hash}
                          </span>
                          <span className="text-slate-500 text-[11px]">
                            Nonce: <span className="font-mono text-slate-400">{hexToNumber(tx.nonce)}</span>
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5 font-mono">
                          <span>From {formatAddress(tx.from)}</span>
                          <span>→</span>
                          <span>To {tx.to ? formatAddress(tx.to) : 'Contract Deploy'}</span>
                        </div>
                      </div>

                      <div className="text-right shrink-0 font-mono">
                        <div className="text-white font-medium">
                          {weiToEth(tx.value, 4)} ETH
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {weiToGwei(tx.gasPrice).toFixed(1)} Gwei
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            {filteredTxs.length > 100 && (
              <div className="text-[11px] text-slate-500 text-center mt-2">
                Showing first 100 of {filteredTxs.length} transactions.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
