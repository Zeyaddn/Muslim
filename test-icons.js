
const puppeteer = require('puppeteer-core');

(async () => {
  try {
    const executablePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
    
    const browser = await puppeteer.launch({ executablePath, headless: "new" });
    const page = await browser.newPage();
    
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
    page.on('requestfailed', request => console.log('REQUEST FAILED:', request.url(), request.failure().errorText));

    console.log('Navigating to http://localhost:3000...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0', timeout: 15000 }).catch(e => console.log('Goto error:', e.message));
    
    await page.screenshot({ path: 'screenshot.png' });
    console.log('Screenshot saved');
    
    const iconCount = await page.evaluate(() => document.querySelectorAll('i.fa, i.fas, i.fab').length);
    console.log('Number of FontAwesome icons on page:', iconCount);
    
    // Also log FontAwesome link element
    const faLink = await page.evaluate(() => {
      const link = document.querySelector('link[href*="font-awesome"]');
      return link ? link.href : 'NOT FOUND';
    });
    console.log('FontAwesome link on page:', faLink);
    
    await browser.close();
  } catch (err) {
    console.error('Puppeteer error:', err);
  }
})();
