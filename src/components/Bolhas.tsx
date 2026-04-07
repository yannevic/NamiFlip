import { useEffect, useRef } from 'react';

interface Bolha {
  x: number;
  y: number;
  r: number;
  speed: number;
  hue: number;
  drift: number;
  driftOffset: number;
  opacity: number;
}

interface Goticula {
  ang: number;
  spd: number;
  gr: number;
  hOff: number;
  gravity: number;
  vy: number;
  trail: { x: number; y: number }[];
}

interface Spray {
  x: number;
  y: number;
  r: number;
  hue: number;
  t: number;
  goticulas: Goticula[];
}

function criarBolha(largura: number, altura: number, noFundo = false): Bolha {
  return {
    x: Math.random() * largura,
    y: noFundo ? altura + Math.random() * altura * 0.5 : Math.random() * altura,
    r: 16 + Math.random() * 52,
    speed: 0.3 + Math.random() * 0.6,
    hue: Math.random() * 360,
    drift: Math.random() * Math.PI * 2,
    driftOffset: 0.008 + Math.random() * 0.012,
    opacity: 0.55 + Math.random() * 0.3,
  };
}

function resolverColisoes(bolhas: Bolha[]) {
  for (let i = 0; i < bolhas.length; i++) {
    for (let j = i + 1; j < bolhas.length; j++) {
      const a = bolhas[i];
      const b = bolhas[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const distSq = dx * dx + dy * dy;
      const minDist = a.r + b.r;

      if (distSq < minDist * minDist && distSq > 0.001) {
        const dist = Math.sqrt(distSq);
        const overlap = (minDist - dist) / 2;
        const nx = dx / dist;
        const ny = dy / dist;

        const totalR = a.r + b.r;
        const ratioA = b.r / totalR;
        const ratioB = a.r / totalR;

        a.x -= nx * overlap * ratioA * 1.05;
        a.y -= ny * overlap * ratioA * 1.05;
        b.x += nx * overlap * ratioB * 1.05;
        b.y += ny * overlap * ratioB * 1.05;
      }
    }
  }
}

function desenharBolha(ctx: CanvasRenderingContext2D, b: Bolha) {
  const { x, y, r, hue, opacity } = b;

  ctx.save();

  const interior = ctx.createRadialGradient(x, y, 0, x, y, r);
  interior.addColorStop(0, `hsla(${hue}, 80%, 95%, ${opacity * 0.06})`);
  interior.addColorStop(0.7, `hsla(${(hue + 40) % 360}, 70%, 85%, ${opacity * 0.04})`);
  interior.addColorStop(1, `hsla(${(hue + 80) % 360}, 60%, 75%, ${opacity * 0.08})`);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = interior;
  ctx.fill();

  const numSegmentos = 60;
  for (let i = 0; i < numSegmentos; i++) {
    const angulo = (i / numSegmentos) * Math.PI * 2;
    const anguloProx = ((i + 1) / numSegmentos) * Math.PI * 2;
    const h = (hue + (i / numSegmentos) * 120) % 360;
    ctx.beginPath();
    ctx.arc(x, y, r, angulo, anguloProx);
    ctx.strokeStyle = `hsla(${h}, 90%, 75%, ${opacity * 0.7})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  const reflexoX = x - r * 0.28;
  const reflexoY = y - r * 0.32;
  const reflexoR = r * 0.52;
  const reflexo = ctx.createRadialGradient(reflexoX, reflexoY, 0, reflexoX, reflexoY, reflexoR);
  reflexo.addColorStop(0, `rgba(255, 255, 255, ${opacity * 0.55})`);
  reflexo.addColorStop(0.4, `rgba(255, 255, 255, ${opacity * 0.2})`);
  reflexo.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r * 0.92, 0, Math.PI * 2);
  ctx.clip();
  ctx.beginPath();
  ctx.arc(reflexoX, reflexoY, reflexoR, 0, Math.PI * 2);
  ctx.fillStyle = reflexo;
  ctx.fill();
  ctx.restore();

  const reflexo2X = x + r * 0.2;
  const reflexo2Y = y + r * 0.55;
  const reflexo2 = ctx.createRadialGradient(reflexo2X, reflexo2Y, 0, reflexo2X, reflexo2Y, r * 0.35);
  reflexo2.addColorStop(0, `hsla(${(hue + 180) % 360}, 80%, 90%, ${opacity * 0.25})`);
  reflexo2.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r * 0.92, 0, Math.PI * 2);
  ctx.clip();
  ctx.beginPath();
  ctx.arc(reflexo2X, reflexo2Y, r * 0.35, 0, Math.PI * 2);
  ctx.fillStyle = reflexo2;
  ctx.fill();
  ctx.restore();

  ctx.beginPath();
  ctx.arc(x - r * 0.32, y - r * 0.38, r * 0.07, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.85})`;
  ctx.fill();

  ctx.restore();
}

function criarSpray(bx: number, by: number, br: number, hue: number): Spray {
  const n = 22 + Math.floor(Math.random() * 16);
  const goticulas: Goticula[] = Array.from({ length: n }, () => ({
    ang: Math.random() * Math.PI * 2,
    spd: 1.5 + Math.random() * 4.0,
    gr: 1.8 + Math.random() * 4.2,
    hOff: Math.random() * 80 - 40,
    gravity: 0.06 + Math.random() * 0.12,
    vy: 0,
    trail: [],
  }));
  return { x: bx, y: by, r: br, hue, t: 0, goticulas };
}

function atualizarDesenharSpray(ctx: CanvasRenderingContext2D, spray: Spray): boolean {
  spray.t = Math.min(spray.t + 0.045, 1);
  const { x, y, r, hue, t } = spray;

  // flash inicial
  if (t < 0.2) {
    const ft = t / 0.2;
    const fo = (1 - ft) * 0.45;
    const fr = r * 0.5 * (1 - ft * 0.5);
    const fg = ctx.createRadialGradient(x, y, 0, x, y, fr);
    fg.addColorStop(0, `rgba(255,255,255,${fo})`);
    fg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.beginPath();
    ctx.arc(x, y, fr, 0, Math.PI * 2);
    ctx.fillStyle = fg;
    ctx.fill();
  }

  for (const g of spray.goticulas) {
    g.vy += g.gravity;
    const dist = r * 0.2 + r * g.spd * t * 0.28;
    const gx = x + Math.cos(g.ang) * dist;
    const gy = y + Math.sin(g.ang) * dist + g.vy * t * r * 0.3;

    const op = Math.max(0, 1 - Math.pow(t / (g.spd * 0.25), 1.5));
    const gr = g.gr * (1 - t * 0.5);
    const h2 = (hue + g.hOff + 360) % 360;

    // rastro
    g.trail.push({ x: gx, y: gy });
    if (g.trail.length > 6) g.trail.shift();

    for (let i = 0; i < g.trail.length; i++) {
      const tp = i / g.trail.length;
      const to = op * tp * 0.35;
      const tr = gr * tp * 0.7;
      if (tr < 0.3) continue;
      ctx.beginPath();
      ctx.arc(g.trail[i].x, g.trail[i].y, tr, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${h2},80%,85%,${to})`;
      ctx.fill();
    }

    // gotinha principal
    if (gr > 0.3) {
      const grd = ctx.createRadialGradient(gx - gr * 0.3, gy - gr * 0.3, 0, gx, gy, gr);
      grd.addColorStop(0, `hsla(${h2},80%,95%,${op})`);
      grd.addColorStop(0.5, `hsla(${h2},75%,78%,${op * 0.85})`);
      grd.addColorStop(1, `hsla(${h2},65%,60%,${op * 0.2})`);
      ctx.beginPath();
      ctx.arc(gx, gy, gr, 0, Math.PI * 2);
      ctx.fillStyle = grd;
      ctx.fill();

      // reflexinho branco nas maiores
      if (gr > 2) {
        ctx.beginPath();
        ctx.arc(gx - gr * 0.25, gy - gr * 0.28, gr * 0.22, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${op * 0.7})`;
        ctx.fill();
      }
    }
  }

  return t < 1;
}

export default function Bolhas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let raf: number;
    let largura = 0;
    let altura = 0;
    let ctx: CanvasRenderingContext2D | null = null;

    function init() {
      largura = window.innerWidth;
      altura = window.innerHeight;
      canvas!.width = largura;
      canvas!.height = altura;
      ctx = canvas!.getContext('2d');
    }

    function resize() {
      largura = window.innerWidth;
      altura = window.innerHeight;
      canvas!.width = largura;
      canvas!.height = altura;
    }

    window.addEventListener('resize', resize);

    const bolhas: Bolha[] = [];

    function handleClick(e: MouseEvent) {
      const rect = canvas!.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      let menorDist = Infinity;
      let indiceMaisProximo = -1;
      for (let i = 0; i < bolhas.length; i++) {
        const b = bolhas[i];
        const dx = mx - b.x;
        const dy = my - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < b.r && dist < menorDist) {
          menorDist = dist;
          indiceMaisProximo = i;
        }
      }
      if (indiceMaisProximo !== -1) {
        const b = bolhas[indiceMaisProximo];
        sprays.push(criarSpray(b.x, b.y, b.r, b.hue));
        bolhas[indiceMaisProximo] = criarBolha(largura, altura, true);
      } else {
        canvas!.style.pointerEvents = 'none';
        const below = document.elementFromPoint(e.clientX, e.clientY);
        if (below && below !== canvas) below.dispatchEvent(new MouseEvent('click', e));
        canvas!.style.pointerEvents = 'auto';
      }
    }

    canvas.addEventListener('click', handleClick);
    const sprays: Spray[] = [];

    function draw() {
      if (!ctx) return;
      ctx.clearRect(0, 0, largura, altura);
      for (const b of bolhas) {
        b.y -= b.speed;
        b.drift += b.driftOffset;
        b.x += Math.sin(b.drift) * 0.6;
        b.hue = (b.hue + 0.2) % 360;
        if (b.y + b.r < 0) Object.assign(b, criarBolha(largura, altura, true));
      }
      resolverColisoes(bolhas);
      resolverColisoes(bolhas);
      for (const b of bolhas) desenharBolha(ctx, b);
      for (let i = sprays.length - 1; i >= 0; i--) {
        const vivo = atualizarDesenharSpray(ctx, sprays[i]);
        if (!vivo) sprays.splice(i, 1);
      }
      raf = requestAnimationFrame(draw);
    }

    // espera o browser terminar o layout antes de iniciar
    requestAnimationFrame(() => {
      init();
      for (let i = 0; i < 40; i++) bolhas.push(criarBolha(largura, altura, false));
      for (let pass = 0; pass < 10; pass++) resolverColisoes(bolhas);
      draw();
    });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('click', handleClick);
    };
  }, []);

  return (
    <canvas ref={canvasRef} className="fixed inset-0 pointer-events-auto" style={{ zIndex: 1 }} />
  );
}