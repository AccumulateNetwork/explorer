import { Button, List, Tag } from 'antd';
import { useState } from 'react';
import { IconContext } from 'react-icons';
import { RiAccountCircleLine } from 'react-icons/ri';
import { Link } from 'react-router-dom';

export default function TxOperations(props) {
  const data = props.data; //Always an array
  const [showAll, setShowAll] = useState(props.showAll || false);
  const items = data.slice(0, showAll ? data.length : 5).map((item, index) => (
    <List.Item key={{ index }}>
      <div>
        {item.type && <Tag color="default">{item.type}</Tag>}
        {item.threshold && item.threshold}
        {item?.entry?.delegate && (
          <Link to={'/acc/' + item.entry.delegate.replace('acc://', '')}>
            <IconContext.Provider value={{ className: 'react-icons' }}>
              <RiAccountCircleLine />
            </IconContext.Provider>
            {item.entry.delegate}
          </Link>
        )}
        {item?.authority && (
          <Link to={'/acc/' + item.authority.replace('acc://', '')}>
            <IconContext.Provider value={{ className: 'react-icons' }}>
              <RiAccountCircleLine />
            </IconContext.Provider>
            {item.authority}
          </Link>
        )}
      </div>
    </List.Item>
  ));
  let extra = data.length - 5;
  if (extra > 0 && !showAll) {
    items.push(
      <List.Item key={'more'}>
        <Button onClick={(e) => setShowAll(true)}>+{extra} more</Button>
      </List.Item>,
    );
  }
  return <List split={false}>{items}</List>;
}
