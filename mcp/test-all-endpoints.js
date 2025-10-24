import { JsonRpcClient } from "accumulate.js/lib/api_v3";

async function testEndpoint(name, url) {
  console.log(`\nTesting ${name}: ${url}`);

  const api = new JsonRpcClient(`${url}/v3`);

  try {
    const status = await api.networkStatus();
    const partitions = status.network?.partitions || [];
    console.log(`  ✓ Connected - ${partitions.length} partitions found`);
    partitions.forEach(p => {
      console.log(`    - ${p.id} (type: ${p.type})`);
    });
    return true;
  } catch (error) {
    console.log(`  ✗ Failed: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log("Testing Mainnet endpoints:");
  await testEndpoint("Mainnet Primary", "https://mainnet.accumulatenetwork.io");
  await testEndpoint("Mainnet Alternate", "https://api-gateway.accumulate.defidevs.io");

  console.log("\n" + "=".repeat(60));
  console.log("Testing Kermit endpoints:");
  await testEndpoint("Kermit Primary", "https://kermit.accumulatenetwork.io");
  await testEndpoint("Kermit Alternate", "https://testnet.accumulatenetwork.io");

  console.log("\n" + "=".repeat(60));
  console.log("Testing Fozzie endpoints:");
  await testEndpoint("Fozzie", "https://fozzie.accumulatenetwork.io");
}

main().catch(console.error);
