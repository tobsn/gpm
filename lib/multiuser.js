
module.exports = multiuser

multiuser.usage = "sudo npm multiuser"

var prompt = require("./utils/prompt")
  , npm = require("../npm")
  , config = require("./config")
  , promiseChain = require("./utils/promise-chain")
  , ini = require("./utils/ini")

function multiuser (args, cb) {
  prompts(function (er, conf) {
    Object.keys(conf).forEach(function (k) {
      if (get(k) !== conf[k]) {
        ini.set(k, conf[k], "global")
      }
    })
    ini.save(cb)
  })
}
function prompts (cb) {
  console.log(["Welcome to the npm root fixing tool"
              ,"This is for server admins to set up configurations so that"
              ,"their users can run npm without root privileges."
              ,""
              ,"Use '~' to mean 'the user's home directory'."
              ].join("\n"))

  var conf = {}
  function h (key, def) { return function (r) {
    if (r.toLowerCase() === "c") return
    else if (!r || r.toLowerCase() === "d") r = def
    conf[key] = r
  }}
  promiseChain(function (er) { cb(er, conf) })
    (prompt, ["\nWhere should node modules be stored?\n"
             +"This should be in your NODE_PATH.\n"
             +"current: "+get("root")+"\n"
             +"a path, C for current, or Enter for default> "
             , "~/.node_libraries"
             ], h("root", "~/.node_libraries"))
    (prompt, ["\nWhere should man pages be stored?\n"
             +"This should be in your MANPATH.\n"
             +"current: "+get("manroot")+"\n"
             +"a path, C for current, or Enter for default> "
             , "~/local/share/man"
             ], h("manroot", "~/local/share/man"))
    (prompt, ["\nWhere should executables be stored?\n"
             +"This should be in your PATH.\n"
             +"current: "+get("binroot")+"\n"
             +"a path, C for current, or Enter for default> "
             ,"~/bin"
             ], h("binroot", "~/bin"))
    ()
}
function get (k) {
  return unParseField(ini.get(k))
}
function unParseField (f) {
  if (process.env.HOME.substr(-1) === "/") {
    process.env.HOME = process.env.HOME(0, process.env.HOME.length-1)
  }
  if (f.indexOf(process.env.HOME) === 0) {
    f = "~"+f.substr(process.env.HOME.length)
  }
  return f
}
