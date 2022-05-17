import React, { useState, useEffect } from 'react';
//import moment from 'moment';
import moment from 'moment-timezone';

import { Link } from 'react-router-dom';

import {
  Typography,
  Skeleton,
  Table
} from 'antd';

import { IconContext } from "react-icons";
import {
    RiCheckboxMultipleBlankLine
} from 'react-icons/ri';

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
            title: 'Height',
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
            title: 'TimeStamp (UTC' + (utcOffset < 0 ? '-' : '+') + utcOffset + ')',
            render: (row) => {
                if (row) {
                    return (
                        <Text>{moment(row.blockTime).format('YYYY-MM-DD hh:mm')}</Text>                        
                    )
                } else {
                    return (
                        <Text disabled>N/A</Text>
                    )
                }
            }
        },
        {
            title: 'Entries',
            render: (row) => {
                if (row) {
                    return (
                        <Text>{row.txCount}</Text>                        
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
        return (<RiCheckboxMultipleBlankLine />)
    }

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
          const response = await RPC.request("query-minor-blocks", { url: "acc://bn", start: start, count: count } );
          if (response && response.type === 'minorBlock') {

            // workaround API bug response
            if (response.start === null || response.start === undefined) {
                response.start = 1;  // in `query-minor-blocks` API the first item has index 1, not 0
            }
            setMinorBlocks(response.items);
            setPagination({...pagination, current: (response.start/response.count)+1, pageSize: response.count, total: response.total, showTotal: (total, range) => `${showTotalStart}-${Math.min(response.total, showTotalFinish)} of ${response.total}`});
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
            {props.data.data.url === 'acc://dn' ? (
                <div>
                    <Title level={4} style={{ marginTop: 30 }}>
                        <IconContext.Provider value={{ className: 'react-icons' }}>
                            <Icon/>
                        </IconContext.Provider>
                        {header}
                        <Count count={totalEntries ? totalEntries : 0} />
                    </Title>

                    <Table
                        dataSource={minorBlocks}
                        columns={columns}
                        pagination={pagination}
                        rowKey="txid"
                        loading={tableIsLoading}
                        onChange={getMinorBlocks}
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

export default MinorBlocks;