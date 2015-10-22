import Camera from './camera.jsx';
import Comm from './comm';
import Peer from './peer';
import React from 'react';
import Video from './video.jsx';

class App extends React.Component {
    constructor(props) {
        super(props);
        let peers = {};
        this.state = {
            peers: peers,
            comm: new Comm({ url: 'ws://localhost:8081/api/ws', peers: peers }),
        };
    }

    toggleBroadcast() {
        let notCurrentlyBroadcasting = !this.state.broadcasting;
        let name = this.refs.broadcastName.value;
        if (notCurrentlyBroadcasting && name) {
            this.setState({ broadcasting: true });
            this.state.comm.startBroadcasting({ name: name });
        } else {
            this.setState({ broadcasting: false });
        }
    }

    onCameraStream(e) {
        this.setState({ stream: e.stream });
    }

    toggleJoin() {
        let name = this.refs.broadcastName.value;
        if (!name) {
            alert('Need to specify a broadcast name to watch');
            return;
        }
        let peer = new Peer({ socket: this.state.comm.socket, remotePeer: null });
        // this.state.peers.push(peer);
        peer.createPeerConnection();
        peer.startWatching({ name: name });
    }

    render() {
        let broadcastText = (this.state.broadcasting ? 'Stop' : 'Start') + ' broadcasting';
        let watchingText = (this.state.watching ? 'Leave' : 'Join') + ' broadcast';
        let participantProps = {
            broadcasting: this.state.broadcasting,
            broadcastName: this.state.broadcastName,
            socket: this.state.socket,
            stream: this.state.stream,
            watching: this.state.watching,
        };
        return (
            <div>
                <h1>Hi there!</h1>
                <div>
                    <input
                        type='text'
                        ref='broadcastName'
                        placeholder='Broadcast name'>
                    </input>
                </div>
                <button type='button' onClick={this.toggleBroadcast.bind(this)}>
                    {broadcastText}
                </button>
                <span>or</span>
                <button type='button' onClick={this.toggleJoin.bind(this)}>
                    {watchingText}
                </button>
                <Camera
                    start={this.state.broadcasting}
                    onCameraStream={this.onCameraStream.bind(this)} />

                <Video stream={this.state.stream} />
            </div>
        );
    }
}

export default App;
