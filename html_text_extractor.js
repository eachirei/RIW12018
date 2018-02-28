const cheerio = require('cheerio')
    , fs = require('fs')
    , path = require('path')
    , {URL} = require('url');

function extractTextFromHtmlFile(filePath) {
    if (!filePath) {
        return;
    }
    const htmlContent = fs.readFileSync(filePath, {encoding: 'UTF8'});
    
    const $ = cheerio.load(htmlContent);
    
    // const title$ = $('title');
    
    const fileName = path.basename(filePath, '.html');
    const fileTitle = path.join(path.dirname(filePath), `${fileName}.txt`);
    
    console.log(`title: ${fileTitle}`);
    try {
        fs.truncateSync(fileTitle);
    } catch (e) {
        console.log('File not existing, no truncate required');
    }
    
    function printContentProperty(name, el, write) {
        if (el.length === 1) {
            const contentText = el.prop('content');
            // console.log(`${name}: ${contentText}`);
            if (write && fileTitle) {
                fs.appendFileSync(fileTitle, contentText);
            }
        } else {
            // console.error(`Error finding ${name} ${el.length}`);
        }
    }
    
    const metaKeywords$ = $('meta[name="keywords"]');
    
    printContentProperty('keywords', metaKeywords$, true);
    
    const metaDescription$ = $('meta[name="description"]');
    
    printContentProperty('description', metaDescription$, true);
    
    const metaRobots$ = $('meta[name="robots"]');
    
    printContentProperty('robots', metaRobots$);
    
    let a$ = $('a');
    
    a$ = a$.filter((idx, el) => $(el).prop('href') && $(el).prop('href')[0] !== '#');
    a$.each((idx, el) => {
        const href = $(el).prop('href');
        const urlO = new URL(href, 'https://jsoup.org');
        console.log(urlO.toString());
    });
    
    let allTextEls = $('body, body *');
    
    allTextEls.filter((idx, el) => $(el).text())
        .each((idx, el) => {
            if (fileTitle) {
                fs.appendFileSync(fileTitle, $(el).text().trim().replace(/\r*\n+/g, '\n').replace(/\t+/g, '').replace(/\s+/g, ' '));
            }
        });
}

const filePaths = fs.readFileSync('./files/fileList', {encoding: 'UTF8'});
filePaths.split('\n').forEach(extractTextFromHtmlFile);

