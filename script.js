const MAX_TIME_DIFFERENCE = 0.800;

window.host = "ws://" + location.hostname + ":7787/";
window.video = null;
window.voice = false;
window.nomesync = false;

var client = new WebSocket(window.host, "irc");


window.syncRemote = function ( currentSrc, currentTime, paused, ended, seeking, hardsync ) {
  currentSrc = currentSrc || video.currentSrc;
  currentTime = currentTime || video.currentTime;
  paused = paused || video.paused;
  ended = ended || video.ended;
  seeking = seeking || video.seeking;
  hardsync = hardsync || false;

  if ( window.voice.checked === true ) {

    var data = JSON.stringify({
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



window.syncMe = function(event) {
//  try {
    if ( window.nomesync.checked === false ) {
      var data = JSON.parse(event.data);

      window.voice.checked = false;

      if ( window.video.src !== data.currentSrc ) {
        window.video.src = data.currentSrc;
      }

      if ( window.video.paused !== data.paused ) {
        if ( data.paused === true ) {
          window.video.pause()
        }
        else {
          window.video.play()
        }
      }

      if ( data.seeking === true || data.hardsync === true || Math.abs(window.video.currentTime - data.currentTime) >= MAX_TIME_DIFFERENCE ) {
        console.log("- syncMe (DEBUG): hardsynced!")
        window.video.currentTime = data.currentTime;
        return;
      }

      if ( data.ended === true ) {
        console.log("VIDEO ENDED");
      }
    }

    return;
  //}
  //catch (error) {
//    return;
  //}
}




window.setSource = function() {
  window.video.src = window.source.value;
}



document.addEventListener("DOMContentLoaded", function() {
  window.video = document.querySelector("#video");
  window.source = document.querySelector("#source");
  window.voice = document.querySelector("#voice");
  window.nomesync = document.querySelector("#nomesync");
  window.set = document.querySelector("#set");

  video.src = source.value;


  var syncInterval = setInterval(function() {
    window.syncRemote();
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


  window.video.onseeking = function() {
    window.syncRemote(
      currentSrc = null,
      currentTime = null,
      paused = null,
      ended = null,
      seeking = null,
      hardsync = true
    );
  }


  window.video.onplay = function() {
    window.syncRemote();
  }


  window.video.onpause = function() {
    window.syncRemote(
      currentSrc = null,
      currentTime = null,
      paused = null,
      ended = null,
      seeking = null,
      hardsync = true
    );
  }


  window.video.onclick = function() {
    if ( video.paused === true ) {
      window.video.play();
    }
    else {
      window.video.pause();
    }
  }

  /*var elements = Object.keys(document.querySelectorAll("*"));
  for ( var key of elements) {
    var element = elements[key];
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


  window.source.onkeyup = function(event) {
    if ( event.keyCode === 13 ) {
      window.setSource();
      window.syncRemote(window.source.value);
      video.play();
    }
  }


  window.set.onclick = function() {
    window.setSource();
    window.syncRemote(window.source.value);
    video.play(); 
  }

});