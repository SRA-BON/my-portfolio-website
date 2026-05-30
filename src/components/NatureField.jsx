import { useEffect, useRef } from 'react';

const SNOW_COUNT = 150;
const LEAF_COUNT = 35;
const BIRD_COUNT = 7;

function rand(a, b) { return a + Math.random() * (b - a); }

export default function NatureField() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const resize = () => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // Factory: Snowflakes
    const makeSnow = () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      radius: rand(1, 3),
      speedY: rand(0.5, 1.5),
      speedX: rand(-0.5, 0.5),
      opacity: rand(0.15, 0.5) // Reduced opacity
    });

    // Factory: Red Leaves
    const makeLeaf = () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: rand(4, 8),
      speedY: rand(1, 2.5),
      speedX: rand(-1, 1),
      rotation: rand(0, Math.PI * 2),
      rotSpeed: rand(-0.05, 0.05),
      color: `rgba(200, 50, 50, ${rand(0.25, 0.55)})` // Reduced opacity
    });

    // Factory: Birds (simple 'V' shapes)
    const makeBird = () => ({
      x: Math.random() * canvas.width,
      y: rand(canvas.height * 0.1, canvas.height * 0.4), // Fly in upper half
      size: rand(8, 15),
      speedX: rand(1, 3) * (Math.random() > 0.5 ? 1 : -1), // Left or right
      speedY: rand(-0.2, 0.2),
      wingPhase: Math.random() * Math.PI * 2,
      wingSpeed: rand(0.1, 0.2)
    });

    let snow = Array.from({ length: SNOW_COUNT }, makeSnow);
    let leaves = Array.from({ length: LEAF_COUNT }, makeLeaf);
    let birds = Array.from({ length: BIRD_COUNT }, makeBird);

    let raf;
    let t = 0;

    const draw = () => {
      t++;
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // Draw Snow
      snow.forEach(s => {
        s.y += s.speedY;
        s.x += s.speedX + Math.sin(t * 0.01 + s.y) * 0.5; // gentle sway

        if (s.y > h) { s.y = -10; s.x = Math.random() * w; }
        if (s.x > w) s.x = 0;
        if (s.x < 0) s.x = w;

        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${s.opacity})`;
        ctx.fill();
      });

      // Draw Leaves
      leaves.forEach(l => {
        l.y += l.speedY;
        l.x += l.speedX + Math.sin(t * 0.02) * 1;
        l.rotation += l.rotSpeed;

        if (l.y > h + 20) { l.y = -20; l.x = Math.random() * w; }
        if (l.x > w + 20) l.x = -20;
        if (l.x < -20) l.x = w + 20;

        ctx.save();
        ctx.translate(l.x, l.y);
        ctx.rotate(l.rotation);
        
        // Draw a simple leaf shape (ellipse-ish)
        ctx.beginPath();
        ctx.ellipse(0, 0, l.size, l.size / 2, 0, 0, Math.PI * 2);
        ctx.fillStyle = l.color;
        ctx.fill();
        ctx.restore();
      });

      // Draw Birds
      birds.forEach(b => {
        b.x += b.speedX;
        b.y += b.speedY;
        b.wingPhase += b.wingSpeed;

        // Wrap around screen
        if (b.x > w + 50 && b.speedX > 0) { b.x = -50; b.y = rand(h * 0.1, h * 0.4); }
        if (b.x < -50 && b.speedX < 0) { b.x = w + 50; b.y = rand(h * 0.1, h * 0.4); }

        const wingOffset = Math.sin(b.wingPhase) * (b.size * 0.5);

        ctx.save();
        ctx.translate(b.x, b.y);
        // Flip bird if flying left
        if (b.speedX < 0) ctx.scale(-1, 1);

        ctx.beginPath();
        ctx.moveTo(0, 0); // Center point
        // Right wing
        ctx.quadraticCurveTo(b.size * 0.5, -b.size * 0.2 + wingOffset, b.size, -b.size * 0.4 + wingOffset);
        ctx.moveTo(0, 0);
        // Left wing (drawn backwards relative to flight path)
        ctx.quadraticCurveTo(-b.size * 0.3, -b.size * 0.1 + wingOffset * 0.8, -b.size * 0.8, -b.size * 0.2 + wingOffset * 0.8);
        
        ctx.strokeStyle = 'rgba(2, 67, 81, 0.25)'; // Subtle green/teal color for birds, reduced opacity
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
      });

      raf = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
      }}
      aria-hidden="true"
    />
  );
}
