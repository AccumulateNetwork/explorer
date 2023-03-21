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

export default function TxTo(props) {
    const data = props.data; //Always an array
    const [showAll, setShowAll] = useState(false);
    const token = props.token;
    const items = data.slice(0, showAll ? data.length : 5).map((item, index) =>
        <Paragraph key={{index}}>
            {item.url ? (
                <Link to={'/acc/' + item.url.replace("acc://", "")}>
                    <IconContext.Provider value={{ className: 'react-icons' }}><RiAccountCircleLine /></IconContext.Provider>{item.url}
                </Link>
            ) :
                <Text disabled>N/A</Text>
            }
            <br />
            {(item.amount && token) ? (
                <span>
                    <Text>{(item.amount/(10**token.precision)).toFixed(token.precision).replace(/\.?0+$/, "")} {token.symbol}</Text>
                    <br /><Text className="formatted-balance">{parseFloat(item.amount/(10**token.precision)).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})} {token.symbol}</Text>
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
