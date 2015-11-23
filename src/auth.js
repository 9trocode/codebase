'use strict';

const denodeify = require('denodeify'),
  osenv = require('osenv'),
  path = require('path'),
  homeDir = osenv.home(),
  authFile = path.join(homeDir, '.codebase_credentials'),
  readFile = denodeify(require('fs').readFile),
  writeFile = denodeify(require('fs').writeFile);

let getCredentials = () => {
  return readFile(authFile).then((data) => {
    return JSON.parse(data);
  });
};

let getCredentialsOrPrompt = (prompt) => {
  return getCredentials().catch(() => {
    return prompt([{
      type: 'input',
      name: 'user',
      message: 'Type your Codebase username including the organization prefix (org/user-name)',
      validate: (val) => {
        // Look for email address
        if (val.indexOf('@') >= 0) {
          return `Please insert your codebase username, not your password. You can find it at https://<your-company>/codebasehq.com/settings/profile.`;
        }
        // Check that at least a / is present
        if (val.indexOf('/') < 0) {
          return 'Please include your organization prefix (e.g. org/username )';
        }
        return true;
      }
    },{
      type: 'input',
      name: 'token',
      message: 'Type your Codebase API key'
    }])
    .then((answers) => {
      return writeFile(authFile, JSON.stringify(answers, null, ' '))
        .then(() =>  answers);
    });
  });
};

module.exports = {
  getCredentials: getCredentials,
  getCredentialsOrPrompt: getCredentialsOrPrompt
};
