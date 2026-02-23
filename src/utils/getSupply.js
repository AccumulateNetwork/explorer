import { message } from 'antd';
import axios from 'axios';

export default async function getSupply(network, setSupply, setAPR) {
  setSupply(null);
  if (!network.metrics) return;

  try {
    const response = await axios.get(network.metrics + '/supply');
    if (response?.data) {
      setSupply(response.data);
    } else {
      throw new Error('Can not get ACME supply metrics');
    }
    const unissued =
      (Number(response.data.max) - Number(response.data.total)) / 10 ** 8;
    const rewards = ((unissued * 0.16) / 365) * 7;
    const rate = rewards / (response.data.staked / 10 ** 8);
    const apr = (1 + rate) ** 52 - 1;
    setAPR?.(apr);
  } catch (error) {
    // Silently fail - supply metrics are non-critical
    // If metrics API is down, just don't show supply data
    console.warn('Failed to fetch supply metrics:', error.message);
    setSupply(null);
  }
}
