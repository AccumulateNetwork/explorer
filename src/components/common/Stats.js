import React, { useState, useEffect } from 'react';
import {
    Row,
    Col,
    Card,
    Carousel,
    Skeleton,
    Typography
} from 'antd';

import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';

import axios from 'axios';

import { NotifyNetworkError } from '../common/Notifications';

import { IconContext } from "react-icons";
import {
    RiExchangeLine, RiLineChartFill, RiAccountCircleLine
} from 'react-icons/ri';

const { Title, Text } = Typography;

const Stats = props => {

  const [tps, setTPS] = useState(-1);
  const [accounts, setAccounts] = useState(-1);
  const [txs, setTxs] = useState(-1);
  const [tpsChange, setTPSChange] = useState(0);
  const [accountsChange, setAccountsChange] = useState(0);
  const [txsChange, setTxsChange] = useState(0);
  const [tpsChangeClass, setTPSChangeClass] = useState("0");
  const [accountsChangeClass, setAccountsChangeClass] = useState("0");
  const [txsChangeClass, setTxsChangeClass] = useState("0");
  const [tpsChangeIcon, setTPSChangeIcon] = useState(null);
  const [accountsChangeIcon, setAccountsChangeIcon] = useState(null);
  const [txsChangeIcon, setTxsChangeIcon] = useState(null);

  const getStats = async () => {
    try {
        const response = await axios.get('/explorer/stats');

        setTPS(response.data.result.tps);
        setAccounts(response.data.result.accounts);
        setTxs(response.data.result.txs);

        if (response.data.result.prevtps > 0) {
            let change = Math.round(((response.data.result.tps/response.data.result.prevtps-1)*100) * 100) / 100;
            setTPSChange(change);
            if (change > 0) {
                setTPSChangeClass("up");
                setTPSChangeIcon(<ArrowUpOutlined />);
            } else if (change < 0) {
                setTPSChange(change*-1);
                setTPSChangeClass("down");
                setTPSChangeIcon(<ArrowDownOutlined />);
            }
        }
        if (response.data.result.prevaccounts > 0) {
            let change = Math.round(((response.data.result.accounts/response.data.result.prevaccounts-1)*100) * 100) / 100;
            setAccountsChange(change);
            if (change > 0) {
                setAccountsChangeClass("up");
                setAccountsChangeIcon(<ArrowUpOutlined />);
            } else if (change < 0) {
                setAccountsChange(change*-1);
                setAccountsChangeClass("down");
                setAccountsChangeIcon(<ArrowDownOutlined />);
            }
        }
        if (response.data.result.prevTxs > 0) {
            let change = Math.round(((response.data.result.txs/response.data.result.prevTxs-1)*100) * 100) / 100;
            setTxsChange(change);
            if (change > 0) {
                setTxsChangeClass("up");
                setTxsChangeIcon(<ArrowUpOutlined />);
            } else if (change < 0) {
                setTxsChange(change*-1);
                setTxsChangeClass("down");
                setTxsChangeIcon(<ArrowDownOutlined />);
            }
        }

    }
    catch(error) {
        NotifyNetworkError();
    }
  }

  useEffect(() => getStats(), []);

  return (
      <div style={{ marginTop: 5, marginBottom: 20 }}>
        <Row gutter={[16,16]}>
          <Col xs={0} sm={8} md={8} lg={6} xl={5}>
            <Card>
                <span>
                    <IconContext.Provider value={{ className: 'react-icons' }}><RiLineChartFill /></IconContext.Provider>
                    <br />
                    TPS <small>/ 24h</small>
                </span>
                {tps === -1 ? (
                    <Skeleton active paragraph={false} />
                ) : 
                    <div>
                    <Title level={3} className="code">{tps.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</Title>
                    <Text className={"change change-"+tpsChangeClass}>{tpsChangeIcon}{tpsChange} %</Text>
                    </div>
                }
            </Card>
          </Col>
          <Col xs={0} sm={8} md={8} lg={6} xl={5}>
            <Card>
                <span>
                    <IconContext.Provider value={{ className: 'react-icons' }}><RiAccountCircleLine /></IconContext.Provider>
                    <br />
                    Active Accounts <small>/ 24h</small>
                </span>
                {accounts === -1 ? (
                    <Skeleton active paragraph={false} />
                ) : 
                    <div>
                    <Title level={3} className="code">{accounts.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</Title>
                    <Text className={"change change-"+accountsChangeClass}>{accountsChangeIcon}{accountsChange} %</Text>
                    </div>
                }
            </Card>
          </Col>
          <Col xs={0} sm={8} md={8} lg={6} xl={5}>
            <Card>
                <span>
                    <IconContext.Provider value={{ className: 'react-icons' }}><RiExchangeLine /></IconContext.Provider>
                    <br />
                    Transactions <small>/ 24h</small>
                </span>
                {txs === -1 ? (
                    <Skeleton active paragraph={false} />
                ) : 
                    <div>
                    <Title level={3} className="code">{txs.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</Title>
                    <Text className={"change change-"+txsChangeClass}>{txsChangeIcon}{txsChange} %</Text>
                    </div>
                }
            </Card>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col xs={24} sm={0} md={0} lg={0} xl={0}>
            <Carousel autoplay>
                <Card>
                    <span>
                        <IconContext.Provider value={{ className: 'react-icons' }}><RiLineChartFill /></IconContext.Provider>
                        <br />
                        TPS <small>/ 24h</small>
                    </span>
                    {tps === -1 ? (
                        <Skeleton active paragraph={false} />
                    ) : 
                        <div>
                        <Title level={3} className="code">{tps.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</Title>
                        <Text className={"change change-"+tpsChangeClass}>{tpsChangeIcon}{tpsChange} %</Text>
                        </div>
                    }
                </Card>
                <Card>
                    <span>
                        <IconContext.Provider value={{ className: 'react-icons' }}><RiAccountCircleLine /></IconContext.Provider>
                        <br />
                        Active Accounts <small>/ 24h</small>
                    </span>
                    {accounts === -1 ? (
                        <Skeleton active paragraph={false} />
                    ) : 
                        <div>
                        <Title level={3} className="code">{accounts.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</Title>
                        <Text className={"change change-"+accountsChangeClass}>{accountsChangeIcon}{accountsChange} %</Text>
                        </div>
                    }
                </Card>
                <Card>
                    <span>
                        <IconContext.Provider value={{ className: 'react-icons' }}><RiExchangeLine /></IconContext.Provider>
                        <br />
                        Transactions <small>/ 24h</small>
                    </span>
                    {txs === -1 ? (
                        <Skeleton active paragraph={false} />
                    ) : 
                        <div>
                        <Title level={3} className="code">{txs.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</Title>
                        <Text className={"change change-"+txsChangeClass}>{txsChangeIcon}{txsChange} %</Text>
                        </div>
                    }
                </Card>
            </Carousel>
          </Col>
        </Row>
      </div>
  );

};

export default Stats;
