# Xray Console Client

## Description
Simple console client that comunicates to Jira Xray and uploads tests and executions

## Features

### Current features

 - Create/update Tests
    - Cucumber
 - Create/update test executions
    - Specflow TestExecution.json
    - Junit
    - Allure xml reports
    - Allure json reports
 - Mapping
    - Map test execution to test plans
    - Map test execution to jira issues
    - Map test cases to test plans

### Incoming features

- Create/update tests
    - generic tests
        - Testng
        - Junit
        - Nunit
        - Xunit
        - Jasmine
        - Cypress
        - Playwright
- Create/update executions
    - Add import of other reports
        - Cypress-cucumber
        - Playwright
        - ?
- Mapping
    - Map added test cases to jira issues

## Usage

### Test uploader

```
node testUploader.js --tt $(testType) --f $(folderWithTests) --pk $(projectKey) --pn $(planKey) --xu $(xrayUrl) --ci $(jira_client_id) --cs $(jira_client_secret)
```

| Flag              | Full Option     | Description                                                | Required |
|-------------------|-----------------|------------------------------------------------------------|----------|
| NO FLAG AVAILABLE | --help          | Show help                                                  | NO       |
| --tt              | --testType      | Type of test to be uploaded, it can be cucumber or generic | YES      |
| --ci              | --clientId      | Xray client ID to connect                                  | YES      |
| --cs              | --clientSecret  | Xray client Secret to connect                              | YES      |
| --xu              | --xrayUrl       | Xray url to connect                                        | YES      |
| -f                | --filePath      | Path to the folder with files or a file specific           | YES      |
| --pk              | --projectKey    | Project key where to upload tests                          | YES      |
| --pn              | --planKey       | Plan key where to map tests                                | NO       |

Example

```
node testUploader.js --tt cucumber --f ./Features/ --pk TT --pn TT-1234 --xu https://xray.cloud.getxray.app --ci AAAAAAAAAAA --cs BBBBBBBBBBBBBBBB
```

### Execution uploader

```
node executionUploader.js --tt $(testType) --f $(folder/file) --pk $(projectKey) --pn $(testPlanKey) --s 'Test execution for $(issueKey)' --xu $(xrayUrl) --ci $(jira_client_id) --cs $(jira_client_secret)  --i $(issueKey) --ju $(jiraUrl) --jbt $(jira_basic_token)
```

| Flag              | Full Option      | Description                                                                                           | Required |
|-------------------|------------------|-------------------------------------------------------------------------------------------------------|----------|
| NO FLAG AVAILABLE | --help           | Show help                                                                                             | NO       |
| --tt              | --testType       | Type of execution to be uploaded, it can be cucumber-specflow , allure-xml , allure-json , junit      | YES      |
| --ci              | --clientId       | Xray client ID to connect                                                                             | YES      |
| --cs              | --clientSecret   | Xray client Secret to connect                                                                         | YES      |
| --xu              | --xrayUrl        | Xray url to connect                                                                                   | YES      |
| -f                | --filePath       | Path to the folder with files or a file specific                                                      | YES      |
| --pk              | --projectKey     | Project key where to upload execution                                                                 | YES      |
| --pn              | --planKey        | Plan key where to map execution                                                                       | NO       |
| --ek              | --executionKey   | Execution key of execution to be updated instead of creating a new one                                | NO       |
| --s               | --summary        | Test Execution Summary, in case new one is created, if none is passed , generic will be set           | NO       |
| --d               | --description    | Test Execution Description, if none is passed , generic will be set                                   | NO       |
| --i               | --issueKey       | Issue to be linked to executions (Youll need a Jira url and Jira token, only available for JIRA CLOUD | NO       |
| --ju              | --jiraUrl        | Jira Url in case you want to link executions to jira issues                                           | NO       |
| --jbt             | --jiraBasicToken | Jira Token (PAT) in case you want to link executions to jira issues                                   | NO       |

Example

```
node executionUploader.js --tt specflow --f './executions/TestExecution.json' --pk TT --pn TT-1111 --s 'Test execution for $(issueKey)' --xu https://xray.cloud.getxray.app --ci AAAAAAAAAAAAAA --cs BBBBBBBBBBBBB  --i TT-1234 --ju https://yourCompany.atlassian.net) --jbt CCCCCCCCCCCCCCCCC
```

## Docker

This console application comes already dockerized, and you can find the image in here:

[Docker image](https://hub.docker.com/repository/docker/marca1234/xray-console-client/general)

### Usage

Copy files in container
```
docker cp ./TestExecution.json xray_console_client:app/executions/TestExecution.json

docker cp ./Features/ xray_console_client:app/tests/
```

Execute commands
```
docker exec xray_console_client node testUploader.js --tt cucumber --f ./tests/Features/ --pk TT --pn TT-1234 --xu https://xray.cloud.getxray.app --ci AAAAAAAAAAA --cs BBBBBBBBBBBBBBBB

docker exec xray_console_client node executionUploader.js --tt specflow --f './executions/TestExecution.json' --pk TT --pn TT-1111 --s 'Test execution for $(issueKey)' --xu https://xray.cloud.getxray.app --ci AAAAAAAAAAAAAA --cs BBBBBBBBBBBBB  --i TT-1234 --ju https://yourCompany.atlassian.net) --jbt CCCCCCCCCCCCCCCCC
```