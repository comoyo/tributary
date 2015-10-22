import Camera from './camera';
import Comm from './comm';
import Peer from './peer';
import React from 'react';
import Tree from './tree.jsx';
import TreeData from './treeData';
import Video from './video.jsx';

let websocketEndpoint = 'ws://' + window.location.host + '/api/ws';

class App extends React.Component {
    constructor(props) {
        super(props);
        let peers = {};
        let camera = new Camera();
        camera.on('stream', this.onCameraStream.bind(this));
        this.state = {
            peers: peers,
            comm: new Comm({ url: websocketEndpoint, peers: peers }),
            camera: camera,
        };
    }

    toggleBroadcast() {
        let notCurrentlyBroadcasting = !this.state.broadcasting;
        let name = this.refs.broadcastName.value;

        let userName = this.refs.user.value;
        if (!userName) {
            alert('Need to specify a user name');
            return;
        }

        if (notCurrentlyBroadcasting && name) {
            this.setState({ broadcasting: true });
            this.state.camera.start();
            this.state.comm.startBroadcasting({ name: name, peerName: userName });
        } else {
            this.setState({ broadcasting: false, stream: null });
            this.state.camera.stop();
        }
    }

    onCameraStream(e) {
        this.setState({ stream: e.stream });
        this.state.comm.setIncomingVideoStream(e.stream);
    }

    toggleJoin() {
        let name = this.refs.broadcastName.value;
        if (!name) {
            alert('Need to specify a broadcast name to watch');
            return;
        }

        let userName = this.refs.user.value;
        if (!userName) {
            alert('Need to specify a user name');
            return;
        }

        let peer = new Peer({
            socket: this.state.comm.socket,
            remotePeer: null,
            onIncomingVideo: stream => {
                this.setState({ stream: stream });
                this.state.comm.setIncomingVideoStream(stream);
            },
        });
        // this.state.peers.push(peer);
        peer.createPeerConnection();
        peer.startWatching({ name: name, peerName: userName });
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
                    <div>
                        <input
                            type='text'
                            ref='broadcastName'
                            placeholder='Broadcast name'>
                        </input>
                        <input
                            type='text'
                            ref='user'
                            placeholder='User name'>
                        </input>
                    </div>
                    <button type='button' onClick={this.toggleBroadcast.bind(this)}>
                        {broadcastText}
                    </button>
                    <span>or</span>
                    <button type='button' onClick={this.toggleJoin.bind(this)}>
                        {watchingText}
                    </button>
                    <Tree data={TreeData} />
                </div>
                <Video stream={this.state.stream} />
            </div>
        );
    }
}

export default App;
