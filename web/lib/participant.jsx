import React from 'react';

class Participant extends React.Component {
    constructor(props) {
        super(props);
        this.state = { offer: {} }; // TODO
    }

    componentWillReceiveProps(props) {
        this.initializeStuff({ stream: props.stream, isBroadcaster: props.isBroadcaster });

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

        if (options.isBroadcaster) {
            if (options.stream) {
                console.log('Adding broadcast stream', options.stream);
                peerConnection.addStream(options.stream);
                peerConnection.createOffer()
                .then(offer => {
                    peerConnection.setRemoteDescription(new RTCSessionDescription(offer), function() {
                        console.log('Remote description set. Creating answer');
                        peerConnection.createAnswer(answer => {
                            peerConnection.setLocalDescription(answer);
                        }, error => {
                          console.log('Unable to create answer: ' + JSON.stringify(error));
                        });
                    }, error => {
                        console.error('Invalid remote description: ' + JSON.stringify(error));
                    });
                });
            }
        } else {
            // TODO
        }

        peerConnection.onaddstream = event => {
            var stream = event.stream;
            if (stream) {
                console.log('Stream added');
                this.setState({ remoteStream: window.URL.createObjectURL(stream) });
            }
        };

        peerConnection.onicecandidate = candidateEvent => {
            var candidate = candidateEvent.candidate;
            if (candidate) {
                console.log('ICE candidate ' + JSON.stringify(candidate));
            }
        };

        peerConnection.oniceconnectionstatechange = event => {
            if (peerConnection.iceConnectionState === 'disconnected') {
                this.hangUp();
            }
        };

        this.setState({ peerConnection: peerConnection });
    }

    render() {
        return (
            <div>Hello</div>
        );
    }
}

export default Participant
