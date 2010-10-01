
// show the installed versions of a package

module.exports = exports = search
var npm = require("../npm")
  , log = require("./utils/log")
  , readInstalled = require("./utils/read-installed")
  , registry = require("./utils/registry")
  , semver = require("./utils/semver")
  , mustache = require("./mustache")

function search (args, cb) {
  readInstalled([], function (er, installed) {
    if (er) return cb(er)
    registry.get(function (er, remote) {
      var pkgs = merge(installed, remote)
      pkgs = Object.keys(pkgs).map(function (pkg) {
        return pkgs[pkg]
      })
      pkgs = filter(pkgs, args)
      var stdout = process.stdout
        , pretty = prettify(pkgs)
      stdout.write(pretty)
      if (stdout.flush()) cb()
      else stdout.on("drain", cb)
    })
  })
}

var testFilters =
  //test name
  { name : function (matcher) {
      function test (pkg) {
        return matcher(pkg.name)
      }
      test.type = 'name'
      return test
    }

  //test for single match tag
  , tag : function (matcher) {
      function test (pkg) {
        var result = (pkg.tags && pkg.tags.filter(matcher))
        return result && result.length
      }
      test.type = 'tag'
      return test
    }

  //test for single match version
  , version : function (matcher) {
      function test (pkg) {
        var result = pkg.versions && pkg.versions.filter(matcher)
        return result && result.length
      }
      test.type = 'version'
      return test
    }

  , latest : function (matcher) {
      function test (pkg) {
        return !!matcher(pkg.latest)
      }
      test.type = 'latest'
      return test
    }

  //test for single match name and email
  , author : function (matcher) {
      function test (pkg) {
        var result = (pkg.maintainers && pkg.maintainers.filter(function (item) {
          return !!( matcher(item.name) || matcher(item.email) )
        }))
        return result && result.length
      }
      test.type = 'author'
      return test
    }

  , installed : function (matcher) {
      function test (pkg) {
        var result = (pkg.installed && pkg.installed.filter(function (version) {
          return matcher(version)
        }))
        return result && result.length
      }
      test.type = 'installed'
      return test
    }

  , stable : function (matcher) {
      function test (pkg) {
        return !!matcher(pkg.stable)
      }
      test.type = 'stable'
      return test
    }

  , description : function (matcher) {
      function test (pkg) {
        return matcher(pkg.description)
      }
      test.type = 'description'
      return test
    }

  , modified : function (matcher) {
      function test (pkg) {
        return matcher(pkg.mtime)
      }
      test.type = 'modified'
      return test
    }

  , created : function (matcher) {
      function test (pkg) {
        return matcher(pkg.ctime)
      }
      test.type = 'created'
      return test
    }
  }

testFilters['@stable'] = testFilters['stable']
testFilters['@latest'] = testFilters['latest']
testFilters['@active'] = testFilters['active']


