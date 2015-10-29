import Emitter from './emitter'

class Peer extends Emitter {
    constructor(config) {
        super();
        this._pendingIncomingCandidates = [];
        this._pendingOutgoingCandidates = [];

        this._peerConnection = new RTCPeerConnection({
            optional: [{ RtpDataChannels: false }],
            iceServers: [
                { 'urls': ['stun:stun.l.google.com:19302'] },
                { 'urls': ['stun:stun1.l.google.com:19302'] },
                { 'urls': ['stun:stun2.l.google.com:19302'] },
                { 'urls': ['stun:stun3.l.google.com:19302'] },
                { 'urls': ['stun:stun4.l.google.com:19302'] },
            ].concat(config.iceServers),
        });

        this._peerConnection.onaddstream = e => {
            console.log('TRIBUTARY:PEER:onaddstream');
            // FIXME: the this.stream thing is a hack! Somehow Firefox gets two onaddstream events
            // when Chromse is broadcasting and the second one is bogus.
            if (e.stream && !this.stream) {
                this.stream = e.stream;
                this.emit('stream', e.stream);
            }
        };

        this._peerConnection.onicecandidate = e => {
            console.log('TRIBUTARY:PEER:onicecandidate', e.candidate);
            if (e.candidate) {
                if (this._pendingOutgoingCandidates) {
                    this._pendingOutgoingCandidates.push(e.candidate);
                    return;
                }
                this.emit('icecandidates', [e.candidate]);
            }
        };

        this._peerConnection.oniceconnectionstatechange = e => {
            console.log('TRIBUTARY:PEER:oniceconnectionstatechange', e);
        };
    }

    getOffer() {
        return this._peerConnection.createOffer({
            offerToReceiveVideo: true,
            offerToReceiveAudio: true,
        }).then(offer => {
            console.log('TRIBUTARY:PEER:offer', offer);
            return this._peerConnection.setLocalDescription(offer).then(() => offer);
        });
    }

    setAnswer(answer) {
        return this._peerConnection.setRemoteDescription(new RTCSessionDescription(answer))
        .then(() => {
            const candidates = this._pendingIncomingCandidates;
            this._pendingIncomingCandidates = null;
            this.addIceCandidates(candidates);
        });
    }

    setOffer(offer) {
        return this._peerConnection.setRemoteDescription(new RTCSessionDescription(offer))
        .then(() => {
            return this._peerConnection.createAnswer();
        })
        .then(answer => {
            this._peerConnection.setLocalDescription(answer);
            const candidates = this._pendingIncomingCandidates;
            this._pendingIncomingCandidates = null;
            this.addIceCandidates(candidates);
            return answer;
        });
    }

    addIceCandidates(candidates) {
        if (this._pendingIncomingCandidates) {
            this._pendingIncomingCandidates = this._pendingIncomingCandidates.concat(candidates);
            return;
        }

        candidates.forEach(candidate => {
            console.log('TRIBUTARY:PEER:addIceCandidate', candidate);
            this._peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        });
    }

    addStream(stream) {
        this._peerConnection.addStream(stream);
    }

    removeStream(stream) {
        this._peerConnection.removeStream(stream);
    }

    unblockOutgoingCandidates() {
        this.emit('icecandidates', this._pendingOutgoingCandidates);
        this._pendingOutgoingCandidates = null;
    }

    close() {
        this._peerConnection.close();
    }
}

const TributaryState = {
    READY: 'READY',
    BROADCASTING: 'BROADCASTING',
    LISTENING: 'LISTENING',
    BROADCAST_ENDED: 'BROADCAST_ENDED',
    RECONNECTING: 'RECONNECTING',
};

class Tributary extends Emitter {

