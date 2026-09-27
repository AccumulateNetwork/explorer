import { Input, Select, Skeleton, Typography } from 'antd';
import { TextProps } from 'antd/lib/typography/Text';
import { Base64 } from 'js-base64';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import { Json } from './Json';

type ContentType = 'Text' | 'JSON' | 'Base64' | 'Hex';

const { Option } = Select;
const { Text } = Typography;
const utf8 = new TextDecoder('utf8', { fatal: true });

export function Content(props: {
  children: string | Uint8Array;
  compact?: boolean;
  type?: ContentType;
}) {
  // Key everything on the payload's content, not its identity: a parent that
  // hands us a fresh but identical Uint8Array must not re-run detection (which
  // would reset the user's chosen view), while a different payload must (#42).
  const contentKey = `${props.children}`;
  const payload = useRef({ key: contentKey, children: props.children });
  if (payload.current.key !== contentKey) {
    payload.current = { key: contentKey, children: props.children };
  }
  const children = payload.current.children;

  const { bytes, textRaw, textHex, text64 } = useMemo(() => {
    const bytes =
      children instanceof Uint8Array
        ? children
        : Buffer.from(children, 'utf-8');
    const textRaw =
      typeof children === 'string'
        ? children
        : Buffer.from(children).toString('utf-8');
    return {
      bytes,
      textRaw,
      textHex: bytes.toString('hex'),
      text64: Base64.fromUint8Array(bytes),
    };
  }, [children]);

  // Use states because that should limit how often React re-executes this code
  const [type, setType] = useState(props.type || 'Text');
  const [textJSON, setTextJSON] = useState(null);
  useEffect(() => {
    if (props.type) {
      setType(props.type);
      return;
    }

    // Re-detect for every new payload, and clear textJSON on the non-JSON
    // paths: this component is reused across navigations, and a stale
    // textJSON left a phantom "JSON" option in the selector for payloads
    // that are not JSON (#42).
    try {
      utf8.decode(bytes);
      try {
        setTextJSON(JSON.stringify(JSON.parse(textRaw), null, 4));
        setType('JSON');
      } catch {
        // Not valid JSON
        setTextJSON(null);
        setType('Text');
      }
    } catch {
      // Not valid UTF-8
      setTextJSON(null);
      setType('Hex');
    }
  }, [bytes, textRaw, props.type]);

  const [current, setCurrent] = useState(null);
  const [currentShort, setCurrentShort] = useState(null);

  useEffect(() => {
    switch (type) {
      case 'Base64':
        setCurrent(text64);
        break;
      case 'Text':
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
    // Keyed on the payload as well as the mode: with [type] alone, navigating
    // /data/<hashA> -> /data/<hashB> where both entries are the same type
    // (usually Text) never recomputed `current`, so entry A's payload rendered
    // under entry B's txid (#42).
  }, [type, textJSON, textRaw, text64, textHex]);

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

  const cssClass = props.compact ? 'extid-compact' : '';

  const handleChange = (event) => {
    setType(event);
  };

  const handleClick = (type) => {
    if (props.type) {
      return;
    }

    switch (type) {
      case 'JSON':
        setType('Text');
        break;
      case 'Text':
        setType('Base64');
        break;
      case 'Base64':
        setType('Hex');
        break;
      case 'Hex':
        setType(textJSON ? 'JSON' : 'Text');
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
          <Option value="Text">Text</Option>
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

Content.Render = function Render({
  as,
  text,
  ...attrs
}: Omit<TextProps, 'children'> & { as: ContentType; text: string }) {
  switch (as) {
    case 'JSON':
      return (
        <Text {...attrs}>
          <Json>{text}</Json>
        </Text>
      );
    case 'Text':
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
  const linkRegex = /(https?|acc):\/\/[\w-._#?=%/]+/;

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
