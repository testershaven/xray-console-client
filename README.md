# Xray Console Client

## Description
Simple console client that comunicates to Jira Xray and uploads tests and executions

## Features

### Current features

 - Create/update test executions (With its test cases)
    - Specflow TestExecution.json results
        - Does not support attachment yet
        - Does not support steps yet
        - Does not support labels yet
    - Junit xml results
        - Does not support attachment yet
        - Does not support steps yet
        - Does not support labels yet
    - Allure xml results
        - Support attachment
        - Support steps
        - Does not support labels yet
    - Allure json results
        - Support attachment
        - Support steps
        - Support labels
    - Cucumber json results
        - Support attachment
        - Support steps
        - Support labels
 - Mapping
    - Map test execution to test plans
    - Map test execution to jira issues
    - Map test cases to test plans
    - Add jira custom fields in test cases

### Incoming features

- Create/update executions
    - Tell me what you need
- Mapping
    - Add Xray custom fields in test cases
    - Tell me what you need

## Usage

### Execution uploader

```
node executionUploader.js --ju $(jiraUrl) --jbt $(jira_basic_token) --xu $(xrayUrl) --ci $(jira_client_id) --cs $(jira_client_secret) --tt $(testType) --f $(folder/file) --pk $(projectKey) --pn $(testPlanKey) --s 'Test execution for $(issueKey)' -e ${executionKey} -d ${description} --rv {releaseVersion} --i $(issueKey) --ilt ${issueLinkType} --e {environments} --jcf {jiraCustomFields}
```

| Flag              | Full Option         | Description                                                                                           | Required |
|-------------------|---------------------|-------------------------------------------------------------------------------------------------------|----------|
| NO FLAG AVAILABLE | --help              | Show help                                                                                             | NO       |
| --ju              | --jiraUrl           | Jira Url in case you want to link executions to jira issues                                           | YES      |
| --jbt             | --jiraBasicToken    | Jira Token (PAT) in case you want to link executions to jira issues                                   | YES      |
| --ci              | --clientId          | Xray client ID to connect                                                                             | YES      |
| --cs              | --clientSecret      | Xray client Secret to connect                                                                         | YES      |
| --xu              | --xrayUrl           | Xray url to connect                                                                                   | YES      |
| --tt              | --testType          | Type of execution to be uploaded, it can be cucumber-specflow , allure-xml , allure-json , junit      | YES      |
| -f                | --filePath          | Path to the folder with files or a file specific                                                      | YES      |
| --pk              | --projectKey        | Project key where to upload execution                                                                 | YES      |
| --pn              | --planKey           | Plan key where to map execution                                                                       | NO       |
| --ek              | --executionKey      | Execution key of execution to be updated instead of creating a new one                                | NO       |
| --s               | --summary           | Test Execution Summary, in case new one is created, if none is passed , generic will be set           | NO       |
| --d               | --description       | Test Execution Description, if none is passed , generic will be set                                   | NO       |
| --rv              | --releaseVersion    | Release version which this test execution is linked                                                   | NO       |
| --i               | --issueKey          | Issue to be linked to executions (Youll need a Jira url and Jira token, only available for JIRA CLOUD | NO       |
| --ilt             | --issueLinkType     | Issue to be linked to executions, needs issueLinkType                                                 | NO       |
| --e               | --environments      | Xray test enviroment variable                                                                         | NO       |
| --jcf             | --jiraCustomFields  | Custom fields added to test case ticket, can be multiple passed like '$id,$value                   | NO       |


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
```

Execute commands
```
docker exec xray_console_client node executionUploader.js --tt specflow --f './executions/TestExecution.json' --pk TT --pn TT-1111 --s 'Test execution for $(issueKey)' --xu https://xray.cloud.getxray.app --ci AAAAAAAAAAAAAA --cs BBBBBBBBBBBBB --ju https://yourCompany.atlassian.net) --jbt CCCCCCCCCCCCCCCCC
```