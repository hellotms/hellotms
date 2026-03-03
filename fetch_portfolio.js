const { chromium } = require('playwright');
(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    try {
        await page.goto('http://localhost:3000/portfolio', { timeout: 15000 });
        console.log(await page.content());
    } catch(e) {
        console.log('Error:', e.message);
    }
    await browser.close();
})();
