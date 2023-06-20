import React, { useState, useEffect } from 'react';

import { Link } from 'react-router-dom';

import {
  Button,
  Modal,
  List,
  message,
  Typography,
  Badge,
  Row,
  Col,
  Tag,
  Tabs,
  Tooltip,
  Alert,
  Skeleton,
  Divider
} from 'antd';

import { useWeb3React } from "@web3-react/core";
import { InjectedConnector } from "@web3-react/injected-connector";

import { IconContext } from "react-icons";
import {
    RiInformationLine, RiAccountCircleLine, RiShutDownLine, RiQuestionLine, RiUserLine, RiKey2Line, RiListCheck, RiStackLine, RiAddCircleFill
} from 'react-icons/ri';

import RPC from '../common/RPC';
import { ethToAccumulate, truncateAddress } from "../common/Web3";

const { Title, Paragraph, Text } = Typography;

const Web3Module = props => {

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDashboardOpen, setIsDashboardOpen] = useState(localStorage.getItem("isDashboardOpen") ? true : false);
  const [liteIdentity, setLiteIdentity] = useState(false);
  const [liteIdentityError, setLiteIdentityError] = useState(false);

  const {
    account,
    activate,
    deactivate,
  } = useWeb3React();

  const showModal = () => {
    setIsModalOpen(true);
  };

  const handleOk = () => {
    setIsModalOpen(false);
  };

  const handleCancel = () => {
    setIsModalOpen(false);
  };

  const toggleDashboard = () => {
    if (!isDashboardOpen) {
      localStorage.setItem("isDashboardOpen", true);
    } else {
      localStorage.removeItem("isDashboardOpen");
    }
    setIsDashboardOpen(!isDashboardOpen);
  }

  const injected = new InjectedConnector();

  const connectWeb3 = async () => {
    if (window.ethereum) {
        activate(injected);
        localStorage.setItem("connected", injected);
        setIsModalOpen(false);
        toggleDashboard();
    } else {
        message.warning("Web3 browser extension not found");
    }
  }

  const disconnect = async () => {
    deactivate();
    localStorage.removeItem("connected");
  }

  const query = async (url, setResult, setError) => {
    setResult(null);
    setError(null);
    try {
        let params = {url: url};
        const response = await RPC.request("query", params);
        if (response && response.data) {
            setResult(response);
        } else {
            throw new Error(url + " not found");
        }
    }
    catch(error) {
      setResult(null);
      setError(error.message);
    }
  }

  useEffect(() => {
    if (account) {
      let liteIdentity = ethToAccumulate(account);
      query(liteIdentity, setLiteIdentity, setLiteIdentityError);
    }
  }, [account]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let connected = localStorage.getItem("connected");
    if (connected !== null) {
      activate(injected);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={`web3-module ${account ? "connected" : null}`}>
      {!account ? (
          <div className="login">
            <Row align={"middle"}>
              <Col>
                <Button type="primary" onClick={showModal} shape="round" style={{marginRight: 10}}>
                  Connect Wallet
                </Button>
              </Col>
              <Col>
                <IconContext.Provider value={{ className: 'react-icons' }}>
                  <RiInformationLine />
                </IconContext.Provider>
                Connect Web3 wallet to sign and submit txs on the Accumulate Network
              </Col>
            </Row>
          </div>
        ) :
          <div className="account">
            <Row>
              <Col className="account-connected">
                <Button shape="round" type="primary" onClick={toggleDashboard}>
                  <IconContext.Provider value={{ className: 'react-icons' }}><RiUserLine /></IconContext.Provider>{truncateAddress(account)}
                </Button>
                <Button danger shape="round" type="primary" onClick={disconnect}>
                  <IconContext.Provider value={{ className: 'react-icons react-icons-only-icon' }}><RiShutDownLine /></IconContext.Provider>
                </Button>
              </Col>
            </Row>
            {isDashboardOpen && (
            <Row>
              <Col className="card-container">
                <Tabs
                  defaultActiveKey="account"
                  type="card"
                >
                  <Tabs.Pane tab={<span><IconContext.Provider value={{ className: 'react-icons' }}><RiAccountCircleLine /></IconContext.Provider>Account</span>} key="account">
                    <Title level={5}>
                      Accumulate Lite Identity
                      <IconContext.Provider value={{ className: 'react-icons' }}><Tooltip overlayClassName="explorer-tooltip" title="Accumulate Lite Identity is an account associated with your Ethereum key"><RiQuestionLine /></Tooltip></IconContext.Provider>
                    </Title>
                    <Paragraph>
                      {liteIdentity ? (
                        <Link to={'/acc/' + ethToAccumulate(account).replace("acc://", "")}>
                          {ethToAccumulate(account)}
                        </Link>
                      ) : 
                        <Text>
                          {ethToAccumulate(account)}
                        </Text>                      
                      }
                    </Paragraph>
                    <Divider />
                    {liteIdentityError ? (
                      <Alert type="warning" message={
                        <Text>
                          <strong>Lite Identity does not exist yet</strong><br />
                          To create a lite identity send ACME to <Text copyable={{text: ethToAccumulate(account, "liteTokenAccount")}}><Text mark>{ethToAccumulate(account, "liteTokenAccount")}</Text></Text>
                        </Text>
                      } />
                    ) : 
                      <>
                      {liteIdentity && liteIdentity.data ? (
                          <Paragraph>
                            <Title level={5}>Credit balance<IconContext.Provider value={{ className: 'react-icons' }}><Tooltip overlayClassName="explorer-tooltip" title="Credits are used to pay for network transactions. You can add credits by converting ACME tokens."><RiQuestionLine /></Tooltip></IconContext.Provider></Title>
                            {liteIdentity.data.creditBalance ? liteIdentity.data.creditBalance/100 : 0} credits<br />
                            <Link to={'/acc/' + ethToAccumulate(account).replace("acc://", "")}>
                              <Button shape="round" type="primary" disabled>
                                <IconContext.Provider value={{ className: 'react-icons' }}><RiAddCircleFill /></IconContext.Provider>Add credits
                              </Button>
                            </Link>
                          </Paragraph>
                      ) :
                        <Skeleton paragraph={false} />
                      }
                      </>
                    }
                    <Paragraph>
                    </Paragraph>
                  </Tabs.Pane>
                  <Tabs.Pane tab={<span><IconContext.Provider value={{ className: 'react-icons' }}><RiKey2Line /></IconContext.Provider>Key</span>} key="key">
                    <Title level={5}>
                      Accumulate Public Key
                      <IconContext.Provider value={{ className: 'react-icons' }}><Tooltip overlayClassName="explorer-tooltip" title="Public key associated with your Ethereum key in the Accumulate network"><RiQuestionLine /></Tooltip></IconContext.Provider>
                    </Title>
                    <Paragraph>
                      <Text copyable className="code">
                        {ethToAccumulate(account, "publicKey")}
                      </Text>
                    </Paragraph>
                  </Tabs.Pane>
                  <Tabs.Pane tab={<span><IconContext.Provider value={{ className: 'react-icons' }}><RiStackLine /></IconContext.Provider>Key Pages</span>} key="signers">
                    <Title level={5}>
                      Accumulate Key Pages
                      <IconContext.Provider value={{ className: 'react-icons' }}><Tooltip overlayClassName="explorer-tooltip" title="Accumulate key pages contain a key or set of keys "><RiQuestionLine /></Tooltip></IconContext.Provider>
                    </Title>
                    <Paragraph>
                      <Text copyable className="code">
                        {ethToAccumulate(account, "publicKey")}
                      </Text>
                    </Paragraph>
                  </Tabs.Pane>
                  <Tabs.Pane tab={<span><IconContext.Provider value={{ className: 'react-icons' }}><RiListCheck /></IconContext.Provider>Actions<Badge count={3} showZero /></span>} key="actions">
                    <Title level={5}>
                      Actions
                    </Title>
                  </Tabs.Pane>
                </Tabs>
              </Col>
            </Row>
            )}
            {false ? (
              <Row>
                <Col>
                  {props.data && props.data.data ? (
                    <>
                      {props.data.data.type ? (
                        <Tag>{props.data.data.type}</Tag>
                      ) : null}
                    </>
                  ) :
                    null
                  }
                </Col>
              </Row>
            ) : null}
          </div>
      }

      <Modal title="Connect Wallet" open={isModalOpen} onOk={handleOk} onCancel={handleCancel} footer={false}>
        <List>
          <List.Item>
            <Button block shape="round" size='large' onClick={connectWeb3}>MetaMask</Button>
          </List.Item>
        </List>
        <List>
          <List.Item>
            <Button block shape="round" size='large'>WalletConnect</Button>
          </List.Item>
        </List>
      </Modal>

    </div>
  );

};

export default Web3Module;