#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { spawn, ChildProcess } from "child_process";
import { JsonRpcClient } from "accumulate.js/lib/api_v3";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";
import os from "os";
import https from "https";
import http from "http";
import { URL } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Explorer server state
let explorerProcess: ChildProcess | null = null;
let currentNetwork = "http://127.0.0.1:16591"; // Default to local devnet

// Devnet state
let devnetProcess: ChildProcess | null = null;
let devnetWorkDir: string | null = null;

// Network configurations
const NETWORKS = {
  "local-devnet": "http://127.0.0.1:16591",
  "mainnet": "https://mainnet.accumulatenetwork.io",
  "kermit": "https://kermit.accumulatenetwork.io",
  "fozzie": "https://fozzie.accumulatenetwork.io",
};

// Create API client
function getApiClient(): JsonRpcClient {
  return new JsonRpcClient(`${currentNetwork}/v3`);
}

// Generate devnet network configuration
function generateDevnetConfig(bvnCount: number = 1, validatorsPerBvn: number = 1): string {
  const config = {
    network: "DevNet",
    partitions: [
      {
        id: "Directory",
        type: "directory",
        nodes: Array.from({ length: validatorsPerBvn }, (_, i) => ({
          address: `127.0.${i + 1}.1`,
          type: "validator"
        }))
      }
    ]
  };

  // Add BVN partitions
  for (let i = 0; i < bvnCount; i++) {
    config.partitions.push({
      id: `BVN${i}`,
      type: "block-validator",
      nodes: Array.from({ length: validatorsPerBvn }, (_, j) => ({
        address: `127.${i + 1}.${j + 1}.1`,
        type: "validator"
      }))
    });
  }

  return JSON.stringify(config, null, 2);
}

// Check CORS headers via POST request (what browsers actually use)
async function checkCORS(apiUrl: string): Promise<{ ok: boolean; message: string }> {
  return new Promise((resolve) => {
    const url = new URL(apiUrl);
    const client = url.protocol === 'https:' ? https : http;

    const postData = JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "network-status",
      params: {}
    });

    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Origin': 'https://explorer.accumulatenetwork.io',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = client.request(options, (res) => {
      const corsHeader = res.headers['access-control-allow-origin'];

      // Check raw headers for duplicates
      const rawHeaders = res.rawHeaders;
      const corsHeaders: string[] = [];
      for (let i = 0; i < rawHeaders.length; i += 2) {
        if (rawHeaders[i].toLowerCase() === 'access-control-allow-origin') {
          corsHeaders.push(rawHeaders[i + 1]);
        }
      }

      if (!corsHeader) {
        resolve({
          ok: false,
          message: "Missing Access-Control-Allow-Origin header"
        });
        return;
      }

      // Check for duplicate values (e.g., "*, *")
      if (typeof corsHeader === 'string' && corsHeader.includes(',')) {
        const values = corsHeader.split(',').map(v => v.trim());
        if (values.length > 1) {
          resolve({
            ok: false,
            message: `Duplicate CORS header values: '${corsHeader}' (browsers only accept one value)`
          });
          return;
        }
      }

      // Check if it's an array (Node.js represents duplicate headers as array)
      if (Array.isArray(corsHeader)) {
        resolve({
          ok: false,
          message: `Duplicate CORS headers detected: ${corsHeader.join(', ')} (browsers only accept one value)`
        });
        return;
      }

      // Check rawHeaders for duplicates (Node.js might combine them in res.headers)
      if (corsHeaders.length > 1) {
        resolve({
          ok: false,
          message: `Duplicate CORS headers detected: ${corsHeaders.join(', ')} (browsers only accept one value)`
        });
        return;
      }

      resolve({
        ok: true,
        message: `CORS configured correctly: ${corsHeader}`
      });
    });

    req.on('error', (err) => {
      resolve({
        ok: false,
        message: `CORS check failed: ${err.message}`
      });
    });

    req.write(postData);
    req.end();
  });
}

// Network health check - replicates explorer's green dot logic
const OK_THRESHOLD = 10; // Number of blocks a partition can lag

interface LedgerInfo {
  url: string;
  partId: string;
  partType: string;
  ledger: any;
  lastBlockTime?: Date;
}

