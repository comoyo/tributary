import React from 'react';

let Video = (props) => {
    if (props.stream) {
        let url = (typeof props.stream === 'object')
            ? window.URL.createObjectURL(props.stream)
            : props.stream;
        return <video autoPlay src={url} />;
    }
    return <div></div>;
}

export default Video;
