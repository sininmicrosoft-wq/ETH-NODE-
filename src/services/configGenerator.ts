export interface NodeConfigOptions {
  executionClient: 'Geth' | 'Nethermind' | 'Besu' | 'Reth' | 'Erigon';
  consensusClient: 'Lighthouse' | 'Prysm' | 'Teku' | 'Lodestar' | 'Nimbus';
  network: 'mainnet' | 'sepolia' | 'holesky';
  syncMode: 'snap' | 'full' | 'archive';
  enableMevBoost: boolean;
  enableMetrics: boolean;
  customMaxPeers: number;
  dataDir: string;
}

export function generateDockerCompose(options: NodeConfigOptions): string {
  const { executionClient, consensusClient, network, syncMode, enableMevBoost, enableMetrics, customMaxPeers, dataDir } = options;

  const networkFlag = network === 'mainnet' ? '' : `--${network}`;
  const networkArg = network === 'mainnet' ? 'mainnet' : network;

  // Execution client service block
  let elService = '';
  if (executionClient === 'Geth') {
    elService = `  execution:
    image: ethereum/client-go:v1.14.8
    container_name: geth-execution
    restart: unless-stopped
    volumes:
      - ${dataDir}/execution:/root/.ethereum
      - ${dataDir}/jwt:/root/jwt:ro
    ports:
      - "8545:8545" # JSON-RPC (HTTP)
      - "8546:8546" # WebSockets
      - "30303:30303/tcp" # DevP2P TCP
      - "30303:30303/udp" # DevP2P UDP
    command:
      ${networkFlag ? `- ${networkFlag}` : ''}
      - --http
      - --http.addr=0.0.0.0
      - --http.vhosts=*
      - --http.api=eth,net,web3
      - --ws
      - --ws.addr=0.0.0.0
      - --ws.api=eth,net,web3
      - --authrpc.addr=0.0.0.0
      - --authrpc.port=8551
      - --authrpc.vhosts=*
      - --authrpc.jwtsecret=/root/jwt/jwt.hex
      - --syncmode=${syncMode === 'archive' ? 'full' : 'snap'}
      - --gcmode=${syncMode === 'archive' ? 'archive' : 'full'}
      - --maxpeers=${customMaxPeers}
      ${enableMetrics ? '- --metrics\n      - --metrics.addr=0.0.0.0' : ''}`;
  } else if (executionClient === 'Nethermind') {
    elService = `  execution:
    image: nethermind/nethermind:1.28.0
    container_name: nethermind-execution
    restart: unless-stopped
    volumes:
      - ${dataDir}/execution:/nethermind/data
      - ${dataDir}/jwt:/nethermind/jwt:ro
    ports:
      - "8545:8545"
      - "8546:8546"
      - "30303:30303/tcp"
      - "30303:30303/udp"
    command:
      - --config=${networkArg}
      - --datadir=/nethermind/data
      - --JsonRpc.Enabled=true
      - --JsonRpc.Host=0.0.0.0
      - --JsonRpc.Port=8545
      - --JsonRpc.JwtSecretFile=/nethermind/jwt/jwt.hex
      - --JsonRpc.EngineHost=0.0.0.0
      - --JsonRpc.EnginePort=8551
      - --Network.MaxActivePeers=${customMaxPeers}
      ${syncMode === 'archive' ? '- --Pruning.Mode=None' : '- --Pruning.Mode=Full'}`;
  } else if (executionClient === 'Reth') {
    elService = `  execution:
    image: ghcr.io/paradigmxyz/reth:v1.0.0
    container_name: reth-execution
    restart: unless-stopped
    volumes:
      - ${dataDir}/execution:/root/.local/share/reth
      - ${dataDir}/jwt:/root/jwt:ro
    ports:
      - "8545:8545"
      - "30303:30303/tcp"
      - "30303:30303/udp"
    command:
      - node
      - --chain=${networkArg}
      - --http
      - --http.addr=0.0.0.0
      - --http.api=eth,net,web3
      - --authrpc.addr=0.0.0.0
      - --authrpc.port=8551
      - --authrpc.jwtsecret=/root/jwt/jwt.hex
      - --metrics=0.0.0.0:9001`;
  } else if (executionClient === 'Besu') {
    elService = `  execution:
    image: hyperledger/besu:24.7.1
    container_name: besu-execution
    restart: unless-stopped
    volumes:
      - ${dataDir}/execution:/var/lib/besu/data
      - ${dataDir}/jwt:/var/lib/besu/jwt:ro
    ports:
      - "8545:8545"
      - "30303:30303/tcp"
      - "30303:30303/udp"
    command:
      - --network=${networkArg}
      - --data-path=/var/lib/besu/data
      - --data-storage-format=BONSAI
      - --rpc-http-enabled=true
      - --rpc-http-host=0.0.0.0
      - --rpc-http-port=8545
      - --rpc-http-api=ETH,NET,WEB3
      - --engine-rpc-enabled=true
      - --engine-jwt-secret=/var/lib/besu/jwt/jwt.hex
      - --engine-host=0.0.0.0
      - --engine-port=8551`;
  } else {
    // Erigon
    elService = `  execution:
    image: thorax/erigon:v2.60.0
    container_name: erigon-execution
    restart: unless-stopped
    volumes:
      - ${dataDir}/execution:/home/erigon/.local/share/erigon
      - ${dataDir}/jwt:/home/erigon/jwt:ro
    ports:
      - "8545:8545"
      - "30303:30303/tcp"
      - "30303:30303/udp"
    command:
      - --chain=${networkArg}
      - --datadir=/home/erigon/.local/share/erigon
      - --http
      - --http.addr=0.0.0.0
      - --http.api=eth,net,web3,erigon
      - --authrpc.addr=0.0.0.0
      - --authrpc.port=8551
      - --authrpc.jwtsecret=/home/erigon/jwt/jwt.hex`;
  }

  // Consensus client service block
  let clService = '';
  if (consensusClient === 'Lighthouse') {
    clService = `  consensus:
    image: sigp/lighthouse:v5.2.0
    container_name: lighthouse-consensus
    restart: unless-stopped
    volumes:
      - ${dataDir}/consensus:/root/.lighthouse
      - ${dataDir}/jwt:/root/jwt:ro
    ports:
      - "5052:5052" # Beacon Node HTTP API
      - "9000:9000/tcp" # Discovery / P2P
      - "9000:9000/udp"
    command:
      - lighthouse
      - bn
      - --network=${networkArg}
      - --execution-endpoint=http://execution:8551
      - --execution-jwt=/root/jwt/jwt.hex
      - --http
      - --http-address=0.0.0.0
      - --http-port=5052
      - --checkpoint-sync-url=https://beaconstate.info
      ${enableMevBoost ? '- --builder=http://mev-boost:18550' : ''}`;
  } else if (consensusClient === 'Prysm') {
    clService = `  consensus:
    image: gcr.io/prysmaticlabs/prysm/beacon-chain:v5.0.3
    container_name: prysm-consensus
    restart: unless-stopped
    volumes:
      - ${dataDir}/consensus:/data
      - ${dataDir}/jwt:/jwt:ro
    ports:
      - "3500:3500" # HTTP API
      - "12000:12000/udp" # P2P UDP
      - "13000:13000/tcp" # P2P TCP
    command:
      - --${networkArg}
      - --datadir=/data
      - --execution-endpoint=http://execution:8551
      - --jwt-secret=/jwt/jwt.hex
      - --rpc-host=0.0.0.0
      - --grpc-gateway-host=0.0.0.0
      - --checkpoint-sync-url=https://beaconstate.info
      - --genesis-beacon-api-url=https://beaconstate.info
      ${enableMevBoost ? '- --http-mev-relay=http://mev-boost:18550' : ''}`;
  } else if (consensusClient === 'Teku') {
    clService = `  consensus:
    image: consensys/teku:24.7.0
    container_name: teku-consensus
    restart: unless-stopped
    volumes:
      - ${dataDir}/consensus:/var/lib/teku
      - ${dataDir}/jwt:/jwt:ro
    ports:
      - "5051:5051"
      - "9000:9000/tcp"
      - "9000:9000/udp"
    command:
      - --network=${networkArg}
      - --data-path=/var/lib/teku
      - --ee-endpoint=http://execution:8551
      - --ee-jwt-secret-file=/jwt/jwt.hex
      - --rest-api-enabled=true
      - --rest-api-interface=0.0.0.0
      - --rest-api-port=5051
      - --initial-state=https://beaconstate.info`;
  } else if (consensusClient === 'Lodestar') {
    clService = `  consensus:
    image: chainsafe/lodestar:v1.20.0
    container_name: lodestar-consensus
    restart: unless-stopped
    volumes:
      - ${dataDir}/consensus:/data
      - ${dataDir}/jwt:/jwt:ro
    ports:
      - "9596:9596"
      - "9000:9000/tcp"
      - "9000:9000/udp"
    command:
      - beacon
      - --network=${networkArg}
      - --dataDir=/data
      - --execution.urls=http://execution:8551
      - --jwt-secret=/jwt/jwt.hex
      - --rest=true
      - --rest.address=0.0.0.0
      - --rest.port=9596
      - --checkpointSyncUrl=https://beaconstate.info`;
  } else {
    // Nimbus
    clService = `  consensus:
    image: statusim/nimbus-eth2:multiarch-v24.7.0
    container_name: nimbus-consensus
    restart: unless-stopped
    volumes:
      - ${dataDir}/consensus:/home/user/nimbus-eth2/build/data
      - ${dataDir}/jwt:/jwt:ro
    ports:
      - "5052:5052"
      - "9000:9000/tcp"
      - "9000:9000/udp"
    command:
      - --network=${networkArg}
      - --data-dir=/home/user/nimbus-eth2/build/data
      - --web3-url=http://execution:8551
      - --jwt-secret=/jwt/jwt.hex
      - --rest
      - --rest-address=0.0.0.0
      - --rest-port=5052`;
  }

  const mevBoostService = enableMevBoost
    ? `  mev-boost:
    image: flashbots/mev-boost:v1.7.0
    container_name: mev-boost
    restart: unless-stopped
    command:
      - -${networkArg}
      - -relay-check
      - -relays=https://0xac6e77e45e9fa3b49fc006d089d31b8047d28f4c02f0641f8d2a6e07dbd1940b34cc519e8dd3a00e4999cf0125f977c8@rsync-builder.xyz,https://0xa1559ace749664bedb37e28f84541071322ecde7362282773941498b88f810fe6177901b011f5442732049f5b39921c4@builder-relay.flashbots.net
    ports:
      - "18550:18550"\n`
    : '';

  return `version: '3.8'

services:
${elService}

${clService}
${mevBoostService}`;
}

