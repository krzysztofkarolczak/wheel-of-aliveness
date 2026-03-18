'use client';

import { motion } from 'framer-motion';
import { DIMENSIONS } from '@/lib/dimensions';

interface DimensionProgressProps {
  currentIndex: number;
  completedCount: number;
}

export default function DimensionProgress({
  currentIndex,
  completedCount,
}: DimensionProgressProps) {
  return (
    <div className="flex items-center gap-2">
      {DIMENSIONS.map((dim, i) => {
        const isCompleted = i < completedCount;
        const isCurrent = i === currentIndex;
        const isFuture = i > completedCount;

        return (
          <div key={dim.id} className="flex items-center gap-2">
            <motion.div
              className="relative flex items-center justify-center"
              animate={{
                scale: isCurrent ? 1 : 1,
              }}
            >
              <div
                className="w-2.5 h-2.5 rounded-full transition-all duration-300"
                style={{
                  backgroundColor: isCompleted
                    ? dim.color
                    : isCurrent
                    ? dim.color
                    : 'var(--border)',
                  opacity: isFuture ? 0.4 : 1,
                }}
              />
              {isCurrent && (
                <motion.div
                  className="absolute w-5 h-5 rounded-full"
                  style={{ borderColor: dim.color, borderWidth: 1.5 }}
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.6, 0.3, 0.6],
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              )}
            </motion.div>

            {i < DIMENSIONS.length - 1 && (
              <div
                className="w-4 h-px transition-colors duration-300"
                style={{
                  backgroundColor: isCompleted
                    ? 'var(--foreground-muted)'
                    : 'var(--border)',
                  opacity: isCompleted ? 0.3 : 0.5,
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
