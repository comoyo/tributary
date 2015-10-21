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
go install github.com/comoyo/tributary/tributary-server
tributary-server
```
