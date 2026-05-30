import { useEffect, useRef } from 'react';

const STAR_COUNT   = 55;
const ACCENT_COUNT = 8;
const UFO_COUNT    = 5;
const SHIP_COUNT   = 3;

function rand(a, b) { return a + Math.random() * (b - a); }

function randInCircle(r) {
  const angle = Math.random() * Math.PI * 2;
  const dist  = Math.random() * r;
  return { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist };
}

export default function StarField() {
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

    const makeStar = (isAccent = false) => {
      const driftR = isAccent ? rand(3, 7) : rand(2, 5);
      const startPt = randInCircle(driftR);
      const targetPt = randInCircle(driftR);
      return {
        x0: Math.random(),
        y0: Math.random(),
        cx: startPt.x,
        cy: startPt.y,
        tx: targetPt.x,
        ty: targetPt.y,
        driftR,
        driftSpeed: isAccent ? rand(0.04, 0.10) : rand(0.03, 0.08),
        arriveThresh: 0.5,
        radius: isAccent ? rand(2.0, 3.2) : rand(0.7, 1.9),
        base: 0.5,
        amp: rand(0.40, 0.50),
        blinkSpeed: rand(0.004, 0.012),
        blinkPhase: Math.random() * Math.PI * 2,
        isAccent,
      };
    };

    const makeUFO = () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * (canvas.height * 0.7), // Increased range
      vx: rand(0.2, 0.6) * (Math.random() > 0.5 ? 1 : -1),
      vy: rand(0.1, 0.3) * (Math.random() > 0.5 ? 1 : -1),
      phase: Math.random() * Math.PI * 2,
      size: rand(5, 8),
      color: `hsl(${rand(180, 240)}, 70%, 70%)`,
    });

    const makeShip = () => {
      const fromLeft = Math.random() > 0.5;
      return {
        x: fromLeft ? -100 : canvas.width + 100,
        y: rand(50, canvas.height - 50),
        vx: (fromLeft ? rand(1.2, 2.2) : -rand(1.2, 2.2)),
        vy: rand(-0.5, 0.5), // More diagonal
        size: rand(3, 5),
        active: Math.random() > 0.6,
        fromLeft
      };
    };

    const stars   = Array.from({ length: STAR_COUNT },   () => makeStar(false));
    const accents = Array.from({ length: ACCENT_COUNT }, () => makeStar(true));
    let ufos      = Array.from({ length: UFO_COUNT }, () => makeUFO());
    let ships     = Array.from({ length: SHIP_COUNT }, () => makeShip());

    let raf;
    let t = 0;

    const draw = () => {
      t++;
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // ── Draw Stars ──────────────────────────────────────────────────
      [...stars, ...accents].forEach(s => {
        const dxToTarget = s.tx - s.cx;
        const dyToTarget = s.ty - s.cy;
        const dist = Math.sqrt(dxToTarget * dxToTarget + dyToTarget * dyToTarget);

        if (dist < s.arriveThresh) {
          const pt = randInCircle(s.driftR);
          s.tx = pt.x; s.ty = pt.y;
        } else {
          const step = Math.min(s.driftSpeed, dist);
          s.cx += (dxToTarget / dist) * step;
          s.cy += (dyToTarget / dist) * step;
        }

        const px = s.x0 * w + s.cx;
        const py = s.y0 * h + s.cy;
        const blink = Math.abs(Math.sin(t * s.blinkSpeed + s.blinkPhase));
        const alpha = Math.max(0.05, s.base - s.amp + blink * s.amp * 2);

        ctx.beginPath();
        ctx.arc(px, py, s.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${alpha.toFixed(3)})`;
        ctx.fill();

        if (s.isAccent) {
          const grd = ctx.createRadialGradient(px, py, 0, px, py, s.radius * 7);
          grd.addColorStop(0, `rgba(180,210,255,${(alpha * 0.4).toFixed(3)})`);
          grd.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.beginPath();
          ctx.arc(px, py, s.radius * 7, 0, Math.PI * 2);
          ctx.fillStyle = grd;
          ctx.fill();
        }
      });

      // ── Draw UFOs (Small discs with spectrum lights) ────────────────
      ufos.forEach(u => {
        u.x += u.vx;
        u.y += u.vy + Math.sin(t * 0.02 + u.phase) * 0.2; // Bobbing

        if (u.x < -20) u.x = w + 20;
        if (u.x > w + 20) u.x = -20;
        if (u.y < -20) u.y = h + 20;
        if (u.y > h + 20) u.y = -20;

        // Saucer Body
        ctx.beginPath();
        ctx.ellipse(u.x, u.y, u.size, u.size / 3, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(150, 150, 150, 0.4)';
        ctx.fill();

        // Dome
        ctx.beginPath();
        ctx.arc(u.x, u.y - u.size/6, u.size/3, Math.PI, 0);
        ctx.fillStyle = 'rgba(100, 200, 255, 0.3)';
        ctx.fill();

        // Spectrum Lights
        const lightColor = `hsl(${(t * 2 + u.phase * 50) % 360}, 80%, 60%)`;
        ctx.beginPath();
        ctx.arc(u.x, u.y, 1, 0, Math.PI * 2);
        ctx.fillStyle = lightColor;
        ctx.shadowBlur = 5;
        ctx.shadowColor = lightColor;
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // ── Draw Ships (Fast moving streaks) ─────────────────────────────
      ships.forEach(s => {
        if (!s.active) {
          if (Math.random() < 0.001) s.active = true;
          return;
        }

        s.x += s.vx;
        s.y += s.vy;

        // Reset if off screen (handle both directions)
        const isOffScreen = s.vx > 0 ? s.x > w + 150 : s.x < -150;
        if (isOffScreen) {
          const fromLeft = Math.random() > 0.5;
          s.fromLeft = fromLeft;
          s.x = fromLeft ? -100 : w + 100;
          s.y = rand(50, h - 50);
          s.vx = (fromLeft ? rand(1.2, 2.2) : -rand(1.2, 2.2));
          s.vy = rand(-0.5, 0.5);
          s.active = false;
        }

        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        // Trail points opposite to velocity
        ctx.lineTo(s.x - s.vx * 8, s.y - s.vy * 8);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Engine glow at the tail
        ctx.beginPath();
        ctx.arc(s.x - s.vx * 8, s.y - s.vy * 8, 1, 0, Math.PI * 2);
        ctx.fillStyle = '#ff6600';
        ctx.fill();
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
