#!/usr/bin/env node

const chalk = require("chalk");
const boxen = require("boxen");
const yargs = require("yargs");
const {XrayRestClient} = require("./clients/xray_rest_client");
const {XrayGraphqlClient} = require("./clients/xray_graphql_client");
const {Worker} = require("./workers/worker");
const {InputError} = require("./errors/input_error");

const options = yargs
.usage(`Usage: --tt <testType> --ci <clientID> --cs <clientSecret> --f <filePath> --pk <projectKey> --pn <planKey> --ek <execution> --d <description>`)
.option("tt", { alias: "testType", describe: "Test type <cucumber>/<junit>/<allure>", type: "string", demandOption: true })
.option("ci", { alias: "clientId", describe: "Client Id", type: "string", demandOption: true })
.option("cs", { alias: "clientSecret", describe: "Client secret", type: "string", demandOption: true })
.option("f", { alias: "filePath", describe: "File path", type: "string", demandOption: true })
.option("xu", { alias: "xrayUrl", describe: "Xray Url", type: "string", demandOption: true })
.option("pk", { alias: "projectKey", describe: "Project Key", type: "string", demandOption: true }) 
.option("pn", { alias: "planKey", describe: "Plan Key", type: "string", demandOption: false }) 
.argv;

const optionsText = chalk.white.bold(
`Execution type: ${options.testType}, \n
Xray Url: ${options.xrayUrl}, \n
ClientID: ${options.clientId}, \n
ClientSecret: ************, \n
Path: ${options.filePath}, \n
Project Key: ${options.projectKey} \n
Plan Key: ${options.planKey}`);

const greenBox = {
 padding: 1,
 margin: 1,
 borderStyle: "round",
 borderColor: "green",
 backgroundColor: "#555555"
};

const optionsSummary = boxen( optionsText, greenBox );
console.log(optionsSummary);

uploadTests(options);

async function uploadTests(options) {
     const restXrayClient = new XrayRestClient(options.xrayUrl + '/api/v2');
     await restXrayClient.login(options.clientId, options.clientSecret);

     let worker = new Worker();
     let response;
     switch(options.testType.toLowerCase()) {
          case "cucumber":
               console.log('Uploading cucumber tests');
               let zippedTests = await worker.zipFiles(options.filePath);
               response = await restXrayClient.sendCucumberTests(options.projectKey, zippedTests);
               console.log(response.data);
               break;
          case "generic":
               console.log('Uploading generic tests');
               throw new InputError('Logic not implemented yet to upload generic tests');   
          default:
               throw new InputError('Check test type input, options available are cucumber | generic');   
     }
   
     if(options.planKey) {
          let graphqlClient = new XrayGraphqlClient(options.xrayUrl + '/api/v2/graphql', await restXrayClient.getAuthToken());
          let testCaseIds = response.data.updatedOrCreatedTests.map(x => x.id);
          let mapTestsResponse = await graphqlClient.mapTestsToTestPlan(options.planKey, testCaseIds);
          console.log(mapTestsResponse);
     }
}