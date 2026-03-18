'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

interface RatingInputProps {
  onRate: (rating: number) => void;
  dimensionColor: string;
}

export default function RatingInput({ onRate, dimensionColor }: RatingInputProps) {
  const [hoveredValue, setHoveredValue] = useState(0);
  const [selectedValue, setSelectedValue] = useState(0);

  function handleSelect(value: number) {
    setSelectedValue(value);
    onRate(value);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="py-6"
    >
      <p className="text-sm text-foreground-muted mb-4 font-sans">
        How alive does this area feel to you right now?
      </p>

      <div className="flex items-center gap-2">
        <span className="text-xs text-foreground-muted w-4 text-right">1</span>

        <div className="flex gap-1.5">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((value) => {
            const isHovered = hoveredValue >= value;
            const isSelected = selectedValue >= value;
            const isActive = isHovered || isSelected;

            return (
              <motion.button
                key={value}
                onClick={() => handleSelect(value)}
                onMouseEnter={() => setHoveredValue(value)}
                onMouseLeave={() => setHoveredValue(0)}
                className="relative w-8 h-8 rounded-full border-2 transition-colors duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                style={{
                  borderColor: isActive ? dimensionColor : 'var(--border)',
                  backgroundColor: isActive ? dimensionColor : 'transparent',
                }}
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.95 }}
                aria-label={`Rate ${value} out of 10`}
              >
                {isActive && (
                  <motion.div
                    className="absolute inset-0 rounded-full"
                    style={{ backgroundColor: dimensionColor }}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.15 }}
                  />
                )}
                <span
                  className="relative z-10 text-xs font-medium"
                  style={{
                    color: isActive ? 'white' : 'var(--foreground-muted)',
                  }}
                >
                  {value}
                </span>
              </motion.button>
            );
          })}
        </div>

        <span className="text-xs text-foreground-muted w-4">10</span>
      </div>

      <div className="flex justify-between mt-2 px-5">
        <span className="text-[10px] text-foreground-muted">feels heavy</span>
        <span className="text-[10px] text-foreground-muted">fully alive</span>
      </div>
    </motion.div>
  );
}
