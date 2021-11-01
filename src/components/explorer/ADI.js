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
    RiInformationLine, RiQuestionLine
} from 'react-icons/ri';

import RPC from './../common/RPC';

const { Title } = Typography;

const ADI = ({ match }) => {

    const [adi, setADI] = useState(null);
    const [error, setError] = useState(null);

    const getADI = async (url) => {
        document.title = "ADI " + url + " | Accumulate Explorer";
        setADI(null);
        setError(null);
        try {
            let params = {url: url};
            const response = await RPC.request("adi", params);
            if (response.data && response.type === "adi") {
                setADI(response.data);
            } else {
                throw new Error("ADI not found"); 
            }
        }
        catch(error) {
            setADI(null);
            setError("ADI " + url + " not found");
        }
    }

    useEffect(() => {
        getADI(match.params.url);
    }, [match.params.url]);

    return (
        <div>
            <Title level={2}>ADI</Title>
            <Title level={4} type="secondary" style={{ marginTop: "-10px" }} className="break-all" copyable>{match.params.url}</Title>
                {adi ? (
                    <div>
                        <Title level={4}>
                          <IconContext.Provider value={{ className: 'react-icons' }}>
                            <RiInformationLine />
                          </IconContext.Provider>
                          ADI Info
                        </Title>
                        <Descriptions bordered column={1} size="middle">
                            <Descriptions.Item label={<span><nobr><IconContext.Provider value={{ className: 'react-icons' }}><Tooltip overlayClassName="explorer-tooltip" title="ADI URL description"><RiQuestionLine /></Tooltip></IconContext.Provider>ADI URL</nobr></span>}>
                                {adi.url}
                            </Descriptions.Item>
                            <Descriptions.Item label={<span><nobr><IconContext.Provider value={{ className: 'react-icons' }}><Tooltip overlayClassName="explorer-tooltip" title="Public key description"><RiQuestionLine /></Tooltip></IconContext.Provider>Public key</nobr></span>}>
                                {adi.publicKey}
                            </Descriptions.Item>
                        </Descriptions>
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
                            </div>
                        }
                    </div>
                }
        </div>
    );
}

export default ADI;
