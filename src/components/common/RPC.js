import axios from 'axios';
import { message } from 'antd';

const showMessage = 0
const onError = (error) => {
  if (error.data && error.code) {
    // exception for nothing was found error
    if ((error.code === -32807) || (error.code === -32804)) {
      if (showMessage) {
        message.info('Nothing was found');
      }
    } else {
      message.error('Error ' + error.code + ': ' + error.data);
    }
  } else {
    message.error('Unexpected error received from Accumulate API');
  }
}

class RPC {
  constructor(opts) {
    this._opts = { ...opts };
    this.currId = 1;
    axios.defaults.baseURL = process.env.REACT_APP_API_PATH;
    axios.defaults.headers.post['Content-Type'] = 'application/json';
  }
  
  request = (method, params = null, ver = 'v2') => {
    const result = axios.post(process.env.REACT_APP_API_PATH + '/' + ver, {
      jsonrpc: '2.0',
      id: ++this.currId,
      method,
      params: typeof params === 'string' ? [params] : params
    })
    .then(function(response) {
      if (response.data.error) {
        onError(response.data.error)
      }
      if (response.data.result) {
        return response.data.result;
      }
    })
    .catch(() => {
      message.error('Accumulate API is unavailable');
    });
    return result;
  }

  batchRequest = (requests, ver = 'v2') => {
    // JSON-RPC does not like empty batches
    if (!requests.length) return [];

    const result = axios.post(process.env.REACT_APP_API_PATH + '/' + ver,
      requests.map(({ method, params }) => ({
        jsonrpc: '2.0',
        id: ++this.currId,
        method,
        params: typeof params === 'string' ? [params] : params
      }))
    )
    .then(function(response) {
      if (response.data instanceof Array) {
        if (requests.length !== response.data.length) {
          message.error("Wrong number of responses for batch request")
          return;
        }
        const results = [];
        for (const data of response.data) {
          if (data.error) {
            onError(data.error)
          }
          results.push(data.result); // May be null if there was an error
        }
        return results;
      }
      if (response.data.error) {
        onError(response.data.error);
        return;
      }
      message.error('Unexpected response received from Accumulate API');
    })
    .catch(() => {
      message.error('Accumulate API is unavailable');
    });
    return result;
  }
}

export default new RPC();