function filter (pkgs, args) {
  var filtered_pkgs = []
    , tests = []
  args.forEach(function (arg) {
    // key, then optionally comparator and 0 or more chars of value.
    // only capture the key, comparator, and value.
    // comparator is one of: !=, ==, <, >, <=, >=
    var parts = arg.match(/^([a-zA-Z_-]+?)(?:(!=|[<>=]=?)(.*))?$/)
    if (parts) {
      var key = parts[1].toLowerCase()
        , modifier = parts[2]
        , matcher = parts[3] ? compileMatcher(modifier, parts[3])
                             : function (item) { return !!item }
      if (testFilters[key]) tests.push(testFilters[key](matcher))
    }
  })
  pkgs.forEach(function (pkg) {
    var matches = {}
      , count = 0
      , valid = true
    tests.forEach(function (test){
      if (test(pkg)) {
        matches[test.type] = matches[test.type] || 1
      } else {
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
function compileMatcher (modifier, pattern) {
  //semver
  if (semver.valid(pattern)) {
    switch (modifier) {
      case '!=': return function (str) {
        return str !== pattern
      }
      case '=' :
      case '>' :
      case '<' : 
      case '<=': 
      case '>=': return function (str) {
        return semver.satisfies(str, modifier+pattern)
      }
    }
  }
  //number
  else if (!isNaN(pattern)) {
    pattern = Number(pattern)
    switch (modifier) {
      case '=' : return function (str) { return str === pattern }
      case '!=': return function (str) { return str !== pattern }
      case '<' : return function (str) { return str < pattern }
      case '>' : return function (str) { return str > pattern }
      case '<=': return function (str) { return str >= pattern }
      case '>=': return function (str) { return str <= pattern }
    }
  }
  //date
  else if (!isNaN(Date.parse(pattern))) {
    pattern = Date.parse(pattern)
    switch (modifier) {
      case '=' : return function (str) {
        return !isNaN(Date.parse(str)) && Date.parse(str) === pattern
      }
      case '!=': return function (str) {                  
        return !isNaN(Date.parse(str)) && Date.parse(str) !== pattern
      }
      case '<=': return function (str) {                  
        return !isNaN(Date.parse(str)) && Date.parse(str) >= pattern
      }
      case '>=': return function (str) {                  
        return !isNaN(Date.parse(str)) && Date.parse(str) <= pattern
      }
      case '<' : return function (str) {                  
        return !isNaN(Date.parse(str)) && Date.parse(str) < pattern
      }
      case '>' : return function (str) {                  
        return !isNaN(Date.parse(str)) && Date.parse(str) > pattern
      }
    }
  }
  //pattern
  else if ( pattern && pattern.charAt(0) === '/' && pattern.slice(-1) === '/') {
    pattern = RegExp(pattern.slice(1,-1),'gi')
    switch (modifier) {
      case '=' : return function (str) {
        return str.match(pattern)
      }
      case '!=': return function (str) {
        return !str.match(pattern)
      }
      default  : return function () { return false }
    }
  }
  //string
  else {
    if ( pattern && (pattern.charAt(0) == '"' && pattern.slice(-1) == '"'
      || pattern.charAt(0) == '"' && pattern.slice(-1) == '"')
      ) {
      pattern = pattern.slice(1,-1)
    }
    switch (modifier) {
      case '=' : return function (str) { return str === pattern }
      case '!=': return function (str) { return str !== pattern }
      case '>' : return function (str) { return str > pattern }
      case '<' : return function (str) { return str < pattern }
      case '<=': return function (str) { return str <= pattern }
      case '>=': return function (str) { return str >= pattern }
    }
  }
}

var formats =
    { terse : "{{name}}"
            + "{{#isInstalled}} "
              + "installed@{{#installed[0..-1]}}{{.}},{{/installed}}"
              + "{{#installed[-1]}}{{.}}{{/installed}}"
              + "{{#active}} active@{{active}}{{/active}}"
            + "{{/isInstalled}}"
            + "{{#latest}} latest@{{latest}}{{/latest}}"
    , list : "{{name}}"
           + "{{#isInstalled}} "
             + "installed@{{#installed[0..-1]}}{{.}}, {{/installed}}"
             + "{{#installed[-1]}}{{.}}{{/installed}}"
             + "{{#active}} active@{{active}}{{/active}}"
           + "{{/isInstalled}}"
           + "{{#isStable}} stable@{{stable}}{{/isStable}}"
           + "{{#latest}} latest@{{latest}}{{/latest}}"
           + "{{#isRemote}} "
             + "remote@{{#remote[0..-1]}}{{.}}, {{/remote}}"
             + "{{#remote[-1]}}{{.}}{{/remote}}"
           + "{{/isRemote}}"
    , verbose : "{{name}} "
              + "by{{#maintainers}} {{name}}({{email}}){{/maintainers}}"
              + "{{#isInstalled}} \n"
                + "installed@{{#installed[0..-1]}}{{.}},{{/installed}}"
                + "{{#installed[-1]}}{{.}}{{/installed}}"
                + "{{#active}} \nactive@{{active}}{{/active}}"
              + "{{/isInstalled}}"
              + "{{#isStable}} \nstable@{{stable}}{{/isStable}} "
              + "\033[m \ndescription: {{description}}"
              + " \n----"
    }
  , orderby =
    { name : function (mp1, mp2) {
        var n1 = mp1[1].name.toLowerCase()
          , n2 = mp2[1].name.toLowerCase()
        return n1 === n2 ? 0
             : n1 > n2 ? 1
             : -1
      }
    , installed : function (mp1, mp2) {
        return mp1[1].installed && mp2[1].installed ? 0
             : mp1[1].installed ? -1
             : 0
      }
    , active : function (mp1, mp2) {
        return mp1[1].active && mp1[1].active ? 0
             : mp1[1].active ? -1
             : 1
      }
    , stable : function (mp1, mp2) {
        return mp1[1].stable && mp2[1].stable ? 0
             : mp1[1].stable ? -1
             : 1
      }
    , created : function (mp1, mp2) {
        var d1 = Date.parse(mp1[1].ctime)
          , d2 = Date.parse(mp1[1].ctime)
        return d1 === d2 ? 0
             : d1 > d2 ? 1
             : -1
      }
    }

function prettify (matches_and_pkgs) {
  var ordering = (npm.config.get("orderby") || "name").split(",").reverse()
    , sorters = []
  for (var i = 0, l = ordering.length; i < l; i++) {
    var order = ordering[i]
      , reverse = order.slice(-8)=="-reverse"
    if (reverse) {
      var toReverseSorter = orderby[order.slice(0,-8)]
      sorters.unshift(function (a, b) {
        return toReverseSorter(a,b)*-1
      })
    } else sorters.unshift(orderby[order])
  }

  matches_and_pkgs.sort(function (a, b) {
    for (var i = 0; i < sorters.length; i++) {
      var sorter = sorters[i]
        , result = sorter(a,b)
      if (result != 0) return result
    }
    return 0
  })
  var pretty = matches_and_pkgs.map(function (pkg) {
    pkg = pkg[1]
    var fmt = npm.config.get("format")
      || npm.config.get("verbose") && "verbose"
      || "terse"
    if (formats[fmt]) fmt = formats[fmt]
    return mustache.to_html(fmt, pkg)
  })
  if (!pretty.length) pretty = ["Nothing found"]
  pretty.push("")
  return pretty.join("\n")
}


function merge (installed, remote) {
  var merged = {}
  // first, just copy the installed stuff
  Object.keys(installed).forEach(function (packageName) {
    var pkg = merged[packageName] =
      { isInstalled : true
      , installed : Object.keys(installed[packageName])
      }
    Object.keys(installed[packageName]).forEach(function (version) {
      pkg[version] = { installed : true, tags : [] }
      if (installed[packageName][version].active) {
        pkg.active = version
      }
      Object.keys(installed[packageName][version]).forEach(function (tag) {
        pkg[version][tag] = installed[packageName][version][tag]
      })
    })
  })
  // now merge in the remote stuff.
  Object.keys(remote).forEach(function (packageName) {
    var pkg = merged[packageName] = merged[packageName] || {}
    pkg.isRemote = true
    pkg.remote = []
    pkg.latest = remote[packageName]["dist-tags"].latest
    for (var property in remote[packageName]) {
      switch (property) {
        case 'versions': break
        default: pkg[property] = remote[packageName][property]
      }
    }
    Object.keys(remote[packageName].versions).forEach(function (version) {
      pkg.remote.push(version)
      pkg[version] = pkg[version] || {}
      pkg[version].remote = true
      if (remote[packageName]["dist-tags"].stable === version) {
        pkg[version].stable = true
        pkg.isStable = true
        pkg.stable = version
      }
      pkg[version].tags = []
      Object.keys(remote[packageName]["dist-tags"]).forEach(function (tag) {
        if (remote[packageName]["dist-tags"][tag] === version) pkg[version].tags.push(tag)
      })
    })
  })
  return merged
}
