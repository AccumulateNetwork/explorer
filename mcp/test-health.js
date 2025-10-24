import { JsonRpcClient } from "accumulate.js/lib/api_v3";

const OK_THRESHOLD = 10;

async function checkNetworkHealth(api) {
  try {
    const status = await api.networkStatus();
    const partitions = status.network?.partitions || [];

    if (partitions.length === 0) {
      return {
        healthy: false,
        details: "No partitions found in network",
        partitions: []
      };
    }

    const ledgerPromises = partitions.map(async (p) => {
      // Check partition type - it might be a number (1 = directory, 2 = block-validator)
      const isDirectory = p.type === "directory" || p.type === 1 || p.id === "Directory";
      const partUrl = isDirectory ? "dn.acme" : `bvn-${p.id}.acme`;

      console.log(`  Querying partition ${p.id} (type: ${p.type}) at ${partUrl}`);

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
      } catch (error) {
        return {
          partition: p,
          error: error.message,
          partUrl
        };
      }
    });

    const results = await Promise.all(ledgerPromises);

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
        lastBlock: r.anchors?.account?.minorBlockSequenceNumber || 0
      }))
    };
  } catch (error) {
    return {
      healthy: false,
      details: `Health check failed: ${error.message}`,
      partitions: []
    };
  }
}

function checkAnchorSync(results) {
  for (const a of results) {
    for (const b of results) {
      if (a.partition.type !== "directory" && b.partition.type !== "directory") {
        continue;
      }

      const bSequence = b.anchors?.account?.sequence;
      if (!bSequence || !Array.isArray(bSequence)) continue;

      const aMinorBlock = a.anchors?.account?.minorBlockSequenceNumber || 0;

      const baEntry = bSequence.find((x) =>
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

function checkSyntheticSync(results) {
  for (const a of results) {
    for (const b of results) {
      const aSequence = a.synthetic?.account?.sequence;
      const bSequence = b.synthetic?.account?.sequence;

      if (!aSequence || !bSequence) continue;
      if (!Array.isArray(aSequence) || !Array.isArray(bSequence)) continue;

      const abEntry = aSequence.find((x) => {
        const urlStr = x.url?.toString?.() || String(x.url || "");
        return urlStr.toLowerCase().includes(b.partUrl?.toLowerCase());
      });
      const baEntry = bSequence.find((x) => {
        const urlStr = x.url?.toString?.() || String(x.url || "");
        return urlStr.toLowerCase().includes(a.partUrl?.toLowerCase());
      });

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

async function testNetwork(name, url) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Testing ${name}: ${url}`);
  console.log("=".repeat(60));

  const api = new JsonRpcClient(`${url}/v3`);
  const result = await checkNetworkHealth(api);

  console.log(`\nStatus: ${result.healthy ? "🟢 Live" : "🔴 Unhealthy"}`);
  console.log(`Details: ${result.details}`);
  console.log(`Partitions: ${result.partitions.length}`);

  if (result.partitions.length > 0) {
    console.log("\nPartition Details:");
    result.partitions.forEach(p => {
      console.log(`  - ${p.id} (${p.type})${p.lastBlock ? ` - Block: ${p.lastBlock}` : ""}${p.error ? ` - Error: ${p.error}` : ""}`);
    });
  }
}

async function main() {
  try {
    await testNetwork("Mainnet", "https://mainnet.accumulatenetwork.io");
    await testNetwork("Kermit", "https://kermit.accumulatenetwork.io");
  } catch (error) {
    console.error("Test failed:", error);
    process.exit(1);
  }
}

main();
