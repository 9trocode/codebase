'use strict';


const got = require('got'),
  endpoint = 'https://api3.codebasehq.com';

module.exports = (config) => {
  let user = config.user,
    pass = config.token;


  let get = (slug) => {
    return got(endpoint + slug, {
      auth: `${user}:${pass}`,
      json: true
    }).then((resp) => {
      return resp.body;
    });
  };

  let listTickets = (project) => {
    get(`/${project}/tickets`).then(console.log);
  };

  let details = (project, ticket) => {
    return Promise.all([
      get(`/${project}/tickets/${ticket}`),
      get(`/${project}/tickets/${ticket}/notes`)
    ]).then((res) => {
      let ticket = res[0].ticket;
      ticket.notes = res[1].map((note) => note.ticket_note);
      return ticket;
    });
  };

  return {
    ticketDetails: details,
    listTickets: listTickets
  };
};
