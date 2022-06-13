import React, { useState, useEffect } from 'react';

import { Link } from 'react-router-dom';

import {
  Typography,
  Descriptions,
  Tooltip,
  Skeleton,
  Table,
  Tag
} from 'antd';

import { IconContext } from "react-icons";
import {
    RiInformationLine, RiQuestionLine, RiFolder2Line, RiStackLine, RiShieldCheckLine, RiExchangeLine
} from 'react-icons/ri';

import RPC from '../../common/RPC';
import tooltipDescs from '../../common/TooltipDescriptions';
import Count from '../../common/Count';
import TxChain from '../../common/TxChain';
import MinorBlocks from '../../common/MinorBlocks';

const { Title, Text } = Typography;

const ADI = props => {

    let type = props.type ? props.type : 'ADI';
    const adi = props.data;
    const [directory, setDirectory] = useState(null);
    const [totalDirectory, setTotalDirectory] = useState(-1);
    const [tableIsLoading, setTableIsLoading] = useState(true);
    const [pagination, setPagination] = useState({pageSize: 10, showSizeChanger: true, pageSizeOptions: ['10', '20', '50', '100'], current: 1});
    const [txs, setTxs] = useState(null);
    const [tableIsLoading2, setTableIsLoading2] = useState(true);
    const [pagination2, setPagination2] = useState({pageSize: 10, showSizeChanger: true, pageSizeOptions: ['10', '20', '50', '100'], current: 1});
    const [totalTxs, setTotalTxs] = useState(-1);

    const columns = [
        {
            title: 'Accounts',
            render: (row) => {
                if (row) {
                    return (
                        <Link to={'/acc/' + row.replace("acc://", "")}>
                            <IconContext.Provider value={{ className: 'react-icons' }}><RiStackLine /></IconContext.Provider>{row}
                        </Link>
                    )
                } else {
                    return (
                        <Text disabled>N/A</Text>
                    )
                }                
            }
        }
    ];

    const columns2 = [
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

    const getDirectory = async (params = pagination) => {
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
          const response = await RPC.request("query-directory", { url: adi.data.url, start: start, count: count } );
          if (response && response.items) {

            // workaround API bug response
            if (response.start === null || response.start === undefined) {
                response.start = 0;
            }

            setDirectory(response.items);
            setPagination({...pagination, current: (response.start/response.count)+1, pageSize: response.count, total: response.total, showTotal: (total, range) => `${showTotalStart}-${Math.min(response.total, showTotalFinish)} of ${response.total}`});
            setTotalDirectory(response.total);
          } else {
            throw new Error("ADI Directory not found"); 
          }
        }
        catch(error) {
          // error is managed by RPC.js, no need to display anything
        }
        setTableIsLoading(false);
    }

    const getTxs = async (params = pagination2) => {
        setTableIsLoading2(true);
    
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
          const response = await RPC.request("query-tx-history", { url: adi.data.url, start: start, count: count } );
          if (response && response.items) {

            // workaround API bug response
            if (response.start === null || response.start === undefined) {
                response.start = 0;
            }

            setTxs(response.items);
            setPagination2({...pagination2, current: (response.start/response.count)+1, pageSize: response.count, total: response.total, showTotal: (total, range) => `${showTotalStart}-${Math.min(response.total, showTotalFinish)} of ${response.total}`});
            setTotalTxs(response.total);
          } else {
            throw new Error("ADI transactions not found");
          }
        }
        catch(error) {
          // error is managed by RPC.js, no need to display anything
        }
        setTableIsLoading2(false);
    }

    useEffect(() => {
        getDirectory();
        getTxs();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div>
            <Descriptions bordered column={1} size="middle">

                {adi.type ? (
                    <Descriptions.Item label="Type">
                        {adi.type}
                    </Descriptions.Item>
                ) :
                    null
                }

            </Descriptions>
            
            {adi.data ? (
                <div>
                    <Title level={4}>
                        <IconContext.Provider value={{ className: 'react-icons' }}>
                        <RiInformationLine />
                        </IconContext.Provider>
                        {type} Info
                    </Title>
                    <Descriptions bordered column={1} size="middle">

                        {adi.data.url ? (
                            <Descriptions.Item label={<span><nobr><IconContext.Provider value={{ className: 'react-icons' }}><Tooltip overlayClassName="explorer-tooltip" title={tooltipDescs.adiUrl}><RiQuestionLine /></Tooltip></IconContext.Provider>URL</nobr></span>}>
                                {adi.data.url}
                            </Descriptions.Item>
                        ) :
                            null
                        }

                        {adi.data.keyBook ? (
                            <Descriptions.Item label={<span><nobr><IconContext.Provider value={{ className: 'react-icons' }}><Tooltip overlayClassName="explorer-tooltip" title={tooltipDescs.keyBook}><RiQuestionLine /></Tooltip></IconContext.Provider>Key Book</nobr></span>}>
                                <Link to={'/acc/' + adi.data.keyBook.replace("acc://", "")}>
                                    <IconContext.Provider value={{ className: 'react-icons' }}><RiStackLine /></IconContext.Provider>{adi.data.keyBook}
                                </Link>
                            </Descriptions.Item>
                        ) :
                            null
                        }

                        {adi.data.keyData ? (
                            <Descriptions.Item label={<span><nobr><IconContext.Provider value={{ className: 'react-icons' }}><Tooltip overlayClassName="explorer-tooltip" title={tooltipDescs.keyData}><RiQuestionLine /></Tooltip></IconContext.Provider>Key Data</nobr></span>}>
                                {adi.data.keyData}
                            </Descriptions.Item>
                        ) :
                            null
                        }

                        {adi.data.keyType ? (
                            <Descriptions.Item label={<span><nobr><IconContext.Provider value={{ className: 'react-icons' }}><Tooltip overlayClassName="explorer-tooltip" title={tooltipDescs.keyType}><RiQuestionLine /></Tooltip></IconContext.Provider>Key Type</nobr></span>}>
                                {adi.data.keyType}
                            </Descriptions.Item>
                        ) :
                            null
                        }

                        {adi.data.creditBalance || adi.data.creditBalance === 0 ? (
                            <Descriptions.Item label={<span><nobr><IconContext.Provider value={{ className: 'react-icons' }}><Tooltip overlayClassName="explorer-tooltip" title={tooltipDescs.creditBalance}><RiQuestionLine /></Tooltip></IconContext.Provider>Credit Balance</nobr></span>}>
                                {adi.data.creditBalance ? adi.data.creditBalance / 100 : 0} credits
                            </Descriptions.Item>
                        ) : null}

                        {adi.data.nonce ? (
                            <Descriptions.Item label={<span><nobr><IconContext.Provider value={{ className: 'react-icons' }}><Tooltip overlayClassName="explorer-tooltip" title={tooltipDescs.nonce}><RiQuestionLine /></Tooltip></IconContext.Provider>Nonce</nobr></span>}>
                                {adi.data.nonce}
                            </Descriptions.Item>
                        ) :
                            null
                        }

                    </Descriptions>

                    <Title level={4}>
                        <IconContext.Provider value={{ className: 'react-icons' }}>
                        <RiFolder2Line />
                        </IconContext.Provider>
                        {type} Directory
                        <Count count={totalDirectory ? totalDirectory : 0} />
                    </Title>

                    <Table
                        dataSource={directory}
                        columns={columns}
                        pagination={pagination}
                        rowKey="txid"
                        loading={tableIsLoading}
                        onChange={getDirectory}
                        scroll={{ x: 'max-content' }}
                    />

                    <Title level={4}>
                        <IconContext.Provider value={{ className: 'react-icons' }}>
                        <RiExchangeLine />
                        </IconContext.Provider>
                        Transactions
                        <Count count={totalTxs ? totalTxs : 0} />
                    </Title>

                    <Table
                        dataSource={txs}
                        columns={columns2}
                        pagination={pagination2}
                        rowKey="txid"
                        loading={tableIsLoading2}
                        onChange={getTxs}
                        scroll={{ x: 'max-content' }}
                    />
                    
                    {adi.data.url === "acc://dn.acme" ? (
                        <MinorBlocks url={adi.data.url} />
                    ) :
                    null}

                    <TxChain url={adi.data.url} type='pending' />

                </div>
            ) :
                <div>
                    <div>
                        <Title level={4}>
                            <IconContext.Provider value={{ className: 'react-icons' }}>
                            <RiInformationLine />
                            </IconContext.Provider>
                            {type} Info
                        </Title>
                        <div className="skeleton-holder">
                            <Skeleton active />
                        </div>
                        <Title level={4}>
                            <IconContext.Provider value={{ className: 'react-icons' }}>
                            <RiFolder2Line />
                            </IconContext.Provider>
                            {type} Directory
                        </Title>
                        <Title level={4}>
                            <IconContext.Provider value={{ className: 'react-icons' }}>
                            <RiExchangeLine />
                            </IconContext.Provider>
                            Transactions
                        </Title>
                        <Title level={4}>
                            <IconContext.Provider value={{ className: 'react-icons' }}>
                            <RiShieldCheckLine />
                            </IconContext.Provider>
                            Signature Chain
                        </Title>
                        <div className="skeleton-holder">
                            <Skeleton active />
                        </div>
                    </div>
                </div>
            }
        </div>
    );
}

export default ADI;
