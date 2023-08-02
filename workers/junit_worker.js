const fs = require("fs");
const convert = require("xml-js");

class JunitWorker {
    async generateSuitesFromJunitXml(resultsDir) {
        let testsuites = [];

        const fileNames = fs.readdirSync(resultsDir);
        for (const fileName of fileNames) {
            let stringXml = fs.readFileSync(`${resultsDir}/${fileName}`).toString()
                .replaceAll('system-err', 'error');

            let options = {compact: true, ignoreComment: true, spaces: 4};
            let results = convert.xml2js(stringXml, options);

            if(Array.isArray(results.testsuites.testsuite)) {
                results.testsuites.testsuite.forEach(test => { testsuites.push(test)});
            } else {
                testsuites.push(results.testsuites.testsuite)
            }
        }
        return testsuites
    }
}

module.exports = {JunitWorker};