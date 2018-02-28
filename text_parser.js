const fs = require('fs')
    , path = require('path');

const stopWords = ['a',
    'about',
    'above',
    'after',
    'again',
    'against',
    'all',
    'am',
    'an',
    'and',
    'any',
    'are',
    'aren\'t',
    'as',
    'at',
    'be',
    'because',
    'been',
    'before',
    'being',
    'below',
    'between',
    'both',
    'but',
    'by',
    'can\'t',
    'cannot',
    'could',
    'couldn\'t',
    'did',
    'didn\'t',
    'do',
    'does',
    'doesn\'t',
    'doing',
    'don\'t',
    'down',
    'during',
    'each',
    'few',
    'for',
    'from',
    'further',
    'had',
    'hadn\'t',
    'has',
    'hasn\'t',
    'have',
    'haven\'t',
    'having',
    'he',
    'he\'d',
    'he\'ll',
    'he\'s',
    'her',
    'here',
    'here\'s',
    'hers',
    'herself',
    'him',
    'himself',
    'his',
    'how',
    'how\'s',
    'i',
    'i\'d',
    'i\'ll',
    'i\'m',
    'i\'ve',
    'if',
    'in',
    'into',
    'is',
    'isn\'t',
    'it',
    'it\'s',
    'its',
    'itself',
    'let\'s',
    'me',
    'more',
    'most',
    'mustn\'t',
    'my',
    'myself',
    'no',
    'nor',
    'not',
    'of',
    'off',
    'on',
    'once',
    'only',
    'or',
    'other',
    'ought',
    'our',
    'ours	ourselves',
    'out',
    'over',
    'own',
    'same',
    'shan\'t',
    'she',
    'she\'d',
    'she\'ll',
    'she\'s',
    'should',
    'shouldn\'t',
    'so',
    'some',
    'such',
    'than',
    'that',
    'that\'s',
    'the',
    'their',
    'theirs',
    'them',
    'themselves',
    'then',
    'there',
    'there\'s',
    'these',
    'they',
    'they\'d',
    'they\'ll',
    'they\'re',
    'they\'ve',
    'this',
    'those',
    'through',
    'to',
    'too',
    'under',
    'until',
    'up',
    'very',
    'was',
    'wasn\'t',
    'we',
    'we\'d',
    'we\'ll',
    'we\'re',
    'we\'ve',
    'were',
    'weren\'t',
    'what',
    'what\'s',
    'when',
    'when\'s',
    'where',
    'where\'s',
    'which',
    'while',
    'who',
    'who\'s',
    'whom',
    'why',
    'why\'s',
    'with',
    'won\'t',
    'would',
    'wouldn\'t',
    'you',
    'you\'d',
    'you\'ll',
    'you\'re',
    'you\'ve',
    'your',
    'yours',
    'yourself',
    'yourselves'];

const stopWordsMap = {};
stopWords.forEach(sW => stopWordsMap[sW] = true);

const exceptionsMap = {
    'JSOUP': true
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
        const readStream = fs.createReadStream(filePath, {
            flags: 'r',
            // encoding: 'utf8',//this breaks if different character encoding is present
            highWaterMark: 1
        });
        
        let currentWord = '';
        const freqDict = {};
        
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
            const data = dataBuf.toString();
            // console.log(data);
            if (!isAlphaNum(data)) {
                if (currentWord === '') {
                    return;
                }
                if (stopWordsMap[currentWord]) {//skip stopword
                    return;
                }
                if (exceptionsMap[currentWord]) {
                    addWordToMap(currentWord);
                } else {
                    addWordToMap(processCommonWord(currentWord));
                }
                currentWord = '';
                return;
            }
            currentWord += data;
        });
        
        readStream.on('error', (err) => {
            console.error(err);
            resolve();
        });
        
        readStream.on('end', () => {
            console.log('no more data');
        });
        
        readStream.on('close', () => {
            console.log('file closed');
            const fileName = path.basename(filePath, '.txt');
            const jsonFilePath = path.join(path.dirname(filePath), `${fileName}.json`);
            try {
                fs.truncateSync(jsonFilePath);
            } catch (err) {
            }
            fs.writeFile(jsonFilePath, JSON.stringify(freqDict), (errorWriting) => {
                errorWriting && console.error(errorWriting);
                resolve();
            });
        });
        
    });
}

(async function wtv() {
    const filePaths = fs.readFileSync('./files/fileList', {encoding: 'UTF8'});
    await Promise.all(filePaths.split('\n').filter(fP => fP).map(fP => {
        const fileName = path.basename(fP, '.html');
        const txtFilePath = path.join(path.dirname(fP), `${fileName}.txt`);
        return processFile(txtFilePath);
    }));
    console.log('all done');
})();