export function generateSystemdUnit(clientName: string, type: 'execution' | 'consensus', network: string): string {
  if (type === 'execution') {
    return `[Unit]
Description=Ethereum Execution Client (${clientName})
After=network.target
Wants=network.target

[Service]
User=ethereum
Group=ethereum
Type=simple
Restart=always
RestartSec=5
ExecStart=/usr/local/bin/${clientName.toLowerCase()} \\
  ${network !== 'mainnet' ? `--${network} \\\n  ` : ''}--http \\
  --http.addr 127.0.0.1 \\
  --http.port 8545 \\
  --authrpc.addr 127.0.0.1 \\
  --authrpc.port 8551 \\
  --authrpc.jwtsecret /var/lib/ethereum/jwt/jwt.hex \\
  --datadir /var/lib/ethereum/execution

[Install]
WantedBy=multi-user.target`;
  } else {
    return `[Unit]
Description=Ethereum Consensus Beacon Node (${clientName})
After=network.target execution.service
Wants=network.target

[Service]
User=ethereum
Group=ethereum
Type=simple
Restart=always
RestartSec=5
ExecStart=/usr/local/bin/${clientName.toLowerCase()} bn \\
  --network ${network} \\
  --execution-endpoint http://127.0.0.1:8551 \\
  --execution-jwt /var/lib/ethereum/jwt/jwt.hex \\
  --checkpoint-sync-url https://beaconstate.info \\
  --datadir /var/lib/ethereum/consensus

[Install]
WantedBy=multi-user.target`;
  }
}

