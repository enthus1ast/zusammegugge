const MAX_TIME_DIFFERENCE = 0.800;

window.host = "ws://" + location.hostname + ":7787/";
window.video = null;
window.voice = false;
window.nomesync = false;
window.noremotesync = false;

var client = new WebSocket(window.host, "irc");
var servertime = 0;
var servertimeoffset = 0;

window.syncRemote = function ( currentSrc, currentTime, paused, ended, seeking, hardsync ) {
  currentSrc = currentSrc || video.currentSrc;
  currentTime = currentTime || video.currentTime;
  paused = paused || video.paused;
  ended = ended || video.ended;
  seeking = seeking || video.seeking;
  hardsync = hardsync || false;

  if ( window.noremotesync.checked === false ) {
    if ( window.voice.checked === true ) {

      var data = JSON.stringify({
        currentSrc: currentSrc,
        currentTime: currentTime + (servertimeoffset / 1000),
        paused: paused,
        ended: ended,
        seeking: seeking,
        hardsync: hardsync
      });

      client.send(data); 

    }
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
        console.log('- syncMe (DEBUG): hardsynced!')
        window.video.currentTime = data.currentTime;
        return;
      }

      if ( data.ended === true ) {
        console.log('VIDEO ENDED');
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



document.addEventListener('DOMContentLoaded', function() {
  window.video = document.querySelector('#video');
  window.source = document.querySelector('#source');
  window.voice = document.querySelector('#voice');
  window.noremotesync = document.querySelector('#noremotesync');
  window.nomesync = document.querySelector('#nomesync');
  window.set = document.querySelector('#set');

  video.src = source.value;


  var syncInterval = setInterval(function() {
    window.syncRemote();
  }, 5000);


  client.onopen = function(event) {
    client.onmessage = function( event ) {
      console.log(event);
      if ( event.data.servertime !== undefined && event.data.servertime !== null ) {
        servertime = event.data.servertime;
        servertimeoffset = (new Date).getTime() - event.data.servertime;
      }
      syncMe(event);
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