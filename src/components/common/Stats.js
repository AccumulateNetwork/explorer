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

import { NotifyNetworkError } from './Notifications';
import RPC from './RPC';

import { IconContext } from "react-icons";
import {
    RiExchangeLine, RiLineChartFill, RiAccountCircleLine
} from 'react-icons/ri';

const { Title, Text } = Typography;

const Stats = props => {

  const displayChange = false;

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
        const response = await RPC.request("metrics", { metric: "tps", duration: "1h" });

        setTPS(response.data.value);

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
                    {displayChange === true ? (
                        <Text className={"change change-"+tpsChangeClass}>{tpsChangeIcon}{tpsChange} %</Text>
                    ) :
                    null
                    }
                    </div>
                }
            </Card>
          </Col>
        </Row>
      </div>
  );

};

export default Stats;
