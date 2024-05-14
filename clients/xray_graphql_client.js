const axios = require('axios');
const {ClientError} = require("../errors/client_error");

let instance;

class XrayGraphqlClient {
  constructor(host, bearerToken) {
    instance = axios.create({
      baseURL: host,
      headers: {'Authorization': bearerToken}
    });
  }

  async getTestPlanIdByKey(key) {
    console.log(`Getting test plan id from key ${key}`)
    let data = JSON.stringify({
      query: `{ getTestPlans(jql: "key=${key}", limit: 1) { results { issueId } }  }`,
      variables: {}
    });

    let config = {
      method: 'post',
      maxBodyLength: Infinity,
      headers: { 'Content-Type': 'application/json', },
      data
    };

    try {
      return (await instance(config)).data.data.getTestPlans.results[0].issueId;
    } catch (error) {
      throw new ClientError('Error getting test plan id by key', error.message, error.response.status, error.response.statusText);   
    }
  }

  async getTestsIdByKey(ids) {
    let config = {
      method: 'post',
      maxBodyLength: Infinity,
      headers: { 'Content-Type': 'application/json' },
      data : JSON.stringify({ query: `{ getTests(jql: "key in (${ids})", limit: 50) { results { issueId  } } }`, variables: {} })
    };

    try {
      return (await instance(config)).data.data.getTests.results.map(x => x.issueId)
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
      return (await  instance(config)).data.data;
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
      return (await  instance(config)).data.data;
    } catch (error) {
      throw new ClientError('Error mapping execution id to testplan', error.message, error.response.status, error.response.statusText);   
    }
  }

  async getTestsByTestPlanKey(key) {
    try {
      let getTestPlanData = JSON.stringify({
        query: `{ getTestPlans(jql: "key=${key}", limit: 1) { results { issueId } }  }`,
        variables: {}
      });
  
      let config = {
        method: 'post',
        maxBodyLength: Infinity,
        headers: { 'Content-Type': 'application/json', },
        data : getTestPlanData
      };
  
      let planId = (await instance(config)).data.data.getTestPlans.results[0].issueId;

      let getTestsData = JSON.stringify({
        query: `{
          getTestPlan(issueId: "${planId}") {
              issueId
              tests(limit: 100) {
                  results {
                      jira(fields: ["key"])
                      issueId
                  }
              }
          }
      }`,
        variables: {}
      });
  
      let getTestsConfig = {
        method: 'post',
        maxBodyLength: Infinity,
        headers: { 'Content-Type': 'application/json', },
        data : getTestsData
      };
  
      let a = await instance(getTestsConfig);

      return a.data.data.getTestPlan.tests.results.map(x => x.jira.key);
    } catch (error) {
      throw new ClientError('Error getting tests keys by test plan key', error.message, error.response.status, error.response.statusText);   
    }
  }
}

module.exports = {XrayGraphqlClient}