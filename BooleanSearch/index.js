const express = require('express');

const revRefO = require('./loadReverseReferences')();

const app = express();

app.use(express.urlencoded());

function getRevFilesForWord(word) {
    if (!revRefO[word]) {
        return [];
    }
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
                }
            }
            return b;
        }
        for (let i = 0; i < a.length; i++) {
            if (b.indexOf(a[i]) === -1) {
                a.splice(i, 1);
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
    },
    'NOT': (a, b) => {
        if (typeof a === 'string') {
            a = getRevFilesForWord(a);
        }
        if (typeof b === 'string') {
            b = getRevFilesForWord(b);
        }
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
