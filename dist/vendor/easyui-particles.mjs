// Adapted from EasyUI AIImageReveal by Suraj Maurya (MIT). See easyui-LICENSE.txt.
                                
                         
                        
                        
                        
                                  
                                        
                                                                                                              
                                                  
     
                                                                           
                                                                            
                                                 
     
                                                                                       
 

const TAU = Math.PI * 2;
const clamp = (v        , min        , max        ) => (v < min ? min : v > max ? max : v);
const easeInOut = (u        ) => (u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2);

function mulberry32(seed        ) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const hexRgb = (h        )                           => {
  const n = parseInt(h.replace("#", "").slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

export function createParticleField(opts   
                
                 
               
                   
                
 )                {
  const { width: W, height: H, cell, colors } = opts;
  const rnd = mulberry32(opts.seed ?? 7);
  const cols = Math.ceil(W / cell);
  const rows = Math.ceil(H / cell);
  const n = cols * rows;
  const palette = (colors.length ? colors : ["#888888"]).map(hexRgb);

  const px = new Float32Array(n), py = new Float32Array(n);
  const sx = new Float32Array(n), sy = new Float32Array(n);
  const tx = new Float32Array(n), ty = new Float32Array(n);
  const delay = new Float32Array(n), arc = new Float32Array(n), nz = new Float32Array(n), ph = new Float32Array(n);
  const size = new Float32Array(n);
  const ir = new Uint8Array(n), ig = new Uint8Array(n), ib = new Uint8Array(n);
  const tr = new Uint8Array(n), tg = new Uint8Array(n), tb = new Uint8Array(n);
  const perm = new Uint32Array(n);

  const cx = W / 2, cy = H / 2;
  const sigma = Math.min(W, H) * 0.2;
  const gauss = () => Math.sqrt(-2 * Math.log(1 - rnd())) * Math.cos(TAU * rnd());

  for (let i = 0; i < n; i++) {
    perm[i] = i;
    px[i] = cx + gauss() * sigma * 1.15;
    py[i] = cy + gauss() * sigma;
    ph[i] = rnd() * TAU;
    size[i] = 1 + rnd() * 1.6;
    delay[i] = rnd();
    arc[i] = rnd() * 2 - 1;
    nz[i] = rnd() * 2 - 1;
    const c = palette[Math.floor(rnd() * palette.length)];
    ir[i] = c[0];
    ig[i] = c[1];
    ib[i] = c[2];
  }
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const t = perm[i];
    perm[i] = perm[j];
    perm[j] = t;
  }

  const pack = (r        , g        , b        , a        ) =>
    ((a & 255) << 24) | ((b & 255) << 16) | ((g & 255) << 8) | (r & 255);

  const block = (out             , x        , y        , s        , color        ) => {
    const ps = s < 1.5 ? 1 : Math.round(s);
    const x0 = Math.round(x - ps / 2), y0 = Math.round(y - ps / 2);
    const xa = x0 < 0 ? 0 : x0, ya = y0 < 0 ? 0 : y0;
    const xb = x0 + ps > W ? W : x0 + ps, yb = y0 + ps > H ? H : y0 + ps;
    for (let yy = ya; yy < yb; yy++) {
      const row = yy * W;
      for (let xx = xa; xx < xb; xx++) out[row + xx] = color;
    }
  };

  return {
    count: n,
    cols,
    rows,
    cell,

    stepIdle(dt, t) {
      const omega = 0.16;
      const k = 0.2;
      for (let i = 0; i < n; i++) {
        const dx = px[i] - cx, dy = py[i] - cy;
        const vx = -dy * omega + Math.sin(py[i] * 0.021 + t * 0.55 + ph[i]) * 30 - dx * k;
        const vy = dx * omega + Math.cos(px[i] * 0.018 - t * 0.47 + ph[i]) * 30 - dy * k;
        px[i] += vx * dt;
        py[i] += vy * dt;
      }
    },

    setTargets(rgb) {
      for (let i = 0; i < n; i++) {
        const c = perm[i];
        const col = c % cols, row = (c / cols) | 0;
        tx[i] = (col + 0.5) * cell;
        ty[i] = (row + 0.5) * cell;
        sx[i] = px[i];
        sy[i] = py[i];
        if (rgb) {
          tr[i] = rgb[c * 3];
          tg[i] = rgb[c * 3 + 1];
          tb[i] = rgb[c * 3 + 2];
        } else {
          // no pixel access (cross-origin image): a soft generic gradient, the image resolves over it
          const m = palette[(col + row) % palette.length];
          tr[i] = m[0];
          tg[i] = m[1];
          tb[i] = m[2];
        }
      }
    },

    draw(out, t, elapsed, duration) {
      out.fill(0);
      if (elapsed === null) {
        for (let i = 0; i < n; i++) {
          const tw = 0.5 + 0.5 * Math.sin(t * 1.4 + ph[i] * 3);
          block(out, px[i], py[i], size[i], pack(ir[i], ig[i], ib[i], 90 + 150 * tw));
        }
        return false;
      }
      const travel = duration * 0.72;
      const maxDelay = duration * 0.28;
      let done = true;
      for (let i = 0; i < n; i++) {
        const u = clamp((elapsed - delay[i] * maxDelay) / travel, 0, 1);
        if (u < 1) done = false;
        const e = easeInOut(u);
        let x = sx[i] + (tx[i] - sx[i]) * e;
        let y = sy[i] + (ty[i] - sy[i]) * e;
        // curved flight: a sideways bow that vanishes on arrival
        const dxv = tx[i] - sx[i], dyv = ty[i] - sy[i];
        const len = Math.hypot(dxv, dyv) || 1;
        const bow = arc[i] * Math.sin(Math.PI * e) * len * 0.22;
        x += (-dyv / len) * bow;
        y += (dxv / len) * bow;
        const s = size[i] + (cell - size[i]) * e * e;
        // colour: starts as the cloud's, ends as the pixel; noise melts away as it lands (denoise)
        const noise = nz[i] * 80 * (1 - e);
        const r = ir[i] + (tr[i] - ir[i]) * e + noise;
        const g = ig[i] + (tg[i] - ig[i]) * e + noise;
        const b = ib[i] + (tb[i] - ib[i]) * e + noise;
        block(
          out,
          e >= 1 ? tx[i] : x,
          e >= 1 ? ty[i] : y,
          s,
          pack(clamp(r, 0, 255) | 0, clamp(g, 0, 255) | 0, clamp(b, 0, 255) | 0, 150 + 105 * e),
        );
      }
      return done;
    },
  };
}

/** Average colour of every `cell`×`cell` block of an RGBA image (3 bytes per block) */
export function averageCells(data                   , W        , H        , cell        )             {
  const cols = Math.ceil(W / cell), rows = Math.ceil(H / cell);
  const out = new Uint8Array(cols * rows * 3);
  for (let cy = 0; cy < rows; cy++) {
    for (let cxx = 0; cxx < cols; cxx++) {
      let r = 0, g = 0, b = 0, c = 0;
      const x1 = Math.min(W, (cxx + 1) * cell), y1 = Math.min(H, (cy + 1) * cell);
      const step = Math.max(1, Math.floor(cell / 4));
      for (let y = cy * cell; y < y1; y += step)
        for (let x = cxx * cell; x < x1; x += step) {
          const o = (y * W + x) * 4;
          r += data[o];
          g += data[o + 1];
          b += data[o + 2];
          c++;
        }
      const k = (cy * cols + cxx) * 3;
      out[k] = r / (c || 1);
      out[k + 1] = g / (c || 1);
      out[k + 2] = b / (c || 1);
    }
  }
  return out;
}

