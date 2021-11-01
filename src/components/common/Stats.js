import React, { useState, useEffect } from 'react';
import {
    Row,
    Col,
    Card,
    Skeleton,
    Typography
} from 'antd';

import { NotifyNetworkError } from './Notifications';
import RPC from './RPC';

import { IconContext } from "react-icons";
import {
    RiLineChartFill
} from 'react-icons/ri';

const { Title } = Typography;

const Stats = props => {

  const [tps, setTPS] = useState(-1);

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
                    TPS <small>/ 1h</small>
                </span>
                {tps === -1 ? (
                    <Skeleton active paragraph={false} />
                ) : 
                    <div>
                    <Title level={3} className="code">{parseFloat(tps).toFixed(2)}</Title>
                    </div>
                }
            </Card>
          </Col>
        </Row>
      </div>
  );

};

export default Stats;
