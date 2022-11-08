import React, { useState, useEffect } from 'react';

import { Link } from 'react-router-dom';

import {
  Typography,
  Skeleton,
  Table,
  Tag
} from 'antd';

import { IconContext } from "react-icons";
import {
    RiExchangeLine, RiShieldCheckLine, RiTimerLine
} from 'react-icons/ri';

import Count from './Count';
import RPC from './RPC';

const { Title, Text } = Typography;

const TxChain = props => {
    let type = props.type ? props.type : "transaction"
    let header
    switch (type) {
        case "pending":
            header = "Pending Transactions"
            break
        case "signature":
            header = "Signature Chain"
            break
        default:
            header = "Transaction History"
            break
    }
    
    const [txChain, setTxChain] = useState(null);
    const [tableIsLoading, setTableIsLoading] = useState(true);
    const [pagination, setPagination] = useState({pageSize: 10, showSizeChanger: true, pageSizeOptions: ['10', '20', '50', '100'], current: 1});
    const [totalEntries, setTotalEntries] = useState(-1);

    const columns = [
        {
            title: 'Transaction ID',
            className: 'align-top no-break',
            render: (row) => {
                if (row && row.txid) {
                    return (
                        <div>
                            <Link to={'/acc/' + row.txid.replace("acc://", "")}>
                                <IconContext.Provider value={{ className: 'react-icons' }}><Icon /></IconContext.Provider>{row.txid}
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
            className: 'align-top no-break',
            render: (row) => {
                if (row && row.type) {
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

    function Icon() {
        switch (type) {
            case "pending":
                return (<RiTimerLine />)
            case "signature":
                return (<RiShieldCheckLine />)
            default:
                return (<RiExchangeLine />)
        }
    }

    const getTxChain = async (params = pagination) => {
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
          let response;
          if (type === 'pending')
            response = await RPC.request("query", { url: props.url + `#${type}` } );
          else
            response = await RPC.request("query", { url : props.url + `?start=${start}&count=${count}#${type}` } );

            if (response) {
            // workaround API bug response
            if (response.start === null || response.start === undefined) {
                response.start = 0;
            }
            setTxChain(response.items);
            setPagination({...pagination, current: (response.start/response.count)+1, pageSize: response.count, total: response.total, showTotal: (total, range) => `${showTotalStart}-${Math.min(response.total, showTotalFinish)} of ${response.total}`});
            setTotalEntries(response.total);
          } else {
            throw new Error("Chain not found"); 
          }
        }
        catch(error) {
          // error is managed by RPC.js, no need to display anything
        }
        setTableIsLoading(false);
    }

    useEffect(() => {
        getTxChain();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div>
            {props.url && type ? (
                <div>
                    <Title level={4} style={{ marginTop: 30 }}>
                        <IconContext.Provider value={{ className: 'react-icons' }}>
                        <Icon/>
                        </IconContext.Provider>
                        {header}
                        <Count count={totalEntries ? totalEntries : 0} />
                    </Title>

                    <Table
                        dataSource={txChain}
                        columns={columns}
                        pagination={pagination}
                        rowKey="txid"
                        loading={tableIsLoading}
                        onChange={getTxChain}
                        scroll={{ x: 'max-content' }}
                    />
                </div>
            ) :
                <div>
                    <div>
                        <Title level={4}>
                            <IconContext.Provider value={{ className: 'react-icons' }}>
                            <Icon/>
                            </IconContext.Provider>
                            {header}
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

export default TxChain;