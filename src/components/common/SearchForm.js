import React, { useState, useEffect } from 'react';
import { createHash } from "crypto";
import { isValidPublicFctAddress, addressToRcdHash } from 'factom';

import moment from 'moment-timezone';

import { useLazyQuery } from '@apollo/client';
import gql from "graphql-tag";

import { Form, message, Input } from 'antd';

import RPC from './RPC';

const { Search } = Input;

function SearchForm() {
  
  const [searchTs, setSearchTs] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [searchIsLoading, setSearchIsLoading] = useState(false);
  const [searchForm] = Form.useForm();

  function sha256(data) {
    return createHash("sha256").update(data).digest();
  }

  function generateLiteIdentity(publicKeyHash) {
    const pkHash = Buffer.from(publicKeyHash.slice(0, 20));
    const checkSum = sha256(pkHash.toString("hex")).slice(28);
    const authority = Buffer.concat([pkHash, checkSum]).toString("hex");
    return authority;
  }

  const handleSearch = (value) => {
    value = value.replaceAll(/\s/g, "");
    setSearchTs(moment());
    setSearchText(value);
    setSearchIsLoading(true);
    var ishash = /^\b[0-9A-Fa-f]{64}\b/.test(value);
    var isnum = /^\d+$/.test(value);
    if (isnum && Number.parseInt(value) >= 0) {
        redirect('/block/'+value);
    }
    else if (ishash) {
        searchTxhash(value);
    }
    else if (isValidPublicFctAddress(value)) {
        const liteIdentityUrl = generateLiteIdentity(addressToRcdHash(value));
        setSearchIsLoading(false);
        redirect("/acc/"+liteIdentityUrl);
    }
    else {
        search(value.replace("acc://", ""));
    }
  };

  const redirect = (url) => {
    window.location.href = url;
  }

  const searchTxhash = async (txhash) => {
    try {
        let params = {txid: txhash};
        const response = await RPC.request("query-tx", params);
        if (response && response.data && response.txid) {
          setSearchIsLoading(false);
          redirect('/acc/'+response.txid.replace("acc://", ""));
        } else {
          setSearchIsLoading(false);
          message.info('Nothing was found');
        }
    }
    catch(error) {
      setSearchIsLoading(false);
      message.info('Nothing was found');
    }
  }

  const search = async (url) => {
    try {
        let params = {url: url};
        const response = await RPC.request("query", params);
        if (response && response.data) {
          setSearchIsLoading(false);
          redirect('/acc/'+url);
        } else {
          searchToken({ variables: { name: url.toUpperCase() } });
        }
    }
    catch(error) {
      setSearchIsLoading(false);
      message.info('Nothing was found');
    }
  }

  const SEARCH_TOKEN = gql`
      query SearchToken($name: String!) {
          token (
              query: {
                  symbol: $name
              }
          ) {
              url
          }
      }
  `;

  const [searchToken, { data, error }] = useLazyQuery(
    SEARCH_TOKEN, {
      fetchPolicy: "network-only",
    }
  );

  useEffect(() => {
    setSearchIsLoading(false);
    if (data && searchForm.getFieldValue('search') !== "") {
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
    }
  }, [searchTs, data, searchText, searchForm]);

  useEffect(() => {
      setSearchIsLoading(false);
  }, [error]);

  return (
    <Form form={searchForm} initialValues={{ search: '' }} className="search-box">
    <Form.Item name="search">
    <Search
        placeholder="Search by Accumulate URL, TXID or block number"
        size="large"
        enterButton
        onSearch={(value) => { if (value!=='') { handleSearch(value); } }}
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
