import React, { useEffect } from 'react';

import { Link } from 'react-router-dom';

import {
    Typography,
    List,
    Tag
} from 'antd';

import { IconContext } from "react-icons";
import {
    RiAccountBoxLine
} from 'react-icons/ri';

import Count from './Count';

const { Title } = Typography;

const Authorities = props => {

    const render = (authorities) => {
        if (authorities) {
            return  <div>
                <Title level={4}>
                    <IconContext.Provider value={{ className: 'react-icons' }}>
                    <RiAccountBoxLine />
                    </IconContext.Provider>
                    Authorities
                    <Count count={authorities.length} />
                </Title>
                <List
                    size="small"
                    bordered
                    dataSource={authorities}
                    renderItem={item => <List.Item>
                        <Link to={'/acc/' + item.url.replace("acc://", "")}><IconContext.Provider value={{ className: 'react-icons' }}><RiAccountBoxLine /></IconContext.Provider>{item.url}{item.disabled ? <Tag color="volcano" style={{marginLeft: 10}}>disabled</Tag> : null}</Link>
                    </List.Item>}
                    style={{ marginBottom: "30px" }}
                />
            </div>;
        } else {
            return null;
        }
    }

    useEffect(() => {
        render(props.items);
    }, [props.items]);

    return render(props.items);

};

export default Authorities;