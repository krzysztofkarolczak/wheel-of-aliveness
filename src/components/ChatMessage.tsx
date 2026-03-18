'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { UIMessage } from '@/lib/types';

interface ChatMessageProps {
  message: UIMessage;
  isStreaming?: boolean;
}

function renderMarkdown(text: string): React.ReactNode[] {
  // Split on **bold** and *italic* patterns
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Match **bold** first, then *italic*
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    const italicMatch = remaining.match(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/);

    // Find the earliest match
    const boldIndex = boldMatch?.index ?? Infinity;
    const italicIndex = italicMatch?.index ?? Infinity;

    if (boldIndex === Infinity && italicIndex === Infinity) {
      // No more matches
      parts.push(remaining);
      break;
    }

    if (boldIndex <= italicIndex && boldMatch) {
      // Bold match comes first
      if (boldIndex > 0) {
        parts.push(remaining.slice(0, boldIndex));
      }
      parts.push(
        <strong key={key++} className="font-semibold">
          {boldMatch[1]}
        </strong>
      );
      remaining = remaining.slice(boldIndex + boldMatch[0].length);
    } else if (italicMatch) {
      // Italic match comes first
      if (italicIndex > 0) {
        parts.push(remaining.slice(0, italicIndex));
      }
      parts.push(
        <em key={key++} className="italic">
          {italicMatch[1]}
        </em>
      );
      remaining = remaining.slice(italicIndex + italicMatch[0].length);
    }
  }

  return parts;
}

export default function ChatMessage({ message, isStreaming }: ChatMessageProps) {
  const isAssistant = message.role === 'assistant';

  const renderedContent = useMemo(
    () => renderMarkdown(message.content),
    [message.content]
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`${isAssistant ? '' : 'pl-8'}`}
    >
      <div
        className={`${
          isAssistant
            ? 'text-base leading-relaxed text-foreground'
            : 'text-sm leading-relaxed text-foreground-muted'
        }`}
      >
        {renderedContent}
        {isStreaming && isAssistant && (
          <span className="inline-flex ml-1 gap-0.5">
            <span className="typing-dot w-1 h-1 rounded-full bg-foreground-muted inline-block" />
            <span className="typing-dot w-1 h-1 rounded-full bg-foreground-muted inline-block" />
            <span className="typing-dot w-1 h-1 rounded-full bg-foreground-muted inline-block" />
          </span>
        )}
      </div>
    </motion.div>
  );
}
