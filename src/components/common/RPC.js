import axios from 'axios';
import { message } from 'antd';

class RPC {
  constructor(opts) {
    this._opts = { ...opts };
    this.currId = 1;
    axios.defaults.baseURL = process.env.REACT_APP_API_PATH;
    axios.defaults.headers.post['Content-Type'] = 'application/json';
  }
  
  request = (method, params = null, ver = 'v2') => {
    const showMessage = 0
    const result = axios.post(process.env.REACT_APP_API_PATH + '/' + ver, {
      jsonrpc: '2.0',
      id: ++this.currId,
      method,
      params: typeof params === 'string' ? [params] : params
    })
    .then(function(response) {
      if (response.data.error) {
        if (response.data.error.data && response.data.error.code) {
          // exception for nothing was found error
          if ((response.data.error.code === -32807) || (response.data.error.code === -32804)) {
            if (showMessage) {
              message.info('Nothing was found');
            }
          } else {
            message.error('Error ' + response.data.error.code + ': ' + response.data.error.data);
          }
        } else {
          message.error('Unexpected error received from Accumulate API');
        }
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

}

export default new RPC();