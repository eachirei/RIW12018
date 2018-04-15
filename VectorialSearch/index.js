const express = require('express')
    , stem = require('stem-porter')
    , MongoClient = require('mongodb').MongoClient;

let directIndexCollection, reverseIndexCollection;

(async () => {
    const mongoConnection = await MongoClient.connect('mongodb://localhost:27017');
    const db = await mongoConnection.db('RIW');
    directIndexCollection = await db.collection('direct-index');
    reverseIndexCollection = await db.collection('reverse-index');
})();


const app = express();

const stopWordsMap = require('../StopWords');

// to add min length for word
// need to do reverse index

const exceptionsMap = require('../ExceptionWords');

app.use(express.urlencoded());

function procWord(word) {
    if (word === '' || stopWordsMap[word]) {
        return null;
    }
    if (exceptionsMap[word]) {
        return word;
    }
    return stem(word);
}

function getRevFilesForWord(word) {
    const proccedWord = procWord(word);
    if (proccedWord === null) {
        return [];
    }
    if (exceptionsMap[proccedWord]) {
        return Object.keys(require(revRefO[proccedWord])[proccedWord]);
    }
    return Object.keys(require(revRefO[proccedWord])[proccedWord]);
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

async function getReverseIdx(query) {
    const splitQuery = query.split(' ');
    const queryTerms = [];
    for (let i = 0; i < splitQuery.length; i++) {
        if (i < (splitQuery.length - 1) && splitQuery[i] === 'NOT') {
            i++;
            continue;
        }
        if (splitQuery[i] in opMaps) {
            continue;
        }
        const proccedWord = procWord(splitQuery[i]);
        if (!proccedWord) {
            continue;
        }
        if (queryTerms.indexOf(proccedWord) === -1) {
            queryTerms.push(proccedWord);
        }
    }
    const returnData = {
        words: [],
        paths: []
    };
    try {
        returnData.words = await reverseIndexCollection.find({word: {"$in": queryTerms}}, {
            _id: 0,
            "paths.count": 0
        }).toArray();
        const pathsArr = [];
        returnData.words.forEach(wIdx => {
            wIdx.paths.forEach(p => {
                if (pathsArr.indexOf(p.path) === -1) {
                    pathsArr.push(p.path);
                }
            });
        });
        returnData.paths = await directIndexCollection.find({path: {"$in": pathsArr}}, {
            _id: 0,
            "words.count": 0,
            "words.tf": 0
        }).toArray();
    } catch (err) {
        console.error(err);
    }
    return returnData;
}

app.get('/search', async (req, res, next) => {
    const searchQuery = req.query.query;
    
    const result = await getReverseIdx(searchQuery);
    
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
            op = 'OR';
        }
        searchTerms.unshift(opMaps[op](a, b));
    }
    
    if (typeof searchTerms[0] === 'string') {
        return res.json(getRevFilesForWord(searchTerms[0]));
    }
    
    return res.json(searchTerms[0]);
});

app.listen(3000);
