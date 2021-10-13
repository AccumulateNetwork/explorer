import React, { useState, useEffect } from 'react';
import { Router, Route, Link, Switch } from 'react-router-dom';

import { Layout, Input, Form, message } from 'antd';

import axios from 'axios';

import Logo from './common/Logo';
import ScrollToTop from './common/ScrollToTop';
import History from './common/History';

import { NotifyNetworkError } from './common/Notifications';

import Blocks from './explorer/Blocks';
import Block from './explorer/Block';
import TokenAccount from './explorer/TokenAccount';
import Transaction from './explorer/Transaction';
import Error404 from './explorer/Error404';

const { Search } = Input;
const { Header, Content } = Layout;

const Explorer = props => {

  const [searchIsLoading, setSearchIsLoading] = useState(false);
  const [searchForm] = Form.useForm();
  const [redirect, setRedirect] = useState(null);

  const handleSearch = (value) => {
    setSearchIsLoading(true);
    search(value);
  };

  const search = async (url) => {
        try {
            const response = await axios.get('/' + url);
            if (response.data.result && response.data.result.type) {
                switch (response.data.result.type) {
                  case "tokenAccount":
                    setRedirect('/accounts/'+url);
                    break;
                  default:
                    message.info('No results found');
                    break;
                }
            } else {
                message.info('No results found');
            }
        }
        catch(error) {
            NotifyNetworkError();
        }
        setSearchIsLoading(false);
  }

  useEffect(() => {
    if (redirect) {
        History.push(redirect);
        searchForm.resetFields();
        setRedirect(null);
    }
  }, [redirect]);

  useEffect(() => {
    console.log(window.location.pathname);
  }, []);
    
  return (
    <Router history={History}>
    <ScrollToTop />
      <Layout>
        <Header style={{ position: 'fixed', zIndex: 1, width: '100%' }}>
          <div className="header-column-logo">
            <Link to="/">
              <Logo />
            </Link>
          </div>
          <div className="header-column-search">
            <Form form={searchForm} initialValues={{ search: '' }} className="search-box">
                  <Search
                      placeholder="Search by Accumulate URL"
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
          </div>
        </Header>

        <Content style={{ padding: '85px 20px 30px 20px', margin: 0 }}>
            <Switch>
                <Route exact path="/" component={Blocks} />
                <Route exact path="/blocks" component={Blocks} />
                <Route path="/blocks/:id" component={Block} />
                <Route path="/accounts/:url" component={TokenAccount} />
                <Route path="/tx/:hash" component={Transaction} />
                <Route component={Error404} />
            </Switch>
        </Content>

      </Layout>
      <div align="center" style={{ marginTop: 30, paddingBottom: 20 }}>
          <p>&copy; Accumulate Network Explorer<br /><a href="mailto:dev@accumulatenetwork.io">dev@accumulatenetwork.io</a></p>
      </div>
    </Router>
  );
};

export default Explorer;
