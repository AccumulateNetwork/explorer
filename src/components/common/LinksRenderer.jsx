export default function wrapLinksInHtml(text) {
  // Regular expression to match http(s), acc://, and ftp:// links
  const linkRegex = /(https?|ftp|acc):\/\/[^\s/$.?#].[^\s]*[^\s.,]/gi;

  // Replace matched links with <a> tags
  const taggedText = text.replace(linkRegex, (match) => {
    if (match.startsWith('http') || match.startsWith('https')) {
      return `<a href="${match}" target="_blank" rel="noopener noreferrer">${match}</a>`;
    } else if (match.startsWith('acc://')) {
      let url = '/acc/' + match.replace('acc://', '');
      return `<a href="${url}" target="_blank" rel="noopener noreferrer">${match}</a>`;
    }
    return match; // Return the original match if not http(s) or acc://
  });

  return taggedText;
}
