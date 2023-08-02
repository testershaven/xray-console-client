const axios = require('axios').default;
const {ClientError} = require("../errors/client_error");

class XrayRestClient {
  constructor(host) {
    axios.defaults.baseURL = host;
  }

  async getAuthToken() {
    return axios.defaults.headers.common['Authorization'];
  }

  async login(client_id, client_secret) {
    console.log('Logging into JIRA Xray')
    let config = { headers: {'Content-Type': 'application/json'} };
    let loginResponse;
    try {
      loginResponse = (await axios.post(`/authenticate`, { client_id, client_secret }, config));
    } catch (error) {
      throw new ClientError('Error Logging in to jira', error.message, error.response.status, error.response.statusText);   
    }
    axios.defaults.headers.common['Authorization'] = 'Bearer ' + loginResponse.data;
  }

  async sendCucumberTests(projectKey, file) {
    console.log('Sending cucumber feature file as multipart into JIRA Xray')
    let config = { 
        headers: {
            'Content-Type': 'multipart/form-data',
        } 
    };

    let formData = new FormData();
    formData.append("file", file, 'features.zip');

    let path = `/import/feature?projectKey=${projectKey}`;
    try {
      return await axios.post(path, formData, config);
    } catch (error) {
      throw new ClientError('Error Sending Cucumber tests in to jira', error.message, error.response.status, error.response.statusText);   
    }
  }

  async sendResultsAsJunitReport(projectName, testplan = '', requestBody) {
    console.log('Sending Junit results into JIRA Xray')
    let config = { headers: {'Content-Type': 'text/xml'} };
    let path = `/import/execution/junit?projectKey=${projectName}&testPlanKey=${testplan}`;
    try {
    return await axios.post(path, requestBody, config);
    } catch (error) {
      throw new ClientError('Error Sending Junit results in to jira', error.message, error.response.status, error.response.statusText);   
    }
  }

  async sendResultsAsXrayJson(requestBody) {
    console.log('Sending xray json results into JIRA Xray')
    let config = {
      headers: {
        'Content-Type': 'application/json',
        'Accept': '*/*'
      }
    };
    try {
      return await axios.post('/import/execution', requestBody, config);
    } catch (error) {
      throw new ClientError('Error Sending Xray json results in to jira', error.message, error.response.status, error.response.statusText);   
    }
  }

  async mapExecutionToIssue(options, executionKey) {
    console.log('Sending xray json results into JIRA Xray')
    let data = JSON.stringify({
      "type": {
        "id": "10618"
      },
      "inwardIssue": {
        "key": executionKey
      },
      "outwardIssue": {
        "key": options.issueKey
      },
      "comment": {
        "body": "Linked related issue!"
      }
    });

  let config = {
    url: options.jiraUrl + '/rest/api/2/issueLink',
    method: 'post',
    headers: {
      'Authorization': 'Basic ' + options.jiraBasicToken,
      'Content-Type': 'application/json', 
    },
    data: data
  };

    try {
      return await axios(config);
    } catch (error) {
      throw new ClientError('Error Mapping execution id into xray', error.message, error.response.status, error.response.statusText);   
    }
  }
}

module.exports = {XrayRestClient}