
module.exports = fixRoot

fixRoot.usage = "sudo npm fix-root"

var prompt = require("./utils/prompt")
  , npm = require("../npm")
  , config = require("./config")
  , promiseChain = require("./utils/promise-chain")
  , ini = require("./utils/ini")

function fixRoot (args, cb) {
  prompts(function (er, conf) {
    Object.keys(conf).forEach(function (k) {
      ini.set(k, conf[k], "global")
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
    if (r.toLowerCase() === "c") r = ini.get(key)
    else if (!r || r.toLowerCase() === "d") r = def
    conf[key] = r
  }}
  promiseChain(function (er) { cb(er, conf) })
    (prompt, ["\nWhere should node modules be stored?\n"
             +"current: "+ini.get("root")+"\n"
             +"a path, C for current, or Enter for default> "
             , "~/.node_libraries"
             ], h("root", "~/.node_libraries"))
    (prompt, ["\nWhere should man pages be stored?\n"
             +"current: "+ini.get("manroot")+"\n"
             +"a path, C for current, or Enter for default> "
             , "~/local/share/man"
             ], h("manroot", "~/local/share/man"))
    (prompt, ["\nWhere should executables be stored?\n"
             +"current: "+ini.get("binroot")+"\n"
             +"a path, C for current, or Enter for default> "
             ,"~/bin"
             ], h("binroot", "~/bin"))
    ()
}