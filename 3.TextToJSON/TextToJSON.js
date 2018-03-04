const fs = require('fs')
    , path = require('path');

const ipc = new (require('../IpcWrapper'))({
    from: 'HTMLTextExtractor',
    current: 'TextToJSON',
    to: 'DirectIndex',
    messageHandler: processFile
});

const stopWordsMap = {
    'a': true,
    'about': true,
    'above': true,
    'after': true,
    'again': true,
    'against': true,
    'all': true,
    'am': true,
    'an': true,
    'and': true,
    'any': true,
    'are': true,
    'aren\'t': true,
    'as': true,
    'at': true,
    'be': true,
    'because': true,
    'been': true,
    'before': true,
    'being': true,
    'below': true,
    'between': true,
    'both': true,
    'but': true,
    'by': true,
    'can\'t': true,
    'cannot': true,
    'could': true,
    'couldn\'t': true,
    'did': true,
    'didn\'t': true,
    'do': true,
    'does': true,
    'doesn\'t': true,
    'doing': true,
    'don\'t': true,
    'down': true,
    'during': true,
    'each': true,
    'few': true,
    'for': true,
    'from': true,
    'further': true,
    'had': true,
    'hadn\'t': true,
    'has': true,
    'hasn\'t': true,
    'have': true,
    'haven\'t': true,
    'having': true,
    'he': true,
    'he\'d': true,
    'he\'ll': true,
    'he\'s': true,
    'her': true,
    'here': true,
    'here\'s': true,
    'hers': true,
    'herself': true,
    'him': true,
    'himself': true,
    'his': true,
    'how': true,
    'how\'s': true,
    'i': true,
    'i\'d': true,
    'i\'ll': true,
    'i\'m': true,
    'i\'ve': true,
    'if': true,
    'in': true,
    'into': true,
    'is': true,
    'isn\'t': true,
    'it': true,
    'it\'s': true,
    'its': true,
    'itself': true,
    'let\'s': true,
    'me': true,
    'more': true,
    'most': true,
    'mustn\'t': true,
    'my': true,
    'myself': true,
    'no': true,
    'nor': true,
    'not': true,
    'of': true,
    'off': true,
    'on': true,
    'once': true,
    'only': true,
    'or': true,
    'other': true,
    'ought': true,
    'our': true,
    'ours	ourselves': true,
    'out': true,
    'over': true,
    'own': true,
    'same': true,
    'shan\'t': true,
    'she': true,
    'she\'d': true,
    'she\'ll': true,
    'she\'s': true,
    'should': true,
    'shouldn\'t': true,
    'so': true,
    'some': true,
    'such': true,
    'than': true,
    'that': true,
    'that\'s': true,
    'the': true,
    'their': true,
    'theirs': true,
    'them': true,
    'themselves': true,
    'then': true,
    'there': true,
    'there\'s': true,
    'these': true,
    'they': true,
    'they\'d': true,
    'they\'ll': true,
    'they\'re': true,
    'they\'ve': true,
    'this': true,
    'those': true,
    'through': true,
    'to': true,
    'too': true,
    'under': true,
    'until': true,
    'up': true,
    'very': true,
    'was': true,
    'wasn\'t': true,
    'we': true,
    'we\'d': true,
    'we\'ll': true,
    'we\'re': true,
    'we\'ve': true,
    'were': true,
    'weren\'t': true,
    'what': true,
    'what\'s': true,
    'when': true,
    'when\'s': true,
    'where': true,
    'where\'s': true,
    'which': true,
    'while': true,
    'who': true,
    'who\'s': true,
    'whom': true,
    'why': true,
    'why\'s': true,
    'with': true,
    'won\'t': true,
    'would': true,
    'wouldn\'t': true,
    'you': true,
    'you\'d': true,
    'you\'ll': true,
    'you\'re': true,
    'you\'ve': true,
    'your': true,
    'yours': true,
    'yourself': true,
    'yourselves': true
};

// to add min length for word
// need to do reverse index

const exceptionsMap = {
    'JSOUP': true,
    'JavaScript': true,
    'CSS': true,
    'jquery': true,
    'Java': true,
    'HTML': true,
    'jsoup': true,
    'HTML5': true,
    'wikipedia': true,
    'Wikipedia': true,
    'MIT': true
};

function isAlphaNum(character) {
    return (character >= '0' && character <= '9') ||
        (character >= 'A' && character <= 'Z') ||
        (character >= 'a' && character <= 'z') ||
        character === '\'';
}

function processFile(filePath) {
    return new Promise((resolve, reject) => {
        console.log(filePath);
        if (filePath === 'DONE') {
            return resolve('DONE');
        }
        const readStream = fs.createReadStream(filePath, {
            flags: 'r',
            // encoding: 'utf8',//this breaks if different character encoding is present
            // highWaterMark: 256
        });
        
        let currentWord = '';
        let freqDict = {};
        
        function addWordToMap(word) {
            if (!freqDict[word]) {
                freqDict[word] = 0;
            }
            freqDict[word]++
        }
        
        function processCommonWord(word) {
            return word;
        }
        
        readStream.on('data', (dataBuf) => {
            dataBuf.toString().split('').forEach((currentChar) => {
                // console.log(data);
                if (!isAlphaNum(currentChar)) {
                    if (currentWord === '') {
                        return;
                    }
                    if (currentWord.length < 3) {
                        currentWord = '';
                        return;
                    }
                    if (exceptionsMap[currentWord]) {
                        addWordToMap(currentWord);
                    } else {
                        if (stopWordsMap[currentWord]) {//skip stopword
                            currentWord = '';
                            return;
                        } else {
                            addWordToMap(processCommonWord(currentWord))
                        }
                    }
                    currentWord = '';
                    return;
                }
                currentWord += currentChar;
            });
        });
        
        readStream.on('error', (err) => {
            console.error(err);
            resolve(JSON.stringify({
                filePath: path.join(path.dirname(filePath), path.basename(filePath, '.txt')),
                fileJSON: freqDict
            }));//resolve with what was done till now
            freqDict = {};
        });
        
        // readStream.on('end', () => {
        //     console.log('no more data');
        // });
        
        readStream.on('close', () => {
            console.log(`closed ${filePath}`);
            resolve(JSON.stringify({
                filePath: path.join(path.dirname(filePath), `${path.basename(filePath, '.txt')}.html`),
                fileJSON: freqDict
            }));
            freqDict = {};
        });
    });
    
}
