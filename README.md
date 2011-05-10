# gpm

This is just enough info to get you up and running.

Much more info available via `gpm help` once it's installed.

## IMPORTANT

**You need node v0.4 or higher to run this program.**

To install an old **and unsupported** version of gpm that works on node 0.3
and prior:

    git clone git://github.com/tobsn/gpm.git ./gpm
    cd gpm
    git checkout origin/0.2
    make dev

## Simple Install

To install gpm with one command, do this:

    curl http://gpmjs.org/install.sh | sh

To skip the gpm 0.x cleanup, do this:

    curl http://gpmjs.org/install.sh | clean=no sh

To say "yes" to the 0.x cleanup, but skip the prompt:

    curl http://gpmjs.org/install.sh | clean=yes sh

If that fails, try this:

    git clone http://github.com/tobsn/gpm.git
    cd gpm
    sudo make install

If you're sitting in the code folder reading this document in your
terminal, then you've already got the code.  Just do:

    sudo make install

and gpm will install itself.

If you don't have make, and don't have curl or git, and ALL you have is
this code and node, you can probably do this:

    sudo node ./cli.js install -g

However, note that github tarballs **do not contain submodules**, so
those won't work.  You'll have to also fetch the appropriate submodules
listed in the .gitmodules file.

## Permissions

**tl;dr**

* Use `sudo` for greater safety.  Or don't, if you prefer not to.
* gpm will downgrade permissions if it's root before running any build
  scripts that package authors specified.

### More details...

As of version 0.3, it is recommended to run gpm as root.
This allows gpm to change the user identifier to the `nobody` user prior
to running any package build or test commands.

If you are not the root user, or if you are on a platform that does not
support uid switching, then gpm will not attempt to change the userid.

If you would like to ensure that gpm **always** runs scripts as the
"nobody" user, and have it fail if it cannot downgrade permissions, then
set the following configuration param:

    gpm config set unsafe-perm false

to prevent it from ever running in unsafe mode, even as non-root users.

## Uninstalling

So sad to see you go.

    sudo gpm uninstall gpm -g

Or, if that fails,

    sudo make uninstall

## More Severe Uninstalling

Usually, the above instructions are sufficient.  That will remove
gpm, but leave behind anything you've installed.

If you would like to remove all the packages that you have installed,
then you can use the `gpm ls` command to find them, and then `gpm rm` to
remove them.

To remove cruft left behind by gpm 0.x, you can use the included
`clean-old.sh` script file.  You can run it conveniently like this:

    gpm explore gpm -g -- sh scripts/clean-old.sh

## Using gpm Programmatically

If you would like to use gpm programmatically, you can do that.
It's not very well documented, but it IS rather simple.

    var gpm = require("gpm")
    gpm.load(myConfigObject, function (er) {
      if (er) return handlError(er)
      gpm.commands.install(["some", "args"], function (er, data) {
        if (er) return commandFailed(er)
        // command succeeded, and data might have some info
      })
      gpm.on("log", function (message) { .... })
    })

See `./bin/gpm.js` for an example of pulling config values off of the
command line arguments using nopt.  You may also want to check out `gpm
help config` to learn about all the options you can set there.

## More Docs

Check out the [docs](http://github.com/tobsn/gpm/blob/master/doc/),
especially the
[faq](http://github.com/tobsn/gpm/blob/master/doc/faq.md#readme).

You can use the `gpm help` command to read any of them.

If you're a developer, and you want to use gpm to publish your program,
you should
[read this](http://github.com/tobsn/gpm/blob/master/doc/developers.md#readme)

## Legal Stuff

"gpm" and "the gpm registry" are owned by Isaac Z. Schlueter.  All
rights not explicitly granted in the MIT license are reserved. See the
included LICENSE file for more details.

"Node.js" and "node" are trademarks owned by Joyent, Inc.  gpm is not
officially part of the Node.js project, and is neither owned by nor
officially affiliated with Joyent, Inc.

The packages in the gpm registry are not part of gpm itself, and are the
sole property of their respective maintainers.  While every effort is
made to ensure accountability, there is absolutely no guarantee,
warrantee, or assertion made as to the quality, fitness for a specific
purpose, or lack of malice in any given gpm package.  Modules
published on the gpm registry are not affiliated with or endorsed by
Joyent, Inc., Isaac Z. Schlueter, Ryan Dahl, or the Node.js project.

If you have a complaint about a package in the gpm registry, and cannot
resolve it with the package owner, please express your concerns to
Isaac Z. Schlueter at <i@izs.me>.

### In plain english

This is mine; not my employer's, not Node's, not Joyent's, not Ryan
Dahl's.

If you publish something, it's yours, and you are solely accountable
for it.  Not me, not Node, not Joyent, not Ryan Dahl.

If other people publish something, it's theirs.  Not mine, not Node's,
not Joyent's, not Ryan Dahl's.

Yes, you can publish something evil.  It will be removed promptly if
reported, and we'll lose respect for you.  But there is no vetting
process for published modules.

If this concerns you, inspect the source before using packages.
