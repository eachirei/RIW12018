// get block path from prev
// reverse it and parse to format <word> <path> <freq>
// sort the strings in the above format
// write to file
// push to vector of paths
// on DONE send to next vector of paths
const fs = require('fs')
    , path = require('path');

const ipc = new (require('../IpcWrapper'))({
    from: 'DirectIndex',
    current: 'ReverseBLocks',
    to: 'FullReverseIndex',
    messageHandler: reverseBlock
});

const blocksDir = 'blocks_dir';
let blockCount = 0;
const blockPathsArr = [];

function reverseBlock(data) {
    console.log(data);
    if (data === 'DONE') {
        return JSON.stringify(blockPathsArr);
    }
    
    const partialIdx = require(data);
    let formattedData = [];
    
    for (const filePath in partialIdx) {
        const pathIdx = partialIdx[filePath];
        for (const word in pathIdx) {
            formattedData.push(`${word} ${filePath} ${pathIdx[word]}`);
        }
    }
    
    formattedData.sort((a, b) => {
        const [wordA, pathA, freqA] = a.split(' ');
        const [wordB, pathB, freqB] = b.split(' ');
        if (wordA !== wordB) {
            return wordA.localeCompare(wordB);
        }
        return pathA.localeCompare(pathB);
    });
    
    const blockPath = path.join(__dirname, blocksDir, `block${blockCount}.txt`);
    
    try {
        fs.truncateSync(blockPath);
    } catch (err) {
        console.log('File not existing, no truncate required');
    }
    
    formattedData.forEach((fS) => {
        fs.appendFileSync(blockPath, fS + '\n');
    });
    
    if (formattedData.length) {
        blockCount++;
        blockPathsArr.push(blockPath);
    }
    
    
}
