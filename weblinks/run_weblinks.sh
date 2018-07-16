#!/bin/bash
yarn && cd client && yarn && cd ..
python -m SimpleHTTPServer 8000 &
yarn dev
