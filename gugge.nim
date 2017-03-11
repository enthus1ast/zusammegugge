#
#
#                   zusamme gugge
#               (c) Copyright 2016 
#             David Krause, Tobias Freitag
#
#    See the file "copying.txt", included in this
#    distribution, for details about the copyright.
#
## Whatch streams together

import asyncnet, asyncdispatch, websocket
import asynchttpserver
import os
import unicode
import strutils
import cgi
import sets
import random
import hashes

randomize()

const 
  URL_ENCODE = false ## if this is enabled the data sent to ws will be "encodeUrl" data that comes back will be "decodeUrl"
                     ## this means that the websocket client has to de- and encode the url as well.
                     ## the server endpoint must not be changed
                     ## please note that this methode should NOT change payload data
                     ## http://blog.fgribreau.com/2012/05/how-to-fix-could-not-decode-text-frame.html

  FILTER_UNICODE = true ## if this is enabled the data that will be sent to the websocket 
                        ## will be stripped from unwanted unicode chars.
                        ## please note that this is CHANGEING the payload data
                        ## http://blog.fgribreau.com/2012/05/how-to-fix-could-not-decode-text-frame.html

type 
  Host = tuple[host: string, port: Port]
  Node = object 
      socket: AsyncSocket
      nodeid: int

var clients = initSet[Node]()

proc hash(x: Node): Hash =
  hash x.nodeid

proc filterUnicode(msg: var string) =
  ## this strips out unwanted unicode characters (to avoid compatibility issues with browsers)
  ## be aware that this is acually --::changeing the payload data::-- thats get sent TO the browser!
  if FILTER_UNICODE == false:
    # return msg
    discard
  else:
    while true:
      var brokenCharPos = validateUtf8(msg)
      if brokenCharPos == -1:
        # this is valid utf-8
        break
      else:
        echo "Deleted invalide UTF-8 char from msg at pos: " , brokenCharPos
        msg.delete(brokenCharPos, brokenCharPos)

proc pump(req: Request): Future[void] {.async.} =
  var fromWs: tuple[opcode: Opcode, data: string]
  while true:
    try:
      fromWs = await req.client.readData(false)
      echo "ws: " & fromWs.data
    except:
      req.client.close()
      return
    for each in clients.items:
      if req.client == each.socket:
        continue 
      try:
        await each.socket.sendText(fromWs.data,false)
      except:
        each.socket.close
        clients.excl each

proc processClientWebsocket(req: Request) {.async.} =
  let (success, error) = await(verifyWebsocketRequest(req, "irc"))
  if not success:
    when defined Windows: # bug...
      if req.url.path == "/":
        asyncCheck req.respond(Http200, readFile(  expandFilename(getCurrentDir() / "index.html")))
      else:  
        let fullPath = expandFilename(getCurrentDir() / req.url.path)

        if fullPath.fileExists:
          asyncCheck req.respond(Http200, readFile(fullPath) )
        else:
          asyncCheck req.respond(Http404, fullPath & " not found :/" )
    else:
      if req.url.path == "/":
        await req.respond(Http200, readFile(  expandFilename(getCurrentDir() / "index.html")))
      else:  
        let fullPath = expandFilename(getCurrentDir() / req.url.path)

        if fullPath.fileExists:
          await req.respond(Http200, readFile(fullPath) )
        else:
          await req.respond(Http404, fullPath & " not found :/" )

    req.client.close()
  else:
    echo "New websocket customer arrived!"
    var node = Node()
    node.socket = req.client
    node.nodeid = random(1000000)
    clients.incl node
    try:
      asyncCheck pump(req)
      discard
    except:
      echo "Could not connect to endpoint :("
      asyncCheck req.client.sendText(":( :( :( :( :(\n",false)
      echo "Closeing ws and tcp socket after error..."
      req.client.close()
      clients.excl node

proc proxy * (src: Host) =
  var websocketServer = newAsyncHttpServer()
  proc paramHelper(req: Request) {.async.} = 
    try:
      asyncCheck processClientWebsocket(req) 
    except:
      echo "processClientWebsocket is fuckd"
  asyncCheck websocketServer.serve(src.port, paramHelper)

when isMainModule:
  proxy(("0.0.0.0",Port(7787)))
  runForever()
  