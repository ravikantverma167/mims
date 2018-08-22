const puppeteer = require('puppeteer');
const cheerio = require('cheerio')


const login = async(page) => {

    await page.setViewport({ width: 1920, height: 926 });
    await page.goto('http://www.mims.com/india');
    await page.click('#authsection > div.signinlink > a');
    await page.waitForNavigation();

    await page.type('#EmailAddress', 'isha131722@gmail.com');
    await page.type('#Password', 'Isha@123');
    await page.click('#btnSubmit');
    await page.waitForNavigation();

    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve(page)
        }, 10000)
    });
}



(async() => {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    await login(page);

    page.goto('http://www.mims.com/india/browse/alphabet/a?cat=drug', { timeout: 0 })
    await page.waitForNavigation({ timeout: 0 });

    // let $ = cheerio.load(body);

    console.log(await page.content());

    await browser.close();
})();
