import React, { useState, useEffect } from 'react';

import { Link } from 'react-router-dom';

import Moment from 'react-moment';

import {
  Typography,
  Table
} from 'antd';

import { IconContext } from "react-icons";
import {
    RiCheckboxMultipleBlankLine
} from 'react-icons/ri';

import Stats from './../common/Stats';

const { Title } = Typography;

const Blocks = () => {

  const [blocks, setBlocks] = useState([]);
  const [tableIsLoading, setTableIsLoading] = useState(true);
  const [pagination, setPagination] = useState({pageSize: 10, showSizeChanger: true, pageSizeOptions: ['10', '20', '50', '100'], current: 1});

  const columns = [
    {
      title: 'Height',
      key: 'dbHeight',
      className: 'code',
      width: 30,
      render: (row) => (
        <Link to={'/blocks/' + row.keyMR}>
          {row.dbHeight}
        </Link>
      )
    },
    {
      title: 'Timestamp (UTC+'+ -(new Date().getTimezoneOffset() / 60) + ')',
      dataIndex: 'timestamp',
      className: 'code',
      width: 30,
      render: (timestamp) => (
        <nobr><Moment unix format="YYYY-MM-DD HH:mm" local>{timestamp*60}</Moment></nobr>
      )
    },
    {
      title: 'Block',
      dataIndex: 'keyMR',
      className: 'code',
      render: (hash) => (
        <Link to={'/blocks/' + hash}>
          <IconContext.Provider value={{ className: 'react-icons' }}>
            <RiCheckboxMultipleBlankLine />
          </IconContext.Provider>
          {hash}
        </Link>
      )
    }
  ];

  useEffect(() => {
    document.title = "Blocks | Accumulate Explorer";
//    getBlocks();
  }, []);

  return (
    <div>

      <div className="stats">
        <Stats />
      </div>

      <Title level={2}>Blocks</Title>

      <p>Debug</p>
      
      <p>
      <Link to="/accounts/acme-edc76c2f57dc759c98c7c0fd25ba799f2394a26361656306">
        accounts/acme-edc76c2f57dc759c98c7c0fd25ba799f2394a26361656306
      </Link>
      </p>

      <p>
      <Link to="/blocks">
        blocks
      </Link>
      </p>

      <Table
        dataSource={blocks}
        columns={columns}
        pagination={pagination}
        rowKey="height"
        loading={tableIsLoading}
        scroll={{ x: 'max-content' }}
      />

    </div>
  );
}

export default Blocks;
