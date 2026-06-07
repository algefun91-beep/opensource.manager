import React from 'react';
import CodeBlock from './CodeBlock';

function renderInlineMarkdown(text: string, keyPrefix: string) {
  const nodes: React.ReactNode[] = [];
  const regex = /(\*\*([^*]+)\*\*|(?<!\*)\*([^*]+)\*(?!\*)|_([^_]+)_|`([^`]+)`|\[([^\]]+)\]\((https?:\/\/[^)\s]+)\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null = null;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    if (match[2]) {
      nodes.push(<strong key={`${keyPrefix}-strong-${key++}`}>{match[2]}</strong>);
    } else if (match[3] || match[4]) {
      nodes.push(<em key={`${keyPrefix}-em-${key++}`}>{match[3] || match[4]}</em>);
    } else if (match[5]) {
      nodes.push(
        <code
          key={`${keyPrefix}-code-${key++}`}
          style={{
            padding: '1px 5px',
            borderRadius: 4,
            background: 'rgba(6,12,28,0.75)',
            border: '1px solid rgba(80,120,200,0.2)',
            color: 'rgba(190,225,255,0.95)',
            fontFamily: 'monospace',
            fontSize: '0.92em',
          }}
        >
          {match[5]}
        </code>
      );
    } else if (match[6] && match[7]) {
      nodes.push(
        <a
          key={`${keyPrefix}-link-${key++}`}
          href={match[7]}
          target="_blank"
          rel="noreferrer"
          style={{ color: '#93c5fd', textDecoration: 'underline', textUnderlineOffset: 2 }}
        >
          {match[6]}
        </a>
      );
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes.length > 0 ? nodes : text;
}

function renderTextBlocks(text: string, keyPrefix: string) {
  const blocks: React.ReactNode[] = [];
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  let index = 0;
  let key = 0;

  const nextNonEmptyLine = () => {
    while (index < lines.length && !lines[index].trim()) index += 1;
  };

  while (index < lines.length) {
    nextNonEmptyLine();
    if (index >= lines.length) break;

    const line = lines[index];
    if (/^\s*---\s*$/.test(line)) {
      blocks.push(
        <hr
          key={`${keyPrefix}-rule-${key++}`}
          style={{
            width: '100%',
            margin: blocks.length === 0 ? '4px 0 10px' : '12px 0 10px',
            border: 0,
            borderTop: '1px solid rgba(120,160,220,0.28)',
          }}
        />
      );
      index += 1;
      continue;
    }

    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    if (heading) {
      const level = heading[1].length;
      const Tag = (`h${level}` as keyof JSX.IntrinsicElements);
      blocks.push(
        <Tag
          key={`${keyPrefix}-heading-${key++}`}
          style={{
            margin: blocks.length === 0 ? '0 0 8px' : '12px 0 8px',
            fontSize: level === 1 ? 18 : level === 2 ? 16 : 14,
            lineHeight: 1.25,
            fontWeight: 700,
            color: 'rgba(210,230,255,0.95)',
          }}
        >
          {renderInlineMarkdown(heading[2], `${keyPrefix}-heading-${key}`)}
        </Tag>
      );
      index += 1;
      continue;
    }

    if (/^\s*-\s+/.test(line)) {
      const items: React.ReactNode[] = [];
      while (index < lines.length && /^\s*-\s+/.test(lines[index])) {
        const item = lines[index].replace(/^\s*-\s+/, '');
        items.push(<li key={`${keyPrefix}-bullet-item-${key}-${items.length}`}>{renderInlineMarkdown(item, `${keyPrefix}-bullet-${key}-${items.length}`)}</li>);
        index += 1;
      }
      blocks.push(
        <ul key={`${keyPrefix}-bullet-${key++}`} style={{ margin: '6px 0', paddingLeft: 18, listStyle: 'disc' }}>
          {items}
        </ul>
      );
      continue;
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      const items: React.ReactNode[] = [];
      while (index < lines.length && /^\s*\d+\.\s+/.test(lines[index])) {
        const item = lines[index].replace(/^\s*\d+\.\s+/, '');
        items.push(<li key={`${keyPrefix}-number-item-${key}-${items.length}`}>{renderInlineMarkdown(item, `${keyPrefix}-number-${key}-${items.length}`)}</li>);
        index += 1;
      }
      blocks.push(
        <ol key={`${keyPrefix}-number-${key++}`} style={{ margin: '6px 0', paddingLeft: 18, listStyle: 'decimal' }}>
          {items}
        </ol>
      );
      continue;
    }

    const paragraphLines: string[] = [];
    while (
      index < lines.length &&
      lines[index].trim() &&
      !/^\s*---\s*$/.test(lines[index]) &&
      !/^(#{1,3})\s+/.test(lines[index]) &&
      !/^\s*-\s+/.test(lines[index]) &&
      !/^\s*\d+\.\s+/.test(lines[index])
    ) {
      paragraphLines.push(lines[index]);
      index += 1;
    }

    blocks.push(
      <p key={`${keyPrefix}-paragraph-${key++}`} style={{ margin: blocks.length === 0 ? 0 : '8px 0 0' }}>
        {paragraphLines.map((paragraphLine, lineIndex) => (
          <React.Fragment key={`${keyPrefix}-paragraph-line-${key}-${lineIndex}`}>
            {lineIndex > 0 && <br />}
            {renderInlineMarkdown(paragraphLine, `${keyPrefix}-paragraph-${key}-${lineIndex}`)}
          </React.Fragment>
        ))}
      </p>
    );
  }

  return blocks;
}

export function renderMessageWithCodeBlocks(content: string) {
  if (!content) return content;

  const parts: React.ReactNode[] = [];
  const regex = /```(bash|sh|python|js|javascript|ts|typescript|java|cpp|c|go|rust|ruby|php|yaml|json|html|css|sql)?\s*\n([\s\S]*?)```/gi;
  let lastIndex = 0;
  let match: RegExpExecArray | null = null;
  let key = 0;
  let hasCodeBlocks = false;

  while ((match = regex.exec(content)) !== null) {
    hasCodeBlocks = true;
    const textBefore = content.slice(lastIndex, match.index);
    if (textBefore.trim()) {
      parts.push(<React.Fragment key={`text-${key}`}>{renderTextBlocks(textBefore, `text-${key++}`)}</React.Fragment>);
    }
    const language = match[1] || 'bash';
    const codeContent = match[2] || '';
    parts.push(
      <CodeBlock key={`code-${key++}`} code={codeContent.trim()} language={language} />
    );
    lastIndex = regex.lastIndex;
  }

  const textAfter = content.slice(lastIndex);
  if (textAfter.trim()) {
    parts.push(<React.Fragment key={`text-${key}`}>{renderTextBlocks(textAfter, `text-${key++}`)}</React.Fragment>);
  }

  if (!hasCodeBlocks) {
    return <>{renderTextBlocks(content, 'text')}</>;
  }

  return <>{parts}</>;
}
