import { useEffect, useRef, useState } from 'react';

/**
 * Renders text normally when it fits; turns into a slow looping marquee
 * (Spotify-style) when it overflows its container.
 */
export default function ScrollingText({ text = '', className = '' }) {
  const containerRef = useRef(null);
  const textRef = useRef(null);
  const [overflowing, setOverflowing] = useState(false);

  useEffect(() => {
    const check = () => {
      if (containerRef.current && textRef.current) {
        setOverflowing(
          textRef.current.scrollWidth > containerRef.current.clientWidth
        );
      }
    };
    check();
    const observer = new ResizeObserver(check);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [text]);

  // Longer titles scroll proportionally slower so speed feels constant
  const duration = `${Math.max(8, text.length * 0.4)}s`;

  return (
    <div
      ref={containerRef}
      className={`overflow-hidden whitespace-nowrap ${
        overflowing ? 'marquee-mask' : ''
      } ${className}`}
    >
      {overflowing ? (
        <div className="marquee inline-flex gap-8" style={{ animationDuration: duration }}>
          <span ref={textRef}>{text}</span>
          <span aria-hidden="true">{text}</span>
        </div>
      ) : (
        <span ref={textRef} className="inline-block max-w-full truncate align-bottom">
          {text}
        </span>
      )}
    </div>
  );
}
