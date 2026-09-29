export interface RpcEndpoint {
  id: string;
  name: string;
  network: 'mainnet' | 'sepolia' | 'holesky' | 'arbitrum' | 'base' | 'custom' | 'local';
  url: string;
  chainId: number;
  isCustom?: boolean;
}

export interface EthereumBlock {
  number: string; // hex
  hash: string;
  parentHash: string;
  nonce?: string;
  sha3Uncles?: string;
  logsBloom?: string;
  transactionsRoot?: string;
  stateRoot: string;
  receiptsRoot: string;
  miner: string; // proposer / fee recipient
  difficulty?: string;
  totalDifficulty?: string;
  extraData: string;
  size?: string;
  gasLimit: string;
  gasUsed: string;
  timestamp: string;
  transactions: string[] | EthereumTransaction[];
  baseFeePerGas?: string;
  blobGasUsed?: string;
  excessBlobGas?: string;
}

export interface EthereumTransaction {
  hash: string;
  blockHash?: string;
  blockNumber?: string;
  from: string;
  to: string | null;
  gas: string;
  gasPrice: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  input: string;
  nonce: string;
  value: string;
  transactionIndex?: string;
  type?: string;
  chainId?: string;
}

export interface EthereumTransactionReceipt {
  transactionHash: string;
  transactionIndex: string;
  blockHash: string;
  blockNumber: string;
  from: string;
  to: string | null;
  cumulativeGasUsed: string;
  gasUsed: string;
  contractAddress: string | null;
  logs: Array<{
    address: string;
    topics: string[];
    data: string;
    logIndex?: string;
  }>;
  status: string; // '0x1' success, '0x0' failure
  effectiveGasPrice?: string;
  type?: string;
}

export interface FeeHistory {
  oldestBlock: string;
  baseFeePerGas: string[];
  gasUsedRatio: number[];
  reward?: string[][];
}

export interface TelemetryLatencyLog {
  blockNumber: number;
  blockLabel: string;
  latencyMs: number;
  timestamp: string;
  baseFeeGwei?: number;
  gasUsedPercent?: number;
  builder?: string;
}

export interface NodeMetrics {
  blockNumber: number;
  blockHash: string;
  clientVersion: string;
  peerCount: number;
  gasPriceGwei: number;
  baseFeeGwei: number;
  safeBlockNumber: number;
  finalizedBlockNumber: number;
  isSyncing: boolean | { startingBlock: number; currentBlock: number; highestBlock: number };
  latencyMs: number;
  chainId: number;
  networkName: string;
  lastUpdated: Date;
}

export interface RpcRequestPreset {
  id: string;
  name: string;
  category: 'Block & Chain' | 'Account & State' | 'Transactions & Gas' | 'Node & Network';
  method: string;
  description: string;
  params: any[];
  sampleDescription?: string;
}
