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
      <p className="text-sm text-foreground-muted mb-5">
        How alive does this area feel to you right now?
      </p>

      <div className="flex items-center justify-between max-w-md">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((value) => {
          const isHovered = hoveredValue >= value;
          const isSelected = selectedValue >= value;
          const isActive = isHovered || isSelected;
          const isExact = hoveredValue === value || selectedValue === value;

          return (
            <motion.button
              key={value}
              onClick={() => handleSelect(value)}
              onMouseEnter={() => setHoveredValue(value)}
              onMouseLeave={() => setHoveredValue(0)}
              className="flex items-center justify-center w-9 h-9 rounded-full transition-colors duration-150 cursor-pointer focus:outline-none"
              style={{
                backgroundColor: isActive ? dimensionColor : 'transparent',
                opacity: isActive ? (isExact ? 1 : 0.6) : 1,
              }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              aria-label={`Rate ${value} out of 10`}
            >
              <span
                className="text-sm font-medium"
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

      <div className="flex justify-between max-w-md mt-1.5">
        <span className="text-[11px] text-foreground-muted">feels heavy</span>
        <span className="text-[11px] text-foreground-muted">fully alive</span>
      </div>
    </motion.div>
  );
}
