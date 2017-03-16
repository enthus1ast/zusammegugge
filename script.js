const SYNC_INTERVAL = 5000;
const PING_INTERVAL = 500;
const DEBUG = true;
const HOST = "ws://" + location.hostname + ":7787/";

let video = null;
let voice = false;
let nomesync = false;
let timedifference = false;
let lagcompensation = false;


let client = new WebSocket(HOST, "irc");
let lagcompensationvalue = 0;
let lagcompensationqueue = [];



let syncRemote = function ( currentSrc, currentTime, paused, ended, seeking, hardsync ) {
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
      hardsync: hardsync,
      lag: lagcompensationvalue
    });

    client.send(data); 

  }
}



let syncMe = function(event) {
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
      if ( lagcompensation.checked === true ) {
        video.currentSrc = data.currentTime + data.lag + lagcompensationvalue;
      }
      else {
        video.currentTime = data.currentTime;
      }

      if ( DEBUG === true ) {
        console.log("- syncMe (DEBUG): hardsynced!")
      }
      return;
    }

    if ( data.ended === true ) {
      if ( DEBUG === true ) {
        console.log("VIDEO ENDED");
      }
    }
  }

  return;
}


let ping = function() {
  client.send(new Date().getTime());

  if ( DEBUG === true ) {
    console.log("- ping (DEBUG): ~", new Date().getTime());
  }
}

let lagCompensation = function(event) {
  if ( lagcompensationqueue.length <= 10 ) {
    lagcompensationqueue.push({"sent": event.data, "got": new Date().getTime()});
   
    if ( DEBUG === true ) {
      console.log("- lagCompensation, pushedDifference (DEBUG): ~", new Date().getTime() - event.data);
    }
  }
  else {
    let sum = 0;
    for ( let key in Object.keys(lagcompensationqueue) ) {
      let entry = lagcompensationqueue[key];
      sum += entry.got - entry.sent;

      if ( DEBUG === true ) {
        console.log("- lagCompensation, calculated sum (DEBUG): ~", sum);
      }
    }
    lagcompensationvalue = sum / lagcompensationqueue.length;
    lagcompensationqueue = [];

    if ( DEBUG === true ) {
      console.log("- lagCompensation, set lagcompensationvalue (DEBUG): ~", lagcompensationvalue);
    }
  }
}


let setSource = function() {
  video.src = source.value;
}



document.addEventListener("DOMContentLoaded", function() {
  video = document.querySelector("#video");
  source = document.querySelector("#source");
  voice = document.querySelector("#voice");
  nomesync = document.querySelector("#nomesync");
  set = document.querySelector("#set");
  timedifference = document.querySelector("#timedifference");
  lagcompensation = document.querySelector("#lagcompensation");

  video.src = source.value;


  let syncInterval = setInterval(function() {
    syncRemote();
  }, SYNC_INTERVAL);

  let pingInterval = setInterval(function() {
    ping();
  }, PING_INTERVAL);


  client.onopen = function(event) {
    client.onmessage = function( event ) {
      if (event.data[0] === "{") {
        syncMe(event);
      } else {
        if ( DEBUG === true ) {
          console.log("- pong: ", new Date().getTime());
        }
        lagCompensation(event);
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
    syncRemote(
      currentSrc = null,
      currentTime = null,
      paused = null,
      ended = null,
      seeking = null,
      hardsync = true
    );
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