const fs = require('fs')
    , path = require('path')
    , {promisify} = require('util');

const ipc = new (require('../IpcWrapper'))({
    current: 'HTMLFilesFinder',
    to: 'HTMLTextExtractor'
});

const initialPath = '/home/eachirei/Desktop/facultate/RIW/L1/files/jsoup.org';

const dirList = [initialPath];

(async function makeMeAsync() {
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
                ipc.sendEvent(fPath);
                console.log(fPath);
            }
        });
    }
})();
