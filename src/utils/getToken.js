import RPC from './RPC';

export default async function getToken(url, setToken, setError) {
  setToken(null);
  setError(null);
  try {
    const response = await RPC.request('query', { scope: url }, 'v3');
    if (response) {
      if (!response?.account?.precision) response.account.precision = 0;
      setToken(response.account);
    } else {
      throw new Error('Token ' + url + ' not found');
    }
  } catch (error) {
    setToken(null);
    setError(error.message);
  }
}
