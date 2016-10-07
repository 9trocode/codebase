#!/usr/bin/env node
'use strict';

const denodeify = require('denodeify'),
  fs = require('fs'),
  inquirer = require('inquirer'),
  auth = require('./auth'),
  codebase = require('./codebase'),
  format = require('./format'),
  stringTemplate = require('string-template'),
  readFile = denodeify(fs.readFile),
  exec = denodeify(require('child_process').exec),

  prompt = (questions) => {
    return new Promise((resolve) => {
      inquirer.prompt(questions, resolve);
    });
  },
  trim = string => string.replace(/\s+/g, ' '),
  yargs = require('yargs'),
  argv = yargs
  .usage('Usage: $0 <command> [options]')
  .example('$0 --project api --ticket 123')
  .command('show-ticket', 'Show ticket details', yargs => {
    return yargs.options('p', {
      alias: 'project',
      demand: false,
      describe: trim(`Codebase project identifier.
      If not specified it defaults to what's inside $PWD/.codebase-project`),
      type: 'string'
    })
    .options('t', {
      alias: 'ticket',
      demand: false,
      describe: trim(`Codebase ticket identifier.
      If not specified it tries to guess it based on your current branch name`),
      type: 'string'
    })
    .options('c', {
      alias: 'count',
      demand: false,
      default: '-1',
      describe: `Number of ticket updates to retrieve, -1 for no limits`,
      type: 'string'
    })
    .usage('Usage: $0 show-ticket [options]')
    .help('h')
    .alias('h', 'help');

  })
  .command('add-note', 'Add a note to a ticket', yargs => {
    return yargs.usage('Usage $0 add-note "Your note"')
    .options('p', {
      alias: 'project',
      demand: false,
      describe: trim(`Codebase project identifier.
      If not specified it defaults to what's inside $PWD/.codebase-project`),
      type: 'string'
    })
    .options('t', {
      alias: 'ticket',
      demand: false,
      describe: trim(`Codebase ticket identifier.
      If not specified it tries to guess it based on your current branch name`),
      type: 'string'
    })
    .help('h')
    .alias('h', 'help');
  })
  .command('list-projects', 'List all projects in your organization')
  .options('no-colors', {
    demand: false,
    describe: `Prevents output colour`,
    type: 'boolean'
  })
  .help('h')
  .alias('h', 'help')
  .epilogue('For more information on each command run $0 <command> --help')
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

let commands = {
  'show-ticket': function () {
    showTicket();
  },
  'list-projects': function () {
    listProjects();
  },
  'add-note': function (args) {
    addNote(args[1]);
  }
};


let addNote = (content) => {
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
    content = stringTemplate(content, {
      ticket: ticket,
      project: project
    });
    return api.addNote(project, ticket, {
      content
    });
  }).then((note) => console.log(note))
  .catch((err) => {
    if (err.statusCode && err.statusCode === 404) {
      console.warn(`It appears that ticket ${ticket} doesn't exists for project "${project}" (got a 404)`);
    } else {
      console.error(`There has been an error: ${JSON.stringify(err)}`);
    }
  });
};

let showTicket = () => {
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
};

let listProjects = () => {
  getCredential()
    .then(codebase)
    .then(api => api.listProjects())
    .then(projects => format.projects(projects))
    .catch(console.error);
};

let command = argv._[0] || 'show-ticket';
if (typeof commands[command] !== 'function') {
  console.error(`Command ${command} doesn't exist :(
  `);
  yargs.showHelp();
} else {
  commands[command](argv._);
}
