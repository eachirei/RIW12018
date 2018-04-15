const fs = require('fs');

module.exports = () => {
    let fileContent;
    try {
        fileContent = fs.readFileSync(process.env['REV_PATH']);
    } catch (err) {
        return {};
    }
    const lines = fileContent.toString().split('\n');
    const revRefO = {};
    lines.forEach(l => {
        if (!l) {
            return;
        }
        const [word, revIdx] = l.split(' ');
        revRefO[word] = revIdx;
    });
    return revRefO;
};
