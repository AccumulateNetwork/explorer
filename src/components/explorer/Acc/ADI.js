import React, { useState, useEffect } from 'react';

import {
  Typography,
  Descriptions,
  Tooltip
} from 'antd';

import { IconContext } from "react-icons";
import {
    RiInformationLine, RiQuestionLine
} from 'react-icons/ri';

import RPC from '../../common/RPC';
import tooltipDescs from '../../common/TooltipDescriptions';

const { Title } = Typography;

const ADI = props => {

    const adi = props.data;
    const [directory, setDirectory] = useState(null);
    const [error, setError] = useState(null);

    const getDirectory = async (url) => {
        setDirectory(null);
        setError(null);
        try {
            let params = {url: adi.data.url};
            const response = await RPC.request("query-directory", params);
            if (response.data && response.type === "adi") {
                setDirectory(response.data);
            } else {
                throw new Error("Directory of ADI " + url + " not found"); 
            }
        }
        catch(error) {
            setDirectory(null);
            setError(error.message);
        }
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
                                {adi.data.keyBook}
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
                </div>
            ) :
                null
            }
        </div>
    );
}

export default ADI;
