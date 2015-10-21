Tributary
=========

This is a prototype of doing live broadcasting using WebRTC.

Server
------

The server is written in Go. To build it check it out under your Go path:
```bash
mkdir -p $GOPATH/src/github.com/comoyo
cd $GOPATH/src/github.com/comoyo
git clone git@github.com:comoyo/tributary.git
```

Install and run the server:
```bash
go get github.com/comoyo/tributary/tributary-server/...
go install github.com/comoyo/tributary/tributary-server
tributary-server
```

## Web client
We use webpack for development (and webpack-dev-server).

To install, run

    npm install -g webpack webpack-dev-server

Then run `webpack-dev-server --inline` from the `web` directory to serve
files and watch for changes.

Go to `http://localhost:8080` to see the magic.