async function checkNetworkHealth(api: JsonRpcClient, apiUrl: string): Promise<{
  healthy: boolean;
  details: string;
  partitions: any[];
}> {
  try {
    // First check CORS (browsers will fail if this is misconfigured)
    const corsResult = await checkCORS(apiUrl);
    if (!corsResult.ok) {
      return {
        healthy: false,
        details: `CORS configuration error: ${corsResult.message}`,
        partitions: []
      };
    }

    // Get network status
    const status = await api.networkStatus();
    const partitions = status.network?.partitions || [];

    if (partitions.length === 0) {
      return {
        healthy: false,
        details: "No partitions found in network",
        partitions: []
      };
    }

    // Query anchor and synthetic ledgers for each partition
    const ledgerPromises = partitions.map(async (p: any) => {
      const partUrl = p.type === "directory"
        ? "dn.acme"
        : `bvn-${p.id}.acme`;

      try {
        const [anchors, synthetic] = await Promise.all([
          api.query(`${partUrl}/anchors`),
          api.query(`${partUrl}/synthetic`)
        ]);

        return {
          partition: p,
          anchors,
          synthetic,
          partUrl
        };
      } catch (error: any) {
        return {
          partition: p,
          error: error.message,
          partUrl
        };
      }
    });

    const results = await Promise.all(ledgerPromises);

    // Check for errors
    const errors = results.filter(r => r.error);
    if (errors.length > 0) {
      return {
        healthy: false,
        details: `Failed to query ${errors.length} partition(s): ${errors.map(e => e.partUrl).join(", ")}`,
        partitions: results.map(r => ({
          id: r.partition.id,
          type: r.partition.type,
          error: r.error
        }))
      };
    }

    // Check freshness (data should be < 60 seconds old)
    for (const r of results) {
      const lastBlockTime = r.anchors?.lastBlockTime || r.synthetic?.lastBlockTime;
      if (lastBlockTime) {
        const ageSeconds = (Date.now() - new Date(lastBlockTime).getTime()) / 1000;
        if (ageSeconds > 60) {
          return {
            healthy: false,
            details: `Partition ${r.partUrl} data is stale (${Math.round(ageSeconds)}s old)`,
            partitions: results.map(r => ({
              id: r.partition.id,
              type: r.partition.type
            }))
          };
        }
      }
    }

    // Check anchor synchronization
    const anchorsHealthy = checkAnchorSync(results);
    if (!anchorsHealthy.ok) {
      return {
        healthy: false,
        details: anchorsHealthy.message,
        partitions: results.map(r => ({
          id: r.partition.id,
          type: r.partition.type
        }))
      };
    }

    // Check synthetic synchronization
    const synthHealthy = checkSyntheticSync(results);
    if (!synthHealthy.ok) {
      return {
        healthy: false,
        details: synthHealthy.message,
        partitions: results.map(r => ({
          id: r.partition.id,
          type: r.partition.type
        }))
      };
    }

    return {
      healthy: true,
      details: "All partitions are synchronized and healthy",
      partitions: results.map(r => ({
        id: r.partition.id,
        type: r.partition.type,
        lastBlock: (r.anchors as any)?.account?.minorBlockSequenceNumber || 0
      }))
    };
  } catch (error: any) {
    return {
      healthy: false,
      details: `Health check failed: ${error.message}`,
      partitions: []
    };
  }
}

function checkAnchorSync(results: any[]): { ok: boolean; message: string } {
  for (const a of results) {
    for (const b of results) {
      // Check if directory partitions have received anchors from BVNs
      if (a.partition.type !== "directory" && b.partition.type !== "directory") {
        continue;
      }

      const bSequence = (b.anchors as any)?.account?.sequence;
      if (!bSequence || !Array.isArray(bSequence)) continue;

      const aMinorBlock = (a.anchors as any)?.account?.minorBlockSequenceNumber || 0;

      // Find the sequence entry for partition a in partition b's ledger
      const baEntry = bSequence.find((x: any) =>
        x.url?.toLowerCase().includes(a.partUrl?.toLowerCase())
      );

      if (baEntry) {
        const delivered = baEntry.delivered || 0;
        const lag = aMinorBlock - delivered;

        if (lag > OK_THRESHOLD) {
          return {
            ok: false,
            message: `Anchor lag detected: ${a.partUrl} is ${lag} blocks ahead of ${b.partUrl}`
          };
        }
      }
    }
  }
  return { ok: true, message: "Anchors synchronized" };
}

