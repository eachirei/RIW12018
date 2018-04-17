// get array of indexes blocks
// open descriptor for each one of them
// read first line from each and extract words
// https://nodejs.org/api/fs.html#fs_fs_readsync_fd_buffer_offset_length_position
// sort unique words and form a queue
// read from all blocks that contain that line and add to global index
// if word from newly read line is different than current word, add to queue and keep it sorted
// when no other descriptors have that word, get to the next in queue
// repeat till end
// every X words write a partial rev_index and its path to a ref file
// write full rev_index to file
const fs = require('fs')
    , MongoClient = require('mongodb').MongoClient;

const RabbitWrapper = require('../RabbitWrapper');

function BlockWrapper(blockPath) {
    const fd = fs.openSync(blockPath, 'r');
    const CHUNK_SIZE = 200;
    let currentLine = null;
    let currentPosition = 0;
    
    this.getCurrentLine = () => {
        return currentLine;
    };
    
    this.getCurrentWord = () => {
        return currentLine !== null ? currentLine.split(' ')[0] : null;
    };
    
    function updateLine() {
        let readBuffer = new Buffer(CHUNK_SIZE);
        let tempLine = '';
        let tempPosition = currentPosition;
        do {
            const bytesRead = fs.readSync(fd, readBuffer, 0, CHUNK_SIZE, tempPosition);
            if (bytesRead === 0) {
                tempLine = null;
                break;
            }
            tempPosition += bytesRead;
            tempLine += readBuffer.toString();
        } while (tempLine.indexOf('\n') === -1);
        
        if (tempLine === null) {
            currentLine = null;
            return;
        }
        
        const [myLine, ...restOfLine] = tempLine.split('\n');
        
        currentLine = myLine;
        currentPosition += currentLine.length + 1;//add \n
    }
    
    this.getNextWord = () => {
        updateLine();
        return this.getCurrentWord();
    };
    
    this.cleanup = () => {
        fs.closeSync(fd);
    };
}

(async function makeMeAsync() {
    const mongoConnection = await MongoClient.connect('mongodb://localhost:27017');
    const db = await mongoConnection.db('RIW');
    const reverseIndexCollection = await db.collection('reverse-index');
    
    const commChannel = await RabbitWrapper({
        from: 'FullReverseIndex',
        messageHandler: fullReverseIndex
    });
    
    function fullReverseIndex(message, msgCb) {
        const {docsCount, blocks: pathsArr} = message;
        console.log(pathsArr);
        let mongoTime = 0;
        
        function finalizeWord(revForWord, word) {
            const docsWithWordCount = Object.keys(revForWord).length;
            const idf = Math.log(docsCount / (1 + docsWithWordCount));
            // console.time('updateDB');
            const now = Date.now();
            // try {
            reverseIndexCollection.updateOne({
                    word
                }, {
                    "$set": {
                        "paths": Object.entries(revForWord).map(([path, {count, tf}]) => ({
                            path,
                            count,
                            tfidf: +tf * idf
                        })),
                        idf: idf
                    }
                }, {upsert: true});
            // } catch (err) {
            //     console.error(err);
            // }
            mongoTime += Date.now() - now;
            // console.timeEnd('updateDB');
        }
        
        console.time('startReverse');
        const blocks = pathsArr.map((p) => new BlockWrapper(p));
        
        const firstWords = blocks.map(b => b.getNextWord());
        const wordsQueue = [];
        firstWords.forEach(fW => {
            if (wordsQueue.indexOf(fW) === -1) {
                return wordsQueue.push(fW);
            }
        });
        wordsQueue.sort((a, b) => a.localeCompare(b));
        
        while (wordsQueue.length) {
            const currentWorkingWord = wordsQueue.shift();
            const wordO = {};
            console.log(`${currentWorkingWord} - ${wordsQueue.length} words left in queue`);
            
            let workingBlocks = blocks.filter(b => b.getCurrentWord() === currentWorkingWord);
            // console.time('wordDone');
            for (let i = 0; i < workingBlocks.length; i++) {
                const wB = workingBlocks[i];
                do {
                    const blockLine = wB.getCurrentLine();
                    if (blockLine === null) {
                        return;
                    }
                    const [word, path, freq, tf] = blockLine.split(' ');
                    wordO[path] = {
                        count: freq,
                        tf
                    };
                } while (wB.getNextWord() === currentWorkingWord);
            }
    
            finalizeWord(wordO, currentWorkingWord);
            // console.timeEnd('wordDone');
            
            blocks.forEach(b => {
                const cW = b.getCurrentWord();
                if (cW !== null && wordsQueue.indexOf(cW) === -1) {
                    return wordsQueue.push(cW);
                }
            });
            
            wordsQueue.sort((a, b) => a.localeCompare(b));
            
        }
        
        blocks.forEach(b => b.cleanup());
        
        msgCb();
        console.timeEnd('startReverse');
        console.log('mongo time ' + mongoTime);
        console.log('ALL DONE');
    }
})();
