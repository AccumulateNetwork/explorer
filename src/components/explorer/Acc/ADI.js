import React, { useState, useEffect } from 'react';

import { Link } from 'react-router-dom';

import {
  Typography,
  Descriptions,
  Tooltip,
  Skeleton,
  Table
} from 'antd';

import { IconContext } from "react-icons";
import {
    RiInformationLine, RiQuestionLine, RiFolder2Line, RiStackLine, RiLinksLine
} from 'react-icons/ri';

import RPC from '../../common/RPC';
import tooltipDescs from '../../common/TooltipDescriptions';

const { Title, Text } = Typography;

const ADI = props => {

    const adi = props.data;
    const [directory, setDirectory] = useState(null);
    const [tableIsLoading, setTableIsLoading] = useState(true);
    const [pagination, setPagination] = useState({pageSize: 10, showSizeChanger: true, pageSizeOptions: ['10', '20', '50', '100'], current: 1});

    const columns = [
        {
            title: 'Key Books',
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
          if (response && response.data) {

            // workaround API bug response
            if (response.data.start === null || response.data.start === undefined) {
                response.data.start = 0;
            }

            setDirectory(response.data.entries);
            setPagination({...pagination, current: (response.data.start/response.data.count)+1, pageSize: response.data.count, total: response.data.total, showTotal: (total, range) => `${showTotalStart}-${Math.min(response.data.total, showTotalFinish)} of ${response.data.total}`});
          } else {
            throw new Error("ADI Directory not found"); 
          }
        }
        catch(error) {
          // error is managed by RPC.js, no need to display anything
        }
        setTableIsLoading(false);
    }

    useEffect(() => {
        getDirectory();
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
                        ADI Info
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
                                <Link to={'/chain/' + adi.data.keyBook.replace("acc://", "")}>
                                    <IconContext.Provider value={{ className: 'react-icons' }}><RiLinksLine /></IconContext.Provider>{adi.data.keyBook}
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
                        ADI Directory
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
                    
                </div>
            ) :
                <div>
                    <div>
                        <Title level={4}>
                            <IconContext.Provider value={{ className: 'react-icons' }}>
                            <RiInformationLine />
                            </IconContext.Provider>
                            ADI Info
                        </Title>
                        <div className="skeleton-holder">
                            <Skeleton active />
                        </div>
                        <Title level={4}>
                            <IconContext.Provider value={{ className: 'react-icons' }}>
                            <RiFolder2Line />
                            </IconContext.Provider>
                            ADI Directory
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
