const fs = require('fs')
    , path = require('path');

const ipc = new (require('../IpcWrapper'))({
    from: 'TextToJSON',
    current: 'DirectIndex',
    to: 'ReverseBLocks',
    messageHandler: wtv
});

const refPath = `idx_ref.txt`;
try {
    fs.truncateSync(refPath);
} catch (err) {
    console.log('File not existing, no truncate required');
}

let workingBatch = {};
const MAX_FILES_INDEX = 30;
const idx_dir = 'idx_dir';
let idxCount = 0;

function flushIndexes() {
    console.log('flushing...');
    const idxPath = path.join(__dirname, idx_dir, `index${idxCount}.json`);
    try {
        fs.truncateSync(idxPath);
    } catch (err) {
        console.log('File not existing, no truncate required');
    }
    try {
        fs.appendFileSync(idxPath, JSON.stringify(workingBatch));
    } catch (errWriting) {
        console.error(errWriting);
    }
    idxCount++;
    for (const htmlFP in workingBatch) {
        try {
            fs.appendFileSync(refPath, `${htmlFP} ${path.join(__dirname, idxPath)}\n`);//weird bug when trying to write full reference dict
        } catch (errWriting) {
            console.error(errWriting);
        }
    }
    workingBatch = {};
    return ipc.sendEvent(idxPath);
}

function wtv(data) {
    let filePath, fileJSON;
    try {
        const parsingResult = JSON.parse(data);
        filePath = parsingResult.filePath;
        fileJSON = parsingResult.fileJSON;
    } catch (err) {
        if (data === 'DONE') { // to do this
            flushIndexes();
            ipc.sendEvent('DONE');
            return;
        }
        return console.error(err);
    }
    console.log(filePath);
    
    workingBatch[filePath] = fileJSON;
    if (Object.keys(workingBatch).length === MAX_FILES_INDEX) {
        flushIndexes();
    }
}

