npm-search(1) -- List packages matching a filter
======================================

## SYNOPSIS

    npm search [filter]
    
## DESCRIPTION

This command will print to stdout all the versions of a package that
match the given arguments in their name, tags, or description. These
packages are accumulated from packages installed or available in the
registry, with their tags and whether or not they're active and/or
stable.

The filter used represents a Javascript RegExp Object an has all the
features of such. It is case insensitive as well.

To filter a single package or state, you can provide words to filter on
and highlight (if appropriate).  For instance, to see all the
packages relating to irc, you could do this:

    npm search irc

