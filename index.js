const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
var request = require('request');
var csv = require('fast-csv');
const fs = require("fs")

const rootUrl = 'http://www.mims.com/'

const login = async (page) => {
    await page.setViewport({
        width: 1520,
        height: 926
    });
    await page.goto('http://www.mims.com/india', {
        timeout: 0
    });
    await page.click('#authsection > div.signinlink > a', {
        timeout: 0
    });
    await page.waitForNavigation();

    await page.type('#EmailAddress', 'isha131722@gmail.com');
    await page.type('#Password', 'Isha@123');
    await page.click('#btnSubmit', {
        timeout: 0
    });
    await page.waitForNavigation();
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve(page)
        }, 5000)
    });
}




const extractData = async (row) => {
    row = row.substring(1, row.length - 1)
    let $ = cheerio.load(row)
    let urls = []

    let items = []
    let tags = $('td > a')
    $(tags).each((index, element) => {
        urls.push('https://www.mims.com/' + $(element).attribs.href)
    })
    // let html = await getHtml(url)
    for (let url of urls) {
        let html = await getHtml(url)
        let data = await extractDrugInfo(html)
        items.push(data)
    }

    return items

}


const getList = async (html) => {
    const tableSelector = '#content > table.tblBrowse > tbody > tr'

    const $ = cheerio.load(html)


    let items = []

    let rows = []

    $(tableSelector).each((index, element) => {
        rows.push($(element).html())
    })


    let count = 0
    for (let row of rows) {
        // count++
        let list = await extractData(row)
        list.forEach(data => items.push(data))
        console.log(items)
        // if (count == 10) {
        //     break
        // }
    }

    return items
    // console.log(items[0])
}

const getData = async (content) => {
    let $ = cheerio.load(content);
    let html = await getHtml(content);
    let list = await getList(html);

    return $('#content > table:nth-child(6) > tbody > tr:nth-child(3) > td:nth-child(2) > a').text()
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

const extractItemFromPage = async(content) =>{
    let item = {};

    // TODO - 2:

    return item;
}

const getDataFromDetailPage = async (url, page) => {
    await page.goto(`${rootUrl}/${url}`, {
        timeout: 0
    });
    await page.waitForNavigation({
        timeout: 0
    });
    let content = await page.content();

    return extractItemFromPage(content)

}

const getFromPage = async (content, page) => {
    let urlSelector = '#content > table:nth-child(6) > tbody > tr > td > a'
    let urls = []
    let items = []
    // TODO - 1 get urls of deatild page
    $(urlSelector).each((index, element) => {
        urls.push(`${rootUrl}` + $(element)[0].attribs.href)
    })
    for (let url of urls) {
        items.push(await getDataFromDetailPage(url, page))
    }
    return items;
}

const doesNextPageExist = async (content) => {
    // TODO - 3
    return true;
}


const getFromAlpahbet = async (char, no, page) => {
    await page.goto(`${rootUrl}/india/browse/alphabet/${char}?cat=drug&tab=brand&page=${no}`, {
        timeout: 0
    });
// await page.waitForNavigation({
//         timeout: 0
//     });
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
        headless: false
    });
    const page = await browser.newPage();
    await login(page);
    let data = await getFromAlpahbet('a', 1, page);
    console.log(data)

    await saveData(data);
    await browser.close();
})();