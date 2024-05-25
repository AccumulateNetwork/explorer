import { message } from 'antd';
import axios from 'axios';

const showMessage = 0;
const onError = (error) => {
  console.error(error);
  if (error.data && error.code) {
    // exception for nothing was found error
    if (
      error.code === -32807 ||
      error.code === -32804 ||
      error.code === -33404
    ) {
      if (showMessage) {
        message.info('Nothing was found');
      }
    } else if (typeof error.data === 'string') {
      message.error('Error ' + error.code + ': ' + error.data);
    } else {
      message.error('Error ' + error.code + ': ' + error.message);
    }
  } else {
    message.error('Unexpected error received from Accumulate API');
  }
};

export class RPCError {
  constructor(props) {
    Object.assign(this, props);
  }
}

class RPC {
  currId = 1;
  constructor(opts = {}) {
    this._opts = { ...opts };
    axios.defaults.baseURL = import.meta.env.VITE_APP_API_PATH;
    axios.defaults.headers.post['Content-Type'] = 'application/json';
  }

  request = (method, params = null, ver = 'v2') => {
    const result = axios
      .post(import.meta.env.VITE_APP_API_PATH + '/' + ver, {
        jsonrpc: '2.0',
        id: ++this.currId,
        method,
        params: typeof params === 'string' ? [params] : params,
      })
      .then((response) => {
        if (response.data.error) {
          onError(response.data.error);
        }
        if (response.data.result) {
          return response.data.result;
        }
      })
      .catch(() => {
        message.error('Accumulate API is unavailable');
      });
    return result;
  };

  batchRequest = (requests, ver = 'v2') => {
    // JSON-RPC does not like empty batches
    if (!requests.length) return [];

    const result = axios
      .post(
        import.meta.env.VITE_APP_API_PATH + '/' + ver,
        requests.map(({ method, params }) => ({
          jsonrpc: '2.0',
          id: ++this.currId,
          method,
          params: typeof params === 'string' ? [params] : params,
        })),
      )
      .then(function (response) {
        if (response.data instanceof Array) {
          if (requests.length !== response.data.length) {
            message.error('Wrong number of responses for batch request');
            return;
          }
          const results = [];
          for (const data of response.data) {
            if (data.error) {
              onError(data.error);
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
        message.error('Accumulate API is unavailable');
      });
    return result;
  };

  rawRequest = (request, ver = 'v2') => {
    // TODO: Refactor request and batchRequest to use rawRequest?

    // Add version and id fields to the request(s)
    if (request instanceof Array) {
      // JSON-RPC does not like empty batches
      if (!request.length) return [];

      request = request.map(({ ...props }) => ({
        jsonrpc: '2.0',
        id: ++this.currId,
        ...props,
      }));
    } else {
      request = {
        jsonrpc: '2.0',
        id: ++this.currId,
        ...request,
      };
    }

    const result = axios
      .post(import.meta.env.VITE_APP_API_PATH + '/' + ver, request)
      .then(
        function (response) {
          // Convert the response(s) into the result or an RPCError
          if (response.data instanceof Array) {
            return response.data.map((r) =>
              r.error ? new RPCError(r.error) : r.result,
            );
          }
          return response.data.error
            ? new RPCError(response.data.error)
            : response.data.result;
        },
        () => {
          message.error('Accumulate API is unavailable');
        },
      );
    return result;
  };
}

const rpc = new RPC();

export default rpc;
