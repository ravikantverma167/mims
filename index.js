const puppeteer = require('puppeteer');

(async() => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto('http:/www.mims.com/india');
    await page.click('#authsection > div.signinlink > a');
    await page.waitForNavigation();

    await page.type('#EmailAddress', 'isha131722@gmail.com');
    await page.type('#Password', 'Isha@123');
    await page.click('#btnSubmit');
    await page.waitForNavigation();
    // await page.screenshot({path: 'screenshot.png'});
    // await page.waitForNavigation();
    console.log(await page.content());
    await page.screenshot({ path: 'screenshot.png' });

    await browser.close();
})();
