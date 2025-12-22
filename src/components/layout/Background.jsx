import { useEffect, useRef, useState } from 'react';
import styles from './Background.module.css';

export function Background() {
  const [scrollY, setScrollY] = useState(0);
  const requestRef = useRef();

  useEffect(() => {
    const handleScroll = () => {
      requestRef.current = requestAnimationFrame(() => {
        setScrollY(window.scrollY);
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, []);

  const parallax1 = scrollY * 0.1;
  const parallax2 = scrollY * 0.15;
  const parallax3 = scrollY * 0.05;
  const rotation = scrollY * 0.02;

  return (
    <div className={styles.bgAnimation}>
      {/* Grid Lines */}
      <div className={styles.gridLines}></div>

      {/* Animated Geometric SVG Layer 1 - Hexagons */}
      <svg 
        className={styles.svgLayer} 
        viewBox="0 0 1920 1080" 
        preserveAspectRatio="xMidYMid slice"
        style={{ transform: `translateY(${parallax1}px)` }}
      >
        <defs>
          <linearGradient id="hexGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#58a6ff" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#7ee787" stopOpacity="0.05" />
          </linearGradient>
          <linearGradient id="hexGradient2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#d2a8ff" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#58a6ff" stopOpacity="0.03" />
          </linearGradient>
        </defs>

        {/* Floating Hexagons */}
        <g style={{ transform: `rotate(${rotation}deg)`, transformOrigin: '200px 200px' }}>
          <polygon 
            points="200,50 300,100 300,200 200,250 100,200 100,100" 
            fill="none" 
            stroke="url(#hexGradient1)" 
            strokeWidth="1"
            className={styles.hexagon1}
          />
        </g>
        <g style={{ transform: `rotate(${-rotation * 0.5}deg)`, transformOrigin: '1600px 300px' }}>
          <polygon 
            points="1600,150 1720,210 1720,330 1600,390 1480,330 1480,210" 
            fill="url(#hexGradient2)" 
            className={styles.hexagon2}
          />
        </g>
        <g style={{ transform: `rotate(${rotation * 0.7}deg)`, transformOrigin: '1200px 800px' }}>
          <polygon 
            points="1200,700 1280,745 1280,835 1200,880 1120,835 1120,745" 
            fill="none" 
            stroke="url(#hexGradient1)" 
            strokeWidth="0.5"
            className={styles.hexagon3}
          />
        </g>
      </svg>

      {/* Animated Geometric SVG Layer 2 - Circles & Rings */}
      <svg 
        className={styles.svgLayer} 
        viewBox="0 0 1920 1080" 
        preserveAspectRatio="xMidYMid slice"
        style={{ transform: `translateY(${parallax2}px)` }}
      >
        <defs>
          <radialGradient id="circleGradient1" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#58a6ff" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#58a6ff" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="circleGradient2" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#7ee787" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#7ee787" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Pulsing Circles */}
        <circle cx="150" cy="400" r="80" fill="url(#circleGradient1)" className={styles.pulse1} />
        <circle cx="1750" cy="600" r="120" fill="url(#circleGradient2)" className={styles.pulse2} />
        
        {/* Rotating Rings */}
        <g className={styles.ring1} style={{ transformOrigin: '960px 540px' }}>
          <circle cx="960" cy="540" r="300" fill="none" stroke="#58a6ff" strokeWidth="0.5" strokeOpacity="0.1" strokeDasharray="10 20" />
        </g>
        <g className={styles.ring2} style={{ transformOrigin: '960px 540px' }}>
          <circle cx="960" cy="540" r="450" fill="none" stroke="#7ee787" strokeWidth="0.3" strokeOpacity="0.08" strokeDasharray="5 15" />
        </g>
      </svg>

      {/* Animated Geometric SVG Layer 3 - Triangles & Lines */}
      <svg 
        className={styles.svgLayer} 
        viewBox="0 0 1920 1080" 
        preserveAspectRatio="xMidYMid slice"
        style={{ transform: `translateY(${parallax3}px)` }}
      >
        <defs>
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#58a6ff" stopOpacity="0" />
            <stop offset="50%" stopColor="#58a6ff" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#58a6ff" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Floating Triangles */}
        <g style={{ transform: `rotate(${rotation * 1.5}deg)`, transformOrigin: '400px 700px' }}>
          <polygon 
            points="400,650 450,750 350,750" 
            fill="none" 
            stroke="#d2a8ff" 
            strokeWidth="0.5" 
            strokeOpacity="0.2"
            className={styles.triangle1}
          />
        </g>
        <g style={{ transform: `rotate(${-rotation}deg)`, transformOrigin: '1500px 150px' }}>
          <polygon 
            points="1500,100 1560,200 1440,200" 
            fill="none" 
            stroke="#7ee787" 
            strokeWidth="0.5" 
            strokeOpacity="0.15"
            className={styles.triangle2}
          />
        </g>

        {/* Animated Lines */}
        <line x1="0" y1="300" x2="500" y2="350" stroke="url(#lineGradient)" strokeWidth="1" className={styles.line1} />
        <line x1="1400" y1="800" x2="1920" y2="750" stroke="url(#lineGradient)" strokeWidth="1" className={styles.line2} />

        {/* Floating Dots */}
        <circle cx="300" cy="200" r="3" fill="#58a6ff" fillOpacity="0.4" className={styles.dot1} />
        <circle cx="600" cy="600" r="2" fill="#7ee787" fillOpacity="0.3" className={styles.dot2} />
        <circle cx="1300" cy="300" r="4" fill="#d2a8ff" fillOpacity="0.3" className={styles.dot3} />
        <circle cx="1700" cy="900" r="2" fill="#58a6ff" fillOpacity="0.4" className={styles.dot4} />
        <circle cx="100" cy="800" r="3" fill="#7ee787" fillOpacity="0.3" className={styles.dot5} />
      </svg>

      {/* Glowing Orbs */}
      <div className={styles.particles}>
        <div 
          className={styles.orb1} 
          style={{ transform: `translate(${Math.sin(scrollY * 0.002) * 20}px, ${parallax1}px)` }}
        />
        <div 
          className={styles.orb2} 
          style={{ transform: `translate(${Math.cos(scrollY * 0.002) * 30}px, ${parallax2}px)` }}
        />
        <div 
          className={styles.orb3} 
          style={{ transform: `translate(${Math.sin(scrollY * 0.003) * 15}px, ${parallax3}px)` }}
        />
      </div>
    </div>
  );
}
