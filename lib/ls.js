
// show the installed versions of a package

module.exports = exports = ls

var npm = require("../npm")
  , log = require("./utils/log")
  , readInstalled = require("./utils/read-installed")
  , registry = require("./utils/registry")
  , semver = require("./utils/semver")
  , sys = require("sys")
  , mustache = require("./mustache.js/mustache")

function ls (args, cb) {
  readInstalled([], function (er, installed) {
    registry.get(function (er, remote) {
      var pkgs = merge(installed, remote)
      pkgs = Object.keys(pkgs).map(function (pkg) {var result=pkgs[pkg];result.name=pkg;return result})
      pkgs = filter(pkgs, args)
      var stdout = process.stdout
        , pretty = prettify(pkgs)
      stdout.write(pretty)
      if (stdout.flush()) cb()
      else stdout.on("drain", cb)
    })
  })
}
var testFilters = {
  //test name
  name:function nameTest(matcher) {
    var test = function (pkg) {
      return matcher(pkg.name)
    }
    test.type = 'name'
    return test
  }

  //test for single match tag
  , tag:function tagTest(matcher) {
    var test = function (pkg) {
      return !!pkg.tags.filter(matcher)
    }
    test.type = 'tag'
    return test
  }

  //test for single match version
  , version:function versionTest(matcher) {
    var test = function (pkg) {
      return !!pkg.versions.filter(matcher)
    }
    test.type = 'version'
    return test
  }

  , latest:function versionTest(matcher) {
    var test = function (pkg) {
      return !!matcher(pkg.latest)
    }
    test.type = 'latest'
    return test
  }

  //test for single match name and email
  , author:function authorTest(matcher) {
    var test = function (pkg) {
      return !!pkg.maintainers.filter(function(item){
        return !!(matcher(item.name)||matcher(item.email))
      })
    }
    test.type = 'author'
    return test
  }

  , installed:function installedTest() {
    var test = function (pkg) {
      return !!pkg.installed.filter(function(version){return matcher(version)})
    }
    test.type = 'installed'
    return test
  }

  , stable:function stableTest(matcher) {
    var test = function (pkg) {
      return !!matcher(pkg.stable)
    }
    test.type = 'stable'
    return test
  }

  , description:function descriptionTest(matcher) {
    var test = function (pkg) {
      return matcher(pkg.description)
    }
    test.type = 'description'
    return test
  }

  , modified:function modifiedTest(matcher) {
    var test = function (pkg) {
      return matcher(pkg.mtime)
    }
    test.type = 'modified'
    return test
  }

  , created:function createdTest(matcher) {
    var test = function (pkg) {
      return matcher(pkg.ctime)
    }
    test.type = 'created'
    return test
  }
}

function filter(pkgs,args) {
  var filtered_pkgs = []
    , tests = []
  //sys.puts(sys.inspect(args))
  args.forEach(function (arg){
    var parts = arg.match(/(?:[^=]*|'(?:\\.|[^'])*?'|"(?:\\.|[^"])*?")(?=(?:[=]|$))/g)
    if (parts) {
      parts[0] = parts[0].toLowerCase()
      var modifier = '=';
      if (parts[0].slice(-1)=='!') {
        modifier = '!='
        parts[0]=parts[0].slice(0,-1)
      }
      else if (parts[0].slice(-1)=='<') {
        modifier = '<='
        parts[0]=parts[0].slice(0,-1)
      }
      else if (parts[0].slice(-1)=='>') {
        modifier = '>='
        parts[0]=parts[0].slice(0,-1)
      }
      var matcher = compileMatcher(modifier, parts[2])
      if(testFilters[parts[0]]) tests.push(testFilters[parts[0]](matcher))
    }
  })
  pkgs.forEach(function (pkg){
    var matches = {}
      , count=0
      , valid=true
      //sys.puts(sys.inspect(pkg))
    tests.forEach(function (test){
      if (test(pkg)) {
        matches[test.type] = matches[test.type] || 1
      }
      else {
        valid=false
      }
    })
    if (valid || (npm.config.get('allow-partial') && count)) {
      filtered_pkgs.push([matches,pkg])
    }
  })

  return filtered_pkgs
}

//TODO Wildcards on Strings
function compileMatcher(modifier,pattern) {
  //semver
  if (semver.valid(pattern)) {
    switch (modifier) {
      case '=':return function (str) {return str==pattern}
      case '!=':return function (str) {return str!=pattern}
      case '<=':return function (str) {return str==pattern||semver.lt(str,pattern)}
      case '>=':return function (str) {return str==pattern||semver.gt(str,pattern)}
    }
  }
  //number
  else if(!isNaN(pattern)) {
    pattern = Number(pattern)
    switch (modifier) {
      case '=':return function (str) {return str==pattern}
      case '!=':return function  (str) {return str!=pattern}
      case '<=':return function (str) {return str>=pattern}
      case '>=':return function (str) {return str<=pattern}
    }
  }
  //date
  else if(!isNaN(Date.parse(pattern))) {
    pattern = Date(pattern)
    switch (modifier) {
      case '=':return function (str) {return !isNaN(Date.parse(modifier))&&str==pattern}
      case '!=':return function (str) {return !isNaN(Date.parse(modifier))&&str!=pattern}
      case '<=':return function (str) {return !isNaN(Date.parse(modifier))&&str>=pattern}
      case '>=':return function (str) {return !isNaN(Date.parse(modifier))&&str<=pattern}
    }
  }
  //pattern
  else if(pattern&&pattern.charAt(0)=='/'&&pattern.slice(-1)=='/') {
    pattern=RegExp(pattern.slice(1,-1),'gi')
    switch (modifier) {
      case '=':return function (str) {return pattern.test (str) }
      case '!=':return function (str) {return !pattern.test (str) }
    }
  }
  //string
  else {
    if (pattern && (pattern.charAt(0) == '"' && pattern.slice(-1) == '"'
    || pattern.charAt(0) == '"' && pattern.slice(-1) == '"')) {
      pattern = pattern.slice(1,-1)
    }
    switch (modifier) {
      case '=':return function (str) {return str==pattern}
      case '!=':return function (str) {return str!=pattern}
      case '<=':return function (str) {return str>=pattern}
      case '>=':return function (str) {return str<=pattern}
    }
  }
}

