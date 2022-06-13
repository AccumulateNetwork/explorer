import React, { useState, useEffect } from 'react';

import { Link } from 'react-router-dom';

import {
  Typography,
  Descriptions,
  Tooltip,
  List,
  Tag,
  Table
} from 'antd';

import { IconContext } from "react-icons";
import {
    RiInformationLine, RiQuestionLine, RiStackLine, RiAccountCircleLine, RiExchangeLine
} from 'react-icons/ri';

import RPC from '../../common/RPC';
import Count from '../../common/Count';
import tooltipDescs from '../../common/TooltipDescriptions';

const { Title, Paragraph, Text } = Typography;

const KeyBook = props => {

    const keybook = props.data;
    const [txs, setTxs] = useState(null);
    const [tableIsLoading, setTableIsLoading] = useState(true);
    const [pagination, setPagination] = useState({pageSize: 10, showSizeChanger: true, pageSizeOptions: ['10', '20', '50', '100'], current: 1});
    const [totalTxs, setTotalTxs] = useState(-1);

    const columns = [
        {
            title: 'Transaction ID',
            render: (row) => {
                if (row) {
                    return (
                        <div>
                            <Link to={'/acc/' + row.txid.replace("acc://", "")}>
                                <IconContext.Provider value={{ className: 'react-icons' }}><RiExchangeLine /></IconContext.Provider>{row.txid}
                            </Link>
                        </div>
                    )
                } else {
                    return (
                        <Text disabled>N/A</Text>
                    )
                }                
            }
        },
        {
            title: 'Type',
            render: (row) => {
                if (row) {
                    return (
                        <Tag color="green">{row.type}</Tag>                        
                    )
                } else {
                    return (
                        <Text disabled>N/A</Text>
                    )
                }
            }
        }
    ];

    const getTxs = async (params = pagination) => {
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
          const response = await RPC.request("query-tx-history", { url: keybook.data.url, start: start, count: count } );
          if (response && response.items) {

            // workaround API bug response
            if (response.start === null || response.start === undefined) {
                response.start = 0;
            }

            setTxs(response.items);
            setPagination({...pagination, current: (response.start/response.count)+1, pageSize: response.count, total: response.total, showTotal: (total, range) => `${showTotalStart}-${Math.min(response.total, showTotalFinish)} of ${response.total}`});
            setTotalTxs(response.total);
          } else {
            throw new Error("Key Book transactions not found");
          }
        }
        catch(error) {
          // error is managed by RPC.js, no need to display anything
        }
        setTableIsLoading(false);
    }

    useEffect(() => {
        if (!keybook.data.pages && keybook.data.pageCount) {
            var pages = [];
            for (var i = 1; i <= keybook.data.pageCount; i++) {
                pages.push(keybook.data.url+'/'+i);
            }
            keybook.data.pages = pages;
        }
        getTxs();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div>

            <Descriptions bordered column={1} size="middle">

                {keybook.type ? (
                    <Descriptions.Item label="Type">
                        {keybook.type}
                    </Descriptions.Item>
                ) :
                    null
                }

            </Descriptions>
            
            {keybook.data ? (
                <div>
                    <Title level={4}>
                        <IconContext.Provider value={{ className: 'react-icons' }}>
                        <RiInformationLine />
                        </IconContext.Provider>
                        Key Book Info
                    </Title>
                    <Descriptions bordered column={1} size="middle">

                        {keybook.data.url ? (
                            <Descriptions.Item label={<span><nobr><IconContext.Provider value={{ className: 'react-icons' }}><Tooltip overlayClassName="explorer-tooltip" title={tooltipDescs.keyBookUrl}><RiQuestionLine /></Tooltip></IconContext.Provider>Key Book URL</nobr></span>}>
                                {keybook.data.url}
                            </Descriptions.Item>
                        ) :
                            null  
                        }

                        {keybook.adi ? (
                            <Descriptions.Item label={<span><nobr><IconContext.Provider value={{ className: 'react-icons' }}><Tooltip overlayClassName="explorer-tooltip" title={tooltipDescs.adiUrl}><RiQuestionLine /></Tooltip></IconContext.Provider>ADI</nobr></span>}>
                                <Link to={'/acc/' + keybook.adi.replace("acc://", "")}>
                                    <IconContext.Provider value={{ className: 'react-icons' }}><RiAccountCircleLine /></IconContext.Provider>{keybook.adi}
                                </Link>
                            </Descriptions.Item>
                        ) :
                            null
                        }

                    </Descriptions>

                    <Title level={4}>
                        <IconContext.Provider value={{ className: 'react-icons' }}>
                        <RiStackLine />
                        </IconContext.Provider>
                        Key Pages
                    </Title>

                    {keybook.data.pages && keybook.data.pages[0] ? (
                        <List
                            size="small"
                            bordered
                            dataSource={keybook.data.pages}
                            renderItem={item => <List.Item><Link to={'/acc/' + item.replace("acc://", "")}><IconContext.Provider value={{ className: 'react-icons' }}><RiStackLine /></IconContext.Provider>{item}</Link></List.Item>}
                            style={{ marginBottom: "30px" }}
                        />
                    ) :
                        <Paragraph><Text type="secondary">No pages</Text></Paragraph>
                    }

                    <Title level={4}>
                        <IconContext.Provider value={{ className: 'react-icons' }}>
                        <RiExchangeLine />
                        </IconContext.Provider>
                        Transactions
                        <Count count={totalTxs ? totalTxs : 0} />
                    </Title>

                    <Table
                        dataSource={txs}
                        columns={columns}
                        pagination={pagination}
                        rowKey="txid"
                        loading={tableIsLoading}
                        onChange={getTxs}
                        scroll={{ x: 'max-content' }}
                    />

                </div>
            ) :
                null
            }
        </div>
    );
}

export default KeyBook;