export function generateSetupScript(options: NodeConfigOptions): string {
  const { dataDir } = options;
  return `#!/usr/bin/env bash
set -euo pipefail

echo "==> Setting up Ethereum Full Node Directory Structure..."
mkdir -p ${dataDir}/execution ${dataDir}/consensus ${dataDir}/jwt

# Generate secure random 32-byte hexadecimal JWT secret for Engine API
if [ ! -f "${dataDir}/jwt/jwt.hex" ]; then
  echo "==> Generating 32-byte JWT Engine API secret..."
  openssl rand -hex 32 | tr -d "\\n" > ${dataDir}/jwt/jwt.hex
  chmod 600 ${dataDir}/jwt/jwt.hex
  echo "==> JWT secret generated at ${dataDir}/jwt/jwt.hex"
else
  echo "==> Existing JWT secret detected at ${dataDir}/jwt/jwt.hex"
fi

echo "==> Setting up UFW firewall rules for P2P discovery..."
# DevP2P execution port
sudo ufw allow 30303/tcp comment "Ethereum Execution P2P"
sudo ufw allow 30303/udp comment "Ethereum Execution P2P"

# Consensus beacon port
sudo ufw allow 9000/tcp comment "Ethereum Consensus P2P"
sudo ufw allow 9000/udp comment "Ethereum Consensus P2P"

# KEEP 8545 & 8551 LOCAL-ONLY (Do NOT open to public Internet!)
echo "==> Security: JSON-RPC (8545) and Engine API (8551) are kept bound to localhost."

echo "==> Starting node containers with Docker Compose..."
docker compose up -d

echo "==> Ethereum Node launched! Inspect logs with:"
echo "    docker compose logs -f"
`;
}

