import React, { useState } from 'react';
import { Router } from 'react-router-dom';

import { Row, Col, Layout, Input, Typography, Form, Divider, Alert, Skeleton, Descriptions } from 'antd';

import axios from 'axios';

import Logo from './common/Logo';
import ScrollToTop from './common/ScrollToTop';
import History from './common/History';

import { NotifyNetworkError } from './common/Notifications';

const { Search } = Input;
const { Title } = Typography;

const Explorer = props => {

  const [searchIsLoading, setSearchIsLoading] = useState(false);
  const [object, setObject] = useState(null);
  const [url, setURL] = useState(null);
  const [type, setType] = useState(null);
  const [searchForm] = Form.useForm();

  function RenderObject(props) {
    const data = props.data;
    const rows = Object.keys(data).map(function(key) {
        return <Descriptions.Item label={key}>{data[key]}</Descriptions.Item>
    });
    
    return (
        <Descriptions bordered column={1} size="middle" style={{ marginTop: 30 }}>
            {rows}
        </Descriptions>
    );
  }

  const handleSearch = (value) => {
    setURL(value);
    setType(null);
    setObject(null);
    setSearchIsLoading(true);
    search(value);
  };

  const search = async (url) => {
        try {
            const response = await axios.get('/' + url);
            setObject(response.data.result.data);
            setType(response.data.result.type);
        }
        catch(error) {
            console.log(error);
            if (error.response) {
                if (error.response.data.error) {
                    // do nothing if it's API error
                    // message.error(error.response.data.error);
                } else {
                    NotifyNetworkError();
                }
            } else {
                NotifyNetworkError();
            }
        }
        setSearchIsLoading(false);
  }
    
  return (
    <Router history={History}>
    <ScrollToTop />
      <Layout>
        <Row>
          <Col xs={1} sm={1} md={3} lg={6} xl={6}></Col>
          <Col xs={22} sm={22} md={18} lg={12} xl={12} align="center" style={{ marginTop: 60, marginBottom: 40 }}>
            <Logo />
            <Title level={2}>Accumulate Explorer</Title>
            <Form form={searchForm} initialValues={{ search: '' }}>
            <Search
                placeholder="Accumulate URL or transaction hash"
                size="large"
                enterButton
                onSearch={(value) => { if (value!=='') { handleSearch(value); } }}
                loading={searchIsLoading}
                spellCheck={false}
                autoComplete="off"
                disabled={searchIsLoading}
                allowClear={true}
                style={{ marginTop: 20 }}
            />
            </Form>
            {url ? (
                <div style={{ marginTop: 40 }}>
                    <Divider />
                    <Title level={2} style={{ marginBottom: 0 }}>{url}</Title>
                    <Title level={5} style={{ marginTop: 5 }} type="secondary">{type}</Title>
                    {object ? (
                        <RenderObject data={object} />
                    ) : 
                        <div>
                            {searchIsLoading ? (
                                <Skeleton active />
                            ) :
                                <Alert showIcon message="Object not found" type="error" style={{ marginTop: 20 }} />
                            }
                        </div>
                    }
                </div>
            ) : null
            }
          </Col>
          <Col xs={1} sm={1} md={3} lg={6} xl={6}></Col>
        </Row>
      </Layout>
      <div align="center" style={{ marginTop: 30, paddingBottom: 20 }}>
          <p>This is a lite version of Accumulate Explorer.<br />Feedback: <a href="mailto:dev@accumulatenetwork.io">dev@accumulatenetwork.io</a></p>
      </div>
    </Router>
  );
};

export default Explorer;
