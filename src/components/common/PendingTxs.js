import React, { useState, useEffect } from 'react';

import { Link } from 'react-router-dom';

import {
  Typography,
  Tooltip,
  Skeleton,
  Table
} from 'antd';

import { IconContext } from "react-icons";
import {
    RiInformationLine, RiQuestionLine, RiFolder2Line, RiStackLine, RiTimerLine
} from 'react-icons/ri';

import RPC from './RPC';
import tooltipDescs from './TooltipDescriptions';

const { Title, Text } = Typography;

const PendingTxs = props => {

    const adi = props.adi;
    const [pendingTxs, setPendingTxs] = useState(null);
    const [tableIsLoading, setTableIsLoading] = useState(true);
    const [pagination, setPagination] = useState({pageSize: 10, showSizeChanger: true, pageSizeOptions: ['10', '20', '50', '100'], current: 1});

    const columns = [
        {
            title: 'TRANSACTION ID',
            render: (row) => {
                if (row) {
                    return (
                        <Link to={'/tx/' + row.data}>
                            <IconContext.Provider value={{ className: 'react-icons' }}><RiTimerLine /></IconContext.Provider>{row.data}
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

    const getPending = async (params = pagination) => {
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
          const response = await RPC.request("query", { url: adi+"#chain/pending", start: start, count: count } );
          if (response && response.items) {

            // workaround API bug response
            if (response.start === null || response.start === undefined) {
                response.start = 0;
            }

            setPendingTxs(response.items);
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
        getPending();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div>
            {adi && pendingTxs ? (
                <div>
                    <Title level={4}>
                        <IconContext.Provider value={{ className: 'react-icons' }}>
                        <RiTimerLine />
                        </IconContext.Provider>
                        Pending Transactions
                    </Title>

                    <Table
                        dataSource={pendingTxs}
                        columns={columns}
                        pagination={pagination}
                        rowKey="txid"
                        loading={tableIsLoading}
                        onChange={getPending}
                        scroll={{ x: 'max-content' }}
                    />
                </div>
            ) :
                <div>
                    <div>
                        <Title level={4}>
                            <IconContext.Provider value={{ className: 'react-icons' }}>
                            <RiTimerLine />
                            </IconContext.Provider>
                            Pending Transactions
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

export default PendingTxs;