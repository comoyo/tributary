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

    render() {
        let video = (this.state.broadcast) ? <Video /> : null;
        let broadcastText = (this.state.broadcast ? 'Stop' : 'Start') + ' broadcasting';
        return (
            <div>
                <h1>Hi there!</h1>
                <button type='button' onClick={this.toggleBroadcast.bind(this)}>
                    {broadcastText}
                </button>
                {video}
                <Video ref='video' start={this.state.broadcast} />
            </div>
        );
    }
}

ReactDom.render(
    <Entry />,
    document.getElementById('content'));
