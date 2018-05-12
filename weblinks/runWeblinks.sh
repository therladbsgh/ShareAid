#!/bin/bash
python -m SimpleHTTPServer 8000
[[ -x $BROWSER ]] && exec "$BROWSER" localhost://8000/getSharedLinks.html
