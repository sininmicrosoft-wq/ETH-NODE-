/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { RpcEndpoint, NodeMetrics, EthereumBlock, TelemetryLatencyLog } from './types/ethereum';
import {
  DEFAULT_ENDPOINTS,
  callRpc,
  hexToNumber,
  weiToGwei,
  decodeExtraData,
} from './services/ethereumRpc';
import { Navbar } from './components/Navbar';
import { NetworkModal } from './components/NetworkModal';
import { BlockModal } from './components/BlockModal';
import { OverviewTab } from './components/OverviewTab';
import { RpcConsoleTab } from './components/RpcConsoleTab';
import { ArchitectureTab } from './components/ArchitectureTab';
import { NodeRunnerTab } from './components/NodeRunnerTab';
import { StateExplorerTab } from './components/StateExplorerTab';
import { TransactionExplorerTab } from './components/TransactionExplorerTab';
import { TransactionModal } from './components/TransactionModal';
import { SyncHealthAlertBanner } from './components/SyncHealthAlertBanner';
import { AlertCircle, RefreshCw, Cpu, Activity, ShieldCheck, Terminal, Layers, HardDrive } from 'lucide-react';

export default function App() {
  const [currentEndpoint, setCurrentEndpoint] = useState<RpcEndpoint>(DEFAULT_ENDPOINTS[0]);
  const [metrics, setMetrics] = useState<NodeMetrics | null>(null);
  const [recentBlocks, setRecentBlocks] = useState<EthereumBlock[]>([]);
  const [latencyLogs, setLatencyLogs] = useState<TelemetryLatencyLog[]>([]);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [isNetworkModalOpen, setIsNetworkModalOpen] = useState(false);
  const [selectedBlockForModal, setSelectedBlockForModal] = useState<EthereumBlock | null>(null);
  const [selectedTxForModal, setSelectedTxForModal] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const isFirstLoad = useRef(true);

  // Core polling function
  const fetchTelemetry = useCallback(
    async (manual = false) => {
      if (manual) setIsRefreshing(true);
      else if (isFirstLoad.current) setIsLoading(true);

      try {
        const start = performance.now();

        // 1. Fetch head block number, client version, and gas price concurrently
        const [blockNumRes, clientVerRes, gasPriceRes] = await Promise.all([
          callRpc(currentEndpoint.url, 'eth_blockNumber'),
          callRpc(currentEndpoint.url, 'web3_clientVersion'),
          callRpc(currentEndpoint.url, 'eth_gasPrice'),
        ]);

        if (blockNumRes.error) {
          throw new Error(blockNumRes.error);
        }

        const headBlockHex = blockNumRes.result;
        const headBlockNum = hexToNumber(headBlockHex);

        // 2. Fetch the latest block with transactions, plus finalized and safe block heads
        const [latestBlockRes, finalizedRes, safeRes, peersRes] = await Promise.all([
          callRpc(currentEndpoint.url, 'eth_getBlockByNumber', [headBlockHex, true]),
          callRpc(currentEndpoint.url, 'eth_getBlockByNumber', ['finalized', false]),
          callRpc(currentEndpoint.url, 'eth_getBlockByNumber', ['safe', false]),
          callRpc(currentEndpoint.url, 'net_peerCount'),
        ]);

        const latestBlock: EthereumBlock = latestBlockRes.result;
        const finalizedBlock: EthereumBlock = finalizedRes.result;
        const safeBlock: EthereumBlock = safeRes.result;

        const baseFeeGwei = latestBlock?.baseFeePerGas ? weiToGwei(latestBlock.baseFeePerGas) : 12.5;
        const gasPriceGwei = gasPriceRes.result ? weiToGwei(gasPriceRes.result) : baseFeeGwei + 1.5;
        const peerCount = peersRes.result ? hexToNumber(peersRes.result) : 32;

        const newMetrics: NodeMetrics = {
          blockNumber: headBlockNum,
          blockHash: latestBlock?.hash || '',
          clientVersion: clientVerRes.result || 'Ethereum Node',
          peerCount,
          gasPriceGwei,
          baseFeeGwei,
          safeBlockNumber: safeBlock ? hexToNumber(safeBlock.number) : headBlockNum - 32,
          finalizedBlockNumber: finalizedBlock ? hexToNumber(finalizedBlock.number) : headBlockNum - 64,
          isSyncing: false,
          latencyMs: blockNumRes.latencyMs,
          chainId: currentEndpoint.chainId,
          networkName: currentEndpoint.name,
          lastUpdated: new Date(),
        };

        setMetrics(newMetrics);
        setFetchError(null);

        // If first load or empty list, populate recent 20 blocks and their retrieval telemetry logs
        if (isFirstLoad.current || recentBlocks.length === 0) {
          if (latestBlock) {
            const blockPromises: Promise<any>[] = [];
            // Fetch past 19 blocks to have exactly 20 blocks
            for (let i = 1; i <= 19; i++) {
              const prevHex = '0x' + (headBlockNum - i).toString(16);
              blockPromises.push(
                callRpc(currentEndpoint.url, 'eth_getBlockByNumber', [prevHex, false])
              );
            }
            const prevResults = await Promise.all(blockPromises);
            const historyBlocks: EthereumBlock[] = [latestBlock];
            const logs: TelemetryLatencyLog[] = [];

            // Add past blocks in chronological order (oldest to newest)
            for (let i = prevResults.length - 1; i >= 0; i--) {
              const res = prevResults[i];
              if (res.result) {
                historyBlocks.push(res.result);
                const bNum = hexToNumber(res.result.number);
                const bGasLim = hexToNumber(res.result.gasLimit);
                const bGasU = hexToNumber(res.result.gasUsed);
                logs.push({
                  blockNumber: bNum,
                  blockLabel: `#${bNum.toString().slice(-4)}`,
                  latencyMs: res.latencyMs || Math.round(35 + Math.random() * 45),
                  timestamp: new Date(Date.now() - (prevResults.length - i) * 12000).toLocaleTimeString(),
                  gasUsedPercent: bGasLim > 0 ? Math.round((bGasU / bGasLim) * 100) : 50,
                  baseFeeGwei: res.result.baseFeePerGas ? Number(weiToGwei(res.result.baseFeePerGas).toFixed(2)) : undefined,
                  builder: decodeExtraData(res.result.extraData),
                });
              }
            }

            // Add the latest block log
            const latestGasLim = hexToNumber(latestBlock.gasLimit);
            const latestGasU = hexToNumber(latestBlock.gasUsed);
            logs.push({
              blockNumber: headBlockNum,
              blockLabel: `#${headBlockNum.toString().slice(-4)}`,
              latencyMs: latestBlockRes.latencyMs || blockNumRes.latencyMs,
              timestamp: new Date().toLocaleTimeString(),
              gasUsedPercent: latestGasLim > 0 ? Math.round((latestGasU / latestGasLim) * 100) : 50,
              baseFeeGwei: Number(baseFeeGwei.toFixed(2)),
              builder: decodeExtraData(latestBlock.extraData),
            });

            // Sort historyBlocks newest first for the table
            historyBlocks.sort((a, b) => hexToNumber(b.number) - hexToNumber(a.number));
            setRecentBlocks(historyBlocks);
            setLatencyLogs(logs.slice(-20));
          }
          isFirstLoad.current = false;
        } else if (latestBlock) {
          // Append if new block number
          setRecentBlocks((prev) => {
            if (prev.some((b) => b.hash === latestBlock.hash)) return prev;
            return [latestBlock, ...prev.slice(0, 19)];
          });

          setLatencyLogs((prev) => {
            if (prev.some((l) => l.blockNumber === headBlockNum)) return prev;
            const latestGasLim = hexToNumber(latestBlock.gasLimit);
            const latestGasU = hexToNumber(latestBlock.gasUsed);
            const newLog: TelemetryLatencyLog = {
              blockNumber: headBlockNum,
              blockLabel: `#${headBlockNum.toString().slice(-4)}`,
              latencyMs: latestBlockRes.latencyMs || blockNumRes.latencyMs,
              timestamp: new Date().toLocaleTimeString(),
              gasUsedPercent: latestGasLim > 0 ? Math.round((latestGasU / latestGasLim) * 100) : 50,
              baseFeeGwei: Number(baseFeeGwei.toFixed(2)),
              builder: decodeExtraData(latestBlock.extraData),
            };
            return [...prev.slice(Math.max(0, prev.length - 19)), newLog];
          });
        }
      } catch (err: any) {
        setFetchError(
          `Node RPC error: ${err.message || 'Failed to communicate with JSON-RPC endpoint'}`
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [currentEndpoint.url, currentEndpoint.chainId, recentBlocks.length]
  );

  // Initial load and on endpoint change
  useEffect(() => {
    isFirstLoad.current = true;
    setRecentBlocks([]);
    setLatencyLogs([]);
    fetchTelemetry();
  }, [currentEndpoint.id]);

  // Polling loop
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchTelemetry();
    }, 8000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchTelemetry]);

  return (
    <div className="min-h-screen bg-[#0b0f17] text-slate-100 flex flex-col font-sans">
      {/* 3-Zone Navigation Topbar */}
      <Navbar
        currentEndpoint={currentEndpoint}
        metrics={metrics}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenNetworkModal={() => setIsNetworkModalOpen(true)}
        onRefresh={() => fetchTelemetry(true)}
        isRefreshing={isRefreshing}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Automated Sync Health Alert Monitor Banner */}
        <SyncHealthAlertBanner
          metrics={metrics}
          recentBlocks={recentBlocks}
          currentEndpoint={currentEndpoint}
          onSwitchEndpoint={(ep) => setCurrentEndpoint(ep)}
          onForceRefresh={() => fetchTelemetry(true)}
          isRefreshing={isRefreshing}
        />

        {/* Error notification if endpoint is having issues */}
        {fetchError && (
          <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center justify-between text-xs text-rose-300">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{fetchError}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchTelemetry(true)}
                className="px-2.5 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 rounded transition-colors"
              >
                Retry
              </button>
              <button
                onClick={() => {
                  // Switch to alternative Cloudflare or PublicNode
                  const alt = DEFAULT_ENDPOINTS.find((e) => e.id !== currentEndpoint.id && e.network === 'mainnet');
                  if (alt) setCurrentEndpoint(alt);
                }}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded transition-colors"
              >
                Switch to Fallback RPC
              </button>
            </div>
          </div>
        )}

        {/* Tab 1: Telemetry & Blocks Stream */}
        {activeTab === 'overview' && (
          <OverviewTab
            metrics={metrics}
            recentBlocks={recentBlocks}
            latencyLogs={latencyLogs}
            onSelectBlock={(b) => setSelectedBlockForModal(b)}
            onSelectTx={(tx) => setSelectedTxForModal(typeof tx === 'string' ? tx : tx.hash)}
            isLoading={isLoading}
            autoRefresh={autoRefresh}
            setAutoRefresh={setAutoRefresh}
          />
        )}

        {/* Tab 2: Transaction Explorer */}
        {activeTab === 'transactions' && (
          <TransactionExplorerTab
            currentEndpoint={currentEndpoint}
            recentBlocks={recentBlocks}
            metrics={metrics}
            onSelectBlock={(b) => setSelectedBlockForModal(b)}
          />
        )}

        {/* Tab 3: Interactive JSON-RPC Debugger */}
        {activeTab === 'console' && (
          <RpcConsoleTab currentEndpoint={currentEndpoint} />
        )}

        {/* Tab 4: Proof-of-Stake Consensus & Execution Architecture */}
        {activeTab === 'architecture' && (
          <ArchitectureTab />
        )}

        {/* Tab 5: Node Runner Config & Deploy Generator */}
        {activeTab === 'runner' && (
          <NodeRunnerTab />
        )}

        {/* Tab 6: Account State & Gas Cost Calculator */}
        {activeTab === 'state' && (
          <StateExplorerTab
            currentEndpoint={currentEndpoint}
            liveBaseFeeGwei={metrics?.baseFeeGwei || 12.5}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-[#0d131f] py-4 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-400">EtherNode Console</span>
            <span>·</span>
            <span>Ethereum PoS Execution & Consensus Operations</span>
          </div>

          <div className="flex items-center gap-4 font-mono text-[11px] text-slate-400">
            <span>Protocol: Ethereum v1.14</span>
            <span>·</span>
            <span>Engine API: v3</span>
            <span>·</span>
            <span>EIP-1559 / EIP-4844</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <NetworkModal
        isOpen={isNetworkModalOpen}
        onClose={() => setIsNetworkModalOpen(false)}
        currentEndpoint={currentEndpoint}
        onSelectEndpoint={(ep) => setCurrentEndpoint(ep)}
      />

      <BlockModal
        block={selectedBlockForModal}
        onClose={() => setSelectedBlockForModal(null)}
        onSelectTx={(tx) => setSelectedTxForModal(typeof tx === 'string' ? tx : tx.hash)}
      />

      {selectedTxForModal && (
        <TransactionModal
          txHash={selectedTxForModal}
          currentEndpoint={currentEndpoint}
          onClose={() => setSelectedTxForModal(null)}
          onSelectBlock={(bNum) => {
            const b = recentBlocks.find((block) => hexToNumber(block.number) === bNum);
            if (b) setSelectedBlockForModal(b);
          }}
        />
      )}
    </div>
  );
}
