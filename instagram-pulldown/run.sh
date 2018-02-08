#!/bin/bash

# if too many user names are given, this may break the node.js socket while downloading -> currently don't know why.

username="$1"

node cli.js posts --username $username>$username
exit 0
