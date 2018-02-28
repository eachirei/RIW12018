const fs = require('fs')
    , path = require('path');

const initialPath = '/home/eachirei/Desktop/facultate/RIW/L1/files/jsoup.org';
const destFileName = './files/fileList';

try {
    fs.truncateSync(destFileName);
} catch (err) {
    console.log('no need to truncate');
}


const dirList = [initialPath];

while (dirList.length) {
    const currentDir = dirList.pop();
    const fileList = fs.readdirSync(currentDir);
    fileList.forEach(f => {
        const fPath = path.join(currentDir, f);
        const fStats = fs.statSync(fPath);
        if (fStats.isDirectory()) {
            return dirList.push(fPath);
        }
        if (path.extname(fPath) === '.html') {
            fs.appendFileSync(destFileName, `${fPath}\n`);
        }
    });
}
