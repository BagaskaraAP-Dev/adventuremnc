import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });
  
  // Wait a bit for 3D scene to render
  await new Promise(r => setTimeout(r, 2000));
  
  // Press 'F' to enter rover
  await page.keyboard.press('f');
  
  // Wait for transition and camera to settle
  await new Promise(r => setTimeout(r, 1000));
  
  await page.screenshot({ path: 'rover-seating.png' });
  console.log('Screenshot saved to rover-seating.png');
  
  await browser.close();
})();
