const axios = require('axios').default;
const {ClientError} = require("../errors/client_error");

class JiraRestClient {
  constructor(host, basicToken) {
    axios.defaults.baseURL = host;
    axios.defaults.headers.common['Authorization'] = 'Basic ' + basicToken;
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

    console.log('issueLinkRequest:' + data)

    let config = {
      headers: {
        'Content-Type': 'application/json', 
      },
    };

    try {
      return await axios.post('/rest/api/2/issueLink', data, config);
    } catch (error) {
      throw new ClientError('Error Mapping execution id into xray', error.message, error.response.status, error.response.data);   
    }
  }
}

module.exports = {JiraRestClient}