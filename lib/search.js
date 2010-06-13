
// show packages that match a pattern

module.exports = exports = search

var npm = require("../npm")
  , log = require("./utils/log")
  , readInstalled = require("./utils/read-installed")
  , registry = require("./utils/registry")
  , semver = require("./utils/semver")

function search (args, cb) {
  readInstalled([], function (er, installed) {
    registry.get(function (er, remote) {
      var packageMap = merge(installed, remote)
      var pretty = prettify(packageMap, args)
        , stdout = process.stdout
      stdout.write(pretty)
      stdout.flush()
    })
  })
}

function strcmp (a, b) { return a > b ? 1 : -1 }
function prettify (data, args) {
  var pkgs = Object.keys(data).sort(strcmp)
    , attrs = []
    , names = []
    , pretty = []
    , maxNameLen = 0
    , tests = args
      ? args.map(function(filter){
        return RegExp(filter,"img")
      })
      : []
  pkgs.forEach(function (name) {
    var pkg = data[name]
    var valid = false
    for (var i = 0; i < args.length; i++) {
      var test = tests[i]
      for(var version in pkg) {
        var module = pkg[version]
        valid = valid || test.test(name)
        valid = valid || test.test(module.description)
        module.tags.forEach(function(tag){
          valid = valid || test.test(tag)
        })
      }
    }
    if(!valid) return
    Object.keys(pkg).sort(semver.compare).forEach(function (v) {
      var ver = pkg[v]
        , p = []
      ver.tags = ver.tags.length === 0
               ? ""
               : ("@tag=" + ver.tags.join(" @tag="))
      for (var i in ver) if (ver[i]) {
        p.push((typeof ver[i] === "string") ? ver[i] : "@" + i)
      }
      names.push(name + "@" + v)
      maxNameLen = Math.max(maxNameLen, (name + "@" + v).length)
      attrs.push(p.sort(strcmp).join(" "))
    })
  })
  var space = "                                   "
  for (var n = 0, l = names.length; n < l; n ++) {
    names[n] += space.substr(0, maxNameLen - names[n].length)
    pretty.push(names[n] + " " + attrs[n])
  }
  // don't color if it's piping to some other process.
  var doColor = !process.binding("stdio").isStdoutBlocking()
    , colors = [36, 32, 33, 31, 35 ]
    , c = 0
    , l = colors.length
  if (args) tests.forEach(function (arg) {
    //pretty = pretty.filter(function (line) { return line.match(arg) })
    if (doColor) {
      pretty = pretty.map(function (line) {
        return line.replace(arg,function(match){
          return "\033["+colors[c]+"m" + match + "\033[m"
        })
      })
      c = (c + 1) % l
    }
  })
  if (!pretty.length) pretty = ["Nothing found"]
  pretty.push("")
  return pretty.join("\n")
}
function merge (installed, remote) {
  var merged = {}
  // first, just copy the installed stuff
  for (var p in installed) {
    merged[p] = {}
    for (var v in installed[p]) {
      merged[p][v] = { installed : true, tags : [] }
      if (remote[p]) merged[p][v].description = remote[p].description
      for (var s in installed[p][v]) {
        merged[p][v][s] = installed[p][v][s]
      }
    }
  }
  // now merge in the remote stuff.
  for (var p in remote) {
    merged[p] = merged[p] || {}
    for (var v in remote[p].versions) {
      merged[p][v] = merged[p][v] || {}
      merged[p][v].remote = true
      merged[p][v].description = remote[p].description
      merged[p][v].stable = (remote[p]["dist-tags"].stable === v)
      merged[p][v].tags = []
      Object.keys(remote[p]["dist-tags"]).forEach(function (tag) {
        if (remote[p]["dist-tags"][tag] === v) merged[p][v].tags.push(tag)
      })
    }
  }
  return merged
}
