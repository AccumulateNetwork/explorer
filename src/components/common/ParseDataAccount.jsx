export default function ParseDataAccount(url) {
  let account = url.split('@');
  return 'acc://' + account[account.length - 1];
}
