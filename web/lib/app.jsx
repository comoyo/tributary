import Camera from './camera.jsx';
import React from 'react';
import Participant from './participant.jsx';

class App extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            socket: new WebSocket('ws://localhost:8081/api/ws'),
        };
        this.state.socket.onerror = e => console.log('WebSocket error', e);
        this.state.socket.handlers = [];
        this.state.socket.onmessage = m => {
            this.state.socket.handlers.forEach(handler => handler(m));
        };
    }

    toggleBroadcast() {
        let notCurrentlyBroadcasting = !this.state.broadcasting;
        if (notCurrentlyBroadcasting && this.state.broadcastName) {
            this.setState({ broadcasting: true });
        } else {
            this.setState({ broadcasting: false });
        }
    }

    onCameraStream(e) {
        this.setState({ stream: e.stream });
    }

    onBroadcastName(e) {
        this.setState({ broadcastName: e.currentTarget.value });
    }

    toggleJoin() {
        this.setState({ watching: !this.state.watching });
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
                        placeholder='Broadcast name'
                        onChange={this.onBroadcastName.bind(this)}>
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

                <Participant {...participantProps} />
            </div>
        );
    }
}

export default App;
