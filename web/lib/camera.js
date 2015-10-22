import Emitter from './emitter';

class Camera extends Emitter {
    constructor() {
        super();
    }

    start() {
        let constraints = {
            audio: false,
            video: {
                mandatory: { maxWidth: 480, maxHeight: 320 }
            }
        };

        navigator.mediaDevices.getUserMedia(constraints)
        .then(stream => {
            this.stream = stream;
            this.emit('stream', { stream: stream });
        })
        .catch(err => {
            console.error('Ohz noez', err);
        });
    }

    stop() {
        if (!this.stream) {
            return;
        }
        if (typeof this.stream.removeTrack === 'function') { // MediaStream
            let tracks = this.stream.getTracks();
            for (var i = tracks.length - 1; i >= 0; i--) {
                tracks[i].stop();
                this.stream.removeTrack(tracks[i]);
            };
        } else if (typeof this.stream.stop === 'function') { // LocalMediaStream
            this.stream.stop();
        }
        this.stream = null;
    }
}

export default Camera;
