import Peer from './peer';

class Comm {
    constructor(options) {
        this.socket = new WebSocket(options.url);
        this.socket.onerror = e => console.log('WebSocket error', e);
        this.socket.handlers = [];
        this.socket.onmessage = m => {
            this.socket.handlers.forEach(handler => handler(m));
        };
        this.peers = {};
        this.unstablePeers = [];
        this.pendingIceCandidates = [];

        this.socket.handlers.push(m => {
            let data = JSON.parse(m.data);
            if (data) {
                switch (data.command) {
                    case 'RELAY_BROADCAST':
                        this.handleRelayBroadcast(data);
                        break;

                    case 'ICE_CANDIDATES':
                        this.handleIceCandidates(data);
                        break;

                    case 'TREE_STATE_CHANGED':
                        this.handleTreeStateChanged(data);
                        break;
                }
            }
        });
    }

    addUnstablePeer(peer) {
        this.unstablePeers.push(peer);
    }

    removeUnstablePeer(peer) {
        var idx = this.unstablePeers.indexOf(peer);
        if (idx >= 0) {
            console.log('FOUND UNSTABLE PEER, Removing');
            this.unstablePeers.splice(idx, 1);
        } else {
            console.log('UNSTABLE PEER NOT FOUND', peer);
        }
        if (this.unstablePeers.length === 0 && this.pendingIceCandidates.length > 0) {
            console.log('Will try to handle pending ice candidates');
            let pending = this.pendingIceCandidates.splice(0, this.pendingIceCandidates.length);
            pending.forEach(iceData => this.handleIceCandidates(iceData));
        }
    }

    setIncomingVideoStream(stream) { // FIXME don't know where this belongs yet..
        this.stream = stream;
    }

    getPeer(peerId) {
        if (!this.peers[peerId]) {
            console.log('PEER', peerId, 'NOT FOUND. Creating one..');
            this.peers[peerId] = new Peer({ socket: this.socket, remotePeer: peerId });
        }
        return this.peers[peerId];
    }

    getPeerWithConnection(peerId) {
        let peer = this.getPeer(peerId);
        if (!peer.peerConnection) {
            peer.createPeerConnection();
        }
        return peer;
    }

    handleRelayBroadcast(data) {
        console.log('GOT RELAY BROADC', data);
        let peer = this.getPeerWithConnection(data.peer);
        peer.addStream(this.stream);
        let remoteSuccessHandler = () => {
            console.log('Downstream description set. Creating answer');
            peer.peerConnection.createAnswer(answer => {
                peer.peerConnection.setLocalDescription(answer);
                this.socket.send(JSON.stringify({
                    command: 'RELAY_BROADCAST_RECEIVED',
                    peer: data.peer,
                    answer: answer,
                }));
            }, error => console.error('Unable to create answer: ' + JSON.stringify(error)));
        };
        peer.peerConnection.setRemoteDescription(
            new RTCSessionDescription(data.offer),
            remoteSuccessHandler,
            error => console.error('Invalid remote description: ' + JSON.stringify(error))
        );
    }

    handleIceCandidates(data) {
        console.log('GOT ICE CANDIDATES', data);
        if (this.unstablePeers.length) {
            console.log('... BUT POSTPONING IT');
            this.pendingIceCandidates.push(data);
            return;
        }
        let peer = this.getPeerWithConnection(data.peer);
        Promise.all(data.candidates.map(c => {
            return peer.peerConnection.addIceCandidate(new RTCIceCandidate(c));
        })).then(promises => console.log('ICE CANDIDATE RESULT', promises));
        this.socket.send(JSON.stringify({
            command: 'ICE_CANDIDATES_RECEIVED',
            peer: peer.remotePeer,
        }));
    }

    requestResponse(socket, payload) {
        return new Promise(function(resolve, reject) {
            let handler = m => {
                let index = socket.handlers.indexOf(handler);
                socket.handlers.splice(index, 1);
                resolve(JSON.parse(m.data));
            }
            socket.handlers.push(handler);
            socket.send(JSON.stringify(payload));
        });
    }

    startBroadcasting(options) {
        let payload = {
            command: 'START_BROADCAST',
            name: options.name,
            peerName: options.peerName,
        };
        this.requestResponse(this.socket, payload)
            .then(() => console.log('Broadcasting started'))
            .then(() => {
                this.socket.send(JSON.stringify({
                    command: 'SUBSCRIBE_TO_TREE_STATE',
                    name: options.name,
                }));
            });
    }

    handleTreeStateChanged(data) {
        if (this.onTreeStateChanged) {
            this.onTreeStateChanged(data.tree);
        }
    }
}

export default Comm;