    constructor(options) {
        super();
        this.state = TributaryState.READY;
        this._downstreamPeers = {};

        this._responseHandlers = {};

        this._socket = new WebSocket(options.url);
        this._socket.onerror = e => console.error('TRIBUTARY:WebSocket error', e);
        this._socket.onmessage = m => {
            try {
                m = JSON.parse(m.data);
            } catch(e) {
                console.error('TRIBUTARY:invalid JSON', m, e);
                return;
            }

            console.log('TRIBUTARY:message', m);

            // FIXME: not super useful, we need to instead have specific error responses for the various
            // commands.
            if (m.command === 'ERROR') {
                console.error('TRIBUTARY:error', m.message);
                return;
            }

            if (this._responseHandlers[m.command]) {
                this._responseHandlers[m.command].resolve(m);
                delete this._responseHandlers[m.command];
                return;
            }

            const commandName = m.command.toLowerCase().split('_').reduce((result, component) => {
                return result + component.substr(0, 1).toUpperCase() + component.substr(1)
            }, '');

            if (this['on' + commandName]) {
                this['on' + commandName](m);
                return;
            }

            console.warn('TRIBUTARY:unhandled message', m);
        };
    }

    sendAndWait(message) {
        return new Promise((resolve, reject) => {
            this._responseHandlers[message.command + '_RECEIVED'] = {
                resolve,
                reject
            };

            this.send(message);
        });
    }

    send(message) {
        this._socket.send(JSON.stringify(message));
    }

    startCamera(constraints) {
        return navigator.mediaDevices.getUserMedia(constraints);
    }

    stopCamera() {
        if (!this._stream) {
            return;
        }

        if (typeof this._stream.removeTrack === 'function') { // MediaStream
            let tracks = this._stream.getTracks();
            for (let i = tracks.length - 1; i >= 0; i--) {
                tracks[i].stop();
                this._stream.removeTrack(tracks[i]);
            };
        } else if (typeof this._stream.stop === 'function') { // LocalMediaStream
            this._stream.stop();
        }
        this._stream = null;

    }

    setStream(stream) {
        const oldStream = this._stream;
        this._stream = stream;

        for (let peer in this._downstreamPeers) {
            if (oldStream) {
                this._downstreamPeers[peer].removeStream(oldStream);
            }

            if (stream) {
                this._downstreamPeers[peer].addStream(stream);
            }
        }

        this.emit('stream', stream);
    }

    startBroadcast(name, peerName) {
        if (this._state !== TributaryState.READY) {
            return Promise.reject(`Tributary is in an invalid state to start a broadcast (${this._state})`);
        }

        return this.sendAndWait({ command: 'FETCH_CONFIG'})
        .then((config) => {
            this._config = config;
            return this.sendAndWait({
                command: 'START_BROADCAST',
                name,
                peerName,
            });
        })
        .then(() => {
            this._broadcast = name;
            this.state = TributaryState.BROADCASTING;
        });
    }

    endBroadcast() {
        if (this._state !== TributaryState.BROADCASTING) {
            return Promise.reject(`Tributary is in an invalid state to end a broadcast (${this._state})`);
        }

        return this.sendAndWait({
            command: 'END_BROADCAST',
            name: this._broadcast,
        }).then(() => {
            this.state = TributaryState.READY;
        });
    }

    joinBroadcast(name, peerName) {
        if (!(this._state === TributaryState.READY || this._state === TributaryState.RECONNECTING)) {
            return Promise.reject(`Tributary is in an invalid state to join a broadcast (${this._state})`);
        }

        // if we're reconnecting, we'll already have an upstream peer who is now dead to us
        if (this._upstreamPeer) {
            this._upstreamPeer.close();
            this._upstreamPeer = null;
            this.setStream(null);
        }

        return this.sendAndWait({ command: 'FETCH_CONFIG'})
        .then((config) => {
            this._config = config;
        })
        .then(() => {
            this._upstreamPeer = new Peer(this._config);
            return this._upstreamPeer.getOffer()
        })
        .then((offer) => {
            return this.sendAndWait({
                command: 'JOIN_BROADCAST',
                name,
                peerName,
                offer,
            });
        })
        .then(response => {
            this._broadcast = name;
            this._peerName = peerName;
            this.state = TributaryState.LISTENING;
            this._upstreamPeerId = response.peer;
            this._upstreamPeer.on('icecandidates', candidates => {
                this.send({
                    command: 'ICE_CANDIDATES',
                    peer: this._upstreamPeerId,
                    candidates,
                });
            });
            this._upstreamPeer.unblockOutgoingCandidates();
            this._upstreamPeer.on('stream', stream => this.setStream(stream));
            return this._upstreamPeer.setAnswer(response.answer);
        })
    }

