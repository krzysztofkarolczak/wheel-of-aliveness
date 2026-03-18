'use client';

import { motion } from 'framer-motion';
import { UIMessage } from '@/lib/types';

interface ChatMessageProps {
  message: UIMessage;
  isStreaming?: boolean;
}

export default function ChatMessage({ message, isStreaming }: ChatMessageProps) {
  const isAssistant = message.role === 'assistant';

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
            ? 'font-serif text-lg leading-relaxed text-foreground'
            : 'font-sans text-base leading-relaxed text-foreground-muted'
        }`}
      >
        {message.content}
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
