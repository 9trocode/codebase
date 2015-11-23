# Codebase CLI
Quickly check the status of the ticket you're working on on codebase.

## Installation

`npm install -g codebase`

**Note: Node 4.0.0+ required **

## Usage

As per `codebase --help`:

```
Usage: codebase [options]

Options:
  -p, --project  Codebase project identifier.
                 If not specified it defaults to
                 what's inside $PWD/.codebase-project                   [string]
  -t, --ticket   Codebase ticket identifier.
                 If not specified it tries to guess
                 it based on your current branch name                   [string]
  -c, --count    Number of ticket updates to retrieve, -1 for no limits
                                                        [string] [default: "-1"]
  --no-colors    Prevents output colour                                [boolean]
  -h, --help     Show help                                             [boolean]

Examples:
  codebase --project api --ticket 123
```

At first run codebase will prompt for your API credential and store them
in a `$HOME/.codebase_credentials` json file. When prompt, insert your API
unsername including you organization (e.g. `microsoft/bill-gates`) and your
access token (something like `234bd452961b34490db83abcd12345672cf00198c16`).

You can find these information in your "profile" page on codebase
(https://&lt;your-company&gt;.codebasehq.com/settings/profile)


## Project and ticket guessing

You can pass an optional `--project` and `--ticket` params to codebase and it
will output a summary of that ticket.

If you don't, codebase will look for a `.codebase-project` file containing the
project name in your current working directory and use that.

Also, if you don't specify a ticket number, codebase will try to guess it based
on the current branch name (which should start with the ticket number).

e.g. if your current branch is called `123-awesome-feature`, codebase will
assume you're interested in ticket number 123.

If guessing can't be performed, or you're missing any of the required param,
codebase will very kindly ask you to provide some.

## Development

This CLI tool can also be used as a node.js library. My plan is to use it
to build an Atom plugin with it, but that's not yet available. API are likely to
change frequently, so until v1.0 is hit, if you want to use this lib, do so
at your own risk (and lock the version with "=0.x.y" in your package.json).

Issues and PR are most welcome.

MIT (c) Alessandro Artoni