    leaveBroadcast() {
        if (this._state === TributaryState.BROADCAST_ENDED) {
            this.state = TributaryState.READY;
            return Promise.resolve();
        }

        if (this._state !== TributaryState.LISTENING) {
            return Promise.reject(`Tributary is in an invalid state to leave a broadcast (${this._state})`);
        }

        if (this.upstreamPeer) {
            this._upstreamPeer.close();
            this._upstreamPeer = null;
        }

        for (let peer in this._downstreamPeers) {
            this._downstreamPeers[peer].close();
        }
        this._downstreamPeers = {};

        return this.sendAndWait({
            command: 'LEAVE_BROADCAST',
            name: this._broadcast,
        }).then(() => {
            this.state = TributaryState.READY;
        });
    }

    subscribeToTreeChanges(name) {
        if (this._state !== TributaryState.BROADCASTING) {
            return Promise.reject(`Tributary is in an invalid state to subscribe to tree changes (${this._state})`);
        }

        return this.sendAndWait({
            command: 'SUBSCRIBE_TO_TREE_STATE',
            name,
        }).then(() => {
            console.log('TRIBUTARY:subscribed to tree state changes');
        });
    }

    unsubscribeFromTreeChanges() {
        if (this._state !== TributaryState.BROADCASTING) {
            return Promise.reject(`Tributary is in an invalid state to  unsubscribe from tree changes (${this._state})`);
        }
    }

    onRelayBroadcast(message) {
        console.log('TRIBUTARY:RELAY_BROADCAST', message);

        const peer = new Peer(this._config);
        this._downstreamPeers[message.peer] = peer;

        peer.addStream(this._stream);
        peer.setOffer(message.offer)
        .then(answer => {
            this.send({
                command: 'RELAY_BROADCAST_RECEIVED',
                peer: message.peer,
                answer,
            });
            peer.on('icecandidates', candidates => {
                this.send({
                    command: 'ICE_CANDIDATES',
                    peer: message.peer,
                    candidates,
                });
            });
            peer.unblockOutgoingCandidates();
        })
        .catch(err => {
            console.log('TRIBUTARY:relay broadcast', err);
        })
    }

    onIceCandidates(message) {
        console.log('TRIBUTARY:ICE_CANDIDATES', message);
        if (message.peer === this._upstreamPeerId) {
            this._upstreamPeer.addIceCandidates(message.candidates);
            return;
        }

        if (!this._downstreamPeers[message.peer]) {
            console.error('TRIBUTARY:unknown peer', message.peer);
            return;
        }

        this._downstreamPeers[message.peer].addIceCandidates(message.candidates);
        this.send({
            command: 'ICE_CANDIDATES_RECEIVED',
            peer: message.peer,
        });
    }

    onBroadcastEnded(message) {
        console.log('TRIBUTARY:BROADCAST_ENDED', message);

        if (this.upstreamPeer) {
            this._upstreamPeer.close();
            this._upstreamPeer = null;
        }

        for (let peer in this._downstreamPeers) {
            this._downstreamPeers[peer].close();
        }
        this._downstreamPeers = {};

        this.setStream(null);

        if (this.state === TributaryState.LISTENING) {
            this.state = TributaryState.BROADCAST_ENDED;
        }
    }

    onReconnectToBroadcast(message) {
        console.log('TRIBUTARY:RECONNECT_TO_BROADCAST', message);
        this.state = TributaryState.RECONNECTING;
        this.joinBroadcast(message.name, this._peerName);
    }

    onTreeStateChanged(message) {
        console.log('TRIBUTARY:TREE_STATE_CHANGED', message);
        this.emit('treestatechanged', message.tree);
    }

    get state() {
        return this._state;
    }

    set state(s) {
        this._state = s;
        this.emit('statechanged', s);
    }
}

Tributary.TributaryState = TributaryState;
export default Tributary
