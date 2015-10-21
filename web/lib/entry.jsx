import React from "react";
import ReactDom from "react-dom";

let constraints = {
    audio: false,
    video: {
        mandatory: { maxWidth: 480, maxHeight: 320 }
    }
};

navigator.mediaDevices.getUserMedia(constraints)
.then(function(stream) {
    var vid = document.createElement("video");
    document.getElementById('content').appendChild(vid);
    vid.autoplay = true;
    vid.srcObject = stream;
})
.catch(function(err) {
    console.log('Ohz noez', err);
})

ReactDom.render(
    <h1>Hi there</h1>,
    document.getElementById('content'));
