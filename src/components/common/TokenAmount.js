//TODO Refactor parseFloat(tokenAccount.data.balance/(10**token.precision)).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})} {token.symbol}

export default function tokenAmount(amount, precision, symbol) {
    let symbolStr = symbol ? " " + symbol : ""

    if (precision === 0) {
        return amount.toString() + symbolStr;
    } else {
        return (amount / (10 ** precision)).toFixed(precision).replace(/\.?0+$/, "") + symbolStr;
    }
}

