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

export function decodeMethodSignature(input?: string | null): { name: string; isContract: boolean; description?: string } {
  if (!input || input === '0x' || input === '0x00') {
    return { name: 'Transfer', isContract: false, description: 'Native ETH EOA-to-EOA Transfer' };
  }
  const selector = input.slice(0, 10).toLowerCase();
  switch (selector) {
    case '0xa9059cbb':
      return { name: 'transfer(address,uint256)', isContract: true, description: 'ERC-20 Token Transfer' };
    case '0x095ea7b3':
      return { name: 'approve(address,uint256)', isContract: true, description: 'Token Spending Approval' };
    case '0x23b872dd':
      return { name: 'transferFrom(address,address,uint256)', isContract: true, description: 'ERC-20 Delegated Transfer' };
    case '0x38ed1739':
      return { name: 'swapExactTokensForTokens(...)', isContract: true, description: 'Uniswap / DEX Multi-Hop Swap' };
    case '0x18cbafe5':
      return { name: 'swapExactETHForTokens(...)', isContract: true, description: 'Uniswap / DEX ETH-to-Token Swap' };
    case '0x7ff36ab5':
      return { name: 'swapExactTokensForETH(...)', isContract: true, description: 'Uniswap / DEX Token-to-ETH Swap' };
    case '0x40c10f19':
      return { name: 'mint(address,uint256)', isContract: true, description: 'ERC-20 / NFT Mint' };
    case '0xa22cb465':
      return { name: 'setApprovalForAll(address,bool)', isContract: true, description: 'ERC-721 / ERC-1155 Operator Approval' };
    case '0x2e1a7d4d':
      return { name: 'withdraw(uint256)', isContract: true, description: 'WETH / DeFi Vault Withdrawal' };
    case '0xd0e30db0':
      return { name: 'deposit()', isContract: true, description: 'WETH / DeFi Vault Wrap Deposit' };
    case '0xf340fa01':
      return { name: 'deposit(address,uint256)', isContract: true, description: 'Lending Pool Deposit' };
    case '0x42842e0e':
      return { name: 'safeTransferFrom(address,address,uint256)', isContract: true, description: 'ERC-721 Safe NFT Transfer' };
    case '0xb6b55f25':
      return { name: 'depositETH(...)', isContract: true, description: 'L2 Rollup Bridge Deposit' };
    default:
      return { name: `Call (${selector})`, isContract: true, description: 'Smart Contract Method Call' };
  }
}

export function getTransactionTypeLabel(typeHex?: string | null): string {
  if (!typeHex) return 'Legacy (Type 0)';
  const t = hexToNumber(typeHex);
  switch (t) {
    case 0:
      return 'Legacy (Type 0)';
    case 1:
      return 'EIP-2930 Access List (Type 1)';
    case 2:
      return 'EIP-1559 Dynamic Fee (Type 2)';
    case 3:
      return 'EIP-4844 Blob (Type 3)';
    default:
      return `Type ${t}`;
  }
}
