import React from 'react';
import Participant from './participant.jsx';
import Video from './video.jsx';

class App extends React.Component {
    constructor(props) {
        super(props);
        this.state = {};

        // TODO: Move, refactor, blah. Just wanted to see a message flowing to the server
        let socket = new WebSocket('ws://127.0.0.1:8081/api/ws');
        socket.onerror = e => console.log('ERR', e);
        socket.onclose = () => console.log('CONN CLOSED');
        socket.onopen = () => {
            console.log('CONN OPEN');
            socket.send(JSON.stringify({ command: 'BROADCAST' }));
        }
        socket.onmessage = m => console.log('CONN MESSAGE', m);
        // TODO end
    }

    toggleBroadcast() {
        let notCurrentlyBroadcasting = !this.state.broadcasting;
        if (notCurrentlyBroadcasting && this.state.broadcastName) {
            this.setState({ broadcasting: true });
        } else {
            this.setState({ broadcasting: false });
        }
    }

    onVideoStream(e) {
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
            watching: this.state.watching,
            stream: this.state.stream,
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
                <Video
                    start={this.state.broadcasting}
                    onVideoStream={this.onVideoStream.bind(this)} />

                <Participant {...participantProps} />
            </div>
        );
    }
}

export default App;
