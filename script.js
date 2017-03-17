const SYNC_INTERVAL = 5000;
const PING_INTERVAL = 5000;
const DEBUG = true;
const HOST = "ws://" + location.hostname + ":7787/";

let video = null;
let divHistory = null;
let tblHistory = null;
let txtSource = null;
let chbxVoice = null;
let chbxNoMeSync = null;
let btnSetSource = null;
let txtTimeDifference = null;
let chbxLagCompensation = null;


let client = new WebSocket(HOST, "irc");
let lag = 0;
let lagQueue = [];


let syncRemote = function ( currentSrc, currentTime, paused, ended, seeking, hardsync ) {
  currentSrc = currentSrc || video.currentSrc;
  currentTime = currentTime || video.currentTime;
  paused = paused || video.paused;
  ended = ended || video.ended;
  seeking = seeking || video.seeking;
  hardsync = hardsync || false;

  if ( chbxVoice.checked === true ) {

    let data = JSON.stringify({
      currentSrc: currentSrc,
      currentTime: currentTime,
      paused: paused,
      ended: ended,
      seeking: seeking,
      hardsync: hardsync,
      lag: lag
    });

    client.send(data); 

  }
}



let syncMe = function(data) {
  if ( chbxNoMeSync.checked === false ) {
    let data = JSON.parse(data);

    chbxVoice.checked = false;

    if ( video.src !== data.currentSrc ) {
      video.src = data.currentSrc;
      addToHistory(data.currentSrc);
    }

    if ( video.paused !== data.paused ) {
      if ( data.paused === true ) {
        video.pause()
      }
      else {
        video.play()
      }
    }

    if ( data.seeking === true || data.hardsync === true || Math.abs(video.currentTime - data.currentTime) >= txtTimeDifference.value ) {
      if ( chbxLagCompensation.checked === true ) {
        video.currentTime = data.currentTime + ( (data.lag + lag) / 1000 );
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

let compensateLag = function(data) {
  if ( lagQueue.length <= 10 ) {
    lagQueue.push({"sent": data, "got": new Date().getTime()});
   
    if ( DEBUG === true ) {
      console.log("- lagCompensation, pushedDifference (DEBUG): ~", new Date().getTime() - data);
    }
  }
  else {
    let sum = 0;
    for ( let key in Object.keys(lagQueue) ) {
      let entry = lagQueue[key];
      sum += entry.got - entry.sent;

      if ( DEBUG === true ) {
        console.log("- lagCompensation, calculated sum (DEBUG): ~", sum);
      }
    }
    lag = sum / lagQueue.length;
    lagQueue = [];

    if ( DEBUG === true ) {
      console.log("- lagCompensation, set lag (DEBUG): ~", lag);
    }
  }
}


let setSource = function() {
  video.src = txtSource.value;
}

let toggleVideoPlayPause = function() {
  if ( video.paused === true ) {
    video.play();
  }
  else {
    video.pause();
  }
}

let toggleVideoFullscreen = function() {
  if ( document.activeElement.type !== "text" ) {
    if ( video.webkitDisplayingFullscreen === false ) {
      video.webkitRequestFullscreen();
    }
    else {
      video.webkitExitFullscreen();
    }
  }
}


let addToHistory = function(url) {
  let tr = document.createElement("tr");
  let td = document.createElement("td");
  td.textContent = url;
  tr.append(td);
  tblHistory.tBodies[0].append(tr);
}


document.addEventListener("DOMContentLoaded", function() {
  video = document.querySelector("#video");
  divHistory = document.querySelector("#divHistory");
  tblHistory = document.querySelector("#tblHistory");
  txtSource = document.querySelector("#txtSource");
  chbxVoice = document.querySelector("#chbxVoice");
  chbxNoMeSync = document.querySelector("#chbxNoMeSync");
  btnSetSource = document.querySelector("#btnSetSource");
  txtTimeDifference = document.querySelector("#txtTimeDifference");
  chbxLagCompensation = document.querySelector("#chbxLagCompensation");

  video.src = txtSource.value;


  let syncInterval = setInterval(function() {
    syncRemote();
  }, SYNC_INTERVAL);

  let pingInterval = setInterval(function() {
    ping();
  }, PING_INTERVAL);


  client.onopen = function(event) {
    client.onmessage = function( event ) {
      if (event.data[0] === "{") {
        syncMe(event.data);
      } else {
        if ( DEBUG === true ) {
          console.log("- pong (DEBUG): ", new Date().getTime());
        }
        compensateLag(event.data);
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
    toggleVideoPlayPause();
  }


  document.body.onkeyup = function(event) {
    // Toggle fullscreen
    if ( event.key.toUpperCase() === "F" ) {
      toggleVideoFullscreen();
    }

    // Toggle video start/pause
    if ( event.keyCode === 32 ) { // Space
      toggleVideoPlayPause();
    }


    if ( DEBUG === true ) {
      console.log("- document.body.onkeyup, event.keyCode: ", event.keyCode);
      console.log("- document.body.onkeyup, event.key.toUpperCase(): ", event.key.toUpperCase());
    }
  }


  txtSource.onkeyup = function(event) {
    if ( event.keyCode === 13 ) {
      setSource();
      addToHistory(txtSource.value);
      syncRemote(
        currentSrc = txtSource.value
      );
      video.play();
    }
  }


  btnSetSource.onclick = function() {
    setSource();
    addToHistory(txtSource.value);
    syncRemote(
      currentSrc = txtSource.value
    );
    video.play(); 
  }

});