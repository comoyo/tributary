class Peer {
    constructor(options) {
        var e = new Error();
        console.log('CREATING Peer', e.stack);
        this.socket = options.socket;
        this.peerConnection = null;
        this.pendingIceCandidates = [];
        this.onIncomingVideo = options.onIncomingVideo;
        this.comm = options.comm;
        this.setRemotePeer(options.remotePeer);
    }

    setRemotePeer(peer) {
        console.log('SET REMOTE PEER', peer);
        this.remotePeer = peer;
        if (peer) {
            if (this.comm) {
                this.comm.peers[peer] = this;
                this.comm.removeUnstablePeer(this);
            } else {
                console.log('  DEBUG: Maybe ok, but only if this is a member of app.peers already..');
            }
        } else {
            this.comm.addUnstablePeer(this);
        }
        this.flushIceCandidatesIfPossible();
    }

    flushIceCandidatesIfPossible() {
        console.log('FLUSH', this.remotePeer, this.pendingIceCandidates.length);
        if (this.remotePeer && this.pendingIceCandidates.length) {
            let candidates = this.pendingIceCandidates;
            this.pendingIceCandidates = [];
            this.requestResponse(this.socket, {
                command: 'ICE_CANDIDATES',
                peer: this.remotePeer,
                candidates: candidates,
            }).then(() => console.log('Sent ICE candidate to', this.remotePeer));
        }
    }

    createPeerConnection() {
        var e = new Error();
        console.log('CREATING RTCPeerConnection', e.stack);
        var peerConnection = new RTCPeerConnection({
            optional: [{ RtpDataChannels: false }],
            iceServers: [
                {
                    url: 'turn:ec2-52-17-229-249.eu-west-1.compute.amazonaws.com:3478',
                    urls: ['turn:ec2-52-17-229-249.eu-west-1.compute.amazonaws.com:3478'],
                    username: 'test',
                    credential: 'bullshit',
                },
                // {
                //     'url': 'stun:stun.l.google.com:19302',
                //     'urls': ['stun:stun.l.google.com:19302']
                // },
                // {
                //     'url': 'stun:stun1.l.google.com:19302',
                //     'urls': ['stun:stun1.l.google.com:19302']
                // },
                // {
                //     'url': 'stun:stun2.l.google.com:19302',
                //     'urls': ['stun:stun2.l.google.com:19302']
                // },
                // {
                //     'url': 'stun:stun3.l.google.com:19302',
                //     'urls': ['stun:stun3.l.google.com:19302']
                // },
                // {
                //     'url': 'stun:stun4.l.google.com:19302',
                //     'urls': ['stun:stun4.l.google.com:19302']
                // },
            ],
        });

        peerConnection.onaddstream = e => {
            console.log('ON ADD STREAM', e);
            if (e.stream) {
                this.stream = e.stream;
                if (typeof this.onIncomingVideo === 'function') {
                    this.onIncomingVideo(this.stream);
                }
            }
        };

        peerConnection.onicecandidate = e => {
            console.log('ON ICE', e.candidate);
            if (e.candidate) {
                this.pendingIceCandidates.push(e.candidate);
                this.flushIceCandidatesIfPossible();
            }
        };

        peerConnection.oniceconnectionstatechange = e => {
            console.log('ICE conn state change', e);
        };

        this.peerConnection = peerConnection;
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

    addStream(stream) {
        if (!stream) {
            console.error('No stream to add');
            return;
        }
        console.log('Adding stream', stream);
        this.peerConnection.addStream(stream);
    }

    startWatching(options) {
        console.log('Joining', options.name);
        this.peerConnection.createOffer({
            offerToReceiveVideo: true,
            offerToReceiveAudio: true,
        }).then(offer => {
            console.log('Created offer', offer);
            return this.peerConnection.setLocalDescription(offer).then(() => offer);
        }).then(offer => {
            let payload = {
                command: 'JOIN_BROADCAST',
                name: options.name,
                peerName: options.peerName,
                offer: offer,
            };
            return this.requestResponse(this.socket, payload);
        }).then(data => {
            console.log('Successfully joined', options.name);
            return this.peerConnection.setRemoteDescription(
                new RTCSessionDescription(data.answer),
                () => console.log('Remote description set.'),
                error => console.error('Invalid remote description: ' + JSON.stringify(error))
            ).then(() => data);
        }).then(data => this.setRemotePeer(data.peer))
        .then(() => {
            this.socket.send(JSON.stringify({
                command: 'SUBSCRIBE_TO_TREE_STATE',
                name: options.name,
            }));
        })
        .catch(e => console.log('Unknown error', e));
    }

    stopBroadcasting(options) {
        let payload = {
            command: 'END_BROADCAST',
            name: options.name,
        };
        this.requestResponse(this.socket, payload)
        .then(() => console.log('Stopped broadcasting'));
    }
}

export default Peer;
