// const fs = require("fs");
import fs from "fs";
// const {AllureWorker} = require("./allure_worker.js");
import {AllureWorker} from './allure_worker.js';
// const {JunitWorker} = require("./junit_worker.js");
import {JunitWorker} from './junit_worker.js';


export class XrayWorker {
    async generateXrayJsonFromCucumberJsonResults(options) {
        console.log('Generate xray json from cucumber json results');
        let tcs = [];
        let executionJson = JSON.parse(fs.readFileSync(options.filePath).toString());
        executionJson.forEach(feature => {
            feature.elements.forEach( test => {
                tcs.push(test)
            });
        });

        let testCases = [];
        tcs.map(tC => {
            let expectedSteps = [];
            let actualSteps = [];
            for (const stepNumber in tC.steps) {
                let rawStep = tC.steps[stepNumber]

                let expectedStep = {
                    action: rawStep.keyword + rawStep.name,
                    data: "",
                    result: "action is correct"
                };
                expectedSteps.push(expectedStep);

                let actualStep = {
                    "status": (rawStep.result.status === "passed" ) ? "PASSED" : "FAILED",
                    "comment": rawStep.keyword + rawStep.name,
                    "actualResult": (rawStep.result.error_message !== undefined) ? rawStep.result.error_message : "Step passed OK"
                };

                let evidences = [];
                if (rawStep.embeddings !== undefined) {
                    for (const embeddingNumber in rawStep.embeddings) {
                        let embedding = rawStep.embeddings[embeddingNumber];
                        let evidence = {
                            data: embedding.data,
                            filename: rawStep.name.replaceAll(' ', '_').replaceAll('"', '') + "." + embedding.mime_type.split('/')[1],
                            contentType: embedding.mime_type
                        }
                        evidences.push(evidence);
                    }
                }

                if (evidences.length !== 0) actualStep["evidences"] = evidences;
                actualSteps.push(actualStep);
            }

            let failed = (actualSteps.some(step => step.status === "FAILED"));
            let status = (failed) ? 'FAILED' : 'PASSED';
            let summary = tC.name + " - Example line: " + tC.line;
            let labels = []

            if (tC.tags !== undefined) {
                tC.tags.forEach(tag => { labels.push(tag.name.replaceAll('@', '')) });
            }

            let test = this.createXrayTest(options, summary, expectedSteps, labels, status, actualSteps, undefined, undefined, undefined, undefined, undefined, undefined);

            testCases.push(test);
        });

        return this.createXrayResponse(testCases, options)
    }

    async generateXrayJsonFromSpecflowResults(options) {
        console.log('Generate xray json from specflow results');
        let executionJson = JSON.parse(fs.readFileSync(options.filePath).toString());

        let testCases = [];
        executionJson.ExecutionResults.map(eR => {

            let status = (eR.Status === 'OK') ? 'PASSED' : 'FAILED';
            let labels = [];
            let expectedSteps = [];
            let actualSteps = [];
            let test = this.createXrayTest(options, eR.ScenarioTitle, expectedSteps, labels, status, actualSteps, undefined, undefined, undefined, undefined, undefined, undefined);

            testCases.push(test);
        });

        return this.createXrayResponse(testCases, options)
    }

    async generateXrayJsonFromJunitXmlResults(options) {
        console.log('Generate xray json from junit xml results');
        const junitWorker = new JunitWorker();
        let testSuite = await junitWorker.generateSuitesFromJunitXml(options.filePath);

        let testCases = [];
        testSuite.forEach(rawTest => {

            let attributes = rawTest._attributes;

            let failed = false;
            let errors = "";
            if(attributes.failures !== "0" || attributes.errors !== "0") {
                failed = true;

                let failedTests = [];
                if (rawTest.testcase != undefined) {
                    if (Array.isArray(rawTest.testcase)) {
                        rawTest.testcase.forEach( tc => {
                            if (tc.failure !== undefined) failedTests.push(tc);
                        })
                    } else if (rawTest.testcase.failure !== undefined){
                        failedTests.push(rawTest.testcase);
                    } else {
                        failedTests.push(rawTest)
                    }
                }

                if (Array.isArray(failedTests) && failedTests.length > 0) {
                    failedTests.forEach(failedTest => {
                        if (failedTest.failure === undefined) {
                            errors += `  | [[[ERROR]]] ${failedTest.error._cdata} |\n`

                        } else {
                            errors += `  | [[[ERROR]]] ${failedTest.failure._cdata.join(' , ')} |\n`
                        }

                    })
                }
            }

            let status =  (failed) ? 'FAILED' : 'PASSED';
            let labels = [];
            let expectedSteps = [];
            let actualSteps = [];

            let test = this.createXrayTest(options, attributes.name, expectedSteps, labels, status, actualSteps, undefined, undefined, undefined, undefined, undefined, undefined);

            testCases.push(test);
        });

        return this.createXrayResponse(testCases, options)
    }

