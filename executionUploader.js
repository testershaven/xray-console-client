#!/usr/bin/env node

const chalk = require("chalk");
const boxen = require("boxen");
const yargs = require("yargs");
const {JiraRestClient} = require("./clients/jira_rest_client");
const {XrayRestClient} = require("./clients/xray_rest_client");
const {InputError} = require("./errors/input_error");
const { XrayWorker } = require("./workers/xray_worker");
const { Worker } = require("./workers/worker");

const options = yargs
.usage(`Usage: --tt <testType> --ci <clientID> --cs <clientSecret> --f <filePath> --pk <projectKey> --pn <planKey> --ek <execution> --s <summary> --d <description>`)
.option("tt", { alias: "testType", describe: "Test type cucumber-specflow | allure-xml | cucumber-json | allure-json", type: "string", demandOption: true })
.option("ci", { alias: "clientId", describe: "Client Id", type: "string", demandOption: true })
.option("cs", { alias: "clientSecret", describe: "Client secret", type: "string", demandOption: true })
.option("f", { alias: "filePath", describe: "File path", type: "string", demandOption: true })
.option("xu", { alias: "xrayUrl", describe: "Xray Url", type: "string", demandOption: true })
.option("pk", { alias: "projectKey", describe: "Project Key", type: "string", demandOption: true }) 
.option("ek", { alias: "executionKey", describe: "Execution Key", type: "string", demandOption: false })
.option("pn", { alias: "planKey", describe: "Plan Key", type: "string", demandOption: false }) 
.option("s", { alias: "summary", describe: "Test Execution Summary", type: "string", demandOption: false }) 
.option("d", { alias: "description", describe: "Test Execution Description", type: "string", demandOption: false })
.option("rv", { alias: "releaseVersion", describe: "Release version which this test execution is linked", type: "string", demandOption: false })
.option("ju", { alias: "jiraUrl", describe: "Jira Url in case you want to link executions to jira issues", type: "string", demandOption: false })
.option("jbt", { alias: "jiraBasicToken", describe: "Jira Token (PAT) in case you want to link executions to jira issues", type: "string", demandOption: false })
.option("i", { alias: "issueKey", describe: "Issue to be linked to executions (Youll need a Jira url and Jira token)", type: "string", demandOption: false }) 
.option("e", { alias: "environments", describe: "Xray test enviroment variable", type: "string", demandOption: false })
.option("cf", { alias: "customFields", describe: "Jira custom fields to be attached to test case", type: "array", demandOption: false })

.argv;

const optionsText = chalk.white.bold(
`Execution type: ${options.testType}, \n
Xray Url: ${options.xrayUrl}, \n
ClientID: ${options.clientId}, \n
ClientSecret: ************, \n
Path: ${options.filePath}, \n
Project Key: ${options.projectKey} \n
Plan Key: ${options.planKey} \n
Execution Key: ${options.executionKey} \n
Summary: ${options.summary} \n
Description: ${options.description} \n
Environments: ${options.environments} \n
Release version: ${options.releaseVersion} \n
Jira Url: ${options.jiraUrl} \n
Jira Basic Token: ************ \n
Issue Key: ${options.issueKey}`);

const greenBox = {
 padding: 1,
 margin: 1,
 borderStyle: "round",
 borderColor: "green",
 backgroundColor: "#555555"
};

const optionsSummary = boxen( optionsText, greenBox );
console.log(optionsSummary);

uploadExecution(options);

async function uploadExecution(options) {
     if(options.issueKey !== undefined && (options.jiraBasicToken === undefined || options.jiraUrl === undefined)) {
          throw new InputError('You are passing a jira issue keyid but basic token or url missing to connect');   
     } else if(options.jiraBasicToken !== undefined && (options.issueKey === undefined || options.jiraUrl === undefined)) {
          throw new InputError('You are passing a jira basic token but issue key id or url missing to connect');
     } else if(options.jiraUrl !== undefined && (options.issueKey === undefined || options.jiraBasicToken === undefined)) {
          throw new InputError('You are passing a jira url but issue key id or basic token missing to connect');
     }

     const xrayWorker = new XrayWorker();
     const restXrayClient = new XrayRestClient(options.xrayUrl + '/api/v2');
     await restXrayClient.login(options.clientId, options.clientSecret);

     let xrayBody;
     switch(options.testType.toLowerCase()) {
          case "cucumber-specflow":
               console.log('Uploading specflow cucumber execution');
               options.testType = 'Cucumber';
               xrayBody = await xrayWorker.generateXrayJsonFromSpecflowResults(options);
          break;
          case "junit-xml":
               console.log('Uploading allure xml execution');
               options.testType = 'Manual';
               xrayBody = await xrayWorker.generateXrayJsonFromJunitXmlResults(options);
               break;
          case "allure-xml":
               console.log('Uploading allure xml execution');
               xrayBody = await xrayWorker.generateXrayJsonFromAllureXmlResults(options);
          break;
          case "cucumber-json":
               console.log('Uploading cucumber-json execution');
               options.testType = 'Manual';
               xrayBody = await xrayWorker.generateXrayJsonFromCucumberJsonResults(options);
          break;
          case "allure-json":
               console.log('Uploading allure json execution');
               options.testType = 'Manual';
               xrayBody = await xrayWorker.generateXrayRequestFromAllureJson(options);
               break;
          default:
               throw new InputError('Check test type input, options available are cucumber-specflow | allure-xml | cucumber-json | allure-xml');
     }

     let executionKey;
     if(xrayBody.tests.length > 50) {
          const worker = new Worker();
          let testsArray = await worker.splitArray(xrayBody.tests, 50);

          let initXrayBody = { tests: testsArray[0]}
          if(xrayBody.testExecutionKey !== undefined) initXrayBody['testExecutionKey'] = xrayBody.testExecutionKey;
          if(xrayBody.info !== undefined) initXrayBody['info'] = xrayBody.info;

          let response = await restXrayClient.sendResultsAsXrayJson(initXrayBody)
          executionKey = response.data.key;

          testsArray.shift();
          for (const testsTranche of testsArray) {
               let body = {
                    tests: testsTranche,
                    testExecutionKey: executionKey
               }

               await restXrayClient.sendResultsAsXrayJson(body);
               await new Promise(resolve => setTimeout(resolve, 3000));
          }
     } else {
          let response = await restXrayClient.sendResultsAsXrayJson(xrayBody)
          executionKey = response.data.key;
     }

     if(options.issueKey) {
          const jiraRestClient = new JiraRestClient(options.jiraUrl, options.jiraBasicToken);
          await jiraRestClient.mapExecutionToIssue(options, executionKey);
          console.log('Execution mapped correctly to issue');
     }
}