import { URL } from 'accumulate.js';
import { Link } from 'react-router-dom';

const AccLink = (props) => {
  const url = URL.parse(props.to);
  return (
    <Link to={`/acc/${url.toString().substring('acc://'.length)}`}>
      {props.children}
    </Link>
  );
};

export default AccLink;
