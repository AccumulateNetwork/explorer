import React, { useState, useEffect } from 'react';

import { Link } from 'react-router-dom';

import {
  Typography,
  Skeleton,
  Table
} from 'antd';

import { IconContext } from "react-icons";
import {
    RiExchangeLine, RiTimerLine
} from 'react-icons/ri';

import Count from './Count';
import RPC from './RPC';

const { Title, Text } = Typography;

const TxChain = props => {
    let type = props.type ? props.type : 'main'
    let header = (type === 'pending') ? 'Pending Transactions' : 'Transaction History'
    
    const [pendingTxs, setTxChain] = useState(null);
    const [tableIsLoading, setTableIsLoading] = useState(true);
    const [pagination, setPagination] = useState({pageSize: 10, showSizeChanger: true, pageSizeOptions: ['10', '20', '50', '100'], current: 1});

    const columns = [
        {
            title: 'TRANSACTION ID',
            render: (row) => {
                if (row) {
                    return (
                        <Link to={'/tx/' + row.data}>
                            <IconContext.Provider value={{ className: 'react-icons' }}><Icon /></IconContext.Provider>{row.data}
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

    function Icon() {
        if (type === 'pending')
            return (<RiTimerLine />)
        else
            return(<RiExchangeLine />)    
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
          const response = await RPC.request("query", { url: props.adi + "#chain/" + type, start: start, count: count } );
          if (response && response.items) {

            // workaround API bug response
            if (response.start === null || response.start === undefined) {
                response.start = 0;
            }

            setTxChain(response.items);
            setPagination({...pagination, current: (response.start/response.count)+1, pageSize: response.count, total: response.total, showTotal: (total, range) => `${showTotalStart}-${Math.min(response.total, showTotalFinish)} of ${response.total}`});
          } else {
            throw new Error("Pending transactions not found"); 
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
            {props.adi && pendingTxs && type ? (
                <div>
                    <Title level={4}>
                        <IconContext.Provider value={{ className: 'react-icons' }}>
                        <Icon/>
                        </IconContext.Provider>
                        {header}
                        <Count count={pendingTxs.length ? pendingTxs.length : 0} />
                    </Title>

                    <Table
                        dataSource={pendingTxs}
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