export function estimateHardwareSpecs(client: string, syncMode: 'snap' | 'full' | 'archive') {
  if (syncMode === 'archive') {
    return {
      cpu: '8+ Cores (AMD Ryzen 9 / Intel i9 / Apple M-series)',
      ram: '64 GB DDR4/DDR5 RAM',
      storage: '4 TB+ High-IOPS NVMe SSD (Samsung 990 Pro or Enterprise U.2)',
      bandwidth: '100+ Mbps Unmetered (1.5 TB/month download, 2 TB upload)',
      approxDiskSize: '3,200 GB (Growing ~30 GB/month)',
      syncTimeEstimate: '3 - 7 days (depending on IOPS)',
    };
  }

  // Snap / Pruned
  return {
    cpu: '4 - 8 Cores (AMD Ryzen 5 / Intel i5 / Modern Quad-Core)',
    ram: '32 GB RAM (16 GB minimum with Reth/Besu)',
    storage: '2 TB High-IOPS NVMe SSD (>5000 MB/s read/write, high sustained random IOPS)',
    bandwidth: '50+ Mbps Unmetered (~1.2 TB/month)',
    approxDiskSize: '1,100 GB (Execution ~900GB + Consensus ~200GB)',
    syncTimeEstimate: 'Checkpoint sync: 5 mins for CL, ~6 - 12 hours for EL snap sync',
  };
}
