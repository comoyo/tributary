import React from 'react';

function RequestResponse(socket, payload) {
    return new Promise(function(resolve, reject) {
        let handler = m => {
            let index = socket.handlers.indexOf(handler);
            socket.handlers.splice(index, 1);
            resolve(m.data);
        }
        socket.handlers.push(handler);
        socket.send(JSON.stringify(payload));
    });
}

class Participant extends React.Component {
    constructor(props) {
        super(props);
        this.state = {};
    }

    componentWillReceiveProps(props) {
        this.initializeStuff({ stream: props.stream, broadcasting: props.broadcasting });
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
                    id: this.props.broadcastName,
                };
                RequestResponse(this.props.socket, broadcast)
                .then(() => this.setState({ broadcasting: true }));
                // peerConnection.createOffer()
                // .then(offer => {

                //     peerConnection.setRemoteDescription(new RTCSessionDescription(offer), function() {
                //         console.log('Remote description set. Creating answer');
                //         peerConnection.createAnswer(answer => {
                //             peerConnection.setLocalDescription(answer);
                //         }, error => {
                //           console.log('Unable to create answer: ' + JSON.stringify(error));
                //         });
                //     }, error => {
                //         console.error('Invalid remote description: ' + JSON.stringify(error));
                //     });
                // });
            }
        } else if (options.watching) {
            console.log('Joining');
        } else if (this.state.broadcasting) {
            let payload = {
                command: 'END_BROADCAST',
                id: this.props.broadcastName,
            };
            RequestResponse(this.props.socket, payload)
            .then(() => this.setState({ broadcasting: false }));
        }

        peerConnection.onaddstream = e => {
            var stream = e.stream;
            if (stream) {
                console.log('Stream added');
                this.setState({ remoteStream: window.URL.createObjectURL(stream) });
            }
        };

        peerConnection.onicecandidate = e => {
            var candidate = e.candidate;
            if (candidate) {
                console.log('ICE candidate ' + JSON.stringify(candidate));
            }
        };

        peerConnection.oniceconnectionstatechange = e => {
            console.log('ICE conn state change', e);
        };

        this.setState({ peerConnection: peerConnection });
    }

    render() {
        return (
            <div>Hello {this.state.broadcasting} {this.state.watching}</div>
        );
    }
}

export default Participant
