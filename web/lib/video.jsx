import React from "react";

class Video extends React.Component {
    constructor(props) {
        super(props);
        this.state = {};
        if (this.props.start) {
            this.initVideo();
        }
    }

    initVideo() {
        let constraints = {
            audio: false,
            video: {
                mandatory: { maxWidth: 480, maxHeight: 320 }
            }
        };

        navigator.mediaDevices.getUserMedia(constraints)
        .then(stream => {
            this.setState({ stream: stream, started: true });
            this.props.onVideoStream({ stream: stream });
        })
        .catch(err => {
            console.error('Ohz noez', err);
        });
    }

    closeVideo() {
        if (!this.state.stream) {
            return;
        }
        if (typeof this.state.stream.removeTrack === 'function') { // MediaStream
            let tracks = this.state.stream.getTracks();
            for (var i = tracks.length - 1; i >= 0; i--) {
                tracks[i].stop();
                this.state.stream.removeTrack(tracks[i]);
            };
        } else if (typeof this.state.stream.stop === 'function') { // LocalMediaStream
            this.state.stream.stop();
        }
        this.setState({ stream: null, started: false });
        this.props.onVideoStream({ stream: null });
    }

    componentWillReceiveProps(newProps) {
        if (newProps.start) {
            if (!this.state.started) {
                this.initVideo();
            }
        } else {
            this.closeVideo();
        }
    }

    render() {
        let video;
        if (this.state.stream) {
            let videoSrcUrl = window.URL.createObjectURL(this.state.stream);
            video = <video autoPlay src={videoSrcUrl}></video>
        }
        return (
            <div>{video}</div>
        );
    }
}

export default Video;
