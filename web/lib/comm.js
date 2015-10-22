import Peer from './peer';

class Comm {
    constructor(options) {
        this.socket = new WebSocket(options.url);
        this.socket.onerror = e => console.log('WebSocket error', e);
        this.socket.handlers = [];
        this.socket.onmessage = m => {
            this.socket.handlers.forEach(handler => handler(m));
        };
        this.peers = options.peers;

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
                }
            }
        });
    }

    setIncomingVideoStream(stream) { // FIXME don't know where this belongs yet..
        this.stream = stream;
    }

    getPeer(peerId) {
        if (!this.peers[peerId]) {
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
        let peer = this.getPeerWithConnection(data.peer);
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
        let peer = this.getPeerWithConnection(data.peer);
        data.candidates.forEach(c => {
            peer.peerConnection.addIceCandidate(new RTCIceCandidate(c))
        });
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
        };
        this.requestResponse(this.socket, payload).then(() => console.log('Broadcasting started'));
    }
}

export default Comm;