function checkSyntheticSync(results: any[]): { ok: boolean; message: string } {
  for (const a of results) {
    for (const b of results) {
      const aSequence = (a.synthetic as any)?.account?.sequence;
      const bSequence = (b.synthetic as any)?.account?.sequence;

      if (!aSequence || !bSequence) continue;
      if (!Array.isArray(aSequence) || !Array.isArray(bSequence)) continue;

      // Find entries between a and b
      const abEntry = aSequence.find((x: any) =>
        x.url?.toLowerCase().includes(b.partUrl?.toLowerCase())
      );
      const baEntry = bSequence.find((x: any) =>
        x.url?.toLowerCase().includes(a.partUrl?.toLowerCase())
      );

      if (!abEntry && !baEntry) continue;
      if (!abEntry || !baEntry) {
        return {
          ok: false,
          message: `Synthetic message asymmetry between ${a.partUrl} and ${b.partUrl}`
        };
      }

      const produced = abEntry.produced || 0;
      const delivered = baEntry.delivered || 0;
      const lag = produced - delivered;

      if (lag > OK_THRESHOLD) {
        return {
          ok: false,
          message: `Synthetic lag detected: ${lag} messages from ${a.partUrl} to ${b.partUrl}`
        };
      }
    }
  }
  return { ok: true, message: "Synthetic messages synchronized" };
}

// Tool schemas
const StartExplorerSchema = z.object({
  network: z.enum(["local-devnet", "mainnet", "kermit", "fozzie"]).optional(),
  port: z.number().optional(),
});

const StopExplorerSchema = z.object({});

const SetNetworkSchema = z.object({
  network: z.string().describe("Network API URL (e.g., http://127.0.0.1:16591) or preset name (local-devnet, mainnet, kermit, fozzie)"),
});

const QueryAccountSchema = z.object({
  url: z.string().describe("Account URL (e.g., acc://example.acme or acc://example.acme/tokens)"),
});

const QueryTransactionSchema = z.object({
  txid: z.string().describe("Transaction ID (hash)"),
});

const QueryBlockSchema = z.object({
  blockIndex: z.number().describe("Block index to query"),
  minor: z.boolean().optional().describe("Whether to query minor block (default: false for major block)"),
});

const QueryChainSchema = z.object({
  url: z.string().describe("Account URL"),
  chainName: z.string().optional().describe("Chain name (e.g., 'main', 'scratch')"),
  start: z.number().optional().describe("Starting entry index"),
  count: z.number().optional().describe("Number of entries to retrieve"),
});

const NetworkStatusSchema = z.object({});

const SearchSchema = z.object({
  query: z.string().describe("Search query (public key hash, key hash, anchor hash, etc.)"),
  type: z.enum(["publicKey", "publicKeyHash", "delegate", "anchor"]).optional(),
});

const StartDevnetSchema = z.object({
  bvnCount: z.number().optional().describe("Number of BVN partitions (default: 1)"),
  validatorsPerBvn: z.number().optional().describe("Number of validators per partition (default: 1)"),
  faucetSeed: z.string().optional().describe("Seed for faucet account (optional)"),
});

const StopDevnetSchema = z.object({});

const StartExplorerWithDevnetSchema = z.object({
  port: z.number().optional().describe("Port to run explorer on (default: 3000)"),
  bvnCount: z.number().optional().describe("Number of BVN partitions (default: 1)"),
  validatorsPerBvn: z.number().optional().describe("Number of validators per partition (default: 1)"),
  faucetSeed: z.string().optional().describe("Seed for faucet account (optional)"),
});

const CheckNetworkHealthSchema = z.object({});

