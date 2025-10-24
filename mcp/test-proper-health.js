import { URL as AccumulateURL } from "accumulate.js";
import { JsonRpcClient } from "accumulate.js/lib/api_v3";
import { PartitionType } from "accumulate.js/lib/core";
import https from "https";
import http from "http";
import { URL } from "url";

const OK_THRESHOLD = 10;
const DN = AccumulateURL.parse("dn.acme");

async function checkCORS(apiUrl) {
  return new Promise((resolve) => {
    const url = new URL(apiUrl);
    const client = url.protocol === 'https:' ? https : http;

    // Test with actual POST request (not OPTIONS) since that's what browsers use
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
      const corsHeaders = [];
      for (let i = 0; i < rawHeaders.length; i += 2) {
        if (rawHeaders[i].toLowerCase() === 'access-control-allow-origin') {
          corsHeaders.push(rawHeaders[i + 1]);
        }
      }

      console.log(`  CORS check for ${apiUrl}:`);
      console.log(`    Access-Control-Allow-Origin: ${corsHeader}`);
      if (corsHeaders.length > 1) {
        console.log(`    ⚠️  Raw duplicate headers detected: ${corsHeaders.join(', ')}`);
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

async function checkNetworkHealth(api, apiUrl) {
  try {
    // First check CORS
    console.log("\nChecking CORS headers...");
    const corsResult = await checkCORS(apiUrl);
    if (!corsResult.ok) {
      return {
        healthy: false,
        details: `CORS configuration error: ${corsResult.message}`
      };
    }
    console.log(`  ✓ ${corsResult.message}`);

    const { network } = await api.networkStatus({});
    const partitions = network?.partitions || [];

    console.log(`Found ${partitions.length} partitions:`);
    partitions.forEach(p => {
      console.log(`  - ${p.id} (type: ${p.type}, isDirectory: ${p.type === PartitionType.Directory})`);
    });

    if (partitions.length === 0) {
      return { healthy: false, details: "No partitions found" };
    }

    // Query ledgers for each partition
    const get = async (p, path, typeName) => {
      const u = p.type === PartitionType.Directory
        ? DN
        : AccumulateURL.parse(`bvn-${p.id}.acme`);

      console.log(`  Querying ${u.toString()}/${path}...`);

      const r = await api.query(u.join(path));

      // Check freshness
      const ageSeconds = (Date.now() - (r.lastBlockTime?.getTime() || 0)) / 1000;
      if (ageSeconds > 60) {
        throw new Error(`Response is too old: ${Math.round(ageSeconds)}s`);
      }

      console.log(`    ✓ Got ${typeName}, age: ${Math.round(ageSeconds)}s`);

      return { url: u, part: p, ledger: r.account };
    };

    console.log("\nQuerying ledgers...");
    const [anchors, synth] = await Promise.all([
      Promise.all(partitions.map(x => get(x, "anchors", "AnchorLedger"))),
      Promise.all(partitions.map(x => get(x, "synthetic", "SyntheticLedger")))
    ]);

    console.log("\nChecking anchor synchronization...");
    const anchorsHealthy = checkAnchors(anchors);
    if (!anchorsHealthy.ok) {
      return { healthy: false, details: anchorsHealthy.message };
    }
    console.log("  ✓ " + anchorsHealthy.message);

    console.log("\nChecking synthetic synchronization...");
    const synthHealthy = checkSynthetic(synth);
    if (!synthHealthy.ok) {
      return { healthy: false, details: synthHealthy.message };
    }
    console.log("  ✓ " + synthHealthy.message);

    return {
      healthy: true,
      details: "All partitions are synchronized and healthy",
      partitions: anchors.map(a => ({
        id: a.part.id,
        type: a.part.type,
        lastBlock: a.ledger.minorBlockSequenceNumber
      }))
    };
  } catch (error) {
    return {
      healthy: false,
      details: `Health check failed: ${error.message}`
    };
  }
}

function checkAnchors(ledgers) {
  for (const a of ledgers) {
    for (const b of ledgers) {
      if (
        a.part.type !== PartitionType.Directory &&
        b.part.type !== PartitionType.Directory
      ) {
        continue;
      }

      const ba = b.ledger.sequence?.find(x => x.url.equals(a.url));

      if (!ba) {
        console.log(`  ! No anchor entry for ${a.url.toString()} in ${b.url.toString()}`);
        continue;
      }

      const lag = a.ledger.minorBlockSequenceNumber - ba.delivered;

      if (lag > OK_THRESHOLD) {
        return {
          ok: false,
          message: `Anchor lag: ${a.url.toString()} is ${lag} blocks ahead of ${b.url.toString()}`
        };
      }
    }
  }
  return { ok: true, message: "Anchors synchronized" };
}

function checkSynthetic(ledgers) {
  for (const a of ledgers) {
    for (const b of ledgers) {
      const ab = a.ledger.sequence?.find(x => x.url.equals(b.url));
      const ba = b.ledger.sequence?.find(x => x.url.equals(a.url));

      if (!ab && !ba) continue;

      if (!ab || !ba) {
        return {
          ok: false,
          message: `Synthetic asymmetry: ${a.url.toString()} <-> ${b.url.toString()}`
        };
      }

      const lag = ab.produced - ba.delivered;

      if (lag > OK_THRESHOLD) {
        return {
          ok: false,
          message: `Synthetic lag: ${lag} messages from ${a.url.toString()} to ${b.url.toString()}`
        };
      }
    }
  }
  return { ok: true, message: "Synthetic messages synchronized" };
}

async function testNetwork(name, url) {
  console.log("\n" + "=".repeat(60));
  console.log(`Testing ${name}: ${url}`);
  console.log("=".repeat(60));

  const api = new JsonRpcClient(`${url}/v3`);
  const result = await checkNetworkHealth(api, `${url}/v3`);

  console.log(`\n${result.healthy ? "🟢 LIVE" : "🔴 UNHEALTHY"}`);
  console.log(`Details: ${result.details}`);

  if (result.partitions) {
    console.log("\nPartitions:");
    result.partitions.forEach(p => {
      console.log(`  - ${p.id} (${p.type}) - Block ${p.lastBlock}`);
    });
  }
}

async function main() {
  await testNetwork("Mainnet", "https://mainnet.accumulatenetwork.io");
  await testNetwork("Kermit", "https://kermit.accumulatenetwork.io");
}

main().catch(console.error);
