const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  await page.goto('http://localhost:4321', { waitUntil: 'networkidle' });
  
  // Click the enter button
  await page.click('.preloader-cta');
  
  // Wait for the loader to fade out and the 3D scene to render
  await page.waitForTimeout(2000);
  
  await page.screenshot({ path: 'screenshot.png' });
  await browser.close();
  console.log('Screenshot saved to screenshot.png');
})();
