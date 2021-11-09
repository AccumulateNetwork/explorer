import React, { useState, useEffect } from 'react';

import {
  Typography,
  Descriptions,
  Skeleton,
  Alert,
  Tooltip
} from 'antd';

import { IconContext } from "react-icons";
import {
    RiInformationLine, RiQuestionLine, RiFolder2Line
} from 'react-icons/ri';

import RPC from './../common/RPC';
import tooltipDescs from './../common/TooltipDescriptions';

const { Title, Paragraph, Text } = Typography;

const ADI = ({ match }) => {

    const [adi, setADI] = useState(null);
    const [directory, setDirectory] = useState(null);
    const [error, setError] = useState(null);

    const getADI = async (url) => {
        document.title = "ADI " + url + " | Accumulate Explorer";
        setADI(null);
        setDirectory(null);
        setError(null);
        try {
            let params = {url: url};
            const response = await RPC.request("adi", params);
            if (response.data && response.type === "adi") {
                setADI(response.data);
            } else {
                throw new Error("ADI " + url + " not found"); 
            }

            const response2 = await RPC.request("get-directory", params);
            if (response2.data && response2.type === "directory") {
                setDirectory(response2.data);
            } else {
                throw new Error("Directory for ADI " + url + " not found"); 
            }
        }
        catch(error) {
            setADI(null);
            setDirectory(null);
            setError(error.message);
        }
    }

    useEffect(() => {
        getADI(match.params.url);
    }, [match.params.url]);

    return (
        <div>
            <Title level={2}>ADI</Title>
            <Title level={4} type="secondary" style={{ marginTop: "-10px" }} className="break-all" copyable>{match.params.url}</Title>
                {adi && directory ? (
                    <div>
                        <Title level={4}>
                          <IconContext.Provider value={{ className: 'react-icons' }}>
                            <RiInformationLine />
                          </IconContext.Provider>
                          ADI Info
                        </Title>
                        <Descriptions bordered column={1} size="middle">

                            {adi.url ? (
                                <Descriptions.Item label={<span><nobr><IconContext.Provider value={{ className: 'react-icons' }}><Tooltip overlayClassName="explorer-tooltip" title={tooltipDescs.adiUrl}><RiQuestionLine /></Tooltip></IconContext.Provider>ADI URL</nobr></span>}>
                                    {adi.url}
                                </Descriptions.Item>
                            ) :
                                null
                            }

                            {adi.publicKey ? (
                                <Descriptions.Item label={<span><nobr><IconContext.Provider value={{ className: 'react-icons' }}><Tooltip overlayClassName="explorer-tooltip" title={tooltipDescs.pubKey}><RiQuestionLine /></Tooltip></IconContext.Provider>Public key</nobr></span>}>
                                    {adi.publicKey}
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

                        {directory && directory.entries ? (
                            <div>{directory.entries.map(entry => <Paragraph>{entry}</Paragraph>)}</div>
                        ) :
                            <Paragraph><Text type="secondary">No entries</Text></Paragraph>
                        }
                        
                    </div>
                ) :
                    <div>
                        {error ? (
                            <div className="skeleton-holder">
                                <Alert message={error} type="error" showIcon />
                            </div>
                        ) :
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
                        }
                    </div>
                }
        </div>
    );
}

export default ADI;
