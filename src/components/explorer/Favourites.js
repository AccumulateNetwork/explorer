import React, { useEffect } from 'react';

import { Link } from 'react-router-dom';

import {
    Typography, List
} from 'antd';

import { IconContext } from "react-icons";
import {
    RiAccountCircleLine
} from 'react-icons/ri';

import Count from '../common/Count';

const { Title } = Typography;

const Favourites = () => {

    const favourites = JSON.parse(localStorage.getItem('favourites')) || [];
    useEffect(() => {
        document.title = "Favourites | Accumulate Explorer";
    }, []);

    return (
        <div>
            <Title level={2}>Favourites
                {favourites ? <Count count={favourites.length} /> : null}
            </Title>
            
            <List
                bordered
                dataSource={favourites}
                renderItem={(address) => <List.Item>
                    <Link to={'/acc/' + address.replace("acc://", "")}><IconContext.Provider value={{ className: 'react-icons' }}><RiAccountCircleLine /></IconContext.Provider>{address}</Link>
                    </List.Item>}
            />

        </div>
    );
}

export default Favourites;