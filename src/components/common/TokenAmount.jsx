function tokenAmount(amount, precision, symbol) {
  let symbolStr = symbol ? ' ' + symbol : '';

  if (precision === 0) {
    return amount.toString() + symbolStr;
  } else {
    return (
      (amount / 10 ** precision).toFixed(precision).replace(/\.?0+$/, '') +
      symbolStr
    );
  }
}

function tokenAmountToLocaleString(
  amount,
  precision,
  symbol,
  min = 2,
  max = 2,
) {
  let symbolStr = symbol ? ' ' + symbol : '';

  return (
    parseFloat(amount / 10 ** precision).toLocaleString('en-US', {
      minimumFractionDigits: min,
      maximumFractionDigits: max,
    }) + symbolStr
  );
}

export { tokenAmount, tokenAmountToLocaleString };
