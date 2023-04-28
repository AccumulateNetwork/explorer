import React from 'react';

import { Link } from 'react-router-dom';

import {
    Typography, List
} from 'antd';

import { IconContext } from "react-icons";
import {
    RiStarLine, RiAccountCircleLine
} from 'react-icons/ri';

import Count from '../common/Count';

const { Title } = Typography;

const Favourites = () => {

    const favourites = JSON.parse(localStorage.getItem('favourites')) || [];
    //const [favourites, setFavourites] = useState(localStorage.getItem('favourites'));
    //const [pagination, setPagination] = useState({pageSize: 10, showSizeChanger: true, pageSizeOptions: ['10', '20', '50', '100'], current: 1});
    //const [totalFavourites, setTotalFavourites] = useState(0);

    return (
        <div>
            <Title level={4}>
                <IconContext.Provider value={{ className: 'react-icons' }}>
                    <RiStarLine />
                </IconContext.Provider>
                Favourites
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