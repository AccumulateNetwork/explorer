import React, { useState, useEffect } from 'react';
import { isValidPublicFctAddress, addressToRcdHash } from 'factom';
import { Buffer, sha256 } from 'accumulate.js/lib/common';

import moment from 'moment-timezone';

import { Form, message, Input } from 'antd';

import RPC from './RPC';

const { Search } = Input;

function SearchForm() {
  const [searchTs, setSearchTs] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [searchIsLoading, setSearchIsLoading] = useState(false);
  const [searchForm] = Form.useForm();

  async function generateLiteIdentity(publicKeyHash) {
    const pkHash = Buffer.from(publicKeyHash.slice(0, 20));
    const checkSum = Buffer.from(await sha256(pkHash)).slice(28);
    const authority = Buffer.from(Buffer.concat([pkHash, checkSum])).toString(
      'hex',
    );
    return authority;
  }

  const handleSearch = async (value) => {
    value = value.replaceAll(/\s/g, '');
    setSearchTs(moment());
    setSearchText(value);
    setSearchIsLoading(true);
    var ishash = /^[A-Fa-f0-9]{64}$/.test(value);
    var isnum = /^\d+$/.test(value);
    if (isnum && Number.parseInt(value) >= 0) {
      redirect('/block/' + value);
    } else if (ishash) {
      searchTxhash(value);
    } else if (isValidPublicFctAddress(value)) {
      const liteIdentityUrl = await generateLiteIdentity(
        addressToRcdHash(value),
      );
      setSearchIsLoading(false);
      redirect('/acc/' + liteIdentityUrl);
    } else {
      search(value.replace('acc://', ''));
    }
  };

  const redirect = (url) => {
    window.location.href = url;
  };

  const searchTxhash = async (txhash) => {
    try {
      let params = { scope: `${txhash}@unknown` };
      const response = await RPC.request('query', params, 'v3');
      setSearchIsLoading(false);
      if (response && response.id) {
        redirect('/acc/' + response.id.replace('acc://', ''));
      } else {
        redirect(`/acc/${txhash}@unknown`);
      }
    } catch (error) {
      setSearchIsLoading(false);
      message.info('Nothing was found');
    }
  };

  const search = async (url) => {
    setSearchIsLoading(false);
    redirect('/acc/' + url);
  };

  /*   function searchToken(name) {
    console.log(name)
  } */

  useEffect(() => {
    setSearchIsLoading(false);
    /* if (searchForm.getFieldValue('search') !== "") {
      if (data.token && data.token.url) {
        redirect('/acc/'+data.token.url);
      } else {
        if (!searchText.includes(".acme")) {
          if (data.token === null) {
            message.info('Nothing was found');
            searchForm.resetFields();
          }
          if (searchText !== "" && !searchText.includes("ACME")) {
            message.info('Searching for an account? Try ' + searchText + '.acme');
          } 
        }
      }
    } */
  }, [searchTs, searchText, searchForm]);

  return (
    <Form
      form={searchForm}
      initialValues={{ search: '' }}
      className="search-box"
    >
      <Form.Item name="search">
        <Search
          placeholder="Search by Accumulate URL, TXID or block number"
          size="large"
          enterButton
          onSearch={(value) => {
            if (value !== '') {
              handleSearch(value);
            }
          }}
          loading={searchIsLoading}
          spellCheck={false}
          autoComplete="off"
          disabled={searchIsLoading}
          allowClear={true}
        />
      </Form.Item>
    </Form>
  );
}

export default SearchForm;
