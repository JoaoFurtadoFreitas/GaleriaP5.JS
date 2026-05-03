// Op Art — Olho Interativo
//
// CAMPO VISUAL:
//   A zona de transição (circular ↔ horizontal) é ancorada no centro FIXO do canvas.
//   O centro dos anéis é interpolado entre canvas-center (fixo) e iris-center (animado):
//
//     f        = R² / (R² + r²_canvas)     ← peso: 1 no centro, 0 longe
//     centerBL = canvas_center + f · (iris - canvas_center)
//     lv       = sqrt(r²_blend · (R² + dy_fix²) / (R² + r²_blend)) / BAND + 0.5
//
//   Perto do canvas center → iris anima os anéis (olho se mexe).
//   Longe do canvas center → blended center ≈ canvas center (faixas estáticas).

let irisX, irisY;

const BASE_BAND   = 10;   // largura de cada faixa (ref.: 600 px)
const BASE_R      = 120;  // raio da zona de transição
const BASE_PUPIL  = 52;   // raio da pupila
const BASE_MOVE_X = 46;   // máx. deslocamento horizontal da íris
const BASE_MOVE_Y = 22;   // máx. deslocamento vertical

function setup() {
  createCanvas(400, 400).position((windowWidth - width) / 2,
    (windowHeight - height) / 2);

  pixelDensity(1);
  irisX = width  / 2;
  irisY = height / 2;
}

function draw() {
  const cx = width  / 2;
  const cy = height / 2;
  const s  = min(width, height) / 600;

  const BAND   = BASE_BAND  * s;
  const R2     = sq(BASE_R  * s);
  const P2     = sq(BASE_PUPIL * s);
  const MOVE_X = BASE_MOVE_X * s;
  const MOVE_Y = BASE_MOVE_Y * s;

  // Cursor → direção e saturação do deslocamento da íris
  const mx  = mouseX - cx;
  const my  = mouseY - cy;
  const mag = Math.sqrt(mx * mx + my * my) || 1;
  const t   = Math.min(mag / (BASE_R * s * 2), 1);

  irisX = lerp(irisX, cx + (mx / mag) * MOVE_X * t, 0.1);
  irisY = lerp(irisY, cy + (my / mag) * MOVE_Y * t, 0.1);

  // Offset da íris em relação ao canvas center — pré-multiplicado por R²
  // para evitar multiplicação extra dentro do loop de pixels
  const iris_dx    = irisX - cx;
  const iris_dy    = irisY - cy;
  const irdx_R2    = iris_dx * R2;
  const irdy_R2    = iris_dy * R2;

  loadPixels();

  for (let y = 0; y < height; y++) {
    const dyFix  = y - cy;           // distância vertical ao canvas center (FIXO)
    const dyFix2 = dyFix * dyFix;
    const dyI    = y - irisY;        // distância vertical ao centro da íris
    const dyI2   = dyI * dyI;
    const R2pDF2 = R2 + dyFix2;      // pré-computado por linha

    for (let x = 0; x < width; x++) {
      const dxFix  = x - cx;
      const r2c    = dxFix * dxFix + dyFix2;  // r² em relação ao canvas center
      const R2pr2c = R2 + r2c;
      const inv    = 1 / R2pr2c;              // 1 divisão reutilizada para dx e dy

      // Centro interpolado do anel:
      //   dxBlend = dxFix − iris_dx · f  =  dxFix − irdx_R2 / R2pr2c
      const dxB = dxFix - irdx_R2 * inv;
      const dyB = dyFix - irdy_R2 * inv;
      const r2B = dxB * dxB + dyB * dyB;

      // Nível do campo usando o centro interpolado
      const lv = Math.sqrt(r2B * R2pDF2 / (R2 + r2B)) / BAND + 0.5;

      let c = (Math.floor(lv) & 1) ? 255 : 0;

      // Pupila: override preto ao redor do centro ANIMADO da íris
      const dxI = dxFix - iris_dx;   // == x - irisX
      if (dxI * dxI + dyI2 < P2) c = 0;

      const i = (y * width + x) << 2;
      pixels[i] = pixels[i + 1] = pixels[i + 2] = c;
      pixels[i + 3] = 255;
    }
  }

  updatePixels();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  irisX = width  / 2;
  irisY = height / 2;
}
