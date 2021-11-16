import React, { useEffect } from 'react';

const CreditTransaction = props => {

    const render = (tx) => {
        if (tx) {
            return <span>{tx}</span>;
        } else {
            return null;
        }
    }

    useEffect(() => {
        render(props.tx);
    }, [props.tx]);

    return render(props.tx);

};

export default CreditTransaction;