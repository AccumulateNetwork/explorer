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
    RiInformationLine, RiQuestionLine, RiKey2Line, RiAccountCircleLine, RiStackLine, RiExchangeLine
} from 'react-icons/ri';

import RPC from '../../common/RPC';
import Count from '../../common/Count';
import tooltipDescs from '../../common/TooltipDescriptions';

const { Title, Paragraph, Text } = Typography;

const KeyPage = props => {

    const keypage = props.data;
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
          const response = await RPC.request("query-tx-history", { url: keypage.data.url, start: start, count: count } );
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
        getTxs();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div>

            <Descriptions bordered column={1} size="middle">

                {keypage.type ? (
                    <Descriptions.Item label="Type">
                        {keypage.type}
                    </Descriptions.Item>
                ) :
                    null
                }

            </Descriptions>
            
            {keypage.data ? (
                <div>
                    <Title level={4}>
                        <IconContext.Provider value={{ className: 'react-icons' }}>
                        <RiInformationLine />
                        </IconContext.Provider>
                        Key Page Info
                    </Title>
                    <Descriptions bordered column={1} size="middle">

                        {keypage.data.url ? (
                            <Descriptions.Item label={<span><nobr><IconContext.Provider value={{ className: 'react-icons' }}><Tooltip overlayClassName="explorer-tooltip" title={tooltipDescs.keyPageUrl}><RiQuestionLine /></Tooltip></IconContext.Provider>Key Page URL</nobr></span>}>
                                {keypage.data.url}
                            </Descriptions.Item>
                        ) :
                            null  
                        }

                        {keypage.adi ? (
                            <Descriptions.Item label={<span><nobr><IconContext.Provider value={{ className: 'react-icons' }}><Tooltip overlayClassName="explorer-tooltip" title={tooltipDescs.adiUrl}><RiQuestionLine /></Tooltip></IconContext.Provider>ADI</nobr></span>}>
                                <Link to={'/acc/' + keypage.adi.replace("acc://", "")}>
                                    <IconContext.Provider value={{ className: 'react-icons' }}><RiAccountCircleLine /></IconContext.Provider>{keypage.adi}
                                </Link>
                            </Descriptions.Item>
                        ) :
                            null
                        }

                        {keypage.data.keyBook ? (
                            <Descriptions.Item label={<span><nobr><IconContext.Provider value={{ className: 'react-icons' }}><Tooltip overlayClassName="explorer-tooltip" title={tooltipDescs.keyBook}><RiQuestionLine /></Tooltip></IconContext.Provider>Key Book</nobr></span>}>
                                <Link to={'/acc/' + keypage.data.keyBook.replace("acc://", "")}><IconContext.Provider value={{ className: 'react-icons' }}><RiStackLine /></IconContext.Provider>{keypage.data.keyBook}</Link>
                            </Descriptions.Item>
                        ) :
                            null
                        }

                        {keypage.data.threshold ? (
                            <Descriptions.Item label={<span><nobr><IconContext.Provider value={{ className: 'react-icons' }}><Tooltip overlayClassName="explorer-tooltip" title={tooltipDescs.threshold}><RiQuestionLine /></Tooltip></IconContext.Provider>Threshold</nobr></span>}>
                                {keypage.data.threshold}
                            </Descriptions.Item>
                        ) :
                            null
                        }

                        <Descriptions.Item label={<span><nobr><IconContext.Provider value={{ className: 'react-icons' }}><Tooltip overlayClassName="explorer-tooltip" title={tooltipDescs.creditBalance}><RiQuestionLine /></Tooltip></IconContext.Provider>Credit Balance</nobr></span>}>
                            {keypage.data.creditBalance ? keypage.data.creditBalance / 100 : 0} credits
                        </Descriptions.Item>

                    </Descriptions>

                    <Title level={4}>
                        <IconContext.Provider value={{ className: 'react-icons' }}>
                        <RiKey2Line />
                        </IconContext.Provider>
                        Public Keys
                    </Title>

                    {keypage.data.keys && keypage.data.keys[0].publicKey ? (
                        <List
                            size="small"
                            bordered
                            dataSource={keypage.data.keys}
                            renderItem={item => <List.Item>{item.publicKey}</List.Item>}
                            style={{ marginBottom: "30px" }}
                        />
                    ) :
                        <Paragraph><Text type="secondary">No keys</Text></Paragraph>
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

export default KeyPage;
