import RaisedButton from 'material-ui/lib/raised-button';
import React from 'react';
import TextField from 'material-ui/lib/text-field';
import Tree from './tree.jsx';
import Tributary from '../../tributary-js/tributary';
import Video from './video.jsx';
import url from 'url';

const query = url.parse(window.location.toString(), true).query;
const wshost = query.wshost || window.location.host;

class App extends React.Component {
    constructor(props) {
        super(props);

        this.tributary = new Tributary({
            url: `ws://${wshost}/api/ws`,
        });
        this.tributary.on('stream', stream => {
            this.setState({ stream });
        });
        this.tributary.on('treestatechanged', tree => {
            const nodes = [{
                id: tree.id,
                label: tree.name,
                color: {
                    background: '#ff0000',
                    border: '#ff0000',
                },
                font: {
                    color: '#ffffff',
                }
            }];

            const edges = [];

            const addNode = node => {
                if (!node.children) {
                    return
                }

                node.children.forEach(child => {
                    nodes.push({ id: child.id, label: child.name });
                    edges.push({ from: child.id, to: node.id });
                    addNode(child);
                });
            }

            addNode(tree);
            this.setState({ treeData: { nodes, edges } });
        });
        this.tributary.on('statechanged', state => {
            this.setState({ tributaryState: state });
        });
        this.state = {
            treeData: { nodes: [], edges: [] },
            tributaryState: this.tributary.state,
        };
    }

    startBroadcast() {
        let name = this.refs.broadcastName.getValue();
        if (!name) {
            alert('Need to specify a broadcast name');
            return;
        }

        let userName = this.refs.user.getValue();
        if (!userName) {
            alert('Need to specify a user name');
            return;
        }

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
        .then(() => this.setState({ broadcast: name }), err => {
            console.error(err);
        });
    }

    endBroadcast() {
        this.tributary.stopCamera();
        this.tributary.endBroadcast();
    }

    joinBroadcast() {
        let name = this.refs.broadcastName.getValue();
        if (!name) {
            alert('Need to specify a broadcast name to watch');
            return;
        }

        let userName = this.refs.user.getValue();
        if (!userName) {
            alert('Need to specify a user name');
            return;
        }

        this.tributary.joinBroadcast(name, userName)
        .then(() => this.setState({ broadcast: name }), err => {
            console.error(err);
        });
    }

    leaveBroadcast() {
        this.tributary.leaveBroadcast();
    }

    render() {
        const video = this.state.tributaryState === Tributary.TributaryState.READY
            ? <div><img src="images/tributary.png" /></div>
            : <Video stream={this.state.stream} />;
        const tree = <div id="tree-container"><Tree graph={this.state.treeData} /></div>;
        return (
            <div>
                <div id="container">
                    <div id="video-and-controls">
                        <div id="video-container">
                            {video}
                        </div>
                        {this.getControls()}
                    </div>
                </div>
                { this.state.tributaryState === Tributary.TributaryState.BROADCASTING && tree }
            </div>
        )
    }

    getControls() {
        if (this.state.tributaryState === Tributary.TributaryState.READY) {
            return (
                <div id="controls">
                    <TextField
                        ref="broadcastName"
                        hintText="Name of broadcast" />
                    <TextField
                        ref="user"
                        hintText="Your name"
                        style={{ marginLeft: 15 }}/>
                    <RaisedButton
                        label="Start Broadcast"
                        secondary={true}
                        style={{ marginLeft: 15 }}
                        onClick={e => this.startBroadcast(e)}/>
                    <RaisedButton
                        label="Join Broadcast"
                        style={{ marginLeft: 15 }}
                        onClick={e => this.joinBroadcast(e)}/>
                </div>
            );
        } else if (this.state.tributaryState === Tributary.TributaryState.BROADCASTING) {
            return (
                <div id="controls">
                    <div className="control-title">Broadcasting to <span className="control-broadcast">{this.state.broadcast}</span></div>
                    <RaisedButton
                        label="End Broadcast"
                        primary={true}
                        onClick={e => this.endBroadcast(e)}/>
                </div>
            );
        } else {

            let title = '';
            switch (this.state.tributaryState) {
                case Tributary.TributaryState.BROADCAST_ENDED:
                    title = 'Broadcast ended on';
                    break;
                case Tributary.TributaryState.RECONNECTING:
                    title = 'Reconnecting to';
                    break;
                default:
                    title = 'Receiving from';
            }

            return (
                <div id="controls">
                    <div className="control-title">{title} <span className="control-broadcast">{this.state.broadcast}</span></div>
                    <RaisedButton
                        label="Leave Broadcast"
                        primary={true}
                        onClick={e => this.leaveBroadcast(e)}/>
                </div>
            );
        }
    }
}

export default App;
