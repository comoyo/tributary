#!/bin/bash

echo 'Running webpack. Hold on...'
webpack $*

rm -rf ../tributary-server/static
mkdir ../tributary-server/static
mkdir ../tributary-server/static/lib
cp -r bundle.js bundle.js.map css images index.html ../tributary-server/static/
cp ./lib/adapter.js ../tributary-server/static/lib

echo 'All done'
