import { message } from 'antd';
import axios from 'axios';

export default async function getSupply(network, setSupply, setAPR) {
  setSupply(null);
  if (!network.api || network.api.length === 0) return;

  try {
    // Query acc://ACME directly from Accumulate network
    const response = await axios.post(network.api[0] + '/v3', {
      jsonrpc: '2.0',
      id: 0,
      method: 'query',
      params: {
        scope: 'acc://ACME',
        query: {},
      },
    });

    if (response?.data?.error) {
      throw new Error(response.data.error.message);
    }

    const account = response.data?.result?.account;
    if (!account) {
      throw new Error('Invalid response from Accumulate API');
    }

    // Parse supply data from token issuer
    const issued = BigInt(account.issued);
    const supplyLimit = BigInt(account.supplyLimit);

    // Estimate staked at ~20% of issued (TODO: query actual staking contracts)
    const staked = issued / 5n;
    const circulating = issued - staked;

    const supplyData = {
      max: supplyLimit.toString(),
      total: issued.toString(),
      circulating: circulating.toString(),
      staked: staked.toString(),
    };

    setSupply(supplyData);

    // Calculate APR
    const unissued = (Number(supplyLimit - issued)) / 10 ** 8;
    const rewards = ((unissued * 0.16) / 365) * 7;
    const rate = rewards / (Number(staked) / 10 ** 8);
    const apr = (1 + rate) ** 52 - 1;
    setAPR?.(apr);
  } catch (error) {
    // Silently fail - supply metrics are non-critical
    // If API query fails, just don't show supply data
    console.warn('Failed to fetch supply metrics:', error.message);
    setSupply(null);
  }
}
