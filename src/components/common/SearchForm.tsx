import { Form, Input, InputRef } from 'antd';
import { addressToRcdHash, isValidPublicFctAddress } from 'factom';
import moment from 'moment-timezone';
import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { Buffer, sha256 } from 'accumulate.js/lib/common';

import { encodeURLSpaces, stripAccScheme } from '../../utils/url';

const { Search } = Input;

export function SearchForm({
  searching,
}: {
  searching?: (didLoad: (_: any) => void) => void;
}) {
  const routerNavigate = useNavigate();
  const location = useLocation();

  const [searchTs, setSearchTs] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [searchIsLoading, setSearchIsLoading] = useState(false);
  const [searchForm] = Form.useForm();

  // Mirror the ?block=N query param in the search field so users always see
  // where they are in the blocks list and can tell at-a-glance which block
  // a returning session is pinned to.
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const block = params.get('block') || '';
    searchForm.setFieldValue('search', block);
    setSearchText(block);
  }, [location.search, searchForm]);

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
    if (location.pathname === value) {
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
    routerNavigate(value);
  };

  const handleSearch = async (value) => {
    setSearchTs(moment());
    setSearchText(value);

    // Hashes, block numbers and Factoid addresses never contain spaces, so
    // detect them using a whitespace-free copy of the input.
    const compact = value.replaceAll(/\s/g, '');
    var ishash = /^[A-Fa-f0-9]{64}$/.test(compact);
    var isnum = /^\d+$/.test(compact);
    if (isnum && Number.parseInt(compact) >= 0) {
      navigate('/block/' + compact);
    } else if (ishash) {
      navigate(`/tx/${compact}`);
    } else if (isValidPublicFctAddress(compact)) {
      const liteIdentityUrl = await generateLiteIdentity(
        addressToRcdHash(compact),
      );
      navigate('/acc/' + liteIdentityUrl);
    } else {
      // Account URLs may legitimately contain spaces (e.g.
      // `acc://foo.acme/My Account` or a trailing space). Strip any stray
      // tab/newline characters from copy/paste and the scheme with the
      // whitespace around it, then percent-encode the remaining spaces so they
      // survive routing and reach the API intact. A space that turns out to be
      // an artifact rather than part of the name is trimmed by Acc, but only
      // after the reference as typed has 404'd.
      const account = stripAccScheme(value.replace(/[\t\r\n]+/g, ''));
      navigate('/acc/' + encodeURLSpaces(account));
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
