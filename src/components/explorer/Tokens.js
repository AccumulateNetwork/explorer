import React, { useEffect } from 'react';

import { useQuery } from "@apollo/client";
import gql from "graphql-tag";

import {
  Typography
} from 'antd';

const { Title, Paragraph } = Typography;

const Tokens = () => {

    const tokens = gql`
        query {
            tokens (limit: 100) {
                _id
                name
                symbol
                logo
                url
            }
        }
    `;

    const { loading, error, data } = useQuery(tokens);

    function Tokens(props) {
        const data = props.data;
        console.log(data);
        const items = data.map((item, index) =>
          <Paragraph key={{index}}>
            {item.name} ({item.symbol})
          </Paragraph>
      );
      return (
        <span>{items}</span>
      );
    }

    useEffect(() => {
      document.title = "Tokens | Accumulate Explorer";
      
    }, []);

    return (
        <div>
            <Title level={2}>Tokens</Title>
            {loading ? (
                <div>Loading...</div>
            ) : 
            null}
            {error ? (
                <div>Loading...</div>
            ) : 
            null}
            {data ? (
                <Tokens data={data.tokens} />
            ) : 
            null}
        </div>
    );
};

export default Tokens;
