const express = require('express')
    , stem = require('stem-porter');

const revRefO = require('./loadReverseReferences')();

const app = express();

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
    'MIT': true,
    'appendElement': true
};

app.use(express.urlencoded());

function getRevFilesForWord(word) {
    if (word === '') {
        return [];
    }
    if (exceptionsMap[word]) {
        return Object.keys(require(revRefO[word])[word]);
    }
    if (stopWordsMap[word]) {//skip stopword
        return [];
    }
    word = stem(word);
    return Object.keys(require(revRefO[word])[word]);
}

const opMaps = {
    'AND': (a, b) => {
        if (typeof a === 'string') {
            a = getRevFilesForWord(a);
        }
        if (typeof b === 'string') {
            b = getRevFilesForWord(b);
        }
        if (b.length < a.length) {
            for (let i = 0; i < b.length; i++) {
                if (a.indexOf(b[i]) === -1) {
                    b.splice(i, 1);
                    i--;
                }
            }
            return b;
        }
        for (let i = 0; i < a.length; i++) {
            if (b.indexOf(a[i]) === -1) {
                a.splice(i, 1);
                i--;
            }
        }
        return a;
    },
    'OR': (a, b) => {
        if (typeof a === 'string') {
            a = getRevFilesForWord(a);
        }
        if (typeof b === 'string') {
            b = getRevFilesForWord(b);
        }
        if (b.length < a.length) {
            for (let i = 0; i < b.length; i++) {
                if (a.indexOf(b[i]) === -1) {
                    a.push(b[i]);
                }
            }
            return a;
        }
        for (let i = 0; i < a.length; i++) {
            if (b.indexOf(a[i]) === -1) {
                b.push(a[i]);
            }
        }
        return b;
    },
    'NOT': (a, b) => {
        if (typeof a === 'string') {
            a = getRevFilesForWord(a);
        }
        if (typeof b === 'string') {
            b = getRevFilesForWord(b);
        }
        for (let i = 0; i < b.length; i++) {
            let aIdx = a.indexOf(b[i]);
            if (aIdx !== -1) {
                a.splice(aIdx, 1);
            }
        }
        return a;
    }
};

app.get('/search', (req, res, next) => {
    const searchQuery = req.query.query;
    let searchTerms = searchQuery.split(' ');
    
    //normalize searchTerms
    while (searchTerms[0] in opMaps) {
        searchTerms.shift();
    }
    
    while (searchTerms[searchTerms.length - 1] in opMaps) {
        searchTerms.pop();
    }
    
    if (!searchTerms.length) {
        return res.send('NO QUERIES SPECIFIED');
    }
    
    if (searchTerms.length % 2 === 0) {
        return res.send('INVALID SEARCH QUERY');
    }
    
    while (searchTerms.length !== 1) {
        let a, op, b;
        [a, op, b, ...searchTerms] = searchTerms;
        if (!(op in opMaps)) {
            return res.send('INVALID QUERY');
        }
        searchTerms.unshift(opMaps[op](a, b));
    }
    
    if (typeof searchTerms[0] === 'string') {
        return res.json(getRevFilesForWord(searchTerms[0]));
    }
    
    return res.json(searchTerms[0]);
});

app.listen(3000);
