import { useState } from 'react';
import { Link } from 'react-router-dom';
import { IconContext } from "react-icons";
import {
    RiAccountCircleLine
} from 'react-icons/ri';

import {
    Button, List
} from 'antd';

export default function TxOperations(props) {
    const data = props.data; //Always an array
    const [showAll, setShowAll] = useState(false);
    const items = data.slice(0, showAll ? data.length : 5).map((item, index) =>
        <List.Item key={{index}}>
            {item.type &&
                <>
                    Type: {item.type}
                </>
            }
            {item?.entry?.delegate &&
                <>
                    <br />
                    <Link to={'/acc/' + item.entry.delegate.replace("acc://", "")}>
                        <IconContext.Provider value={{ className: 'react-icons' }}><RiAccountCircleLine /></IconContext.Provider>{item.entry.delegate}
                    </Link>
                </>
            }
            {item?.authority &&
                <>
                    <br />
                    <Link to={'/acc/' + item.authority.replace("acc://", "")}>
                        <IconContext.Provider value={{ className: 'react-icons' }}><RiAccountCircleLine /></IconContext.Provider>{item.authority}
                    </Link>
                </>
            }
        </List.Item>
    );
    let extra = data.length - 5;
    if (extra > 0 && !showAll) {
        items.push(<List.Item key={"more"}><Button onClick={e => setShowAll(true) } >+{extra} more</Button></List.Item>);
    }
    return (
        <List>
            {items}
        </List>
    );
}
