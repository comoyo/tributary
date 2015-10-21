import React from 'react';
import ReactDom from 'react-dom';
import Video from './video.jsx';

class Entry extends React.Component {
    constructor(props) {
        super(props);
        this.state = {};
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
            </div>
        );
    }
}

ReactDom.render(<Entry />, document.getElementById('content'));
