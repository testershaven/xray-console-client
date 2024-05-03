const fs = require("fs");
const {AllureWorker} = require("./allure_worker");
const {JunitWorker} = require("./junit_worker");

class XrayWorker {
    async generateXrayJsonFromCucumberJsonResults(options) {
        console.log('Generate xray json from cucumber report');
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
            let labels = []
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

            if (tC.tags !== undefined) {
                tC.tags.forEach(tag => { labels.push(tag.name.replaceAll('@', '')) });
            }
            
            let test = {
                status: (failed) ? 'FAILED' : 'PASSED',
                testInfo : {
                    projectKey: options.projectKey,
                    summary: tC.name + " - Example line: " + tC.line,
                    type: options.testType,
                    steps: expectedSteps,
                    labels
                },
                steps: actualSteps,
            };

            testCases.push(test);
        });

        return this.createResponse(testCases, options)
    }

    async generateXrayJsonFromSpecflowResults(options) {
        console.log('Generate xray json from cucumber report');
        let executionJson = JSON.parse(fs.readFileSync(options.filePath).toString());

        let testCases = [];
        executionJson.ExecutionResults.map(eR => {
            
            let test = {
                testInfo : {
                    projectKey: options.projectKey,
                    summary: eR.ScenarioTitle,
                    type: options.testType,
                },
                status: (eR.Status === 'OK') ? 'PASSED' : 'FAILED',
            };

            testCases.push(test);
        });

        return this.createResponse(testCases, options)
    }

    async generateXrayJsonFromJunitXmlResults(options) {
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

            let test = {
                status: (failed) ? 'FAILED' : 'PASSED',
                comment: (errors !== "") ? errors : 'Test passed ok',
                testInfo: {
                    projectKey: options.projectKey,
                    summary: attributes.name,
                    type: options.testType,
                },
            };

            testCases.push(test);
        });

        return this.createResponse(testCases, options)
    }

    async generateXrayJsonFromAllureXmlResults(options) {

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

                    let testCase = {
                        testKey : rtc.testId,
                        start : allureWorker.formatEpoch(parseInt(rtc.start)),
                        finish : allureWorker.formatEpoch(parseInt(rtc.stop)),
                        status : rtc.status,
                        defects,
                        evidence,
                    };
                    testCases.push(testCase);
                }
            });
        });

        return this.createResponse(testCases, options)
    }

    async generateXrayRequestFromAllureJson(options) {
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

            let test = {
                status: (rawTest.status === "passed") ? 'PASSED' : 'FAILED',
                testInfo: {
                    projectKey: options.projectKey,
                    summary: testName,
                    type: options.testType,
                    steps: expectedSteps,
                    labels
                },
                evidence,
                steps: actualSteps,
            };

            testCases.push(test);
        });

        return this.createResponse(testCases, options)
    }

    createResponse(testCases, options) {
        let response = {
            tests: testCases
        }

        if (options.executionKey !== undefined) {
            response['testExecutionKey'] = options.executionKey;
        } else {
            let info =  {
                project: options.projectKey,
                summary : (options.summary !== undefined) ? options.summary : 'Execution automatically imported',
                description : (options.description !== undefined) ? options.description : "This execution is automatically created when importing execution results from an external source",
                testPlanKey : options.planKey
            }

            if (options.environments !== undefined) {
                info['testEnvironments'] = options.environments.split(",");
            }

            if (options.releaseVersion !== undefined) {
                info['version'] = options.releaseVersion;
            }

            response['info'] = info;
        }

        return response;
    }
}

module.exports = {XrayWorker}