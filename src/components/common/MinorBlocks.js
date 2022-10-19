import React, { useState, useEffect } from 'react';
import moment from 'moment-timezone';

import { Link } from 'react-router-dom';

import {
  Typography,
  Skeleton,
  Table
} from 'antd';

import Count from './Count';
import RPC from './RPC';

const { Title, Text } = Typography;

const MinorBlocks = props => {
    //let type = props.type ? props.type : 'main'
    let header = 'Minor Blocks'
    
    const [minorBlocks, setMinorBlocks] = useState(null);
    const [tableIsLoading, setTableIsLoading] = useState(true);
    const [pagination, setPagination] = useState({pageSize: 10, showSizeChanger: true, pageSizeOptions: ['10', '20', '50', '100'], current: 1});
    const [totalEntries, setTotalEntries] = useState(-1);
    
    //let tz = moment.tz.guess();
    let utcOffset = moment().utcOffset() / 60;

    const columns = [
        {
            title: 'Block',
            className: 'code',
            width: 30,
            render: (row) => {
                if (row) {
                    return (
                        <div>
                            <Link to={'/block/' + row.blockIndex}>
                                {row.blockIndex}
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
            title: 'Timestamp (UTC' + (utcOffset < 0 ? '-' : '+') + utcOffset + ')',
            className: 'code',
            width: 180,
            render: (row) => {
                var blockTime = moment(row.blockTime);
                if (row) {
                    if (row.blockTime) {
                        return (
                            <Text>{blockTime.format("YYYY-MM-DD HH:mm")}</Text>                        
                        )    
                    } else {
                        return (
                            <Text disabled>N/A</Text>
                        )
                    }
                } else {
                    return (
                        <Text disabled>N/A</Text>
                    )
                }
            }
        },
        {
            title: 'Transactions',
            className: 'code',
            render: (row) => {
                if (row) {
                    if (row.txCount) {
                        return (
                            <Text>{row.txCount}</Text>                        
                        )    
                    } else {
                        return (
                            <Text>0</Text>
                        )
                    }
                } else {
                    return (
                        <Text>0</Text>
                    )
                }
            }
        }
    ];

    const getMinorBlocks = async (params = pagination) => {
        setTableIsLoading(true);
    
        let start = 1; // in `query-minor-blocks` API the first item has index 1, not 0
        let count = 10;
        let showTotalStart = 1;
        let showTotalFinish = 10;
    
        if (params) {
            start = (params.current-1)*params.pageSize+1; // in `query-minor-blocks` API the first item has index 1, not 0
            count = params.pageSize;
            showTotalStart = (params.current-1)*params.pageSize+1;
            showTotalFinish = params.current*params.pageSize;
        }
    
        try {
          const response = await RPC.request("query-minor-blocks", { url: props.url, start: start, count: count } );
          if (response && response.type === 'minorBlock') {
            console.log(response.items.slice(0, response.count));
            setMinorBlocks(response.items.slice(0, response.count));
            setPagination({...pagination, current: ((response.start-1)/response.count)+1, pageSize: response.count, total: response.total, showTotal: (total, range) => `${showTotalStart}-${Math.min(response.total, showTotalFinish)} of ${response.total}`}); // in `query-minor-blocks` API the first item has index 1, not 0
            setTotalEntries(response.total);
          } else {
            throw new Error("Transaction chain not found"); 
          }
        }
        catch(error) {
          // error is managed by RPC.js, no need to display anything
        }
        setTableIsLoading(false);
    }

    useEffect(() => {
        getMinorBlocks();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div>
            {props.url ? (
                <div>
                    <Title level={3} style={{ marginTop: 30 }}>
                        {header}
                        <Count count={totalEntries ? totalEntries : 0} />
                    </Title>

                    <Table
                        dataSource={minorBlocks}
                        columns={columns}
                        pagination={pagination}
                        loading={tableIsLoading}
                        onChange={getMinorBlocks}
                        scroll={{ x: 'max-content' }}
                    />
                </div>
            ) :
                <div>
                    <div>
                        <Title level={3}>
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

export default MinorBlocks;