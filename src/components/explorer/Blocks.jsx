import { Card, Col, Row, Typography } from 'antd';
import React, { useContext, useEffect } from 'react';
import { IconContext } from 'react-icons';
import { RiCoinLine, RiHandCoinLine } from 'react-icons/ri';
import { Link } from 'react-router-dom';

import { Network } from '../common/Network';
import MinorBlocks from './../common/MinorBlocks';

const { Title } = Typography;

const Blocks = () => {
  const { network } = useContext(Network);

  useEffect(() => {
    document.title = 'Blocks | Accumulate Explorer';
  }, []);

  return (
    <div>
      <Title level={2}>Accumulate Explorer</Title>

      <div className="stats" style={{ marginTop: 5, marginBottom: 20 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={8} md={6} lg={5} xl={4}>
            <Link to="/acc/acme">
              <Card>
                <span>
                  <IconContext.Provider value={{ className: 'react-icons' }}>
                    <RiCoinLine />
                  </IconContext.Provider>
                  <br />
                  Accumulate token
                </span>
                <Title level={4}>ACME</Title>
              </Card>
            </Link>
          </Col>
          {!network.mainnet && (
            <Col xs={24} sm={8} md={6} lg={5} xl={4}>
              <Link to="/faucet">
                <Card>
                  <span>
                    <IconContext.Provider value={{ className: 'react-icons' }}>
                      <RiHandCoinLine />
                    </IconContext.Provider>
                    <br />
                    Get test ACME
                  </span>
                  <Title level={4}>Faucet</Title>
                </Card>
              </Link>
            </Col>
          )}
        </Row>
      </div>

      <MinorBlocks url="acc://dn.acme" />
    </div>
  );
};

export default Blocks;
