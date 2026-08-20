const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));

  await page.goto('http://localhost:4321', { waitUntil: 'networkidle' });
  
  await page.screenshot({ path: 'screenshot.png' });
  await browser.close();
  console.log('Screenshot saved to screenshot.png');
})();
