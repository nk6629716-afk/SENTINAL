import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = path.resolve('docs', 'screenshots');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

// Copy before screenshots from artifacts if available
const artifactsDir = 'C:\\Users\\echrontech-laptop\\.gemini\\antigravity-ide\\brain\\3ff39525-f9db-4887-8d03-849019754825\\.tempmediaStorage';
const beforeMap = [
  { src: 'media_1792946780994.png', dest: 'before-overview-1440.png' },
  { src: 'media_1792946786761.png', dest: 'before-skywatch-1440.png' },
  { src: 'media_1792946792149.png', dest: 'before-fieldlink-1440.png' },
  { src: 'media_1792946804708.png', dest: 'before-mediroute-1440.png' },
];

for (const { src, dest } of beforeMap) {
  const fullSrc = path.join(artifactsDir, src);
  const fullDest = path.join(SCREENSHOT_DIR, dest);
  if (fs.existsSync(fullSrc) && !fs.existsSync(fullDest)) {
    try {
      fs.copyFileSync(fullSrc, fullDest);
      console.log(`Copied ${src} -> ${dest}`);
    } catch (e) {
      console.warn(`Could not copy ${src}:`, e.message);
    }
  }
}

const VIEWPORTS = [
  { width: 1440, height: 900, suffix: '1440px' },
  { width: 1024, height: 768, suffix: '1024px' },
  { width: 390, height: 844, suffix: '390px' },
];

const MODULES = [
  { id: 'dashboard', name: 'overview' },
  { id: 'fieldlink', name: 'fieldlink' },
  { id: 'skywatch', name: 'skywatch' },
  { id: 'geointel', name: 'geointel' },
  { id: 'mediroute', name: 'mediroute' },
];

async function run() {
  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      channel: 'msedge',
    });
  } catch (err) {
    try {
      browser = await chromium.launch({
        headless: true,
        channel: 'chrome',
      });
    } catch (err2) {
      console.error('Could not launch system msedge or chrome:', err2.message);
      return;
    }
  }

  console.log('Browser launched successfully');
  const context = await browser.newContext();
  const page = await context.newPage();

  for (const vp of VIEWPORTS) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto('http://localhost:5173');
    await page.waitForTimeout(1000);

    for (const mod of MODULES) {
      console.log(`Capturing ${mod.name} at ${vp.suffix}...`);
      if (vp.width < 768) {
        const btn = page.locator(`.mobile-bottom-dock button`).filter({ hasText: new RegExp(mod.name.slice(0, 4), 'i') }).first();
        if (await btn.isVisible()) {
          await btn.click();
        }
      } else {
        const btn = page.locator(`.sidebar-nav-item`).filter({ hasText: new RegExp(mod.name.slice(0, 4), 'i') }).first();
        if (await btn.isVisible()) {
          await btn.click();
        }
      }

      await page.waitForTimeout(500);
      const outPath = path.join(SCREENSHOT_DIR, `after-${mod.name}-${vp.suffix}.png`);
      await page.screenshot({ path: outPath, fullPage: false });
      console.log(`Saved: ${outPath}`);
    }
  }

  await browser.close();
  console.log('All screenshots captured successfully!');
}

run().catch(console.error);
