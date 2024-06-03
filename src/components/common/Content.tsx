import { Input, Select, Skeleton, Typography } from 'antd';
import { TextProps } from 'antd/lib/typography/Text';
import { Base64 } from 'js-base64';
import React, { useEffect, useState } from 'react';
import SyntaxHighlighter from 'react-syntax-highlighter';

const { Option } = Select;
const { Text } = Typography;

function isWhitespace(x: number) {
  switch (x) {
    case 0x9:
    case 0xa:
    case 0xd:
    case 0x20:
      return true;
  }
  return false;
}

function isPrintable(x: number) {
  // Non-ASCII
  if (x > 0x7e) return false;

  // Regular characters
  if (x > 0x20) return true;

  // Whitespace
  return isWhitespace(x);
}

type ContentType = 'ASCII' | 'JSON' | 'Base64' | 'Hex';

export function Content(props: {
  children: string | Uint8Array;
  compact?: boolean;
  type?: ContentType;
}) {
  const bytes =
    props.children instanceof Uint8Array
      ? props.children
      : Buffer.from(props.children, 'utf-8');
  const textRaw =
    typeof props.children === 'string'
      ? props.children
      : Buffer.from(props.children).toString('utf-8');
  const textHex = bytes.toString('hex');
  const text64 = Base64.fromUint8Array(bytes);

  // Use states because that should limit how often React re-executes this code
  const [type, setType] = useState(props.type || 'ASCII');
  const [textJSON, setTextJSON] = useState(null);
  useEffect(() => {
    if (props.type) {
      return;
    }

    // TODO: check for valid utf-8 strings
    if (bytes.every(isWhitespace)) {
      // All whitespace
      setType('Hex');
    } else if (!bytes.every(isPrintable)) {
      // Has non-printable characters
      setType('Hex');
    } else if (!props.compact) {
      try {
        setTextJSON(JSON.stringify(JSON.parse(textRaw), null, 4));
        setType('JSON');
      } catch (_) {}
    }
  }, [`${props.children}`, props.type]);

  const [current, setCurrent] = useState(null);
  const [currentShort, setCurrentShort] = useState(null);

  useEffect(() => {
    switch (type) {
      case 'Base64':
        setCurrent(text64);
        break;
      case 'ASCII':
        setCurrent(textRaw);
        break;
      case 'JSON':
        setCurrent(textJSON);
        break;
      case 'Hex':
        setCurrent(textHex);
        break;
      default:
        break;
    }
  }, [type]);

  const shortLimit = 16;
  useEffect(() => {
    if (!current) {
      setCurrentShort('');
      return;
    }
    setCurrentShort(
      current.length > shortLimit
        ? current.substring(0, shortLimit) + '…'
        : current,
    );
  }, [current]);

  let cssClass = props.compact ? 'extid-compact' : '';

  const handleChange = (event) => {
    setType(event);
  };

  const handleClick = (type) => {
    if (props.type) {
      return;
    }

    switch (type) {
      case 'JSON':
        setType('ASCII');
        break;
      case 'ASCII':
        setType('Base64');
        break;
      case 'Base64':
        setType('Hex');
        break;
      case 'Hex':
        setType(textJSON ? 'JSON' : 'ASCII');
        break;
      default:
        break;
    }
  };

  if (current === null) {
    return (
      <Skeleton
        className={'skeleton-singleline'}
        active
        title={true}
        paragraph={false}
      />
    );
  }

  if (!props.children.length) {
    return (
      <Input.Group compact className={'extid extid-' + type + ' ' + cssClass}>
        <Text className="extid-text extid-empty" disabled>
          Empty
        </Text>
      </Input.Group>
    );
  }

  const content = (
    <Content.Render
      className="extid-text"
      copyable={!props.compact}
      as={type}
      text={props.compact ? currentShort : current}
    />
  );

  if (props.type) {
    return (
      <Input.Group compact className={'extid extid-' + type + ' ' + cssClass}>
        {content}
      </Input.Group>
    );
  }

  return (
    <Input.Group compact className={'extid extid-' + type + ' ' + cssClass}>
      {!props.compact ? (
        <Select value={type} className="extid-type" onChange={handleChange}>
          {textJSON && <Option value="JSON">JSON</Option>}
          <Option value="ASCII">ASCII</Option>
          <Option value="Base64">Base64</Option>
          <Option value="Hex">Hex</Option>
        </Select>
      ) : (
        <Text className="extid-type" onClick={() => handleClick(type)}>
          {type}
        </Text>
      )}
      {content}
    </Input.Group>
  );
}

Content.Render = function ({
  as,
  text,
  ...attrs
}: Omit<TextProps, 'children'> & { as: ContentType; text: string }) {
  switch (as) {
    case 'JSON':
      return (
        <Text {...attrs}>
          <SyntaxHighlighter language="json">{text}</SyntaxHighlighter>
        </Text>
      );
    case 'ASCII':
      break;
    default:
      return <Text {...attrs}>{text}</Text>;
  }

  // Split on links
  const children = [];
  const push = (s) =>
    children.push(<span key={`${children.length}`}>{s}</span>);

  // This is conservative to ensure it's not possible to inject dangerous
  // elements
  const linkRegex = /(https?|acc):\/\/[\w-._#?=%\/]+/;

  // This is a for-loop to prevent pathological cases and limit the impact of
  // bugs
  for (let i = 0; i < 1000 && text?.length > 0; i++) {
    const m = linkRegex.exec(text);
    if (!m?.[0]?.length) {
      push(text);
      break;
    }
    if (m.index > 0) {
      push(text.substring(0, m.index));
    }
    push(
      <a href={m[0]} target="_blank" rel="noopener noreferrer">
        {m[0]}
      </a>,
    );
    text = text.substring(m.index + m[0].length);
  }
  return <Text {...attrs}>{children}</Text>;
};
