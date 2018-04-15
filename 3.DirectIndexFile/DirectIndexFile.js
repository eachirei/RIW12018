const fs = require('fs')
    , path = require('path')
    , stem = require('stem-porter')
    , MongoClient = require('mongodb').MongoClient;

const RabbitWrapper = require('../RabbitWrapper');

const stopWordsMap = require('../StopWords');

// to add min length for word
// need to do reverse index

const exceptionsMap = require('../ExceptionWords');

function isAlphaNum(character) {
    return (character >= '0' && character <= '9') ||
        (character >= 'A' && character <= 'Z') ||
        (character >= 'a' && character <= 'z') ||
        character === '\'';
}

function addWordToMap(freqDict, word) {
    if (!freqDict[word]) {
        freqDict[word] = 0;
    }
    freqDict[word]++
}

/**
 *
 * @param word {string}
 * @return {string}
 */
function processCommonWord(word) {
    word = word.toLowerCase();
    word = stem(word);
    return word;
}

function processWord(freqDict, currentWord) {
    if (currentWord === '') {
        return;
    }
    if (exceptionsMap[currentWord]) {
        return addWordToMap(freqDict, currentWord);
    }
    if (currentWord.length < 3) {
        return;
    }
    if (stopWordsMap[currentWord]) {//skip stopword
        return;
    }
    return addWordToMap(freqDict, processCommonWord(currentWord))
}

function computeTF(freqDict) {
    const noWords = Object.values(freqDict).reduce((accum, count) => accum + count, 0);
    const TFed = {};
    for (const [word, count] of Object.entries(freqDict)) {
        TFed[word] = {
            count,
            tf: count / noWords
        };
    }
    return TFed;
}

(async function makeMeAsync() {
    const mongoConnection = await MongoClient.connect('mongodb://localhost:27017');
    const db = await mongoConnection.db('RIW');
    const directIndexCollection = await db.collection('direct-index');
    
    const commChannel = await RabbitWrapper({
        from: 'DirectIndexFile',
        to: 'BatchIndexes',
        messageHandler: processFile
    });
    
    function processFile(message, msgCb) {
        if (!message || !message.data) {
            return msgCb(null);
        }
    
        async function finalizeIndex() {
            const htmlFilePath = path.join(path.dirname(filePath), `${path.basename(filePath, '.txt')}.html`);
            const TFed = computeTF(freqDict);
            try {
                await directIndexCollection.updateOne({
                    path: htmlFilePath
                }, {
                    "$set": {
                        "words": Object.entries(TFed).map(([word, {count, tf}]) => ({
                            word,
                            count,
                            tf
                        }))
                    }
                }, {upsert: true});
                await (() => new Promise((resolve, reject) => {
                    commChannel.sendMessage({
                        filePath: htmlFilePath,
                        fileJSON: TFed
                    }, (err) => {
                        if (err) {
                            msgCb(err, true);
                            return reject(err);
                        }
                        msgCb();
                        return resolve();
                    });
                }))();
            } catch (err) {
                console.error(err);
            }
            freqDict = {};
        }
        
        const filePath = message.data;
        console.log(filePath);
        
        const readStream = fs.createReadStream(filePath, {
            flags: 'r',
            // encoding: 'utf8',//this breaks if different character encoding is present
            // highWaterMark: 256
        });
        
        let currentWord = '';
        let freqDict = {};
        
        readStream.on('data', (dataBuf) => {
            console.log(`chunk for ${filePath}`);
            dataBuf.toString().split('').forEach((currentChar) => {
                // console.log(data);
                if (!isAlphaNum(currentChar)) {
                    processWord(freqDict, currentWord);
                    return currentWord = '';
                }
                currentWord += currentChar;
            });
        });
    
        readStream.on('error', async (err) => {
            console.error(err);
            processWord(freqDict, currentWord);
        
            await finalizeIndex();
        });
    
        readStream.on('close', async () => {
            console.log(`closed ${filePath}`);
            processWord(freqDict, currentWord);
        
            await finalizeIndex();
        });
        
    }
})();

