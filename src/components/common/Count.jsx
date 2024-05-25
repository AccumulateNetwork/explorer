import React, { useEffect } from 'react';

const Count = (props) => {
  const render = (count) => {
    if (count >= 0) {
      return <span className="count">{count}</span>;
    } else {
      return null;
    }
  };

  useEffect(() => {
    render(props.count);
  }, [props.count]);

  return render(props.count);
};

export default Count;
