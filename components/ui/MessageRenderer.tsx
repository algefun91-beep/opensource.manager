import React from 'react';
import CodeBlock from './CodeBlock';

export function renderMessageWithCodeBlocks(content: string) {
  if (!content) return content;

  const parts: React.ReactNode[] = [];
  const regex = /```(bash|sh|python|js|javascript|ts|typescript|java|cpp|c|go|rust|ruby|php|yaml|json|html|css|sql)?\n([\s\S]*?)```/gi;
  let lastIndex = 0;
  let match: RegExpExecArray | null = null;
  let key = 0;
  let hasCodeBlocks = false;

  while ((match = regex.exec(content)) !== null) {
    hasCodeBlocks = true;
    const textBefore = content.slice(lastIndex, match.index);
    if (textBefore.trim()) {
      parts.push(
        <div key={`text-${key++}`} style={{ marginBottom: 12 }}>{textBefore}</div>
      );
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
    parts.push(
      <div key={`text-${key++}`} style={{ marginTop: 12 }}>{textAfter}</div>
    );
  }

  if (!hasCodeBlocks) {
    return content;
  }

  return <>{parts}</>;
}
