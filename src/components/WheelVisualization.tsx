'use client';

import { motion } from 'framer-motion';
import { DIMENSIONS } from '@/lib/dimensions';

interface WheelVisualizationProps {
  ratings: number[];
  currentDimension: number;
  size?: number;
  showLabels?: boolean;
}

function polarToCartesian(
  index: number,
  value: number,
  maxRadius: number,
  total: number = 8
) {
  const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
  return {
    x: (value / 10) * maxRadius * Math.cos(angle),
    y: (value / 10) * maxRadius * Math.sin(angle),
  };
}

function createPolygonPath(values: number[], maxRadius: number): string {
  if (values.every((v) => v === 0)) return '';
  const points = values.map((v, i) => polarToCartesian(i, v, maxRadius));
  return (
    points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') +
    ' Z'
  );
}

function getLabelAnchor(index: number, total: number = 8): 'start' | 'middle' | 'end' {
  const angle = (360 * index) / total;
  if (angle === 0 || angle === 180) return 'middle';
  if (angle > 0 && angle < 180) return 'start';
  return 'end';
}

function getLabelOffset(
  index: number,
  maxRadius: number,
  total: number = 8
): { x: number; y: number } {
  const pos = polarToCartesian(index, 10, maxRadius, total);
  const angle = (360 * index) / total;
  const padding = 16;

  let dx = 0;
  let dy = 0;

  if (angle === 0) dy = -padding;
  else if (angle === 180) dy = padding + 4;
  else if (angle > 0 && angle < 180) dx = padding;
  else dx = -padding;

  if (angle === 90) dy = 4;
  if (angle === 270) dy = 4;

  return { x: pos.x + dx, y: pos.y + dy };
}

export default function WheelVisualization({
  ratings,
  currentDimension,
  size = 360,
  showLabels = true,
}: WheelVisualizationProps) {
  const margin = showLabels ? 80 : 20;
  const maxRadius = (size - margin * 2) / 2;
  const viewBox = size / 2 + margin;
  const gridLevels = [2, 4, 6, 8, 10];

  const path = createPolygonPath(ratings, maxRadius);
  const hasAnyRating = ratings.some((r) => r > 0);

  return (
    <svg
      viewBox={`${-viewBox} ${-viewBox} ${viewBox * 2} ${viewBox * 2}`}
      className="w-full h-full"
      style={{ maxWidth: size + margin * 2, maxHeight: size + margin * 2 }}
    >
      {/* Grid circles */}
      {gridLevels.map((level) => (
        <circle
          key={level}
          r={(level / 10) * maxRadius}
          fill="none"
          stroke="var(--border)"
          strokeWidth={level === 10 ? 1 : 0.5}
          opacity={level === 10 ? 0.6 : 0.3}
        />
      ))}

      {/* Spokes */}
      {DIMENSIONS.map((dim, i) => {
        const end = polarToCartesian(i, 10, maxRadius);
        const isActive = i === currentDimension;
        const isCompleted = ratings[i] > 0;
        return (
          <line
            key={dim.id}
            x1={0}
            y1={0}
            x2={end.x}
            y2={end.y}
            stroke={isActive ? dim.color : 'var(--border)'}
            strokeWidth={isActive ? 1.5 : 0.5}
            opacity={isActive ? 0.8 : isCompleted ? 0.5 : 0.25}
          />
        );
      })}

      {/* Filled polygon */}
      {hasAnyRating && (
        <motion.path
          d={path}
          fill="var(--primary)"
          fillOpacity={0.12}
          stroke="var(--primary)"
          strokeWidth={1.5}
          strokeOpacity={0.4}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      )}

      {/* Rating dots */}
      {ratings.map((rating, i) => {
        if (rating === 0) return null;
        const pos = polarToCartesian(i, rating, maxRadius);
        return (
          <motion.circle
            key={`dot-${i}`}
            cx={pos.x}
            cy={pos.y}
            r={5}
            fill={DIMENSIONS[i].color}
            stroke="white"
            strokeWidth={2}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.1, type: 'spring' }}
          />
        );
      })}

      {/* Current dimension highlight dot (pulsing) */}
      {ratings[currentDimension] === 0 && (
        <motion.circle
          cx={0}
          cy={0}
          r={4}
          fill={DIMENSIONS[currentDimension].color}
          opacity={0.5}
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.5, 0.8, 0.5],
          }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}

      {/* Labels */}
      {showLabels &&
        DIMENSIONS.map((dim, i) => {
          const labelPos = getLabelOffset(i, maxRadius);
          const anchor = getLabelAnchor(i);
          const isActive = i === currentDimension;
          const isCompleted = ratings[i] > 0;

          return (
            <text
              key={`label-${dim.id}`}
              x={labelPos.x}
              y={labelPos.y}
              textAnchor={anchor}
              dominantBaseline="middle"
              fontSize={11}
              fill={
                isActive
                  ? dim.color
                  : isCompleted
                  ? 'var(--foreground)'
                  : 'var(--foreground-muted)'
              }
              fontWeight={isActive ? 600 : 400}
              opacity={isActive ? 1 : isCompleted ? 0.8 : 0.5}
            >
              {dim.name}
              {isCompleted && (
                <tspan fontSize={10} opacity={0.6}>
                  {' '}
                  {ratings[i]}
                </tspan>
              )}
            </text>
          );
        })}
    </svg>
  );
}
