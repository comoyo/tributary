import Tributary from '../../tributary-js/tributary';
import React from 'react';
import Tree from './tree.jsx';
import Video from './video.jsx';
import url from 'url';

const query = url.parse(window.location.toString(), true).query;
const wshost = query.wshost || window.location.host;

class App extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            treeData: {},
        };

        this.tributary = new Tributary({
            url: `ws://${wshost}/api/ws`,
        });
        this.tributary.on('stream', stream => {
            this.setState({ stream });
        });
        this.tributary.on('treestatechanged', tree => {
            this.setState({ treeData: tree });
        });
    }

    toggleBroadcast() {
        let notCurrentlyBroadcasting = !this.state.broadcasting;
        let name = this.refs.broadcastName.value;
        if (!name) {
            alert('Need to specify a broadcast name');
            return;
        }

        let userName = this.refs.user.value;
        if (!userName) {
            alert('Need to specify a user name');
            return;
        }

        if (notCurrentlyBroadcasting && name) {
            let constraints = {
                audio: false,
                video: {
                    mandatory: { maxWidth: 480, maxHeight: 320 }
                }
            };
            this.tributary.startCamera(constraints)
            .then(stream => {
                this.tributary.setStream(stream);
            })
            .then(() => {
                return this.tributary.startBroadcast(name, userName);
            })
            .then(() => {
                return this.tributary.subscribeToTreeChanges(name);
            })
            .then(() => {
                this.setState({ broadcasting: true });
            }, err => {
                console.error(err);
            });
        } else {
            this.setState({ broadcasting: false, stream: null });
            this.tributary.stopCamera();
        }
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

        this.tributary.joinBroadcast(name, userName)
        .catch(err => {
            console.error(err);
        });
    }

    render() {
        let broadcastText = (this.state.broadcasting ? 'Stop' : 'Start') + ' broadcasting';
        let watchingText = (this.state.watching ? 'Leave' : 'Join') + ' broadcast';
        let tree = <Tree data={this.state.treeData} />;
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
                    { this.state.broadcasting && tree }
                </div>
                <Video stream={this.state.stream} />
            </div>
        );
    }
}

export default App;
