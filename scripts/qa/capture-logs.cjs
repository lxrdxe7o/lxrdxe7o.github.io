const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('console', msg => console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`));
  await page.goto('http://localhost:4321', { waitUntil: 'networkidle' });
  const data = await page.evaluate(() => {
    const host = document.querySelector('[data-experience-canvas-host]');
    return {
      dataset: JSON.parse(JSON.stringify(host.dataset)),
      capabilities: {
        webgl: (function(){
          try {
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('webgl2') || canvas.getContext('webgl');
            return !!context;
          } catch(e) { return e.toString(); }
        })(),
        reducedData: window.matchMedia('(prefers-reduced-data: reduce)').matches,
        reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        pointer: window.matchMedia('(pointer: fine)').matches ? 'fine' : window.matchMedia('(pointer: coarse)').matches ? 'coarse' : 'none'
      }
    };
  });
  console.log(JSON.stringify(data, null, 2));
  await browser.close();
})();
