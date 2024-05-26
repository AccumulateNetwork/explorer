import { Button, Typography } from 'antd';
import { useState } from 'react';
import { IconContext } from 'react-icons';
import { RiAccountCircleLine } from 'react-icons/ri';
import { Link } from 'react-router-dom';

import { tokenAmount, tokenAmountToLocaleString } from './Amount';

const { Text, Paragraph } = Typography;

export default function TxTo(props) {
  const data = props.data; //Always an array
  const [showAll, setShowAll] = useState(false);
  const token = props.token;
  const items = data.slice(0, showAll ? data.length : 5).map((item, index) => (
    <Paragraph key={{ index }}>
      {item.url ? (
        <Link to={'/acc/' + item.url.replace('acc://', '')}>
          <IconContext.Provider value={{ className: 'react-icons' }}>
            <RiAccountCircleLine />
          </IconContext.Provider>
          {item.url}
        </Link>
      ) : (
        <Text disabled>N/A</Text>
      )}
      <br />
      {item.amount && token ? (
        <span>
          <Text>{tokenAmount(item.amount, token.precision, token.symbol)}</Text>
          <br />
          <Text className="formatted-balance">
            {tokenAmountToLocaleString(
              item.amount,
              token.precision,
              token.symbol,
            )}
          </Text>
        </span>
      ) : null}
    </Paragraph>
  ));
  let extra = data.length - 5;
  if (extra > 0 && !showAll) {
    items.push(
      <Paragraph key={'more'}>
        <Button onClick={(e) => setShowAll(true)}>+{extra} more</Button>
      </Paragraph>,
    );
  }
  return <span className="break-all">{items}</span>;
}
