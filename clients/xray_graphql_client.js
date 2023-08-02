const axios = require('axios').default;
const {ClientError} = require("../errors/client_error");

class XrayGraphqlClient {
  constructor(host, bearerToken) {
    axios.defaults.baseURL = host;
    axios.defaults.headers.common['Authorization'] = bearerToken;
  }

  async getTestPlanIdByKey(key) {
    let config = {
      headers: { 'Content-Type': 'application/json', },
      data: JSON.stringify({ query: `{ getTestPlans(jql: "key=${key}", limit: 1) { results { issueId } } }`, variables: {} })
    };

    try {
      return (await axios.get('', config)).data.data.getTestPlans.results[0].issueId;
    } catch (error) {
      throw new ClientError('Error getting test plan id by key', error.message, error.response.status, error.response.statusText);   
    }
  }

  async getTestsIdByKey(ids) {
    let config = {
      headers: { 'Content-Type': 'application/json' },
      data : JSON.stringify({ query: `{ getTests(jql: "key in (${ids})", limit: 50) { results { issueId  } } }`, variables: {} })
    };

    try {
      return (await axios.get('', config)).data.data.getTests.results.map(x => x.issueId)
    } catch (error) {
      throw new ClientError('Error getting test ids from keys',  error.message, error.response.status, error.response.statusText);   
    }
  }

  async mapTestsToTestPlan(testPlanKey, ids) {
    console.log('Mapping test case keys to a testplan')

    let testPlanId= await this.getTestPlanIdByKey(testPlanKey);

    var data = JSON.stringify({
      query: `mutation {
                addTestsToTestPlan(
                issueId: ${JSON.stringify(testPlanId)},
                testIssueIds: ${JSON.stringify(ids)}) {
                    addedTests
                    warning
                }
            }`,
      variables: {}
    });

    let config = {
      method: 'post',
      headers: { 
        'Content-Type': 'application/json',
      },
      data : data
    };

    try {
      return (await  axios(config)).data.data;
    } catch (error) {
      throw new ClientError('Error mapping test ids to testplan', error.message, error.response.status, error.response.statusText);   
    }
  }

  async mapExecutionToTestPlan(testPlanKey, executionId) {
    console.log('Mapping execution to a testplan');
    let testPlanId= await this.getTestPlanIdByKey(testPlanKey);

    var data = JSON.stringify({
      query: `mutation {
                addTestExecutionsToTestPlan(
                issueId: ${JSON.stringify(testPlanId)},
                testExecIssueIds: [${JSON.stringify(executionId)}]) {
                    addedTestExecutions
                    warning
                }
            }`,
      variables: {}
    });

    let config = {
      method: 'post',
      headers: { 
        'Content-Type': 'application/json',
      },
      data : data
    };

    try {
      return (await  axios(config)).data.data;
    } catch (error) {
      throw new ClientError('Error mapping execution id to testplan', error.message, error.response.status, error.response.statusText);   
    }
  }
}

module.exports = {XrayGraphqlClient}