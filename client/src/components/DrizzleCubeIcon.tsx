import React from 'react';

interface DrizzleCubeIconProps {
  className?: string;
  size?: number;
  animate?: boolean;
  color?: string;
}

const DrizzleCubeIcon: React.FC<DrizzleCubeIconProps> = ({
  className = "",
  size = 24,
  animate = false,
  color = "#059669"
}) => {
  const uid = React.useId().replace(/:/g, '');

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Drizzle Cube"
    >
      {animate && (
        <style>{`
          @keyframes dc-sparkle-${uid} {
            0% { transform: rotate(0deg) scale(0.6); opacity: 0; }
            15% { transform: rotate(90deg) scale(1.1); opacity: 1; }
            30% { transform: rotate(180deg) scale(0.95); }
            45% { transform: rotate(270deg) scale(1.05); }
            60% { transform: rotate(360deg) scale(1); opacity: 1; }
            100% { transform: rotate(360deg) scale(1); opacity: 1; }
          }
          .dc-star-${uid} {
            transform-origin: 72px 74px;
            animation: dc-sparkle-${uid} 2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }
        `}</style>
      )}

      {/*
        Cube outline - isometric 3D box
        The cube is drawn as thick stroked paths with round joins.
        Viewbox is 100x100. Cube occupies roughly left 75% of the space.
      */}
      <g
        stroke={color}
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      >
        {/* Top-left edge: top -> left corner (with rounded top) */}
        <path d="M40 10 Q37 8 34 10 L7 25 Q4 27 4 31" />
        {/* Top-right edge: top -> right corner (with rounded top) */}
        <path d="M40 10 Q43 8 46 10 L73 25 Q76 27 76 31" />
        {/* Inner left: left corner -> center (with rounded corner) */}
        <path d="M4 31 Q4 27 7 29 L37 46 Q40 48 40 52" />
        {/* Inner right: right corner -> center (with rounded corner) */}
        <path d="M76 31 Q76 27 73 29 L43 46 Q40 48 40 52" />
        {/* Left face: left corner -> bottom (with rounded corners) */}
        <path d="M4 31 L4 69 Q4 73 7 75 L37 90 Q40 92 40 88" />
        {/* Right face: right corner -> cut off */}
        <path d="M76 31 L76 46" />
        {/* Center vertical */}
        <path d="M40 52 L40 88" />
        {/* Bottom edge stub */}
        <path d="M40 88 Q40 92 43 90 L48 87" />
      </g>

      {/* 4-pointed sparkle */}
      <g className={animate ? `dc-star-${uid}` : undefined}>
        <path
          d="M72 54 C72 54 66 65 66 74 C66 83 72 94 72 94 C72 94 78 83 78 74 C78 65 72 54 72 54 Z"
          fill={color}
        />
        <path
          d="M54 74 C54 74 65 68 72 68 C79 68 90 74 90 74 C90 74 79 80 72 80 C65 80 54 74 54 74 Z"
          fill={color}
        />
        {/* Center diamond cutout */}
        <path
          d="M72 70 L75.5 74 L72 78 L68.5 74 Z"
          fill="white"
        />
      </g>
    </svg>
  );
};

export default DrizzleCubeIcon;
