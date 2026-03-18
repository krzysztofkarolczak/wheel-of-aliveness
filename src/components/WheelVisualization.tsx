'use client';

import { motion } from 'framer-motion';
import { DIMENSIONS } from '@/lib/dimensions';

interface WheelVisualizationProps {
  ratings: number[];
  currentDimension: number;
  size?: number;
  showLabels?: boolean;
}

const TOTAL = 8;
const GAP_DEG = 2; // gap between wedges in degrees
const SECTOR_DEG = 360 / TOTAL - GAP_DEG;

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Start angle (in degrees, 0 = top/12 o'clock, clockwise) for sector i */
function sectorStartDeg(i: number): number {
  return i * (360 / TOTAL) + GAP_DEG / 2 - 90;
}

function sectorEndDeg(i: number): number {
  return sectorStartDeg(i) + SECTOR_DEG;
}

/** Create an SVG arc path for a wedge from center, spanning startDeg→endDeg at given radius */
function createWedgePath(
  startDeg: number,
  endDeg: number,
  radius: number
): string {
  const startRad = degToRad(startDeg);
  const endRad = degToRad(endDeg);

  const x1 = radius * Math.cos(startRad);
  const y1 = radius * Math.sin(startRad);
  const x2 = radius * Math.cos(endRad);
  const y2 = radius * Math.sin(endRad);

  const largeArc = endDeg - startDeg > 180 ? 1 : 0;

  return `M 0 0 L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
}

function getLabelPosition(
  index: number,
  maxRadius: number
): { x: number; y: number } {
  const midDeg = (sectorStartDeg(index) + sectorEndDeg(index)) / 2;
  const midRad = degToRad(midDeg);
  const labelRadius = maxRadius + 18;
  return {
    x: labelRadius * Math.cos(midRad),
    y: labelRadius * Math.sin(midRad),
  };
}

function getLabelAnchor(index: number): 'start' | 'middle' | 'end' {
  const midDeg = ((sectorStartDeg(index) + sectorEndDeg(index)) / 2 + 360) % 360;
  // Normalize to 0-360 where 0 is right
  const adjusted = (midDeg + 90) % 360; // back to standard 0=right
  if (adjusted > 350 || adjusted < 10 || (adjusted > 170 && adjusted < 190))
    return 'middle';
  if (adjusted >= 10 && adjusted <= 170) return 'start';
  return 'end';
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

  return (
    <svg
      viewBox={`${-viewBox} ${-viewBox} ${viewBox * 2} ${viewBox * 2}`}
      className="w-full h-full"
      style={{ maxWidth: size + margin * 2, maxHeight: size + margin * 2 }}
    >
      {/* Outer ring / grid circle */}
      <circle
        r={maxRadius}
        fill="none"
        stroke="var(--border)"
        strokeWidth={0.5}
        opacity={0.4}
      />

      {/* Wedge sectors */}
      {DIMENSIONS.map((dim, i) => {
        const isCurrent = i === currentDimension;
        const rating = ratings[i];
        const hasRating = rating > 0;
        const startDeg = sectorStartDeg(i);
        const endDeg = sectorEndDeg(i);

        return (
          <g key={dim.id}>
            {/* Background wedge — light tint for current, very faint for others */}
            <path
              d={createWedgePath(startDeg, endDeg, maxRadius)}
              fill={dim.color}
              fillOpacity={isCurrent ? 0.1 : 0.03}
              stroke={dim.color}
              strokeWidth={isCurrent ? 1 : 0.5}
              strokeOpacity={isCurrent ? 0.3 : 0.1}
            />

            {/* Rated wedge — filled proportionally */}
            {hasRating && (
              <motion.path
                d={createWedgePath(
                  startDeg,
                  endDeg,
                  (rating / 10) * maxRadius
                )}
                fill={dim.color}
                fillOpacity={0.35}
                stroke={dim.color}
                strokeWidth={1}
                strokeOpacity={0.5}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                style={{ transformOrigin: '0 0' }}
              />
            )}
          </g>
        );
      })}

      {/* Center dot */}
      <circle r={3} fill="var(--border)" opacity={0.5} />

      {/* Labels */}
      {showLabels &&
        DIMENSIONS.map((dim, i) => {
          const labelPos = getLabelPosition(i, maxRadius);
          const anchor = getLabelAnchor(i);
          const isCurrent = i === currentDimension;
          const hasRating = ratings[i] > 0;

          return (
            <text
              key={`label-${dim.id}`}
              x={labelPos.x}
              y={labelPos.y}
              textAnchor={anchor}
              dominantBaseline="middle"
              fontSize={11}
              fill={
                isCurrent
                  ? dim.color
                  : hasRating
                  ? 'var(--foreground)'
                  : 'var(--foreground-muted)'
              }
              fontWeight={isCurrent ? 600 : 400}
              opacity={isCurrent ? 1 : hasRating ? 0.8 : 0.5}
            >
              {dim.name}
              {hasRating && (
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
