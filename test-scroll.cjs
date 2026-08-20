const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));
  
  await page.goto('http://localhost:4321', { waitUntil: 'networkidle' });
  await page.click('.preloader-cta');
  await page.waitForTimeout(1000);
  
  // Scroll a LOT continuously
  for (let i = 0; i < 50; i++) {
    await page.mouse.wheel(0, 100);
    await page.waitForTimeout(50);
  }
  
  await page.waitForTimeout(1000);
  
  const getActiveTitle = async () => page.evaluate(() => {
    const el = document.querySelector('.ui-work-center-title-inner span');
    return el ? el.textContent : null;
  });

  console.log('After heavy scroll:', await getActiveTitle());

  await browser.close();
})();
