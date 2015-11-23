#!/usr/bin/env node
'use strict';

const denodeify = require('denodeify'),
  fs = require('fs'),
  inquirer = require('inquirer'),
  auth = require('./auth'),
  codebase = require('./codebase'),
  format = require('./format'),
  readFile = denodeify(fs.readFile),
  exec = denodeify(require('child_process').exec),

  prompt = (questions) => {
    return new Promise((resolve) => {
      inquirer.prompt(questions, resolve);
    });
  },

  argv = require('yargs')
  .usage('Usage: $0 [options]')
  .example('$0 --project api --ticket 123')
  .options('p', {
    alias: 'project',
    demand: false,
    describe: `Codebase project identifier.
If not specified it defaults to what's inside $PWD/.codebase-project`,
    type: 'string'
  })
  .options('t', {
    alias: 'ticket',
    demand: false,
    describe: `Codebase ticket identifier.
If not specified it tries to guess it based on your current branch name`,
    type: 'string'
  })
  .options('c', {
    alias: 'count',
    demand: false,
    default: '-1',
    describe: `Number of ticket updates to retrieve, -1 for no limits`,
    type: 'string'
  })
  .options('no-colors', {
    demand: false,
    describe: `Prevents output colour`,
    type: 'boolean'
  })
  .help('h')
  .alias('h', 'help')
  .argv;


/**
 * Get current project based on either the cli param or the current working
 * directory `.codebase-project` file content.
 * If both fail, prompt for it
 *
 * @return {Promise.<string>} Promise resolved with the project name
 */
let getProject = () => {
  return new Promise((resolve, reject) => {
    let project = argv.p;
    if (project) {
      resolve(project);
    } else {
      reject();
    }
  }).catch(() => {
    let codebaseFile = `${process.cwd()}/.codebase-project`;
    return readFile(codebaseFile)
      .then((data) => {
        return data.toString().split('\n')[0];
      }).catch(() => {
        console.log(`We couldn't guess the project you want. (Error while reading ${codebaseFile})`);
        return prompt([{
          type: 'input',
          name: 'project',
          message: 'Which project are you looking for?'
        }]).then((answers) => answers.project);
      });
  });
};


/**
 * Get ticket number based on either the cli param or the current branch name.
 * If both fail, prompt for it
 *
 * @return {Promise.<number>} Ticket number to look up
 */
let getTicket = () => new Promise((resolve, reject) => {
  let ticketNo = argv.t;
  if (ticketNo) {
    resolve(ticketNo);
  } else {
    reject();
  }
}).catch(() => exec('git symbolic-ref HEAD').then((data) => {
  let ref = data.toString().split('\n')[0],
    branchName = ref.replace('refs/heads/', ''),
    ticket = parseInt(branchName, 10);
  if (Number.isNaN(ticket)) {
    throw {
      error: 'NO_TICKET'
    };
  }
  return ticket;
})).catch(() => {
  console.log(`We couldn't guess the ticket you want.`);
  return prompt([{
    type: 'input',
    name: 'ticket',
    validate: (val) => {
      let valid = !Number.isNaN(parseInt(val, 10));
      return valid ? true : 'Please enter a ticket number';
    },
    message: 'Which ticket are you looking for?'
  }]).then((answers) => parseInt(answers.ticket, 10));
});

/**
 * Check $HOME/.codebase_credentials or prompt for auth information
 *
 * @return {Promise.<{user: string, token: string}>} Auth config object
 */
let getCredential = () => auth.getCredentialsOrPrompt(prompt);

let project, ticket, config = {};

// Run in sequence since otherwise inquirer breaks :(
// This *could* be refactored to have a separate prompt-only promise on which
// inquirer additionaly wait on, but it would significantly increase complexity.
getCredential().then((conf) => {
  config = conf;
  return getProject();
}).then((pj) => {
  project = pj;
  return getTicket();
}).then((tk) => {
  ticket = tk;
}).then(() => {
  let api = codebase(config);
  return api.ticketDetails(project, ticket);
}).then((ticket) => format.ticket(ticket, argv.c))
.catch((err) => {
  if (err.statusCode && err.statusCode === 404) {
    console.warn(`It appears that ticket ${ticket} doesn't exists for project "${project}" (got a 404)`);
  } else {
    console.error(`There has been an error: ${JSON.stringify(err)}`);
  }
});