// MCP Server
const server = new Server(
  {
    name: "accumulate-explorer",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "start_explorer",
        description: "Start the Accumulate Explorer web server. This launches a local development server on port 3000 (or custom port) to browse the Accumulate blockchain.",
        inputSchema: {
          type: "object",
          properties: {
            network: {
              type: "string",
              enum: ["local-devnet", "mainnet", "kermit", "fozzie"],
              description: "Network to connect to (default: local-devnet)",
            },
            port: {
              type: "number",
              description: "Port to run the explorer on (default: 3000)",
            },
          },
        },
      },
      {
        name: "stop_explorer",
        description: "Stop the running Accumulate Explorer web server",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "set_network",
        description: "Set the Accumulate network to query. Use preset names (local-devnet, mainnet, kermit, fozzie) or provide a custom API URL.",
        inputSchema: {
          type: "object",
          properties: {
            network: {
              type: "string",
              description: "Network API URL or preset name",
            },
          },
          required: ["network"],
        },
      },
      {
        name: "query_account",
        description: "Query an Accumulate account by URL. Returns account details, balances, and metadata.",
        inputSchema: {
          type: "object",
          properties: {
            url: {
              type: "string",
              description: "Account URL (e.g., acc://example.acme or acc://example.acme/tokens)",
            },
          },
          required: ["url"],
        },
      },
      {
        name: "query_transaction",
        description: "Query a transaction by its ID/hash. Returns transaction details, status, and result.",
        inputSchema: {
          type: "object",
          properties: {
            txid: {
              type: "string",
              description: "Transaction ID (hash)",
            },
          },
          required: ["txid"],
        },
      },
      {
        name: "query_block",
        description: "Query a block by its index. Can query both major and minor blocks.",
        inputSchema: {
          type: "object",
          properties: {
            blockIndex: {
              type: "number",
              description: "Block index to query",
            },
            minor: {
              type: "boolean",
              description: "Whether to query minor block (default: false for major block)",
            },
          },
          required: ["blockIndex"],
        },
      },
      {
        name: "query_chain",
        description: "Query an account's chain entries. Useful for viewing transaction history or data entries.",
        inputSchema: {
          type: "object",
          properties: {
            url: {
              type: "string",
              description: "Account URL",
            },
            chainName: {
              type: "string",
              description: "Chain name (e.g., 'main', 'scratch')",
            },
            start: {
              type: "number",
              description: "Starting entry index",
            },
            count: {
              type: "number",
              description: "Number of entries to retrieve",
            },
          },
          required: ["url"],
        },
      },
      {
        name: "network_status",
        description: "Get the current network status including partition information and health",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "search",
        description: "Search the network by public key, key hash, delegate, or anchor",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Search query (public key hash, key hash, anchor hash, etc.)",
            },
            type: {
              type: "string",
              enum: ["publicKey", "publicKeyHash", "delegate", "anchor"],
              description: "Type of search to perform",
            },
          },
          required: ["query"],
        },
      },
      {
        name: "start_devnet",
        description: "Initialize and start a local Accumulate devnet. This creates a full local blockchain network with configurable partitions and validators.",
        inputSchema: {
          type: "object",
          properties: {
            bvnCount: {
              type: "number",
              description: "Number of BVN (Block Validator Network) partitions (default: 1)",
            },
            validatorsPerBvn: {
              type: "number",
              description: "Number of validators per partition (default: 1)",
            },
            faucetSeed: {
              type: "string",
              description: "Seed for faucet account to generate test tokens (optional)",
            },
          },
        },
      },
      {
        name: "stop_devnet",
        description: "Stop the running local devnet and clean up resources",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "start_explorer_with_devnet",
        description: "One-command deployment: start a local devnet and explorer together. This is the easiest way to get a complete local development environment.",
        inputSchema: {
          type: "object",
          properties: {
            port: {
              type: "number",
              description: "Port to run the explorer on (default: 3000)",
            },
            bvnCount: {
              type: "number",
              description: "Number of BVN partitions (default: 1)",
            },
            validatorsPerBvn: {
              type: "number",
              description: "Number of validators per partition (default: 1)",
            },
            faucetSeed: {
              type: "string",
              description: "Seed for faucet account (optional)",
            },
          },
        },
      },
      {
        name: "check_network_health",
        description: "Check if the current network is live and healthy. Returns the same health status that the explorer displays as a green dot indicator. Validates partition synchronization and recent activity.",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;

    switch (name) {
      case "start_explorer": {
        const parsed = StartExplorerSchema.parse(args);

        if (explorerProcess) {
          return {
            content: [
              {
                type: "text",
                text: "Explorer is already running. Stop it first with stop_explorer.",
              },
            ],
          };
        }

        const network = parsed.network || "local-devnet";
        const port = parsed.port || 3000;

        // Set the network
        currentNetwork = NETWORKS[network] || NETWORKS["local-devnet"];

        // Get the explorer root directory (2 levels up from dist/index.js)
        const explorerRoot = path.resolve(__dirname, "../..");

        // Start the explorer dev server
        explorerProcess = spawn("npm", ["run", "start"], {
          cwd: explorerRoot,
          env: {
            ...process.env,
            VITE_NETWORK: network,
            PORT: port.toString(),
          },
          stdio: "pipe",
        });

        let output = "";

        explorerProcess.stdout?.on("data", (data) => {
          output += data.toString();
        });

        explorerProcess.stderr?.on("data", (data) => {
          output += data.toString();
        });

        explorerProcess.on("close", (code) => {
          explorerProcess = null;
        });

        // Wait a bit for the server to start
        await new Promise((resolve) => setTimeout(resolve, 3000));

        return {
          content: [
            {
              type: "text",
              text: `Explorer started successfully!\n\nNetwork: ${network} (${currentNetwork})\nPort: ${port}\nURL: http://localhost:${port}\n\nThe explorer web interface is now accessible in your browser.`,
            },
          ],
        };
      }

      case "stop_explorer": {
        if (!explorerProcess) {
          return {
            content: [
              {
                type: "text",
                text: "No explorer process is currently running.",
              },
            ],
          };
        }

        explorerProcess.kill();
        explorerProcess = null;

        return {
          content: [
            {
              type: "text",
              text: "Explorer stopped successfully.",
            },
          ],
        };
      }

      case "set_network": {
        const parsed = SetNetworkSchema.parse(args);
        const network = parsed.network;

        // Check if it's a preset or custom URL
        if (network in NETWORKS) {
          currentNetwork = NETWORKS[network as keyof typeof NETWORKS];
        } else {
          currentNetwork = network;
        }

        return {
          content: [
            {
              type: "text",
              text: `Network set to: ${currentNetwork}`,
            },
          ],
        };
      }

      case "query_account": {
        const parsed = QueryAccountSchema.parse(args);
        const api = getApiClient();

        try {
          const result = await api.query(parsed.url);
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        } catch (error: any) {
          return {
            content: [
              {
                type: "text",
                text: `Error querying account: ${error.message}`,
              },
            ],
            isError: true,
          };
        }
      }

      case "query_transaction": {
        const parsed = QueryTransactionSchema.parse(args);
        const api = getApiClient();

        try {
          const result = await api.query(parsed.txid);
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        } catch (error: any) {
          return {
            content: [
              {
                type: "text",
                text: `Error querying transaction: ${error.message}`,
              },
            ],
            isError: true,
          };
        }
      }

      case "query_block": {
        const parsed = QueryBlockSchema.parse(args);
        const api = getApiClient();

        try {
          const blockType = parsed.minor ? "minor" : "major";
          const result = await api.query(`${blockType}-block/${parsed.blockIndex}`);
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        } catch (error: any) {
          return {
            content: [
              {
                type: "text",
                text: `Error querying block: ${error.message}`,
              },
            ],
            isError: true,
          };
        }
      }

      case "query_chain": {
        const parsed = QueryChainSchema.parse(args);
        const api = getApiClient();

        try {
          const chainUrl = parsed.chainName
            ? `${parsed.url}#chain/${parsed.chainName}`
            : `${parsed.url}#chain/main`;

          const queryParams: any = {};
          if (parsed.start !== undefined) queryParams.start = parsed.start;
          if (parsed.count !== undefined) queryParams.count = parsed.count;

          const result = await api.query(chainUrl, queryParams);
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        } catch (error: any) {
          return {
            content: [
              {
                type: "text",
                text: `Error querying chain: ${error.message}`,
              },
            ],
            isError: true,
          };
        }
      }

      case "network_status": {
        const api = getApiClient();

        try {
          const result = await api.networkStatus();
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        } catch (error: any) {
          return {
            content: [
              {
                type: "text",
                text: `Error getting network status: ${error.message}`,
              },
            ],
            isError: true,
          };
        }
      }

      case "search": {
        const parsed = SearchSchema.parse(args);
        const api = getApiClient();

        try {
          const searchType = parsed.type || "publicKeyHash";
          const result = await api.query(`search/${searchType}/${parsed.query}`);
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        } catch (error: any) {
          return {
            content: [
              {
                type: "text",
                text: `Error searching: ${error.message}`,
              },
            ],
            isError: true,
          };
        }
      }

      case "start_devnet": {
        const parsed = StartDevnetSchema.parse(args);

        if (devnetProcess) {
          return {
            content: [
              {
                type: "text",
                text: "Devnet is already running. Stop it first with stop_devnet.",
              },
            ],
          };
        }

        try {
          const bvnCount = parsed.bvnCount || 1;
          const validatorsPerBvn = parsed.validatorsPerBvn || 1;

          // Create temporary directory for devnet
          devnetWorkDir = await fs.mkdtemp(path.join(os.tmpdir(), "accumulate-devnet-"));

          // Generate network configuration
          const configContent = generateDevnetConfig(bvnCount, validatorsPerBvn);
          const configPath = path.join(devnetWorkDir, "network.json");
          await fs.writeFile(configPath, configContent);

          // Initialize the devnet
          const initArgs = [
            "init", "network", configPath,
            "--work-dir", devnetWorkDir,
            "--reset"
          ];

          if (parsed.faucetSeed) {
            initArgs.push("--faucet-seed", parsed.faucetSeed);
          }

          const initProcess = spawn("accumulated", initArgs, {
            stdio: "pipe",
          });

          let initOutput = "";

          initProcess.stdout?.on("data", (data) => {
            initOutput += data.toString();
          });

          initProcess.stderr?.on("data", (data) => {
            initOutput += data.toString();
          });

          // Wait for initialization to complete
          await new Promise<void>((resolve, reject) => {
            initProcess.on("close", (code) => {
              if (code === 0) {
                resolve();
              } else {
                reject(new Error(`Initialization failed with code ${code}: ${initOutput}`));
              }
            });
          });

          // Start the devnet using run-dual
          const dnnPath = path.join(devnetWorkDir, "dnn");
          const bvn0Path = path.join(devnetWorkDir, "bvn0");

          devnetProcess = spawn("accumulated", ["run-dual", dnnPath, bvn0Path], {
            stdio: "pipe",
          });

          let devnetOutput = "";

          devnetProcess.stdout?.on("data", (data) => {
            devnetOutput += data.toString();
          });

          devnetProcess.stderr?.on("data", (data) => {
            devnetOutput += data.toString();
          });

          devnetProcess.on("close", (code) => {
            devnetProcess = null;
            devnetWorkDir = null;
          });

          // Wait for devnet to start (give it time to initialize)
          await new Promise((resolve) => setTimeout(resolve, 5000));

          // Set current network to local devnet
          currentNetwork = NETWORKS["local-devnet"];

          return {
            content: [
              {
                type: "text",
                text: `Devnet started successfully!\n\nConfiguration:\n- BVN Count: ${bvnCount}\n- Validators per BVN: ${validatorsPerBvn}\n- API Endpoint: ${currentNetwork}\n- Work Directory: ${devnetWorkDir}\n\nThe devnet is now running and ready to accept transactions.`,
              },
            ],
          };
        } catch (error: any) {
          // Clean up on error
          if (devnetProcess) {
            devnetProcess.kill();
            devnetProcess = null;
          }
          if (devnetWorkDir) {
            await fs.rm(devnetWorkDir, { recursive: true, force: true });
            devnetWorkDir = null;
          }

          return {
            content: [
              {
                type: "text",
                text: `Error starting devnet: ${error.message}`,
              },
            ],
            isError: true,
          };
        }
      }

      case "stop_devnet": {
        if (!devnetProcess) {
          return {
            content: [
              {
                type: "text",
                text: "No devnet process is currently running.",
              },
            ],
          };
        }

        try {
          devnetProcess.kill();
          devnetProcess = null;

          // Clean up work directory
          if (devnetWorkDir) {
            await fs.rm(devnetWorkDir, { recursive: true, force: true });
            devnetWorkDir = null;
          }

          return {
            content: [
              {
                type: "text",
                text: "Devnet stopped successfully and resources cleaned up.",
              },
            ],
          };
        } catch (error: any) {
          return {
            content: [
              {
                type: "text",
                text: `Error stopping devnet: ${error.message}`,
              },
            ],
            isError: true,
          };
        }
      }

      case "check_network_health": {
        const api = getApiClient();

        try {
          const health = await checkNetworkHealth(api, `${currentNetwork}/v3`);

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  network: currentNetwork,
                  healthy: health.healthy,
                  status: health.healthy ? "🟢 Live" : "🔴 Unhealthy",
                  details: health.details,
                  partitions: health.partitions
                }, null, 2),
              },
            ],
          };
        } catch (error: any) {
          return {
            content: [
              {
                type: "text",
                text: `Error checking network health: ${error.message}`,
              },
            ],
            isError: true,
          };
        }
      }

      case "start_explorer_with_devnet": {
        const parsed = StartExplorerWithDevnetSchema.parse(args);

        if (devnetProcess) {
          return {
            content: [
              {
                type: "text",
                text: "Devnet is already running. Use stop_devnet first if you want to restart with different settings.",
              },
            ],
          };
        }

        if (explorerProcess) {
          return {
            content: [
              {
                type: "text",
                text: "Explorer is already running. Use stop_explorer first.",
              },
            ],
          };
        }

        try {
          const bvnCount = parsed.bvnCount || 1;
          const validatorsPerBvn = parsed.validatorsPerBvn || 1;
          const port = parsed.port || 3000;

          // Start devnet first
          devnetWorkDir = await fs.mkdtemp(path.join(os.tmpdir(), "accumulate-devnet-"));

          const configContent = generateDevnetConfig(bvnCount, validatorsPerBvn);
          const configPath = path.join(devnetWorkDir, "network.json");
          await fs.writeFile(configPath, configContent);

          const initArgs = [
            "init", "network", configPath,
            "--work-dir", devnetWorkDir,
            "--reset"
          ];

          if (parsed.faucetSeed) {
            initArgs.push("--faucet-seed", parsed.faucetSeed);
          }

          const initProcess = spawn("accumulated", initArgs, {
            stdio: "pipe",
          });

          let initOutput = "";

          initProcess.stdout?.on("data", (data) => {
            initOutput += data.toString();
          });

          initProcess.stderr?.on("data", (data) => {
            initOutput += data.toString();
          });

          await new Promise<void>((resolve, reject) => {
            initProcess.on("close", (code) => {
              if (code === 0) {
                resolve();
              } else {
                reject(new Error(`Initialization failed with code ${code}: ${initOutput}`));
              }
            });
          });

          const dnnPath = path.join(devnetWorkDir, "dnn");
          const bvn0Path = path.join(devnetWorkDir, "bvn0");

          devnetProcess = spawn("accumulated", ["run-dual", dnnPath, bvn0Path], {
            stdio: "pipe",
          });

          devnetProcess.on("close", (code) => {
            devnetProcess = null;
            devnetWorkDir = null;
          });

          // Wait for devnet to be ready
          await new Promise((resolve) => setTimeout(resolve, 5000));

          // Set network to local devnet
          currentNetwork = NETWORKS["local-devnet"];

          // Now start the explorer
          const explorerRoot = path.resolve(__dirname, "../..");

          explorerProcess = spawn("npm", ["run", "start"], {
            cwd: explorerRoot,
            env: {
              ...process.env,
              VITE_NETWORK: "local-devnet",
              PORT: port.toString(),
            },
            stdio: "pipe",
          });

          explorerProcess.on("close", (code) => {
            explorerProcess = null;
          });

          // Wait for explorer to start
          await new Promise((resolve) => setTimeout(resolve, 3000));

          return {
            content: [
              {
                type: "text",
                text: `Complete development environment started!\n\nDevnet:\n- BVN Count: ${bvnCount}\n- Validators per BVN: ${validatorsPerBvn}\n- API Endpoint: ${currentNetwork}\n- Work Directory: ${devnetWorkDir}\n\nExplorer:\n- URL: http://localhost:${port}\n- Network: local-devnet\n\nYou can now browse your local devnet using the explorer!`,
              },
            ],
          };
        } catch (error: any) {
          // Clean up on error
          if (explorerProcess) {
            explorerProcess.kill();
            explorerProcess = null;
          }
          if (devnetProcess) {
            devnetProcess.kill();
            devnetProcess = null;
          }
          if (devnetWorkDir) {
            await fs.rm(devnetWorkDir, { recursive: true, force: true });
            devnetWorkDir = null;
          }

          return {
            content: [
              {
                type: "text",
                text: `Error starting environment: ${error.message}`,
              },
            ],
            isError: true,
          };
        }
      }

      default:
        return {
          content: [
            {
              type: "text",
              text: `Unknown tool: ${name}`,
            },
          ],
          isError: true,
        };
    }
  } catch (error: any) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Accumulate Explorer MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
