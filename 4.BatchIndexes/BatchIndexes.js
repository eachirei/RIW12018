const fs = require('fs')
    , path = require('path');

const RabbitWrapper = require('../RabbitWrapper');

(async function makeMeAsync() {
    
    const commChannelBarrier = await RabbitWrapper({
        from: 'BarrierDirectIndex',
        to: 'BarrierReverseBlocks',
        messageHandler: barrierInit
    });
    
    async function barrierInit(fileMap, msgCbBig) {
        const filesCount = Object.keys(fileMap).length;
        let currentFilesCount = 0;
        
        const commChannel = await RabbitWrapper({
            from: 'BatchIndexes',
            to: 'ReverseBLocks',
            messageHandler: wtv
        });
        
        let workingBatch = {};
        let idxPathDict = {};
        const MAX_FILES_INDEX = 65;
        const idx_dir = 'idx_dir';
        let idxCount = 0;
        let stopReceiving = false;
        
        function flushIndexes() {
            if (!Object.keys(workingBatch).length) {
                return;
            }
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
            idxPathDict[idxPath] = true;
            workingBatch = {};
            return commChannel.sendMessage({data: idxPath}, (err) => {
                if (err) {
                    console.error(err);
                }
            });
        }
        
        //better error handling here and overall
        
        async function wtv(message, msgCb) {
            if (stopReceiving) {
                return msgCb(true, true);
            }
            const filePath = message.filePath
                , fileJSON = message.fileJSON;
            
            console.log(filePath);
            workingBatch[filePath] = fileJSON;
            currentFilesCount++;
            msgCb();
            if (Object.keys(workingBatch).length === MAX_FILES_INDEX) {
                return flushIndexes();
            }
            if (currentFilesCount === filesCount) { // to do this
                flushIndexes();
                stopReceiving = true;
                return commChannelBarrier.sendMessage(idxPathDict, async (err) => {
                    await commChannel.close();
                    idxPathDict = {};
                    if (err) {
                        console.error(err);
                        return msgCbBig(err, false); // this could be handled better
                    }
                    return msgCbBig();
                });
            }
        }
    }
    
})();

