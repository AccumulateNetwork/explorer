import React, { useEffect } from 'react';

import {
  Typography
} from 'antd';

import { IconContext } from "react-icons";
import {
    RiExternalLinkLine
} from 'react-icons/ri';


const { Title } = Typography;

const Validators = () => {

    useEffect(() => {
      document.title = "Validators | Accumulate Explorer";
    }, []);

    return (
        <div>
            <Title level={2}>Validators</Title>
            <div class="featured">
                Learn more about Accumulate validators and staking: <a href="https://accumulatenetwork.io/learn/#validators" target="_blank" rel="noopener noreferrer">
                    <strong>accumulatenetwork.io<IconContext.Provider value={{ className: 'react-icons react-icons-end' }}><RiExternalLinkLine /></IconContext.Provider></strong>
                </a>
            </div>
        </div>
    );
};

export default Validators;
