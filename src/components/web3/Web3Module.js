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
  Divider,
  Form,
  Select,
  InputNumber
} from 'antd';

import { useWeb3React } from "@web3-react/core";
import { InjectedConnector } from "@web3-react/injected-connector";

import { IconContext } from "react-icons";
import {
    RiInformationLine, RiAccountCircleLine, RiShutDownLine, RiQuestionLine, RiUserLine, RiKey2Line, RiListCheck, RiStackLine, RiAddCircleFill, RiExternalLinkLine
} from 'react-icons/ri';

import RPC from '../common/RPC';
import { ethToAccumulate, truncateAddress } from "../common/Web3";

const { Title, Paragraph, Text } = Typography;

const Web3Module = props => {

  const [isConnectWalletOpen, setIsConnectWalletOpen] = useState(false);
  const [isAddCreditsOpen, setIsAddCreditsOpen] = useState(false);

  const [isDashboardOpen, setIsDashboardOpen] = useState(localStorage.getItem("isDashboardOpen") ? true : false);

  const [ACME, setACME] = useState(null);
  const [ACMEError, setACMEError] = useState(null);

  const [liteIdentity, setLiteIdentity] = useState(null);
  const [liteIdentityError, setLiteIdentityError] = useState(null);

  const [formAddCredits] = Form.useForm();
  const [formAddCreditsLiteTA, setFormAddCreditsLiteTA] = useState(null);
  const [formAddCreditsDestination, setFormAddCreditsDestination] = useState(null);
  const [formAddCreditsAmount, setFormAddCreditsAmount] = useState(null);

  const [liteTokenAccount, setLiteTokenAccount] = useState(null);
  const [liteTokenAccountError, setLiteTokenAccountError] = useState(null);

  const [networkStatus, setNetworkStatus] = useState(null);
  const [networkStatusError, setNetworkStatusError] = useState(null);

  const {
    account,
    activate,
    deactivate,
  } = useWeb3React();

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
        setIsConnectWalletOpen(false);
        if (!isDashboardOpen) {
          toggleDashboard();
        }
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

  const getNetworkStatus = async () => {
    setNetworkStatus(null);
    setNetworkStatusError(null);
    try {
      let params = {partition: "directory"};
        const response = await RPC.request("network-status", params, "v3");
        if (response && response.oracle && response.oracle.price) {
            setNetworkStatus(response);
        } else {
            throw new Error("can not get network status");
        }
    }
    catch(error) {
      setNetworkStatus(null);
      setNetworkStatusError(error.message);
    }
  }

  const handleFormAddCredits = async () => {
    try {
      console.log("Generating tx to add " + formAddCreditsAmount + " credits to " + formAddCreditsDestination + ", payer " + formAddCreditsLiteTA);
    }
    catch(error) {
      message.error(error);
    }
  }

  useEffect(() => {
    if (account) {
      setFormAddCreditsLiteTA(null);
      setLiteTokenAccount(null);
      setLiteTokenAccountError(null);
      let liteIdentity = ethToAccumulate(account);
      query(liteIdentity, setLiteIdentity, setLiteIdentityError);
    }
  }, [account]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    getNetworkStatus();
    query("ACME", setACME, setACMEError);
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
                <Button type="primary" onClick={() => setIsConnectWalletOpen(true)} shape="round" style={{marginRight: 10}}>
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
                          To create a lite identity send ACME to <Text copyable={{text: ethToAccumulate(account, "liteTokenAccount")}}><Text mark>{ethToAccumulate(account, "liteTokenAccount")}</Text></Text><br />
                          You can also <a href="https://bridge.accumulatenetwork.io/release" target="_blank" rel="noreferrer"><strong>bridge WACME<IconContext.Provider value={{ className: 'react-icons react-icons-end' }}><RiExternalLinkLine /></IconContext.Provider></strong></a> from Ethereum or Arbitrum, using the above address as the destination.
                        </Text>
                      } />
                    ) : 
                      <>
                      {liteIdentity && liteIdentity.data ? (
                          <Paragraph>
                            <Title level={5}>Credit Balance<IconContext.Provider value={{ className: 'react-icons' }}><Tooltip overlayClassName="explorer-tooltip" title="Credits are used to pay for network transactions. You can add credits by converting ACME tokens."><RiQuestionLine /></Tooltip></IconContext.Provider></Title>
                            {liteIdentity.data.creditBalance ? liteIdentity.data.creditBalance/100 : 0} credits<br />
                            <Button shape="round" type="primary" onClick={() => setIsAddCreditsOpen(true)}>
                              <IconContext.Provider value={{ className: 'react-icons' }}><RiAddCircleFill /></IconContext.Provider>Add credits
                            </Button>
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

      <Modal title="Connect Wallet" open={isConnectWalletOpen} onCancel={() => setIsConnectWalletOpen(false)} footer={false}>
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

      <Modal title="Add Credits" open={isAddCreditsOpen && account && liteIdentity} onCancel={() => setIsAddCreditsOpen(false)} footer={false}>
        <Alert showIcon type="info" message={
          <span>
            ACME tokens can be converted to credits
          </span>
        } />
        <Divider />
        <Divider />
        <Form form={formAddCredits} layout="vertical" className="modal-form">
          <Form.Item label="Price Oracle" className="text-row">
            {networkStatus?.oracle?.price &&
              <Text type="secondary">1 ACME = {networkStatus.oracle.price/100} credits</Text>
            }
            {networkStatusError &&
              <Alert showIcon type="error" message={<span>{networkStatusError}</span>} />
            }
          </Form.Item>
          <Form.Item label="ACME Token Account">
            <Select value={formAddCreditsLiteTA} placeholder="Choose token account" onChange={e => { setFormAddCreditsLiteTA(e); query(e, setLiteTokenAccount, setLiteTokenAccountError); }}>
              <Select.Option value={ethToAccumulate(account, "liteTokenAccount")}>{ethToAccumulate(account, "liteTokenAccount")}</Select.Option>
            </Select>
            {!ACMEError && ACME?.data?.precision && liteTokenAccount?.data?.balance &&
              <Paragraph style={{ marginTop: 5, marginBottom: 0 }}>
                <Text type="secondary">Available balance: {liteTokenAccount.data.balance ? liteTokenAccount.data.balance/Math.pow(10, ACME.data.precision) : 0} ACME</Text>
              </Paragraph>
            }
            {liteTokenAccountError &&
              <>
                <Divider />
                <Alert showIcon type="error" message={<span>{liteTokenAccountError}</span>} />
              </>
            }
          </Form.Item>
          <Form.Item label="Credits Destination">
            <Select value={formAddCreditsDestination} placeholder="Choose credits destination" onChange={setFormAddCreditsDestination}>
              <Select.Option value={ethToAccumulate(account)}>{ethToAccumulate(account)}</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item label="Amount">
            <InputNumber addonAfter="credits" placeholder="100" min={1} value={formAddCreditsAmount} onChange={setFormAddCreditsAmount} />
            {networkStatus?.oracle?.price &&
              <Paragraph style={{ marginTop: 5, marginBottom: 0 }}>
                <Text type="secondary">{formAddCreditsAmount ? formAddCreditsAmount : 0} credits = {formAddCreditsAmount ? formAddCreditsAmount*100*Math.pow(10, 8)/networkStatus.oracle.price/Math.pow(10, 8) : 0} ACME</Text>
              </Paragraph>
            }
          </Form.Item>
          <Form.Item>
            <Button onClick={handleFormAddCredits} type="primary" shape="round" size="large" disabled={ (formAddCreditsAmount <= 0 || !liteTokenAccount || !formAddCreditsDestination || !formAddCreditsLiteTA) ? true : false}>Submit</Button>
          </Form.Item>
        </Form>
        
      </Modal>

    </div>
  );

};

export default Web3Module;