import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';

export type LightBeamButtonProps = {
  children: React.ReactNode;
  className?: string;
  gradientColors?: [string, string, string]; // Optional custom gradient colors
  href?: string;
  target?: string;
  rel?: string;
} & Omit<HTMLMotionProps<"button"> & HTMLMotionProps<"a">, 'children' | 'className'>;

/**
 * LightBeamButton
 *
 * A high-performance button with a rotating light beam border effect.
 * Uses CSS @property for smooth gradient rotation animations on the border.
 */
export function LightBeamButton({
  children,
  className = "",
  onClick,
  gradientColors = ["#8b5cf6", "#06b6d4", "#8b5cf6"], // Violet -> Cyan -> Violet
  href,
  target,
  rel,
  ...props
}: LightBeamButtonProps) {
  // Construct the gradient string dynamically based on props
  const gradientString = `conic-gradient(from var(--gradient-angle), transparent 0%, ${gradientColors[0]} 40%, ${gradientColors[1]} 50%, transparent 60%, transparent 100%)`;

  const commonProps = {
    whileHover: { scale: 1.02 },
    whileTap: { scale: 0.98 },
    onClick,
    className: `lbb-container ${className}`,
    ...props
  };

  const innerContent = (
    <>
      <span className="lbb-content">{children}</span>

      {/* Gradient Border Simulation */}
      <div
        className="lbb-border"
        style={{ '--gradient-angle': '0deg', background: gradientString } as React.CSSProperties}
      />

      {/* Inner Background (keeps text readable) */}
      <div className="lbb-inner" />

      {/* Shine Effect Overlay */}
      <div className="lbb-shine" />
    </>
  );

  return (
    <>
      <style>{`
        @property --gradient-angle {
          syntax: "<angle>";
          initial-value: 0deg;
          inherits: false;
        }

        @keyframes border-spin {
          from {
            --gradient-angle: 0deg;
          }
          to {
            --gradient-angle: 360deg;
          }
        }

        .lbb-container {
          position: relative;
          isolation: isolate;
          overflow: hidden;
          border-radius: 9999px;
          background-color: #0a0a0a;
          padding: 0.75rem 2rem;
          font-size: 0.875rem;
          font-weight: 500;
          color: white;
          transition: all 300ms ease;
          box-shadow: 0 0 20px -5px rgba(139,92,246,0.3);
          border: none;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
        }

        .lbb-container:hover {
          background-color: #171717;
          box-shadow: 0 0 25px -5px rgba(139,92,246,0.5);
        }

        .lbb-content {
          position: relative;
          z-index: 10;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .lbb-border {
          position: absolute;
          inset: 0;
          z-index: -10;
          border-radius: 9999px;
          padding: 1px;
          animation: border-spin 2s linear infinite;
        }

        .lbb-inner {
          position: absolute;
          inset: 1px;
          z-index: -10;
          border-radius: 9999px;
          background-color: #0a0a0a;
        }

        .lbb-shine {
          position: absolute;
          inset: 0;
          z-index: -10;
          background: radial-gradient(circle at 50% 0%, rgba(139,92,246,0.15) 0%, transparent 60%);
          opacity: 0;
          transition: opacity 500ms ease;
        }

        .lbb-container:hover .lbb-shine {
          opacity: 1;
        }
      `}</style>
      {href ? (
        <motion.a href={href} target={target} rel={rel} {...(commonProps as HTMLMotionProps<"a">)}>
          {innerContent}
        </motion.a>
      ) : (
        <motion.button {...(commonProps as HTMLMotionProps<"button">)}>
          {innerContent}
        </motion.button>
      )}
    </>
  );
}

export default LightBeamButton;
