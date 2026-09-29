import React, { useState, useEffect } from 'react';
import { EthereumTransaction, EthereumTransactionReceipt, RpcEndpoint } from '../types/ethereum';
import {
  callRpc,
  hexToNumber,
  weiToEth,
  weiToGwei,
  formatAddress,
  decodeMethodSignature,
  getTransactionTypeLabel,
} from '../services/ethereumRpc';
import {
  X,
  Copy,
  Check,
  ExternalLink,
  ArrowRightLeft,
  CheckCircle2,
  XCircle,
  Clock,
  Fuel,
  Database,
  FileCode,
  Layers,
  Sparkles,
  Search,
} from 'lucide-react';

interface TransactionModalProps {
  txHash: string | null;
  initialTx?: EthereumTransaction | null;
  currentEndpoint: RpcEndpoint;
  onClose: () => void;
  onSelectBlock?: (blockNum: number) => void;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  txHash,
  initialTx,
  currentEndpoint,
  onClose,
  onSelectBlock,
}) => {
  const [transaction, setTransaction] = useState<EthereumTransaction | null>(initialTx || null);
  const [receipt, setReceipt] = useState<EthereumTransactionReceipt | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(!initialTx);
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'calldata' | 'logs' | 'raw'>('details');

  const ethPriceUsd = 2650;

  useEffect(() => {
    if (!txHash) return;

    let isMounted = true;
    const loadTxDetails = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const [txRes, receiptRes] = await Promise.all([
          callRpc(currentEndpoint.url, 'eth_getTransactionByHash', [txHash]),
          callRpc(currentEndpoint.url, 'eth_getTransactionReceipt', [txHash]),
        ]);

        if (!isMounted) return;

        if (txRes.result) {
          setTransaction(txRes.result);
        } else if (!initialTx) {
          setError('Transaction not found on this RPC endpoint or pending indexing.');
        }

        if (receiptRes.result) {
          setReceipt(receiptRes.result);
        }
      } catch (err: any) {
        if (isMounted) setError(err.message || 'Failed to fetch transaction data.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadTxDetails();

    return () => {
      isMounted = false;
    };
  }, [txHash, currentEndpoint.url, initialTx]);

  if (!txHash) return null;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const blockNumber = transaction?.blockNumber ? hexToNumber(transaction.blockNumber) : null;
  const gasLimit = transaction?.gas ? hexToNumber(transaction.gas) : 0;
  const gasUsed = receipt?.gasUsed ? hexToNumber(receipt.gasUsed) : 0;
  const gasPercent = gasLimit > 0 && gasUsed > 0 ? Math.round((gasUsed / gasLimit) * 100) : null;

  const effectiveGasPriceWei = receipt?.effectiveGasPrice
    ? BigInt(receipt.effectiveGasPrice)
    : transaction?.gasPrice
    ? BigInt(transaction.gasPrice)
    : 0n;

  const effectiveGasPriceGwei = Number(effectiveGasPriceWei) / 1e9;
  const totalTxFeeWei = effectiveGasPriceWei * BigInt(gasUsed > 0 ? gasUsed : 21000);
  const totalTxFeeEth = Number(totalTxFeeWei) / 1e18;
  const totalTxFeeUsd = totalTxFeeEth * ethPriceUsd;

  const valueEth = transaction ? Number(weiToEth(transaction.value, 6)) : 0;
  const valueUsd = valueEth * ethPriceUsd;

  const methodInfo = decodeMethodSignature(transaction?.input);
  const isContractDeploy = !transaction?.to || transaction.to === '0x' || transaction.to === '0x0';
  const isSuccess = receipt?.status === '0x1';
  const isFailed = receipt?.status === '0x0';

  const explorerBaseUrl = currentEndpoint.network === 'sepolia'
    ? 'https://sepolia.etherscan.io'
    : currentEndpoint.network === 'arbitrum'
    ? 'https://arbiscan.io'
    : currentEndpoint.network === 'base'
    ? 'https://basescan.org'
    : 'https://etherscan.io';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="bg-[#111827] border border-slate-700/80 rounded-xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#0d131f]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white font-mono">
                  Transaction Details
                </h3>
                {receipt && (
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase font-bold flex items-center gap-1 ${
                      isSuccess
                        ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                        : isFailed
                        ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                        : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                    }`}
                  >
                    {isSuccess ? (
                      <>
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        Success
                      </>
                    ) : isFailed ? (
                      <>
                        <XCircle className="w-3 h-3 text-rose-400" />
                        Reverted
                      </>
                    ) : (
                      'Pending'
                    )}
                  </span>
                )}
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  {getTransactionTypeLabel(transaction?.type)}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400 font-mono mt-0.5">
                <span className="truncate max-w-xs sm:max-w-md">{txHash}</span>
                <button
                  onClick={() => copyToClipboard(txHash, 'header-hash')}
                  className="text-slate-500 hover:text-white transition-colors"
                >
                  {copiedKey === 'header-hash' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={`${explorerBaseUrl}/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 border border-transparent hover:border-slate-700 transition-colors"
              title="View on Etherscan"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center px-6 border-b border-slate-800 bg-slate-900/40 text-xs font-mono">
          <button
            onClick={() => setActiveTab('details')}
            className={`py-3 px-3 border-b-2 font-medium transition-colors ${
              activeTab === 'details'
                ? 'border-emerald-400 text-emerald-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('calldata')}
            className={`py-3 px-3 border-b-2 font-medium transition-colors ${
              activeTab === 'calldata'
                ? 'border-emerald-400 text-emerald-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Input Calldata
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`py-3 px-3 border-b-2 font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === 'logs'
                ? 'border-emerald-400 text-emerald-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Event Logs</span>
            {receipt?.logs && (
              <span className="px-1.5 py-0.2 rounded bg-slate-800 text-[10px] text-slate-300">
                {receipt.logs.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('raw')}
            className={`py-3 px-3 border-b-2 font-medium transition-colors ${
              activeTab === 'raw'
                ? 'border-emerald-400 text-emerald-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Raw JSON-RPC
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {isLoading && (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-slate-400 font-mono">
                Querying node for transaction receipt & state roots...
              </p>
            </div>
          )}

          {error && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300">
              {error}
            </div>
          )}

          {!isLoading && transaction && activeTab === 'details' && (
            <div className="space-y-5">
              {/* Key Summary Stat Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800">
                  <span className="text-[11px] text-slate-400 font-mono block uppercase">Value Transferred</span>
                  <div className="text-sm font-bold text-white font-mono mt-1">
                    {valueEth} ETH
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">
                    ≈ ${valueUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800">
                  <span className="text-[11px] text-slate-400 font-mono block uppercase">Transaction Fee</span>
                  <div className="text-sm font-bold text-emerald-400 font-mono mt-1">
                    {totalTxFeeEth.toFixed(6)} ETH
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">
                    ≈ ${totalTxFeeUsd.toFixed(2)} USD
                  </span>
                </div>

                <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800">
                  <span className="text-[11px] text-slate-400 font-mono block uppercase">Gas Price</span>
                  <div className="text-sm font-bold text-cyan-400 font-mono mt-1">
                    {effectiveGasPriceGwei.toFixed(2)} Gwei
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">
                    Effective Base + Tip
                  </span>
                </div>

                <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800">
                  <span className="text-[11px] text-slate-400 font-mono block uppercase">Gas Used / Limit</span>
                  <div className="text-sm font-bold text-white font-mono mt-1">
                    {gasUsed > 0 ? gasUsed.toLocaleString() : gasLimit.toLocaleString()}
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {gasPercent !== null ? `${gasPercent}% of limit` : 'Estimated'}
                  </span>
                </div>
              </div>

              {/* Transaction Key Attributes Table */}
              <div className="bg-slate-950/60 rounded-xl border border-slate-800 divide-y divide-slate-800/80 font-mono text-xs">
                {/* Method / Action */}
                <div className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-slate-400">Action / Method:</span>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/30 text-blue-300 font-semibold">
                      {methodInfo.name}
                    </span>
                    <span className="text-slate-500 text-[11px]">{methodInfo.description}</span>
                  </div>
                </div>

                {/* Block Number */}
                <div className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-slate-400">Block Height:</span>
                  {blockNumber ? (
                    <button
                      onClick={() => onSelectBlock && onSelectBlock(blockNumber)}
                      className="text-emerald-400 hover:text-emerald-300 font-semibold underline flex items-center gap-1.5"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      #{blockNumber.toLocaleString()}
                    </button>
                  ) : (
                    <span className="text-amber-400">Pending</span>
                  )}
                </div>

                {/* From Address */}
                <div className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-slate-400">From (Sender):</span>
                  <div className="flex items-center gap-2">
                    <span className="text-white select-all">{transaction.from}</span>
                    <button
                      onClick={() => copyToClipboard(transaction.from, 'from-addr')}
                      className="text-slate-500 hover:text-white"
                    >
                      {copiedKey === 'from-addr' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* To Address */}
                <div className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-slate-400">
                    {isContractDeploy ? 'Contract Deployed:' : 'To (Interacted With):'}
                  </span>
                  <div className="flex items-center gap-2">
                    {transaction.to ? (
                      <>
                        <span className="text-white select-all">{transaction.to}</span>
                        <button
                          onClick={() => copyToClipboard(transaction.to!, 'to-addr')}
                          className="text-slate-500 hover:text-white"
                        >
                          {copiedKey === 'to-addr' ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-semibold border border-purple-500/30">
                        {receipt?.contractAddress ? receipt.contractAddress : 'Contract Creation'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Nonce & Index */}
                <div className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-slate-400">Nonce & Index:</span>
                  <div className="text-slate-300">
                    Nonce: <span className="text-white font-semibold">{hexToNumber(transaction.nonce)}</span> · Index: <span className="text-white font-semibold">{transaction.transactionIndex ? hexToNumber(transaction.transactionIndex) : 0}</span>
                  </div>
                </div>

                {/* EIP-1559 Fee breakdown if present */}
                {(transaction.maxFeePerGas || transaction.maxPriorityFeePerGas) && (
                  <div className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-slate-400">EIP-1559 Tip Cap:</span>
                    <div className="text-slate-300">
                      Max Fee: <span className="text-white font-semibold">{transaction.maxFeePerGas ? (Number(BigInt(transaction.maxFeePerGas)) / 1e9).toFixed(2) : '—'} Gwei</span> · Max Priority Tip: <span className="text-cyan-400 font-semibold">{transaction.maxPriorityFeePerGas ? (Number(BigInt(transaction.maxPriorityFeePerGas)) / 1e9).toFixed(2) : '—'} Gwei</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Calldata Tab */}
          {activeTab === 'calldata' && transaction && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-white">Input Data (Calldata)</h4>
                  <p className="text-xs text-slate-400">
                    Payload sent with transaction to execute smart contract operations.
                  </p>
                </div>
                <button
                  onClick={() => copyToClipboard(transaction.input, 'calldata-copy')}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-300 flex items-center gap-1.5 transition-colors"
                >
                  {copiedKey === 'calldata-copy' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Calldata</span>
                    </>
                  )}
                </button>
              </div>

              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 break-all max-h-64 overflow-y-auto leading-relaxed select-all">
                {transaction.input || '0x'}
              </div>

              <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800 text-xs space-y-1">
                <div className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <FileCode className="w-4 h-4 text-emerald-400" />
                  Calldata Decoder
                </div>
                <div className="text-slate-400 font-mono">
                  Method Selector:{' '}
                  <span className="text-emerald-400 font-bold">
                    {transaction.input && transaction.input.length >= 10 ? transaction.input.slice(0, 10) : '0x (Standard Transfer)'}
                  </span>
                </div>
                <div className="text-slate-400 font-mono">
                  Resolved Signature:{' '}
                  <span className="text-white font-medium">{methodInfo.name}</span>
                </div>
              </div>
            </div>
          )}

          {/* Event Logs Tab */}
          {activeTab === 'logs' && receipt && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-white">
                    Event Logs ({receipt.logs ? receipt.logs.length : 0})
                  </h4>
                  <p className="text-xs text-slate-400">
                    EVM events emitted by smart contracts during transaction execution.
                  </p>
                </div>
              </div>

              {(!receipt.logs || receipt.logs.length === 0) ? (
                <div className="p-8 text-center bg-slate-950 rounded-xl border border-slate-800 text-slate-400 text-xs font-mono">
                  No event logs emitted for this transaction.
                </div>
              ) : (
                <div className="space-y-3">
                  {receipt.logs.map((log, index) => (
                    <div
                      key={index}
                      className="p-4 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs space-y-2"
                    >
                      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                        <span className="text-emerald-400 font-bold">Log #{index}</span>
                        <span className="text-slate-400 text-[11px]">Contract: {log.address}</span>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[11px] text-slate-500 block uppercase">Topics:</span>
                        {log.topics.map((topic, tIdx) => (
                          <div key={tIdx} className="text-slate-300 break-all text-[11px] pl-2 border-l border-slate-800">
                            [{tIdx}] {topic}
                          </div>
                        ))}
                      </div>

                      {log.data && log.data !== '0x' && (
                        <div className="pt-1">
                          <span className="text-[11px] text-slate-500 block uppercase">Data:</span>
                          <div className="text-slate-400 break-all text-[11px] pl-2 border-l border-slate-800">
                            {log.data}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Raw Tab */}
          {activeTab === 'raw' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400 font-mono">Full RPC Response Objects</span>
                <button
                  onClick={() => copyToClipboard(JSON.stringify({ transaction, receipt }, null, 2), 'raw-json')}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-300 flex items-center gap-1.5"
                >
                  {copiedKey === 'raw-json' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Copy JSON</span>
                </button>
              </div>

              <pre className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-[11px] font-mono text-emerald-400 overflow-x-auto max-h-72">
                {JSON.stringify({ transaction, receipt }, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
