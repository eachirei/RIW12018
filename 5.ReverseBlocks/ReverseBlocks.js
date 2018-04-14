// get block path from prev
// reverse it and parse to format <word> <path> <freq>
// sort the strings in the above format
// write to file
// push to vector of paths
// on DONE send to next vector of paths
const fs = require('fs')
    , path = require('path');

const RabbitWrapper = require('../RabbitWrapper');

(async function makeMeAsync() {
    
    const commChannelBarrier = await RabbitWrapper({
        from: 'BarrierReverseBlocks',
        messageHandler: barrierInit
    });
    
    async function barrierInit(idxPathDict, msgCbBig) {
        // when this message arrives, direct index is already done, so this can go through
        const idxPathCount = Object.keys(idxPathDict).length;
        let currentIdxPathCount = 0;
        let currentDocsCount = 0;
        
        const commChannel = await RabbitWrapper({
            from: 'ReverseBLocks',
            to: 'FullReverseIndex',
            messageHandler: reverseBlock
        });
        
        const blocksDir = 'blocks_dir';
        let blockCount = 0;
        const blockPathsArr = [];
        
        function reverseBlock(message, msgCb) {
            currentIdxPathCount++;
            console.log(message.data);
            const idxPath = message.data;
            
            const partialIdx = require(idxPath);
            let formattedData = [];
    
            currentDocsCount += Object.keys(partialIdx).length;
            
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
            
            msgCb();
            
            if (currentIdxPathCount === idxPathCount) {
                return commChannel.sendMessage({
                    docsCount: currentDocsCount,
                    blocks: blockPathsArr
                }, (err) => {
                    if (err) {
                        return msgCbBig(err, true);
                    }
                    return msgCbBig();
                });
            }
            
        }
    }
    
})();
