import React, { useState, useEffect } from 'react';

import { Link } from 'react-router-dom';

import {
  Typography,
  Descriptions,
  Tooltip,
  Table,
  Tag,
  List
} from 'antd';

import { IconContext } from "react-icons";
import {
    RiInformationLine, RiQuestionLine, RiAccountCircleLine, RiFileList2Line, RiKeynoteLine
} from 'react-icons/ri';

import RPC from '../../common/RPC';
import Data from '../../common/Data';
import tooltipDescs from '../../common/TooltipDescriptions';
import ExtId from '../../common/ExtId';
import Count from '../../common/Count';
import TxChain from '../../common/TxChain';
import Authorities from '../../common/Authorities';

const { Title, Paragraph, Text } = Typography;

const DataAccount = props => {

    const account = props.data;

    const [entries, setEntries] = useState(null);
    const [tableIsLoading, setTableIsLoading] = useState(true);
    const [pagination, setPagination] = useState({pageSize: 10, showSizeChanger: true, pageSizeOptions: ['2', '10', '20', '50', '100'], current: 1});
    const [totalEntries, setTotalEntries] = useState(-1);

    const getEntries = async (params = pagination) => {
        setTableIsLoading(true);
    
        let start = 0;
        let count = 10;
        let showTotalStart = 1;
        let showTotalFinish = 10;
    
        if (params) {
            start = (params.current-1)*params.pageSize;
            count = params.pageSize;
            showTotalStart = (params.current-1)*params.pageSize+1;
            showTotalFinish = params.current*params.pageSize;
        }
    
        try {
          const response = await RPC.request("query-data-set", { url: account.data.url, start: start, count: count, expand: true } );
          if (response) {

            // workaround API bug response
            if (response.start === null || response.start === undefined) {
                response.start = 0;
            }
            setEntries(response.items);
            setPagination({...pagination, current: (response.start/response.count)+1, pageSize: response.count, total: response.total, showTotal: (total, range) => `${showTotalStart}-${Math.min(response.total, showTotalFinish)} of ${response.total}`});
            setTotalEntries(response.total);
          } else {
            throw new Error("Data set not found"); 
          }
        }
        catch(error) {
          // error is managed by RPC.js, no need to display anything
        }
        setTableIsLoading(false);
    }

    const columns = [
        {
            title: 'Entry Hash',
            dataIndex: 'entryHash',
            className: 'code',
            render: (entryHash) => (
                <Link to={'#data/'+entryHash}>
                    <IconContext.Provider value={{ className: 'react-icons' }}>
                        <RiFileList2Line />
                    </IconContext.Provider>
                    {entryHash}
                </Link>
            )
        },
        {
            title: 'Entry Data',
            dataIndex: 'entry',
            render: (entry) => {
              if (entry.data !== null && entry.data !== undefined) {
                var items = [];
                if (Array.isArray(entry.data)) {
                    items = entry.data.slice(0,3).map((item) => <ExtId compact>{item ? item : ""}</ExtId>);
                    let extra = entry.data.length-3;
                    if (extra > 0) {
                      items.push(<Tag className="extid-tag">+{extra} more</Tag>);
                    }    
                } else {
                    items.push(<ExtId compact>{entry.data ? entry.data : ""}</ExtId>)
                }
                return <nobr>{items}</nobr>;
              } else {
                return null;
              }
          }
      },
    ];

    useEffect(() => {
        getEntries();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div>

            <Descriptions bordered column={1} size="middle">

                {account.type ? (
                    <Descriptions.Item label="Type">
                        {account.type}
                    </Descriptions.Item>
                ) :
                    null
                }

            </Descriptions>
            
            {account.data ? (
                <div>
                    <Title level={4}>
                        <IconContext.Provider value={{ className: 'react-icons' }}>
                        <RiInformationLine />
                        </IconContext.Provider>
                        Data Account Info
                    </Title>

                    <Descriptions bordered column={1} size="middle">

                        {account.data.url ? (
                            <Descriptions.Item label={<span><nobr><IconContext.Provider value={{ className: 'react-icons' }}><Tooltip overlayClassName="explorer-tooltip" title={tooltipDescs.dataAccountUrl}><RiQuestionLine /></Tooltip></IconContext.Provider>Data Account URL</nobr></span>}>
                                {account.data.url}
                            </Descriptions.Item>
                        ) :
                            null  
                        }

                        {account.adi ? (
                            <Descriptions.Item label={<span><nobr><IconContext.Provider value={{ className: 'react-icons' }}><Tooltip overlayClassName="explorer-tooltip" title={tooltipDescs.adiUrl}><RiQuestionLine /></Tooltip></IconContext.Provider>ADI</nobr></span>}>
                                <Link to={'/acc/' + account.adi.replace("acc://", "")}>
                                    <IconContext.Provider value={{ className: 'react-icons' }}><RiAccountCircleLine /></IconContext.Provider>{account.adi}
                                </Link>
                            </Descriptions.Item>
                        ) :
                            null
                        }

                    </Descriptions>

                    <Authorities items={account.data.authorities} />

                    <Title level={4} style={{ marginTop: 30 }}>
                        <IconContext.Provider value={{ className: 'react-icons' }}>
                        <RiKeynoteLine />
                        </IconContext.Provider>
                        Data Account State
                    </Title>

                    {account.data.entry && account.data.entry.data ? (
                            <List
                            size="small"
                            bordered
                            dataSource={account.data.entry.data}
                            renderItem={item => <List.Item><Data>{item}</Data></List.Item>}
                            style={{ marginBottom: "30px" }}
                            />
                        ) :
                        <Paragraph><Text type="secondary">Empty state</Text></Paragraph>
                    }

                    <Title level={4} style={{ marginTop: 30 }}>
                        <IconContext.Provider value={{ className: 'react-icons' }}>
                        <RiFileList2Line />
                        </IconContext.Provider>
                        Data Entries
                        <Count count={totalEntries ? totalEntries : 0} />
                    </Title>

                    <Table
                        dataSource={entries}
                        columns={columns}
                        pagination={pagination}
                        rowKey="entryHash"
                        loading={tableIsLoading}
                        onChange={getEntries}
                        scroll={{ x: 'max-content' }}
                    />

                    <TxChain url={account.data.url} type='transaction' />
                    {account.type !== "liteDataAccount" ? (
                        <TxChain url={account.data.url} type='pending' />
                    ) : null }
                    <TxChain url={account.data.url} type='signature' />

                </div>
            ) :
                null
            }
        </div>
    );
}

export default DataAccount;
