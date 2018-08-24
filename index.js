const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
var csv = require('fast-csv');
const fs = require("fs")

const rootUrl = 'http://www.mims.com/'

const click = async (selector, page) => {

    return Promise.all([
        page.waitForNavigation({
            timeout: 0
        }),
        page.click(selector)
    ]);

}

const open = async (url, page) => {
    await page.goto(url, {
        timeout: 0
    });

    await page.waitForNavigation({
        timeout: 0
    });
}


const set = async (selector, value, page) => {
    const name = await page.waitForSelector(selector);
    await name.type(value)
    await page.waitFor(3000)
}

const login = async (page) => {
    await page.setViewport({
        width: 1520,
        height: 926
    });
    await open('http://www.mims.com/india', page);
    await click('#authsection > div.signinlink > a', page)
    await set('#EmailAddress', 'isha131722@gmail.com', page)
    await set('#Password', 'Isha@123', page)
    await click('#btnSubmit', page)
    console.log('logged in')
}

const saveData = async (items) => {
    var csvStream = csv.createWriteStream({
        headers: true
    })
    let writableStream = fs.createWriteStream("./Drugs_Database/A.csv")

    writableStream.on("finish", function () {
        console.log("DONE!");
    });

    csvStream.pipe(writableStream);
    items.forEach(item => {
        csvStream.write(item);
    })
}

const getText = async (selector, $) =>{
    return $(valueSelector).text()
}

const extractValue = async(keySelector, valueSelector) =>{
    // TODO if data does not exist
    if(false) {
        return null
    }
    return {
        key:getText(keySelector, $),
        value:  getText(valueSelector, $)
    }
}

const extractItemFromPage = async (content) => {
    let $ = cheerio.load(content)
    let item = {
        name: getText('#tdMonoTop > div:nth-child(2) > h1 > span:nth-child(2)', $)
    };
    for(let rowNo = 1; rowNo < 5; rowNo++) {
        let data = extractValue(
            `#tbMonoCenter > tbody > tr:nth-child(${rowNo}) > td.outline > span`
            `#tbMonoCenter > tbody > tr:nth-child(${rowNo}) > td.outline-all > span > a > span > span`,
            $
        )

        if(data === null) {
            break;
        }

        switch(data.key) {
            case 'Manufacturer': 
            item.manufacturer = data.value
            break
        }
    }

    return item

    // let name_selector = '#tdMonoTop > div:nth-child(2) > h1 > span:nth-child(2)'
    // name = $(name_selector)

    // data_selactor = '#tbMonoCenter > tbody > tr > td.outline-all > span'
    // let data = $(data_selactor)

    // keySelector = '#tbMonoCenter > tbody > tr > td.outline > span'
    // let key = $(keySelector)
    // if (key === 'Manufacturer') {
    //     manufacturer = $(data[0]).text()
    // }
    // Active_Ingredients = $(data[1]).text(),
    //     manufacturer = $(data[0]).text(),
    //     Administration / Uses = $(data[0]).text()
    // console.log(Active_Ingredients, manufacturer);
    // return {
    //     Active_Ingredients: $(data[1]).text(),
    //     manufacturer: $(data[0]).text()
    // }
}

const getDataFromDetailPage = async (selector, page) => {
    await click(selector, page)
    let content = await page.content();
    return extractItemFromPage(content)
}

const getFromPage = async (content, page) => {
    let selectors = []
    let items = []
    // TODO review 10
    for (let rowNo = 1; rowNo <= 40; rowNo++) {
        selectors.push(`#content > table:nth-child(6) > tbody > tr:nth-child(${rowNo + 2}) > td:nth-child(2) > a`)
    }

    for (let selector of selectors) {
        items.push(await getDataFromDetailPage(selector, page))
    }
    return items;
}

const doesNextPageExist = async (content) => {
    // TODO - 3
    return true;
}


const getFromAlpahbet = async (char, no, page) => {
    await open(`${rootUrl}/india/browse/alphabet/${char}?cat=drug&tab=brand&page=${no}`, page)
    let content = await page.content();

    let items = await getFromPage(content, page);
    let nextPageExist = await doesNextPageExist(content)
    if (nextPageExist) {
        let nextData = await getFromAlpahbet(char, no++, page)

        nextData.forEach(item => {
            items.push(item)
        })
    }
    return items
}

(async () => {
    const browser = await puppeteer.launch({
        headless: false,
        //  executablePath: 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
    });
    const page = await browser.newPage();
    await login(page);
    let data = await getFromAlpahbet('y', 3, page);
    console.log(data)

    await saveData(data);
    await browser.close();
})();