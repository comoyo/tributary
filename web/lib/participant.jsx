import React from 'react';

function RequestResponse(socket, payload) {
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

class Participant extends React.Component {
    constructor(props) {
        super(props);
        this.state = {};
        this.props.socket.handlers.push(m => {
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

    handleRelayBroadcast(data) {
        this.state.peerConnection.setRemoteDescription(
            new RTCSessionDescription(data.offer),
            () => {
                console.log('Downstream description set. Creating answer');
                this.state.peerConnection.createAnswer(answer => {
                    this.state.peerConnection.setLocalDescription(answer);
                    this.props.socket.send(JSON.stringify({
                        command: 'RELAY_BROADCAST_RECEIVED',
                        peer: data.peer,
                        answer: answer,
                    }));
                }, error => {
                  console.error('Unable to create answer: ' + JSON.stringify(error));
                });
            }, error => {
                console.error('Invalid remote description: ' + JSON.stringify(error));
            }
        );
        this.setState({ peer: data.peer });
    }

    handleIceCandidates(data) {
        let pc = this.state.peerConnection;
        data.candidates.forEach(c => pc.addIceCandidate(new RTCIceCandidate(c)));
        this.props.socket.send(JSON.stringify({ command: 'ICE_CANDIDATES_RECEIVED' }));
    }

    componentWillReceiveProps(props) {
        this.initializeStuff({ ...props });
    }

    initializeStuff(options) {
        var peerConnection = new RTCPeerConnection({
            optional: [{ RtpDataChannels: false }],
            iceServers: [
                { 'urls': ['stun:stun.l.google.com:19302'] },
                { 'urls': ['stun:stun1.l.google.com:19302'] },
                { 'urls': ['stun:stun2.l.google.com:19302'] },
                { 'urls': ['stun:stun3.l.google.com:19302'] },
                { 'urls': ['stun:stun4.l.google.com:19302'] },
            ],
        });

        if (options.broadcasting) {
            if (options.stream) {
                console.log('Adding broadcast stream', options.stream);
                peerConnection.addStream(options.stream);
                let broadcast = {
                    command: 'START_BROADCAST',
                    name: this.props.broadcastName,
                };
                RequestResponse(this.props.socket, broadcast)
                .then(() => this.setState({ broadcasting: true }));
            }
        } else if (options.watching) {
            console.log('Joining', this.props.broadcastName);
            peerConnection.createOffer({
                offerToReceiveVideo: true,
                offerToReceiveAudio: true,
            }).then(offer => {
                console.log('Created offer', offer);
                this.state.peerConnection.setLocalDescription(offer);

                let payload = {
                    command: 'JOIN_BROADCAST',
                    name: this.props.broadcastName,
                    offer: offer,
                };
                RequestResponse(this.props.socket, payload)
                .then((data) => {
                    console.log('Successfully joined', this.props.broadcastName);

                    this.state.peerConnection.setRemoteDescription(
                        new RTCSessionDescription(data.answer),
                        () => {
                            console.log('Remote description set.');
                        }, error => {
                            console.error('Invalid remote description: ' + JSON.stringify(error));
                        }
                    );

                    this.setState({ watching: true, peer: data.peer });
                });
            }).catch(e => console.log('NOZ', e));
        } else if (this.state.broadcasting) {
            let payload = {
                command: 'END_BROADCAST',
                name: this.props.broadcastName,
            };
            RequestResponse(this.props.socket, payload)
            .then(() => this.setState({ broadcasting: false }));
        }

        peerConnection.onaddstream = e => {
            var stream = e.stream;
            if (stream) {
                this.setState({ remoteStream: window.URL.createObjectURL(stream) });
            }
        };

        peerConnection.onicecandidate = e => {
            var candidate = e.candidate;
            if (candidate) {
                RequestResponse(this.props.socket, {
                    command: 'ICE_CANDIDATES',
                    peer: this.state.peer,
                    candidates: [candidate],
                }).then(() => console.log('Sent ICE candidate to', this.state.peer));
            }
        };

        peerConnection.oniceconnectionstatechange = e => {
            console.log('ICE conn state change', e);
        };

        this.setState({ peerConnection: peerConnection });
    }

    render() {
        let video = (this.state.remoteStream)
            ? <video autoPlay src={this.state.remoteStream} />
            : null;
        return (
            <div>Hello {video}</div>
        );
    }
}

export default Participant
