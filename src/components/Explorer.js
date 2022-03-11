import React, { useState } from 'react';
import { BrowserRouter as Router, Route, Link, Switch } from 'react-router-dom';

import { Layout, Input, Form, message, Menu, Typography, Dropdown, Button } from 'antd';

import {
  DownOutlined
} from '@ant-design/icons';

import Logo from './common/Logo';
import Version from './common/Version';
import ScrollToTop from './common/ScrollToTop';

import RPC from './common/RPC';

import Blocks from './explorer/Blocks';

import Acc from './explorer/Acc';
import Tx from './explorer/Tx';
import Chain from './explorer/Chain';
import Error404 from './explorer/Error404';
import Faucet from './explorer/Faucet';

const { Search } = Input;
const { Header, Content } = Layout;
const { Text } = Typography;

const Explorer = props => {

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

  const ExplorerSelectFooter = (
    <Menu>
      <Menu.Item>
        {process.env.REACT_APP_API_PATH && process.env.REACT_APP_API_PATH === "https://v3.testnet.accumulatenetwork.io/v2" ? (
            <Text>explorer.accumulatenetwork.io</Text>
        ) :
            <a target="_blank" rel="noopener noreferrer" href="https://explorer.accumulatenetwork.io">
                explorer.accumulatenetwork.io
            </a>
        }
      </Menu.Item>
      <Menu.Item>
        {process.env.REACT_APP_API_PATH && process.env.REACT_APP_API_PATH === "https://testnet.accumulatenetwork.io/v2" ? (
            <Text>beta.explorer.accumulatenetwork.io</Text>
        ) :
            <a target="_blank" rel="noopener noreferrer" href="https://beta.explorer.accumulatenetwork.io">
                beta.explorer.accumulatenetwork.io
            </a>
        }
      </Menu.Item>
    </Menu>
  );
    
  return (
    <Router>
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
          </div>
        </Header>

        <Content style={{ padding: '85px 20px 30px 20px', margin: 0 }}>
            <Switch>
                <Route exact path="/" component={Blocks} />
                <Route exact path="/faucet" component={Faucet} />

                <Route path="/acc/:url+" component={Acc} />
                <Route path="/tx/:hash" component={Tx} />
                <Route path="/chain/:chainid" component={Chain} />

                <Route component={Error404} />
            </Switch>
        </Content>

      </Layout>
      <div align="center" style={{ marginTop: 30, paddingBottom: 20 }} className="footer">
          <p>&copy; Accumulate Network Explorer</p>
            {process.env.REACT_APP_API_PATH ? (
                <p>
                <Dropdown overlay={ExplorerSelectFooter} trigger={['click']}>
                    <Button type="link" className="ant-dropdown-link" onClick={e => e.preventDefault()}>
                        {process.env.REACT_APP_API_PATH === "https://testnet.accumulatenetwork.io/v2" ? (
                            <span>beta.explorer.accumulatenetwork.io</span>
                        ) :
                            <span>explorer.accumulatenetwork.io</span>
                        }
                        <DownOutlined style={{ marginLeft: 5 }} />
                    </Button>
                </Dropdown>
                </p>
            ) :
                null
            }
          <p><Version /></p>
          <p><a href="mailto:support@defidevs.io">support@defidevs.io</a></p>
      </div>
    </Router>
  );
};

export default Explorer;
