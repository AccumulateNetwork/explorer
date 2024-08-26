import { Form, Input, InputRef } from 'antd';
import { addressToRcdHash, isValidPublicFctAddress } from 'factom';
import moment from 'moment-timezone';
import React, { useEffect, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';

import { Buffer, sha256 } from 'accumulate.js/lib/common';

const { Search } = Input;

export function SearchForm({
  searching,
}: {
  searching?: (didLoad: (_: any) => void) => void;
}) {
  const history = useHistory();

  const [searchTs, setSearchTs] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [searchIsLoading, setSearchIsLoading] = useState(false);
  const [searchForm] = Form.useForm();

  function generateLiteIdentity(publicKeyHash) {
    const pkHash = Buffer.from(publicKeyHash.slice(0, 20));
    const checkSum = Buffer.from(sha256(pkHash)).slice(28);
    const authority = Buffer.from(Buffer.concat([pkHash, checkSum])).toString(
      'hex',
    );
    return authority;
  }

  const searchRef = useRef<InputRef>(null);
  const navigate = (value) => {
    if (history?.location?.pathname === value) {
      searchForm.resetFields();
      return;
    }
    if (searching) {
      setSearchIsLoading(true);
      searching((_) => {
        setSearchIsLoading(false);
        searchForm.resetFields();
      });
    }
    history.push(value);
  };

  const handleSearch = async (value) => {
    value = value.replaceAll(/\s/g, '');
    setSearchTs(moment());
    setSearchText(value);
    var ishash = /^[A-Fa-f0-9]{64}$/.test(value);
    var isnum = /^\d+$/.test(value);
    if (isnum && Number.parseInt(value) >= 0) {
      navigate('/block/' + value);
    } else if (ishash) {
      navigate(`/tx/${value}`);
    } else if (isValidPublicFctAddress(value)) {
      const liteIdentityUrl = await generateLiteIdentity(
        addressToRcdHash(value),
      );
      navigate('/acc/' + liteIdentityUrl);
    } else {
      navigate('/acc/' + value.replace('acc://', ''));
    }
  };

  /*   function searchToken(name) {
    console.log(name)
  } */

  useEffect(() => {
    // setSearchIsLoading(false);
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
          ref={searchRef}
          placeholder="Search by Accumulate URL, TXID or block number"
          size="large"
          enterButton
          onSearch={(value) => {
            if (value !== '') {
              handleSearch(value);
            }
          }}
          value={searchText}
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
