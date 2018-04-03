const fs = require('fs')
    , path = require('path')
    , {promisify} = require('util')
    , RabbitWrapper = require('../RabbitWrapper');

const initialPath = '/home/eachirei/Desktop/facultate/RIW/L1/files/jsoup.org';

const dirList = [initialPath];

(async function makeMeAsync() {
    const commChannel = await RabbitWrapper({
        to: 'HTMLTextExtractor'
    });
    const commChannelBarrier = await RabbitWrapper({
        to: 'BARRIER'
    });
    const filesMap = {};
    while (dirList.length) {
        const currentDir = dirList.pop();
        const fileList = await (promisify(fs.readdir)(currentDir));
        fileList.forEach(f => {
            const fPath = path.join(currentDir, f);
            const fStats = fs.statSync(fPath);
            if (fStats.isDirectory()) {
                return dirList.push(fPath);
            }
            if (path.extname(fPath) === '.html') {
                filesMap[fPath] = true;
                commChannel.sendMessage({
                    data: fPath
                });
                console.log(fPath);
            }
        });
    }
    commChannelBarrier.sendMessage(filesMap);
})();
