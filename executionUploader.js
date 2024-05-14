#!/usr/bin/env node

const chalk = require("chalk");
const boxen = require("boxen");
const yargs = require("yargs");
const {JiraRestClient} = require("./clients/jira_rest_client");
const {XrayGraphqlClient} = require("./clients/xray_graphql_client");
const {XrayRestClient} = require("./clients/xray_rest_client");
const {InputError} = require("./errors/input_error");
const { XrayWorker } = require("./workers/xray_worker");
const { Worker } = require("./workers/worker");

const options = yargs
.option("xu", { alias: "xrayUrl", describe: "Xray Url", type: "string", demandOption: true })
.option("ci", { alias: "clientId", describe: "Client Id", type: "string", demandOption: true })
.option("cs", { alias: "clientSecret", describe: "Client secret", type: "string", demandOption: true })
.option("ju", { alias: "jiraUrl", describe: "Jira Url in case you want to link executions to jira issues", type: "string", demandOption: true })
.option("jbt", { alias: "jiraBasicToken", describe: "Jira Token (PAT) in case you want to link executions to jira issues", type: "string", demandOption: true })
.option("tt", { alias: "testType", describe: "Test type cucumber-specflow | allure-xml | cucumber-json | allure-json", type: "string", demandOption: true })
.option("f", { alias: "filePath", describe: "File path", type: "string", demandOption: true })
.option("pk", { alias: "projectKey", describe: "Project Key", type: "string", demandOption: true }) 

.option("ek", { alias: "executionKey", describe: "Execution Key, if not passed will create a new execution under test plan", type: "string", demandOption: false })
.option("pn", { alias: "planKey", describe: "Plan Key where the test execution will be linked", type: "string", demandOption: false }) 
.option("s", { alias: "summary", describe: "Test Execution Summary, if none provided will generate one automatically", type: "string", demandOption: false }) 
.option("d", { alias: "description", describe: "Test Execution Description, if none provided will generate one automatically", type: "string", demandOption: false })
.option("rv", { alias: "releaseVersion", describe: "Release version which this test execution is linked", type: "string", demandOption: false })
.option("i", { alias: "issueKey", describe: "Issue to be linked to executions, needs issueLinkType", type: "string", demandOption: false }) 
.option("ilt", { alias: "issueLinkType", describe: "Linking type between your execution and the issue", type: "string", demandOption: false }) 
.option("e", { alias: "environments", describe: "Xray test enviroment variable", type: "string", demandOption: false })
.option("jcf", { alias: "jiraCustomFields", describe: "Custom fields added to test case ticket, can be multiple passed like '$id,$value", type: "string", demandOption: false })
.argv;

const optionsText = chalk.white.bold(
`
Xray Url: ${options.xrayUrl}, \n
ClientID: ${options.clientId}, \n
ClientSecret: ************, \n
Jira Url: ${options.jiraUrl} \n
Jira Basic Token: ************ \n
Test type: ${options.testType}, \n
Path: ${options.filePath}, \n
Project Key: ${options.projectKey} \n
Execution Key: ${options.executionKey} \n
Plan Key: ${options.planKey} \n
Summary: ${options.summary} \n
Description: ${options.description} \n
Release version: ${options.releaseVersion} \n
Issue Key: ${options.issueKey} \n
Issue Key Link type: ${options.issueLinkType} \n
Environments: ${options.environments} \n
Jira Custom Fields: ${options.jiraCustomFields}
`);

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
     const xrayWorker = new XrayWorker();
     const restXrayClient = new XrayRestClient(options.xrayUrl + '/api/v2');
     const jiraRestClient = new JiraRestClient(options.jiraUrl, options.jiraBasicToken);
     await restXrayClient.login(options.clientId, options.clientSecret);
     const graphqlXrayClient = new XrayGraphqlClient(options.xrayUrl + '/api/v2/graphql', await restXrayClient.getAuthToken())

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
               options.testType = 'Manual';
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
               throw new InputError('Check test type input, options available are cucumber-specflow | allure-xml | cucumber-json | allure-xml | junit-xml');
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
          if(options.jiraBasicToken == undefined) {
               throw new InputError('You are passing a jira issue to link but no authorization token');
          } 
          if(options.jiraUrl == undefined) {
               console.log('You are passing a jira issue to link but no jira url');
          }
          if(options.issueLinkType == undefined) {
               console.log('You are passing a jira issue to link but no the type of linking');
          }
          
          try{
               await jiraRestClient.mapExecutionToIssue(options, executionKey);
               console.log('Execution mapped correctly to issue');
          } catch(error) {
               console.log('Was not possible to map execution key to ticket being tested')
          }
     }

     if(options.jiraCustomFields) {
          try{
               let issueKeys = await graphqlXrayClient.getTestsByTestPlanKey(options.planKey)
               
               var customFields = options.jiraCustomFields.replace(/\s/g, "").split(',');

               for (let index = 0; index < issueKeys.length; index++) {
                    try{
                         const element = issueKeys[index];
                         await jiraRestClient.addValueToCustomField(customFields[0], customFields[1], element);
                    } catch(error) {
                         console.log(`Was not possible to add jira custom field ${customFields[0]} to test ${element}, because error: ` + error.message)
                    }
               }
          } catch(error) {
               console.log('Was not possible to add jira custom fields to tests in plan, because error: ' + error.message);
          }
     }
}