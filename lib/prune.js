
// prune outdated and unnecessary dependencies
// if the package has the "prunable" marker,
// which is just an empty file called "prunable",
// then delete any non-latest versions that have
// no dependent packages.

module.exports = prune

prune.usage = "npm prune [<package>[@<version] ...]"

var fs = require("./utils/graceful-fs")
  , asyncMap = require("./utils/async-map")

function prune (args, cb) {

}

function unpackArgs (args, cb) {
}