    async generateXrayJsonFromAllureXmlResults(options) {
        console.log('Generate xray json from allure xml results');
        const allureWorker = new AllureWorker();
        let testSuites = await allureWorker.generateSuitesFromAllureXml(options.filePath);

        let testCases = [];
        testSuites.forEach(rts => {
            rts.testCases.forEach(rtc => {
                if(rtc.testId !== '') {
                    let defects = [];
                    if (rtc.issueId !== '') {
                        defects.push(rtc.issueId)
                    }

                    let steps = [];
                    let evidence = [];
                    for (const step of rtc.steps) {
                        if (step.attachment.contentType !== undefined) {
                            evidence.push(step.attachment)
                        }

                        let newStep =  {
                            status: step.status,
                            comment: step.name._text,
                        }
                        steps.push(newStep);
                    }

                    let start = allureWorker.formatEpoch(parseInt(rtc.start));
                    let finish = allureWorker.formatEpoch(parseInt(rtc.stop));

                    let test = this.createXrayTest(options, attributes.name, undefined, undefined, rtc.status, undefined, rtc.testId, start, finish, undefined, defects, evidence);

                    testCases.push(test);
                }
            });
        });

        return this.createXrayResponse(testCases, options)
    }

    async generateXrayRequestFromAllureJson(options) {
        console.log('Generate xray json from allure json results');
        const allureWorker = new AllureWorker();
        let rawTests = await allureWorker.generateSuitesFromAllureJson(options.filePath);

        let testCases = [];
        rawTests.map(rawTest => {
            let expectedSteps = [];
            let actualSteps = [];
            let labels = [];
            let evidence = [];

            for(const rawEvidence of rawTest.attachments) {
                let data = fs.readFileSync(`${options.filePath}/${rawEvidence.source}`).toString('base64');

                let actualEvidence = {
                    data,
                    filename: rawEvidence.name,
                    contentType: rawEvidence.type
                }

                evidence.push(actualEvidence);
            }

            for (const rawStep of rawTest.steps) {
                let expectedStep = {
                    action: rawStep.name,
                    data: "",
                    result: "action is correct"
                };
                expectedSteps.push(expectedStep);

                let actualStep = {
                    "status": (rawStep.status === "passed") ? "PASSED" : "FAILED",
                    "comment": rawStep.name,
                    "actualResult": (rawStep.status === "passed") ? "Step passed OK" : "Step FAILED"
                };

                actualSteps.push(actualStep);
            }

            rawTest.labels.forEach( label => {
                if(label.name === 'tag') { labels.push(label.value)}
            });

            let testName = (rawTest.name === rawTest.fullName) ? rawTest.historyId : rawTest.fullName;
            let status = (rawTest.status === "passed") ? 'PASSED' : 'FAILED';

            let test = this.createXrayTest(options, testName, expectedSteps, labels, status, actualSteps, undefined, undefined, undefined, undefined, evidence);

            testCases.push(test);
        });

        return this.createXrayResponse(testCases, options)
    }

    createXrayTest(options, summary, expectedSteps, labels, status, actualSteps, testKey, start, finish, comment, defects, evidence) {
        let testInfo = {
            projectKey: options.projectKey,
            summary,
            type: options.testType,
        };

        if (expectedSteps !== undefined) { testInfo['steps'] = expectedSteps };
        if (labels !== undefined) { testInfo['labels'] = labels };

        let xrayTestCase = {
            status,
            testInfo,
        };

        if (testKey !== undefined) { xrayTestCase['testKey'] = testKey };
        if (start !== undefined) { xrayTestCase['start'] = start };
        if (finish !== undefined) { xrayTestCase['finish'] = finish };
        if (comment !== undefined) { xrayTestCase['comment'] = comment };
        if (actualSteps !== undefined) { xrayTestCase['steps'] = actualSteps };
        if (defects !== undefined) { xrayTestCase['defects'] = defects };
        if (evidence !== undefined) { xrayTestCase['evidence'] = evidence };

        return xrayTestCase;
    }

    createXrayResponse(testCases, options) {
        let response = {
            tests: testCases
        }

        if (options.executionKey !== undefined) {
            response['testExecutionKey'] = options.executionKey;
        }

        let info =  {
            project: options.projectKey,
            testPlanKey : options.planKey
        }

        info['summary'] = (options.summary !== undefined) ? options.summary : 'Execution automatically imported';
        info['description'] = (options.description !== undefined) ? options.description : "This execution is automatically created when importing execution results from an external source";

        if (options.environments !== undefined) {
            info['testEnvironments'] = options.environments.split(",");
        }

        if (options.releaseVersion !== undefined) {
            info['version'] = options.releaseVersion;
        }

        response['info'] = info;

        return response;
    }
}
