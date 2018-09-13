const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
var csv = require('fast-csv');
const fs = require("fs")

var current = {
    index: 0,
    continue: false,
    alphabet: null,
    pageNo: null,
    itemNo: null,
    items: []
}

var isTest = false;

const rootUrl = 'http://www.mims.com/'

const getCurrent = async () => {
    var stream = fs.createReadStream(`./data/current.csv`);

    return new Promise((resolve, reject) => {
        csv.fromStream(stream, { headers: true })
            .on("data", (data) => {
                data = data || {
                    index: current.index || 0,
                    continue: false,
                    alphabet: current.alphabet,
                    pageNo: current.pageNo,
                    itemNo: current.itemNo,
                }
                current = {
                    index: parseInt('' + data.index),
                    continue: data.continue === 'true',
                    alphabet: data.alphabet,
                    pageNo: parseInt('' + data.pageNo),
                    itemNo: parseInt('' + data.itemNo),
                    items: []
                }
                console.log(current)
            })
            .on("end", async () => {
                console.log("done");
                return resolve(saveCurrent());
            });
    })
}

const saveCurrent = async () => {
    // current.continue = true;
    var csvStream = csv.createWriteStream({
        headers: true
    });

    let writableStream = fs.createWriteStream(`./data/current.csv`)

    writableStream.on("finish", function () {
        console.log("DONE!");
    });

    csvStream.pipe(writableStream);
    csvStream.write({
        index: current.index,
        continue: true,
        alphabet: current.alphabet,
        pageNo: current.pageNo,
        itemNo: current.itemNo
    });
}

const addItem = async (item) => {
    current.items.push(item);
    if (current.items.length >= 45) {
        await saveData()
    }
}

const saveData = async () => {
    let fileName = `${current.alphabet}-${current.pageNo}-${current.itemNo}`;
    console.log(`writing ${current.items.length} items to file ${fileName}.csv`)
    var csvStream = csv.createWriteStream({
        headers: true
    });

    let writableStream = fs.createWriteStream(`./data/${fileName}.csv`)

    writableStream.on("finish", function () {
        console.log("DONE!");
    });

    csvStream.pipe(writableStream);
    current.items.forEach(item => {
        csvStream.write(item);
    })
    current.items = [];

    await saveCurrent();
}

const click = async (selector, page, waitFor) => {
    // console.log("click")
    await page.click(selector)
    // .then((data) => {
    //     return page.waitForNavigation({
    //         timeout: 0
    //     })
    // })
    waitFor = waitFor || '#wrapper'
    return page.waitFor(waitFor)
}

const open = async (url, page) => {
    // console.log("open")

    await page.goto(url, {
        timeout: 0
    })
    // page.waitForNavigation({
    //     timeout: 0
    // })

    return page.waitFor('#wrapper')

    // return new Promise((resolve, reject) => {
    //     page.on('load', () => {
    //         console.log("open resolve")
    //         return resolve()
    //     });
    // })
}

const set = async (selector, value, page) => {
    const name = await page.waitForSelector(selector);
    await name.type(value)
    await page.waitFor(3000)
}

const login = async (page) => {
    // console.log("login")
    await page.setViewport({
        width: 1520,
        height: 926
    });
    await page.goto('http://www.mims.com/india', {
        timeout: 0
    });
    // await open('http://www.mims.com/india', page);
    await click('#authsection > div.signinlink > a', page, "#divOuterContainer")
    await set('#EmailAddress', 'isha131722@gmail.com', page)
    await set('#Password', 'Isha@123', page)
    await click('#btnSubmit', page)
    // console.log('logged in')
}

const getText = async (page, selector) => {
    try {
        let val = await page.evaluate((sel) => {
            let el = document.querySelector(sel)

            if (el) {
                return el.innerText || ''
            }
            return '';
        }, selector)


        val = val.replace(/,/gi, '|')
        val = val.replace(/"/gi, '')

        return val
    }
    catch (err) {
        return ''
    }
}

const extractItemFromPage = async (page) => {
    await page.waitFor('[itemprop="name"]')

    let item = {
        row: `${current.pageNo}-${current.itemNo}`
    }
    try {
        item.name = await getText(page, '[itemprop="name"]')
        item.manufacturer = await getText(page, '[itemprop="manufacturer"]')
        item.composition = await getText(page, '[itemprop="nonProprietaryName"]')
        item.atc = await getText(page, '#tbMonoCenter > tbody > tr:nth-child(6) > td.outline-all > span')
        item.administration = await getText(page, '#tbMonoCenter > tbody > tr:nth-child(3) > td.outline-all > span')
        item.form = await getText(page, '#tdMonoPP > table > tbody > tr:nth-child(2) > td:nth-child(1) > font > strong')
        item.mrp = await getText(page, '#tdMonoPP > table > tbody > tr:nth-child(2) > td:nth-child(2) > table > tbody > tr > td > font > strong')
        return item
    } catch (err) {
        return item
    }
}

const getDataFromDetailPage = async (selector, page) => {
    try {
        await click(selector, page, "#Head1")
        return extractItemFromPage(page)
    } catch (err) {
        console.log(err)
        return {
            row: `${current.pageNo}-${current.itemNo}`
        }
    }
}

const getFromPage = async (content, page) => {
    let count = 0;
    let rowNo = current.itemNo;
    for (; ; rowNo++) {
        current.itemNo = rowNo
        let selector = `#content > table:nth-child(6) > tbody > tr:nth-child(${rowNo + 2}) > td:nth-child(2) > a`

        let exists = await page.evaluate((sel) => document.querySelector(sel), selector)
        if (!exists) {
            break;
        }
        count++;
        let item = await getDataFromDetailPage(selector, page)

        // if (item.row = 11) {
        //     throw new Error('crashed');
        // }
        await addItem(item)
        if (isTest) {
            break;
        }
        await page.goBack();
        await page.waitFor('#wrapper')
    }

    return count;
}

const getFromAlpahbet = async (char, no, page) => {
    current.pageNo = no
    current.itemNo = 1
    await open(`${rootUrl}/india/browse/alphabet/${char}?cat=drug&tab=brand&page=${no}`, page)

    let content = await page.content();

    let noOfItemsFetched = await getFromPage(content, page);

    console.log(`char ${char} page: ${no} count: ${noOfItemsFetched}  `);

    if (isTest) {
        return;
    }

    if (!noOfItemsFetched) {
        return
    }

    return getFromAlpahbet(char, no + 1, page)
}

const extractAlpha = async (page) => {
    try {
        await getFromAlpahbet(current.alphabet, current.pageNo, page);
    } catch (ex) {
        console.log(ex)
        await saveData()
        extractAlpha(page)
    }
}

(async () => {
    await getCurrent();

    const browser = await puppeteer.launch({
        headless: false,
        //  executablePath: 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
    });
    const page = await browser.newPage();
    await login(page);

    try {

        let alphas = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z']
        for (let index = current.index; index < alphas.length; index++) {
            current.index = index;
            current.alphabet = alphas[index];
            if (current.continue) {
                current.continue = false
            } else {
                current.pageNo = 1;
            }

            await extractAlpha(page)
        }

        if (current.items.length != 0) {
            await saveData()
        }
    } catch (err) {
        console.log(err)
        saveCurrent()
    }

    await browser.close();
})();


