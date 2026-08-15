import React from 'react';
import json from 'react-syntax-highlighter/dist/esm/languages/hljs/json';
import SyntaxHighlighter from 'react-syntax-highlighter/dist/esm/light';
import { colorBrewer } from 'react-syntax-highlighter/dist/esm/styles/hljs';

// The default react-syntax-highlighter entry point bundles highlight.js with
// all ~190 grammars — 1.2 MB, on the landing page's critical path via Block.
// Every call site in this app highlights JSON, whose grammar is 1.4 KB (#52).
SyntaxHighlighter.registerLanguage('json', json);

/** JSON, syntax highlighted. The only language this app highlights. */
export function Json({
  children,
  ...rest
}: {
  children: string;
} & Omit<
  React.ComponentProps<typeof SyntaxHighlighter>,
  'language' | 'style'
>) {
  return (
    <SyntaxHighlighter language="json" style={colorBrewer} {...rest}>
      {children}
    </SyntaxHighlighter>
  );
}
