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

Web client
----------
We use webpack for development (and webpack-dev-server).

To install, run

    npm install -g webpack webpack-dev-server

Then run `webpack-dev-server --inline` from the `web` directory to serve
files and watch for changes.

Go to `http://localhost:8080` to see the magic.

Protocol
--------
The web client and server talk over web sockets. All of the messages sent back and forth are JSON objects with a property "command" which defines the type of the message. Clients are either "broadcasting clients" (i.e. the person broadcasting the event) or "receiving clients" (i.e. the people consuming a live broadcast).

## Client-to-server commands

### START_BROADCAST

A broadcasting client sends this command to announce the intent to start a live broadcast.

Command properties:
  * id (string): an identifier for the broadcast.

The server will send back a START_BROADCAST_RECEIVED command which is an acknowledgement that the broadast is now live.

### END_BROADCAST

A broadcasting client sends this command to terminate the live broadcast.

Command properties:
  * id (string): an identifier for the broadcast.

The server will send back a END_BROADCAST_RECEIVED command which is an acknowledgement that the broadast is now terminated.

### JOIN_BROADCAST

A receiving client sends this message to announce that they'd like to watch a live broadcast.

Command properties:
  * id (string): an identifier for the broadcast.
  * offer (JSON object): the offer retrieved via RTCPeerConnection.createOffer().

The server will send back a JOIN_BROADCAST_RESPONSE to this command. It will contain the following properties:
  * peer (string): a unique identifier of the remote peer. The client will need to send this ID back to the server for future messages (like ICE_CANDIDATE).
  * answer (JSON object): the answer from a remote peer which will start sending the broadcast.

### LEAVE_BROADCAST

A receiving client sends this message to cleanly exit a broadcast.

Command properties:
  * id (string): an identifier for the broadcast.

The server will send back a LEAVE_BROADCAST command which is an acknowledgement that the broadast has been exited.

### ICE_CANDIDATE

A client (both broadcasting and receiving) sends this message to announce that is has one or more ICE candidates.

Command properties:
  * peer (string): the unique identifier of the remote peer that was provided in the JOIN_BROADCAST_RESPONSE message.
  * candidates (array of JSON objects): the ICE candidates from the RTCPeerConnection.onicecandidate().

The server will send back a ICE_CANDIDATE_RESPONSE to acknowlege that the remote peer has received the candidates.

## Server-to-client commands

### RELAY_BROADCAST

A new listener is attempting to start receiving the broadcast from this client (which could be the oringal broadcasting client or some other client further down the tree).

Command properties:
  * peer (string): a unique identifier of the remote peer. The client will need to send this ID back to the server for future messages (like ICE_CANDIDATE).
  * offer (JSON object): the offer from the remote peer.

The server expects an RELAY_BROADCAST_RECEIVED message in response. It will contain the following properties:
  * peer (string): a unique identifier of the remote peer.
  * answer (JSON object): the answer to send the remote peer obtained via RTCPeerConnection.createAnswer().

### ICE_CANDIDATE

The remote peer is sending one or more ICE candidates.

Command properties:
  * peer (string): the unique identifer of the remote peer providing ICE candidates.
  * candidates (array of JSON objects): the ICE candidates from the remote peer which should be passed to RTCPeerConnection.addIceCandidate().

The server expects an ICE_CANDIDATE_RESPONSE message to acknowledge the receipt of the ICE candidate.
