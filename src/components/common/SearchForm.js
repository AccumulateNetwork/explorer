import React, { useState } from 'react';

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
        const response = await RPC.request("query", params, 1);
        if (response.data && response.type) {
          redirect('/acc/'+url);
        } else {
          message.info('Nothing was found');
        }
    }
    catch(error) {
      // error is managed by RPC.js, no need to display anything
    }
    setSearchIsLoading(false);
}

/*
const SEARCH_TOKEN = gql`
    query {
        token (
            query: {
                name: $name
            }
        ) {
            url
        }
    }
`;
*/

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
