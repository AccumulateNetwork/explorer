import { useState } from 'react';
import { Link } from 'react-router-dom';
import { IconContext } from "react-icons";
import {
    RiAccountCircleLine
} from 'react-icons/ri';

import {
    Typography, Button
} from 'antd';

const { Text, Paragraph } = Typography;

export default function TxOperations(props) {
    const data = props.data; //Always an array
    const [showAll, setShowAll] = useState(false);
    const items = data.slice(0, showAll ? data.length : 5).map((item, index) =>
        <Paragraph key={{index}}>
            {item?.entry?.delegate ? (
                <Link to={'/acc/' + item.entry.delegate.replace("acc://", "")}>
                    <IconContext.Provider value={{ className: 'react-icons' }}><RiAccountCircleLine /></IconContext.Provider>{item.entry.delegate}
                </Link>
            ) :
                <Text disabled>N/A</Text>
            }
            <br />
            {(item.type) ? (
                <span>
                    <Text>{item.type}</Text>
                </span>
            ) :
                null
            }
        </Paragraph>
    );
    let extra = data.length - 5;
    if (extra > 0 && !showAll) {
        items.push(<Paragraph key={"more"}><Button onClick={e => setShowAll(true) } >+{extra} more</Button></Paragraph>);
    }
    return (
        <span className="break-all">{items}</span>
    );
}
