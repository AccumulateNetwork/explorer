import React, { useState, useEffect } from 'react';
import { createHash } from "crypto";
import { isValidPublicFctAddress, addressToRcdHash } from 'factom';

import { useLazyQuery } from '@apollo/client';
import gql from "graphql-tag";

import { Form, message, Input } from 'antd';

import RPC from './RPC';

const { Search } = Input;

function SearchForm() {
  
  const [searchIsLoading, setSearchIsLoading] = useState(false);
  const [searchForm] = Form.useForm();

  function sha256(data) {
    return createHash("sha256").update(data).digest();
  }

  function generateLiteTokenAccount(publicKeyHash) {
    const pkHash = Buffer.from(publicKeyHash.slice(0, 20));
    const checkSum = sha256(pkHash.toString("hex")).slice(28);
    const authority = Buffer.concat([pkHash, checkSum]).toString("hex");
    return authority + "/ACME";
  }

  const handleSearch = (value) => {
    value = value.replaceAll(/\s/g, "");
    setSearchIsLoading(true);
    var ishash = /^\b[0-9A-Fa-f]{64}\b/.test(value);
    // remove search by height until v0.3
    /*
    var isnum = /^\d+$/.test(value);
    if (isnum && Number.parseInt(value) >= 0) {
        redirect('/blocks/'+value);
    }
    else */
    if (ishash) {
        searchTxhash(value);
    }
    else if (isValidPublicFctAddress(value)) {
        const liteTAUrl = generateLiteTokenAccount(addressToRcdHash(value));
        setSearchIsLoading(false);
        redirect("/acc/"+liteTAUrl);
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
    if (data) {
      if (data.token && data.token.url) {
        redirect('/acc/'+data.token.url);
      } else {
        message.info('Nothing was found');
      }
    }
  }, [data]);

  useEffect(() => {
      setSearchIsLoading(false);
  }, [error]);

  return (
    <Form form={searchForm} initialValues={{ search: '' }} className="search-box">
    <Search
        placeholder="Search by Accumulate URL or TXID"
        size="large"
        enterButton
        onSearch={(value) => { if (value!=='') { handleSearch(value); } }}
        loading={searchIsLoading}
        spellCheck={false}
        autoComplete="off"
        disabled={searchIsLoading}
        allowClear={true}
    />
    </Form>
  );
}

export default SearchForm;
