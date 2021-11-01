import axios from 'axios';

class RPC {
  constructor(opts) {
    this._opts = { ...opts };
    this.currId = 1;
    axios.defaults.baseURL = process.env.REACT_APP_API_PATH;
    axios.defaults.headers.post['Content-Type'] = 'application/json';
  }
  
  request = (method, params = null) => {
    const result = axios.post('', {
      jsonrpc: '2.0',
      id: ++this.currId,
      method,
      params: typeof params === 'string' ? [params] : params
    }).then(({ data: {result} }) => result);
    return result;
  }

}

export default new RPC();