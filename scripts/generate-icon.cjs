// scripts/generate-icon.cjs
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const pngToIco = require('png-to-ico');

(async () => {
  try {
    const repoRoot = path.resolve(__dirname, '..');
    const srcSvg = path.join(repoRoot, 'public', 'favicon.svg');
    if (!fs.existsSync(srcSvg)) throw new Error(`Source icon not found: ${srcSvg}`);

    const outDir = path.join(repoRoot, 'build');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    const sizes = [256, 128, 64, 48, 32, 16];
    const pngPaths = [];

    for (const s of sizes) {
      const outP = path.join(outDir, `icon-${s}.png`);
      await sharp(srcSvg)
        .resize(s, s, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toFile(outP);
      pngPaths.push(outP);
    }

    const icoBuffer = await pngToIco(pngPaths);
    const icoPath = path.join(outDir, 'icon.ico');
    fs.writeFileSync(icoPath, icoBuffer);

    // cleanup intermediate pngs
    for (const p of pngPaths) {
      try { fs.unlinkSync(p); } catch (e) {}
    }

    console.log('✅ Generated', icoPath);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
})();
