import React from 'react';
import ReactDom from 'react-dom';
import Participant from './participant.jsx';
import Video from './video.jsx';

class Entry extends React.Component {
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
        let newState = !this.state.broadcast;
        this.setState({ broadcast: newState });
    }

    onBroadcast(e) {
        this.setState({ stream: e.stream });
    }

    render() {
        let broadcastText = (this.state.broadcast ? 'Stop' : 'Start') + ' broadcasting';
        let participantProps = {
            isBroadcaster: this.state.broadcast,
            stream: this.state.stream,
        };
        return (
            <div>
                <h1>Hi there!</h1>
                <button type='button' onClick={this.toggleBroadcast.bind(this)}>
                    {broadcastText}
                </button>
                <Video start={this.state.broadcast} onBroadcast={this.onBroadcast.bind(this)}/>
                <Participant {...participantProps} />
            </div>
        );
    }
}

ReactDom.render(<Entry />, document.getElementById('content'));
