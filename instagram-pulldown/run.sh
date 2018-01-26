#!/bin/bash

# if too many user names are given, this may break the node.js socket while downloading -> currently don't know why.

username=(add instagram user name here)

for i in ${username[@]}; do
        node cli.js posts --username ${i}>${i}
done
exit 0
