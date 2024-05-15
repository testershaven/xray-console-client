// const axios = require('axios');
import axios from "axios";
// const {ClientError} = require("../errors/client_error");
import {ClientError} from '../errors/client_error.js';

let instance;

export class JiraRestClient {
  constructor(host, basicToken) {
      instance = axios.create({
      baseURL: host,
      headers: {
        'Authorization': 'Basic ' + basicToken
      },
    });
  }

  async addValueToCustomField(customFieldId, customFieldValue, key) {
    console.log(`Adding value ${customFieldValue} in custom field ${customFieldId} from issue ${key}`)

    var data = `{ "fields" : { "${customFieldId}" : "${customFieldValue}" } }`;

    let config = {
      url: `/rest/api/3/issue/${key}`,
      method: 'put',
      headers: {
        'Content-Type': 'application/json',
      },
      data
    };

    try {
      return instance(config);
    } catch (error) {
      throw new ClientError(`Error adding value ${customFieldValue} in custom field ${customFieldId} from issue ${key}`, error.message, error.response.status, error.response.data);
    }
  }

  async mapExecutionToIssue(options, executionKey) {
    console.log('Linking issue to execution')

    let data = JSON.stringify({
      "type": {
        "id": options.issueLinkType
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
      method: 'post',
      url: '/rest/api/2/issueLink',
      headers: {
        'Content-Type': 'application/json',
      },
      data
    };

    try {
      return await instance(config);
    } catch (error) {
      throw new ClientError('Error Mapping execution id into xray', error.message, error.response.status, error.response.data);
    }
  }
}
