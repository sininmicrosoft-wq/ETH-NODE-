import { EthereumBlock, NodeMetrics, RpcEndpoint } from '../types/ethereum';

export const DEFAULT_ENDPOINTS: RpcEndpoint[] = [
  {
    id: 'eth-mainnet-llama',
    name: 'Ethereum Mainnet (LlamaRPC)',
    network: 'mainnet',
    url: 'https://eth.llamarpc.com',
    chainId: 1,
  },
  {
    id: 'eth-mainnet-cloudflare',
    name: 'Ethereum Mainnet (Cloudflare)',
    network: 'mainnet',
    url: 'https://cloudflare-eth.com',
    chainId: 1,
  },
  {
    id: 'eth-mainnet-publicnode',
    name: 'Ethereum Mainnet (PublicNode)',
    network: 'mainnet',
    url: 'https://ethereum-rpc.publicnode.com',
    chainId: 1,
  },
  {
    id: 'eth-sepolia',
    name: 'Ethereum Sepolia Testnet',
    network: 'sepolia',
    url: 'https://rpc.sepolia.org',
    chainId: 11155111,
  },
  {
    id: 'eth-holesky',
    name: 'Ethereum Holesky Testnet',
    network: 'holesky',
    url: 'https://ethereum-holesky-rpc.publicnode.com',
    chainId: 17000,
  },
  {
    id: 'arbitrum-one',
    name: 'Arbitrum One L2',
    network: 'arbitrum',
    url: 'https://arb1.arbitrum.io/rpc',
    chainId: 42161,
  },
  {
    id: 'base-mainnet',
    name: 'Base L2',
    network: 'base',
    url: 'https://mainnet.base.org',
    chainId: 8453,
  },
  {
    id: 'local-node',
    name: 'Local Node (Geth / Reth / Anvil)',
    network: 'local',
    url: 'http://127.0.0.1:8545',
    chainId: 1,
  },
];

let rpcRequestId = 1;

export async function callRpc(
  rpcUrl: string,
  method: string,
  params: any[] = []
): Promise<{ result: any; latencyMs: number; error?: string }> {
  const start = performance.now();
  const id = rpcRequestId++;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id,
        method,
        params,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const latencyMs = Math.round(performance.now() - start);

    if (!response.ok) {
      return {
        result: null,
        latencyMs,
        error: `HTTP error ${response.status}: ${response.statusText}`,
      };
    }

    const data = await response.json();
    if (data.error) {
      return {
        result: null,
        latencyMs,
        error: data.error.message || JSON.stringify(data.error),
      };
    }

    return {
      result: data.result,
      latencyMs,
    };
  } catch (err: any) {
    const latencyMs = Math.round(performance.now() - start);
    return {
      result: null,
      latencyMs,
      error: err.name === 'AbortError' ? 'RPC Request Timeout (10s)' : err.message || 'Network error',
    };
  }
}

export function hexToNumber(hexStr?: string | null): number {
  if (!hexStr || hexStr === '0x') return 0;
  try {
    return Number(BigInt(hexStr));
  } catch {
    return 0;
  }
}

export function hexToBigInt(hexStr?: string | null): bigint {
  if (!hexStr || hexStr === '0x') return 0n;
  try {
    return BigInt(hexStr);
  } catch {
    return 0n;
  }
}

export function weiToGwei(weiHexOrStr?: string | null): number {
  if (!weiHexOrStr) return 0;
  try {
    const wei = typeof weiHexOrStr === 'string' && weiHexOrStr.startsWith('0x')
      ? BigInt(weiHexOrStr)
      : BigInt(weiHexOrStr);
    return Number(wei) / 1e9;
  } catch {
    return 0;
  }
}

export function weiToEth(weiHexOrStr?: string | null, decimals = 4): string {
  if (!weiHexOrStr) return '0.0000';
  try {
    const wei = typeof weiHexOrStr === 'string' && weiHexOrStr.startsWith('0x')
      ? BigInt(weiHexOrStr)
      : BigInt(weiHexOrStr);
    const eth = Number(wei) / 1e18;
    return eth.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  } catch {
    return '0.0000';
  }
}

export function formatAddress(addr?: string | null): string {
  if (!addr) return '';
  if (addr.length < 10) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function decodeExtraData(hexStr?: string | null): string {
  if (!hexStr || hexStr === '0x') return 'N/A';
  try {
    const hex = hexStr.startsWith('0x') ? hexStr.slice(2) : hexStr;
    let str = '';
    for (let i = 0; i < hex.length; i += 2) {
      const code = parseInt(hex.substring(i, i + 2), 16);
      if (code >= 32 && code <= 126) {
        str += String.fromCharCode(code);
      }
    }
    return str.trim() || 'Bytes';
  } catch {
    return 'Bytes';
  }
}

export function timeAgo(timestampSec: number): string {
  const diffSec = Math.max(0, Math.floor(Date.now() / 1000 - timestampSec));
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  return `${diffHours}h ago`;
}
