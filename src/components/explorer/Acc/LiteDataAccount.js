import React, { useState, useEffect } from 'react';

import { Link } from 'react-router-dom';

import {
  Typography,
  Descriptions,
  Tooltip,
  Table,
  Tag
} from 'antd';

import { IconContext } from "react-icons";
import {
    RiInformationLine, RiQuestionLine, RiAccountCircleLine, RiLinksLine, RiFileList2Line
} from 'react-icons/ri';

import RPC from '../../common/RPC';
import tooltipDescs from '../../common/TooltipDescriptions';
import ExtId from '../../common/ExtId';
import Count from '../../common/Count';

const { Title } = Typography;

const LiteDataAccount = props => {

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
          const response = await RPC.request("query-data-set", { url: account.data.url, start: start, count: count, expandChains: true } );
          if (response && response.data) {

            // workaround API bug response
            if (response.data.start === null || response.data.start === undefined) {
                response.data.start = 0;
            }
            setEntries(response.data.dataEntries);
            setPagination({...pagination, current: (response.data.start/response.data.count)+1, pageSize: response.data.count, total: response.data.total, showTotal: (total, range) => `${showTotalStart}-${Math.min(response.data.total, showTotalFinish)} of ${response.data.total}`});
            setTotalEntries(response.data.total);
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
            title: 'External IDs',
            dataIndex: 'entry',
            render: (entry) => {
              if (entry.extIds !== null && entry.extIds !== undefined) {
                var items = entry.extIds.slice(0,3).map((item) => <ExtId compact>{item}</ExtId>);
                let extra = entry.extIds.length-3;
                if (extra > 0) {
                  items.push(<Tag className="extid-tag">+{extra} more</Tag>);
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
                            <Descriptions.Item label={<span><nobr><IconContext.Provider value={{ className: 'react-icons' }}><Tooltip overlayClassName="explorer-tooltip" title={tooltipDescs.LiteDataAccountUrl}><RiQuestionLine /></Tooltip></IconContext.Provider>Data Account URL</nobr></span>}>
                                {account.data.url}
                            </Descriptions.Item>
                        ) :
                            null  
                        }

                        {account.data.keyBook ? (
                            <Descriptions.Item label={<span><nobr><IconContext.Provider value={{ className: 'react-icons' }}><Tooltip overlayClassName="explorer-tooltip" title={tooltipDescs.keyBook}><RiQuestionLine /></Tooltip></IconContext.Provider>Key Book</nobr></span>}>
                                <Link to={'/chain/' + account.data.keyBook}>
                                    <IconContext.Provider value={{ className: 'react-icons' }}><RiLinksLine /></IconContext.Provider>{account.data.keyBook}
                                </Link>
                            </Descriptions.Item>
                        ) :
                            null
                        }

                    </Descriptions>

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

                </div>
            ) :
                null
            }
        </div>
    );
}

export default LiteDataAccount;
