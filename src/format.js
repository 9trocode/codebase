'use strict';

const chalk = require('chalk'),
  Table = require('cli-table'),

  windowWidth = process.stdout.columns || 80,


  statusColors = {
    'blue': chalk.bgBlue.gray,
    'green': chalk.bgGreen.gray,
    'red': chalk.bgRed,
    'orange': chalk.bgYellow.gray,
    'purple': chalk.bgMagenta.gray,
    'pink': chalk.bgCyan.gray,
    'black': chalk.bgBlack,
    'white': chalk.bgWhite.gray,
    'grey': chalk.grey
  },

  priorityColors = {
    'blue': chalk.blue,
    'green': chalk.green,
    'red': chalk.red,
    'orange': chalk.yellow,
    'purple': chalk.magenta,
    'pink': chalk.cyan,
    'black': chalk.black,
    'white': chalk.white,
    'grey': chalk.grey
  },

  formatTitleF = (ticket) => {
    let title = chalk.bold.underline;
    if (ticket.status && ticket.status['treat-as-closed']) {
      title = title.red;
    } else {
      title = title.green;
    }
    return title;
  },

  noteSeparator = chalk.grey('  ' + '―'.repeat(windowWidth - 4) + '  '),

  formatTicket = (ticket, count) => {
    let formatTitle = formatTitleF(ticket),
      title = formatTitle(ticket.summary),
      formatStatus = statusColors[ticket.status.colour] || chalk.bgYellow,
      status = formatStatus(` ${ticket.status.name} `),
      formatPriority = priorityColors[ticket.priority.colour] || chalk.yellow,
      limit = parseInt(count, 10),
      hasLimit = limit >= 0 && !Number.isNaN(limit),
      printed = 0,
      priority = formatPriority(ticket.priority.name);

    console.log(`\n${title} | ${status} | ${priority}\n`);
    ticket.notes
    .filter((note) => !!note.content)
    .filter((note, index) => {
      if (hasLimit && index >= limit) {
        return false;
      }
      return true;
    }).forEach((note) => {
      let content = note.content;
      content = content.split('\n').join('\n  ');
      console.log('  ' + content);
      console.log(noteSeparator);
      printed += 1;
    });

  },

  formatProjects = projects => {
    // instantiate
    let table = new Table({
      head: [
        'Project Id',
        'Project Name',
        'Permalink',
        'Open tickets',
        'Closed tickets'
      ]
    });

    // table is an Array, so you can `push`, `unshift`, `splice` and friends

    projects.forEach(project => {
      table.push([
        project.project_id,
        project.name,
        project.permalink,
        project.open_tickets,
        project.closed_tickets
      ]);
    });
    console.log(table.toString());
  };

module.exports = {
  ticket: formatTicket,
  projects: formatProjects
};