var terse="{{name}}{{#isInstalled}} \033[35minstalled\033[m@{{#installed[0..-1]}}{{.}},{{/installed}}{{#installed[-1]}}{{.}}{{/installed}}{{#active}} \033[35mactive\033[m@{{active}}{{/active}}{{/isInstalled}}{{#isStable}} \033[35mstable\033[m@{{stable}}{{/isStable}}"
  , list="{{name}}{{#isInstalled}} \033[35minstalled\033[m@{{#installed[0..-1]}}{{.}}, {{/installed}}{{#installed[-1]}}{{.}}{{/installed}}{{#active}} \033[35mactive\033[m@{{active}}{{/active}}{{/isInstalled}}{{#isStable}} \033[35mstable\033[m@{{stable}}{{/isStable}}{{#latest}} \033[35mlatest\033[m@{{latest}}{{/latest}}{{#isRemote}} \033[35mremote\033[m@{{#remote[0..-1]}}{{.}}, {{/remote}}{{#remote[-1]}}{{.}}{{/remote}}{{/isRemote}}"
  , verbose="\033[31m{{name}}\033[m by{{#maintainers}} {{name}}({{email}}){{/maintainers}}\n{{#isInstalled}} \033[35m@installed\033[m {{#installed[0..-1]}}{{.}},{{/installed}}{{#installed[-1]}}{{.}}{{/installed}}{{#active}} \033[35m@active\033[m {{active}}{{/active}}{{/isInstalled}}{{#isStable}} \033[35m@stable\033[m {{stable}}{{/isStable}}\n\033[35m@description\033[m:\n{{description}}\n\033[35m@tags\033[m:\n{{#tags}} {{.}} {{/tags}}\n----"
  , orderby={
    "name":function(matches_and_pkg1,matches_and_pkg2) {
      return matches_and_pkg1[1].name.toLowerCase() > matches_and_pkg2[1].name.toLowerCase() ? 1 : -1
    }
    , "installed":function(matches_and_pkg1,matches_and_pkg2) {
      return matches_and_pkg1[1].installed ? -1 : 1
    }
    , "active":function(matches_and_pkg1,matches_and_pkg2) {
      return matches_and_pkg1[1].active ? -1 : 1
    }
    , "stable":function(matches_and_pkg1,matches_and_pkg2) {
      return matches_and_pkg1[1].stable ? -1 : 1
    }
    , "created":function(matches_and_pkg1,matches_and_pkg2) {
      return matches_and_pkg1[1].ctime > matches_and_pkg2[1].ctime ? 1 : -1
    }
    , "modified":function(matches_and_pkg1,matches_and_pkg2) {
      return matches_and_pkg1[1].mtime > matches_and_pkg2[1].mtime  ? 1 : -1
    }
  }
function prettify (matches_and_pkgs) {
  var ordering = (npm.config.get("orderby") || "name").split(",").reverse()
  for (var i = 0; i < ordering.length; i++) {
    var order = ordering[i]
      , reverse = order.slice(-8)=="-reverse"
      , sorter
    if(reverse) {
      var toReverseSorter = orderby[order.slice(0,-8)]
      sorter = function(a,b) {
        return toReverseSorter(a,b)*-1
      }
    }
    else {
      sorter = orderby[order]
    }
    if(sorter) matches_and_pkgs = matches_and_pkgs.sort(sorter)
  }
  var pretty = matches_and_pkgs.map(function (pkg) {
    pkg=pkg[1]
    return (mustache.to_html(
      npm.config.get("format") || (npm.config.get("verbose")?verbose:false) || terse
      , pkg
    ))
  })
  if (!pretty.length) pretty = ["Nothing found"]
  pretty.push("")
  return pretty.join("\n")
}


function merge (installed, remote) {
  //sys.puts(sys.inspect(installed))
  var merged = {}
  // first, just copy the installed stuff
  for (var packageName in installed) {
    var pkg = merged[packageName] = {
      isInstalled : true
      ,installed : Object.keys(installed[packageName])
    }
    for (var version in installed[packageName]) {
      pkg[version] = { installed : true, tags : [] }
      if(installed[packageName][version].active) {
        pkg.active=version
      }
      for (var tag in installed[packageName][version]) {
        pkg[version][tag] = installed[packageName][version][tag]
      }
    }
  }
  // now merge in the remote stuff.
  for (var packageName in remote) {
    var pkg = merged[packageName] = merged[packageName] || {}
    pkg.isRemote = true
    pkg.remote = []
    pkg.latest = remote[packageName]["dist-tags"].latest
    for (var property in remote[packageName]) {
      switch(property) {
        case 'versions':
          break;
        default: pkg[property] = remote[packageName][property]
      }
    }
    for (var version in remote[packageName].versions) {
      pkg.remote.push(version)
      pkg[version] = pkg[version] || {}
      pkg[version].remote = true
      if(remote[packageName]["dist-tags"].stable === version) {
        pkg[version].stable = true
        pkg.isStable = true
        pkg.stable = version
      }
      pkg[version].tags = []
      Object.keys(remote[packageName]["dist-tags"]).forEach(function (tag) {
        if (remote[packageName]["dist-tags"][tag] === version) pkg[version].tags.push(tag)
      })
    }
  }
  return merged
}
