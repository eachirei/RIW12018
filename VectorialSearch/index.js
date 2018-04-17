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

const opMaps = {
    'and': true,
    'or': true,
    'not': true
};

function opIniter(revIdx) {
    function getRevFilesForWord(word) {
        const proccedWord = procWord(word);
        if (proccedWord === null) {
            return [];
        }
        if (exceptionsMap[proccedWord]) {
            return [...(revIdx[proccedWord] || [])];
        }
        return [...(revIdx[proccedWord] || [])];
    }
    
    return {
        'and': (a, b) => {
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
        'or': (a, b) => {
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
        'not': (a, b) => {
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
}

async function getReverseIdx(query) {
    query = query.split(' ').map(w => w ? w.toLowerCase() : w).join(' ');
    const splitQuery = query.split(' ');
    const queryTerms = [];
    for (let i = 0; i < splitQuery.length; i++) {
        // if (i < (splitQuery.length - 1) && splitQuery[i] === 'NOT') {
        //     i++;
        //     continue;
        // }
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
        words: {},
        pathsWithModulus: {},
        wordsWithIDFs: {}
    };
    try {
        console.time('firstMongo');
        const tempWordsIDFs = await reverseIndexCollection.find({word: {"$in": queryTerms}}, {
            _id: 0,
            "paths.count": 0
        }).toArray();
        console.timeEnd('firstMongo');
        const pathsArr = [];
        tempWordsIDFs.forEach(wIdx => {
            returnData.wordsWithIDFs[wIdx.word] = wIdx;
            returnData.words[wIdx.word] = wIdx.paths.map(p => p.path);
            wIdx.paths.forEach(p => {
                if (pathsArr.indexOf(p.path) === -1) {
                    pathsArr.push(p.path);
                }
            });
        });
        console.time('secondMongo');
        const docs = await directIndexCollection.find({path: {$in: pathsArr}}, {
            _id: 0,
            "words": 0
        }).toArray();
        console.timeEnd('secondMongo');
        docs.forEach(docO => {
            returnData.pathsWithModulus[docO.path] = docO.mod;
        });
    } catch (err) {
        console.error(err);
    }
    return returnData;
}

app.get('/search', async (req, res, next) => {
    console.time("search");
    const searchQuery = req.query.query.toLowerCase();
    
    const mongoData = await getReverseIdx(searchQuery);
    
    const queryApplier = opIniter(mongoData.words);
    
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
    
    while (searchTerms.length !== 1) {
        let a, op, b;
        [a, op, b, ...searchTerms] = searchTerms;
        if (!(op in opMaps)) {
            if (b) {
                searchTerms.unshift(b);
            }
            b = op;
            op = 'or';
        }
        searchTerms.unshift(queryApplier[op](a, b));
    }
    
    const resultDocs = typeof searchTerms[0] === 'string' ? (mongoData.words[procWord(searchTerms[0])] || []) : searchTerms[0];
    
    searchTerms = searchQuery.split(' ').filter((sT, idx, arr) => {
        if (!opMaps[sT]) {
            if (idx > 0) {
                return arr[idx - 1] !== 'not';
            }
            return true;
        }
        return false;
    }).map(sT => procWord(sT)).filter(sT => sT);
    
    const searchTermsMap = {};
    
    searchTerms.forEach(procced => {
        if (!searchTermsMap[procced]) {
            const idfO = mongoData.wordsWithIDFs[procced];
            searchTermsMap[procced] = {
                count: 0,
                tf: 0,
                idf: idfO ? idfO.idf : 0
            };
        }
        searchTermsMap[procced].count++;
        searchTermsMap[procced].tf = searchTermsMap[procced].count / searchTerms.length;
    });
    
    const queryModulus = Math.sqrt(Object.values(searchTermsMap).reduce((accum, sTO) => accum + Math.pow(sTO.tf * sTO.idf, 2), 0));
    
    function getTFIDF(path, word) {
        return ((mongoData.wordsWithIDFs[word] || {paths: []}).paths.find(pO => pO.path === path) || {}).tfidf || 0;
    }
    
    const finalSearchResult = resultDocs.map(path => {
        const down = (queryModulus * mongoData.pathsWithModulus[path]) || 1;
        const up = Object.entries(searchTermsMap).reduce((accum, [sT, sTO]) => accum + sTO.tf * sTO.idf * getTFIDF(path, sT), 0);
        const cos = up / down;
        return {
            path,
            cos
        };
    }).sort((a, b) => b.cos - a.cos);
    
    // res.json({
    //     count: finalSearchResult.length,
    //     results: finalSearchResult
    // });
    
    
    res.send(`<html><head></head><body><p>${req.query.query} - ${finalSearchResult.length}</p>
</body></html>`);
    
    return console.timeEnd("search");
});

app.listen(3000);
