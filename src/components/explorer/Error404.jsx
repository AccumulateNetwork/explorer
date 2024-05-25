import { CloseCircleTwoTone } from '@ant-design/icons';
import { Button, Result, Typography } from 'antd';
import React, { useEffect } from 'react';

const { Title } = Typography;

const Error404 = () => {
  useEffect(() => {
    document.title = '404 Not Found | Accumulate Explorer';
  }, []);

  return (
    <Result
      icon={<CloseCircleTwoTone twoToneColor="#1890ff" />}
      title={<Title level={2}>404 Not Found</Title>}
      extra={
        <a href="/">
          <Button size="large" type="primary">
            Go To Blocks
          </Button>
        </a>
      }
    />
  );
};

export default Error404;
