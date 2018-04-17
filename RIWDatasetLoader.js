const fs = require('fs')
    , path = require('path')
    , {promisify} = require('util');

const RabbitWrapper = require('./RabbitWrapper');

const initialPath = '/home/eachirei/Desktop/facultate/RIW/L1/riwdataset';

const dirList = [initialPath];

(async function makeMeAsync() {
    const commChannel = await RabbitWrapper({
        to: 'DirectIndexFile'
    });
    const commChannelBarrier = await RabbitWrapper({
        to: 'BarrierDirectIndex'
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
            if (path.basename(fPath) === 'txt') {
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
