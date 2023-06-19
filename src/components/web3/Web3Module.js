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
  Tooltip
} from 'antd';

import { useWeb3React } from "@web3-react/core";
import { InjectedConnector } from "@web3-react/injected-connector";

import { IconContext } from "react-icons";
import {
    RiInformationLine, RiAccountCircleLine, RiShutDownLine, RiQuestionLine, RiUserLine, RiKey2Line, RiPenNibLine, RiListCheck, RiStackLine
} from 'react-icons/ri';

import { ethToAccumulate, truncateAddress } from "../common/Web3";

const { Title, Paragraph } = Typography;

const Web3Module = props => {

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDashboardOpen, setIsDashboardOpen] = useState(localStorage.getItem("isDashboardOpen") ? true : false);

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
              <Col>
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
                      Lite Identity
                      <IconContext.Provider value={{ className: 'react-icons' }}><Tooltip overlayClassName="explorer-tooltip" title="Accumulate Lite Identity associated with your Ethereum address"><RiQuestionLine /></Tooltip></IconContext.Provider>
                    </Title>
                    <Paragraph>
                      <Link to={'/acc/' + ethToAccumulate(account).replace("acc://", "")}><IconContext.Provider value={{ className: 'react-icons' }}><RiAccountCircleLine /></IconContext.Provider>{ethToAccumulate(account)}</Link>
                    </Paragraph>
                    <Title level={5}>
                      Lite Token Account
                      <IconContext.Provider value={{ className: 'react-icons' }}><Tooltip overlayClassName="explorer-tooltip" title="Accumulate Lite Identity associated with your Ethereum address"><RiQuestionLine /></Tooltip></IconContext.Provider>
                    </Title>
                    <Paragraph>
                      <Link to={'/acc/' + ethToAccumulate(account, "liteTokenAccount").replace("acc://", "")}><IconContext.Provider value={{ className: 'react-icons' }}><RiAccountCircleLine /></IconContext.Provider>{ethToAccumulate(account, "liteTokenAccount")}</Link>
                    </Paragraph>
                  </Tabs.Pane>
                  <Tabs.Pane tab={<span><IconContext.Provider value={{ className: 'react-icons' }}><RiKey2Line /></IconContext.Provider>Key</span>} key="key">
                    <Paragraph>
                      123
                    </Paragraph>
                  </Tabs.Pane>
                  <Tabs.Pane tab={<span><IconContext.Provider value={{ className: 'react-icons' }}><RiStackLine /></IconContext.Provider>Key Pages</span>} key="signers">
                    <Paragraph>
                      123
                    </Paragraph>
                  </Tabs.Pane>
                  <Tabs.Pane tab={<span><IconContext.Provider value={{ className: 'react-icons' }}><RiListCheck /></IconContext.Provider>Actions<Badge count={3} showZero color="#bfbfbf" /></span>} key="actions">
                    <Paragraph>
                      123
                    </Paragraph>
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