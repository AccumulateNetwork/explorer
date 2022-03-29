import React, { useState, useEffect } from 'react';

import { useLazyQuery } from '@apollo/client';
import gql from "graphql-tag";

import { Form, message, Input } from 'antd';

import RPC from './RPC';

const { Search } = Input;

function SearchForm() {
  
  const [searchIsLoading, setSearchIsLoading] = useState(false);
  const [searchForm] = Form.useForm();

  const handleSearch = (value) => {
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
        redirect('/tx/'+value);
    }
    else {
        search(value.replace("acc://", ""));
    }
  };

  const redirect = (url) => {
    window.location.href = url;
  }

  const search = async (url) => {
    try {
        let params = {url: url};
        const response = await RPC.request("query", params);
        if (response && response.data && response.type) {
          setSearchIsLoading(false);
          redirect('/acc/'+url);
        } else {
          searchToken({ variables: { name: url } });
        }
    }
    catch(error) {
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
    SEARCH_TOKEN
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
