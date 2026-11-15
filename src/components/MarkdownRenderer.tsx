import React from 'react';

interface MarkdownRendererProps {
  content: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  const lines = content.split('\n');

  let inCodeBlock = false;
  let codeBlockContent: string[] = [];
  let codeBlockLang = '';

  const elements: React.ReactNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        elements.push(
          <div
            key={`code-${i}`}
            className="my-3 rounded-lg bg-slate-900 text-slate-100 p-4 font-mono text-xs overflow-x-auto border border-slate-800"
          >
            {codeBlockLang && (
              <div className="text-[11px] text-slate-400 font-medium mb-2 select-none">
                {codeBlockLang}
              </div>
            )}
            <pre className="whitespace-pre">{codeBlockContent.join('\n')}</pre>
          </div>
        );
        codeBlockContent = [];
        inCodeBlock = false;
        codeBlockLang = '';
      } else {
        inCodeBlock = true;
        codeBlockLang = line.trim().replace(/^```/, '').trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockContent.push(line);
      continue;
    }

    if (!line.trim()) {
      elements.push(<div key={`empty-${i}`} className="h-1.5" />);
      continue;
    }

    if (line.startsWith('### ')) {
      elements.push(
        <h3 key={`h3-${i}`} className="text-sm font-semibold text-slate-900 mt-4 mb-1.5">
          {renderInlineFormatting(line.slice(4))}
        </h3>
      );
      continue;
    }

    if (line.startsWith('## ')) {
      elements.push(
        <h2
          key={`h2-${i}`}
          className="text-base font-semibold text-slate-900 mt-4 mb-2 pb-1.5 border-b border-slate-200"
        >
          {renderInlineFormatting(line.slice(3))}
        </h2>
      );
      continue;
    }

    if (line.startsWith('# ')) {
      elements.push(
        <h1
          key={`h1-${i}`}
          className="text-lg font-bold text-slate-900 mt-4 mb-2 pb-1.5 border-b border-slate-200"
        >
          {renderInlineFormatting(line.slice(2))}
        </h1>
      );
      continue;
    }

    if (line.startsWith('> ')) {
      elements.push(
        <blockquote
          key={`quote-${i}`}
          className="px-4 py-2.5 italic text-slate-700 bg-slate-50 border border-slate-200 rounded-lg my-2 text-sm"
        >
          {renderInlineFormatting(line.slice(2))}
        </blockquote>
      );
      continue;
    }

    if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
      const indentLevel = line.search(/\S/) > 1 ? 'ml-5' : 'ml-1';
      const cleanLine = line.trim().replace(/^[-*]\s+/, '');
      elements.push(
        <div
          key={`bullet-${i}`}
          className={`flex items-start gap-2 my-1 text-slate-700 leading-relaxed text-sm ${indentLevel}`}
        >
          <span className="text-slate-400 mt-0.5 select-none">•</span>
          <span className="flex-1">{renderInlineFormatting(cleanLine)}</span>
        </div>
      );
      continue;
    }

    const numMatch = line.trim().match(/^(\d+)\.\s+(.*)$/);
    if (numMatch) {
      elements.push(
        <div
          key={`num-${i}`}
          className="flex items-start gap-2.5 my-1 text-slate-700 leading-relaxed text-sm ml-1"
        >
          <span className="font-mono tabular-nums text-xs font-semibold text-slate-500 mt-0.5 select-none min-w-4">
            {numMatch[1]}.
          </span>
          <span className="flex-1">{renderInlineFormatting(numMatch[2])}</span>
        </div>
      );
      continue;
    }

    elements.push(
      <p key={`p-${i}`} className="text-slate-700 leading-relaxed text-sm my-1.5">
        {renderInlineFormatting(line)}
      </p>
    );
  }

  if (inCodeBlock && codeBlockContent.length > 0) {
    elements.push(
      <div
        key="code-final"
        className="my-3 rounded-lg bg-slate-900 text-slate-100 p-4 font-mono text-xs overflow-x-auto border border-slate-800"
      >
        <pre className="whitespace-pre">{codeBlockContent.join('\n')}</pre>
      </div>
    );
  }

  return <div className="space-y-0.5">{elements}</div>;
};

function renderInlineFormatting(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*.*?\*\*|`.*?`)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      parts.push(
        <strong key={match.index} className="font-semibold text-slate-900">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('`') && token.endsWith('`')) {
      parts.push(
        <code
          key={match.index}
          className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 font-mono text-xs border border-slate-200"
        >
          {token.slice(1, -1)}
        </code>
      );
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts;
}
