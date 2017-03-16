let host = "ws://" + location.hostname + ":7787/";
let video = null;
let voice = false;
let nomesync = false;
let timedifference = false;

let client = new WebSocket(host, "irc");


syncRemote = function ( currentSrc, currentTime, paused, ended, seeking, hardsync ) {
  currentSrc = currentSrc || video.currentSrc;
  currentTime = currentTime || video.currentTime;
  paused = paused || video.paused;
  ended = ended || video.ended;
  seeking = seeking || video.seeking;
  hardsync = hardsync || false;

  if ( voice.checked === true ) {

    let data = JSON.stringify({
      currentSrc: currentSrc,
      currentTime: currentTime,
      paused: paused,
      ended: ended,
      seeking: seeking,
      hardsync: hardsync
    });

    client.send(data); 

  }
}



syncMe = function(event) {
  if ( nomesync.checked === false ) {
    let data = JSON.parse(event.data);

    voice.checked = false;

    if ( video.src !== data.currentSrc ) {
      video.src = data.currentSrc;
    }

    if ( video.paused !== data.paused ) {
      if ( data.paused === true ) {
        video.pause()
      }
      else {
        video.play()
      }
    }

    if ( data.seeking === true || data.hardsync === true || Math.abs(video.currentTime - data.currentTime) >= timedifference.value ) {
      console.log("- syncMe (DEBUG): hardsynced!")
      video.currentTime = data.currentTime;
      return;
    }

    if ( data.ended === true ) {
      console.log("VIDEO ENDED");
    }
  }

  return;
}




setSource = function() {
  video.src = source.value;
}



document.addEventListener("DOMContentLoaded", function() {
  video = document.querySelector("#video");
  source = document.querySelector("#source");
  voice = document.querySelector("#voice");
  nomesync = document.querySelector("#nomesync");
  set = document.querySelector("#set");
  timedifference = document.querySelector("#timedifference");

  video.src = source.value;


  let syncInterval = setInterval(function() {
    syncRemote();
  }, 5000);


  client.onopen = function(event) {
    client.onmessage = function( event ) {
      if (event.data[0] === "{") {
        syncMe(event);
      } else {
        //TODO: Pong from server
        console.log("Pong: ", event.data);
      }
    }
  }


  video.onseeking = function() {
    syncRemote(
      currentSrc = null,
      currentTime = null,
      paused = null,
      ended = null,
      seeking = null,
      hardsync = true
    );
  }


  video.onplay = function() {
    syncRemote();
  }


  video.onpause = function() {
    syncRemote(
      currentSrc = null,
      currentTime = null,
      paused = null,
      ended = null,
      seeking = null,
      hardsync = true
    );
  }


  video.onclick = function() {
    if ( video.paused === true ) {
      video.play();
    }
    else {
      video.pause();
    }
  }

  /*let elements = Object.keys(document.querySelectorAll("*"));
  for ( let key of elements) {
    let element = elements[key];
    if ( element.type !== "text" ) {
      console.log('asdasdasd')
      element.onkeyup = function(event) {
        switch ( event.key.toUpperCase() ) {
          case "F":
            if ( video.webkitDisplayingFullscreen === false ) {
              video.webkitRequestFullscreen();
            }
            else {
              video.webkitExitFullscreen();
            }
        }
      }
    }
  }*/

  document.body.onkeyup = function(event) {
    switch ( event.key.toUpperCase() ) {
      case "F":
        if ( document.activeElement.type !== "text" ) {
          if ( video.webkitDisplayingFullscreen === false ) {
            video.webkitRequestFullscreen();
          }
          else {
            video.webkitExitFullscreen();
          }
        }
    }
  }


  source.onkeyup = function(event) {
    if ( event.keyCode === 13 ) {
      setSource();
      syncRemote(source.value);
      video.play();
    }
  }


  set.onclick = function() {
    setSource();
    syncRemote(source.value);
    video.play(); 
  }

});