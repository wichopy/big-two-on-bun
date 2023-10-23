import { Handler, Router, WSContext } from "@stricjs/router";
import { Card, Value, decodemapping } from "./logic";
import { Game, getGame } from "./game";
import {
  handleNewRoom,
  joinRoomByGameCode,
  startGame as startRoomGame,
  readRoom as readRoomGame,
  getRoomIdByGameId,
} from "./gamerooms";
// import { CORS, writeHead } from "@stricjs/utils";
import { ServerWebSocket } from "bun";

// const cors = new CORS();
// const send = writeHead({ headers: cors.headers });

const DEBUG_MODE = true;
const ENABLE_CORS = true;
const PORT = 3000;

const serverError = (message, code) => ({
  error: true,
  code,
  message,
});

const ERROR_INVALID_ROOM_REQUEST = "ERR-001" as const;
const ERROR_ROOM_NOT_FOUND = 'ERR-002' as const;

type ErrorCodes = typeof ERROR_INVALID_ROOM_REQUEST | typeof ERROR_ROOM_NOT_FOUND

interface WSToken {
  userId: string
  userName: string
  gameCode: string
}

const errorResponse = (message: string, code: ErrorCodes, statusCode: number) => {
  return new Response(JSON.stringify(serverError(message, code)), {
    status: statusCode,
  })
}

const extractToken = (url: string) => {
  const theURL = new URL(url)
  const searchParams = new URLSearchParams(theURL.search)
  const token = searchParams.get('token')

  const decodedToken = atob(token)
  const json: WSToken = JSON.parse(decodedToken)
  return json
}

const app = new Router({
  port: PORT,
});

const makeGameChannel = (gameCode: string) => `channel-game-${gameCode}`

const extractFromMeta = ws => {
  const { userId, userName, gameCode } = ws.data.meta
  return {
    userId,
    userName,
    gameCode,
  }
}

const wsClients = new Map<string, ServerWebSocket<WSContext<"/room/updates"> & Dict<any>>>()

app.ws("/room/updates", {
  open(ws) {
    const url = ws.data.ctx.url
    const tokenObj = extractToken(url)

    // Inject meta data into existing meta
    ws.data.meta = {
      ...ws.data.meta,
      ...tokenObj,
    }

    const msg = `${tokenObj.userName} has entered the game ${tokenObj.gameCode}}`;
    const channel = makeGameChannel(tokenObj.gameCode)
    ws.subscribe(channel);
    ws.publish(channel, msg);
    const room = readRoomGame(tokenObj.gameCode)
    const game = getGame(room.currentGameId)
    const payload = {
      type: 'room-update',
      payload: {
        ...room,
        game: game?.getViewerData(),
      },
    }
    console.log('notify of join', payload)
    ws.publish(channel, JSON.stringify(payload))
    wsClients.set(tokenObj.userId, ws)
  },
  message(ws, data) {
    console.log('incoming websocket message', data)
    const channel = makeGameChannel(ws.data.gameCode)
    ws.publish(channel, data)
  },
  close(ws) {
    const meta = extractFromMeta(ws)
    const channel = makeGameChannel(meta.gameCode)
    ws.unsubscribe(channel)
    ws.publish(channel, `${meta.userName} has left the game`)
    wsClients.delete(meta.userId)
  }
})

const games: {
  [key: string]: Game;
} = {};

function handleCreateGame(ctx, server) {
  const uniqueID = crypto.randomUUID();
  console.log("creating game at unique id", uniqueID);
  let numPlayers;
  try {
    const { numPlayers: numplay } = ctx.data;
    numPlayers = numplay;
  } catch (err) {
    console.log("something went wrong with post body");
  }
  games[uniqueID] = new Game({
    numPlayers,
  });
  if (DEBUG_MODE) {
    const resp = new Response(
      JSON.stringify({
        id: uniqueID,
        ...games[uniqueID],
      })
    );
    if (ENABLE_CORS) {
      resp.headers.set("Access-Control-Allow-Origin", "*");
      resp.headers.set(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS"
      );
    }

    return resp;
  }

  const resp = new Response(
    JSON.stringify({
      id: uniqueID,
    })
  );
  if (ENABLE_CORS) {
    resp.headers.set("Access-Control-Allow-Origin", "*");
    resp.headers.set(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, OPTIONS"
    );
  }

  return resp;
}

function createRoom(ctx, server) {
  console.log('create room')
  const { userId, userName } = ctx.data;

  if (!userId) {
    return errorResponse('user id is needed', ERROR_INVALID_ROOM_REQUEST, 400)
  }

  const room = handleNewRoom(userId, userName);
  console.log("returning data", {
    gameCode: room.gameCode,
    hostName: room.hostName,
    status: room.status,
  });
  const res = new Response(
    JSON.stringify({
      ...room
    }),
    {
      headers: {
        "Content-Type": "application/json",
        "Access-control-allow-origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS"
      },
    }
  );

  return res;
}

type RouteCtx = Parameters<Handler>[0]
type RouterMeta = Parameters<Handler>[1]

function joinRoom(ctx, meta: RouterMeta) {
  const { gameCode } = ctx.params;
  const { userId, userName } = ctx.data;

  if (!gameCode || !userId) {
    return errorResponse('game code and user id is needed', ERROR_INVALID_ROOM_REQUEST, 400)
  }

  const room = joinRoomByGameCode(gameCode, userId, userName);
  return new Response(JSON.stringify({
    ...room,
  }), {
    headers: {
      "Content-Type": "application/json",
      "Access-control-allow-origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS"
    }
  });
}

function startGame(ctx: RouteCtx, server: RouterMeta) {
  console.log('start!!')
  const { gameCode } = ctx.params;
  const { userId } = ctx.data;
  const room = readRoomGame(gameCode)
  if (userId !== room.hostId) {
    return errorResponse('only host can start game', ERROR_INVALID_ROOM_REQUEST, 400)
  }
  console.log('starting game')
  startRoomGame(gameCode);

  const game = getGame(room.currentGameId)
  console.log('the game', room.currentGameId)
  server.server.publish(makeGameChannel(gameCode), JSON.stringify({
    type: 'room-update',
    payload: {
      ...room.getViewerData(),
    },
  }))

  Object.entries(room.players).forEach(entry => {
    const wsClient = wsClients.get(entry[1]?.userId)
    if (!wsClient) return
    const playerPayload = {
      type: 'player-update',
      payload: {
        ...room.getPlayerUpdate(entry[0])
      }
    }
    wsClient.send(JSON.stringify(playerPayload))
  })
  // server.server.

  return new Response(JSON.stringify({}), {
    headers: {
      "Content-Type": "application/json",
      "Access-control-allow-origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS"
    }
  });
}

function sitInGameSlot(ctx: RouteCtx, meta: RouterMeta) {
  const gameCode = ctx.params.gameCode
  const { userId, userName, slot } = ctx.data;

  const room = readRoomGame(gameCode)
  room.sitInGameSlot(userId, slot)

  meta.server.publish(makeGameChannel(gameCode), JSON.stringify({ 
    type: 'room-update',
    payload: {
      ...room,
    }
  }))

  return new Response(JSON.stringify({}), {
    headers: {
      "Content-Type": "application/json",
      "Access-control-allow-origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS"
    }
  })
}

function decodeCards(cardStr: string[]) {
  return cardStr.map((crdstr) => {
    return new Card(decodemapping[crdstr.charAt(0)], crdstr.slice(1) as Value);
  });
}

// new
function playCardHandler(ctx: RouteCtx, meta: RouterMeta) {
  const { gameCode } = ctx.params;
  const { userId, cards } = ctx.data;
  const decodedCards = decodeCards(cards);
  const room = readRoomGame(gameCode)
  try {
    const result = room.playCards(userId, decodedCards);
  
    Object.entries(room.players).forEach(entry => {
      const wsClient = wsClients.get(entry[1]?.userId)
      if (!wsClient) return
      const playerPayload = {
        type: 'player-update',
        payload: {
          ...room.getPlayerUpdate(entry[0])
        }
      }
      wsClient.send(JSON.stringify(playerPayload))
    })
    meta.server.publish(makeGameChannel(room.gameCode), JSON.stringify({
      type: 'room-update',
      payload: room.getViewerData(),
      // ...room,
    }))
  
    return new Response(JSON.stringify({
      result,
    }), {
      headers: {
        "Content-Type": "application/json",
        "Access-control-allow-origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS"
      }
    })
  } catch (err) {
    return errorResponse(err.message, ERROR_INVALID_ROOM_REQUEST, 400)
  }
}

// new
function passCardHandler(ctx: RouteCtx, meta: RouterMeta) {
  const { gameCode } = ctx.params;
  const { userId } = ctx.data;

  // const game = games[gameId];
  // const { playerId } = ctx.data;
  const room = readRoomGame(gameCode)
  const result = room.passTurn(userId);

  console.log("action result", gameCode, userId, result);
  Object.entries(room.players).forEach(entry => {
    const wsClient = wsClients.get(entry[1]?.userId)
    if (!wsClient) return
    const playerPayload = {
      type: 'player-update',
      payload: {
        ...room.getPlayerUpdate(entry[0])
      }
    }
    wsClient.send(JSON.stringify(playerPayload))
  })
  meta.server.publish(makeGameChannel(room.gameCode), JSON.stringify({
    type: 'room-update',
    payload: room.getViewerData(),
    // ...room,
  }))
  
  return new Response(JSON.stringify({
    result,
  }), {
    headers: {
      "Content-Type": "application/json",
      "Access-control-allow-origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS"
    }
  })
}

// old
// function handlePlayCards(ctx: RouteCtx, server: RouterMeta) {
//   const { gameId } = ctx.params;
//   const game = games[gameId];
//   console.log("play card action", ctx.data);
//   const { playerId, cards } = ctx.data;
//   console.log("body", playerId, cards);
//   const decodedCards = decodeCards(cards);
//   const result = game.performAction(playerId, "playCards", decodedCards);
//   console.log("action result", gameId, result);

//   const wsClient = wsClients.get(playerId)
//   const room = getRoomIdByGameId(gameId)
//   const slot = room.getSlotByPlayerId(playerId)
//   const playerPayload = {
//     type: 'player-update',
//     payload: {
//       ...game.getPlayerData(slot),
//     }
//   }
//   wsClient.send(JSON.stringify(playerPayload))
  
//   server.server.publish(makeGameChannel(room.gameCode), JSON.stringify({
//     ...room,
//   }))
//   if (DEBUG_MODE) {
//     const res = new Response(
//       JSON.stringify({
//         id: gameId,
//         ...games[gameId],
//       })
//     );

//     if (ENABLE_CORS) {
//       res.headers.set("Access-Control-Allow-Origin", "*");
//       res.headers.set(
//         "Access-Control-Allow-Methods",
//         "GET, POST, PUT, DELETE, OPTIONS"
//       );
//     }
//     return res;
//   }

//   return result;
// }

// function handlePassTurn(ctx, server) {
//   const { gameId } = ctx.params;
//   const game = games[gameId];
//   const { playerId } = ctx.data;
//   const result = game.performAction(playerId, "passTurn");
//   console.log("action result", gameId, playerId, result);
//   if (DEBUG_MODE) {
//     return new Response(
//       JSON.stringify({
//         id: gameId,
//         ...games[gameId],
//       })
//     );
//   }

//   return result;
// }

app.get("/game/:gameId", (ctx) => {
  const { gameId } = ctx.params;

  const res = new Response(
    JSON.stringify({
      id: gameId,
      ...games[gameId],
    })
  );

  if (ENABLE_CORS) {
    res.headers.set("Access-Control-Allow-Origin", "*");
    res.headers.set(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, OPTIONS"
    );
  }

  return res;
});

app.post("/game", handleCreateGame, { body: "json" });
// delete this
// app
//   .post("/game/:gameId/actions/play-cards", handlePlayCards, { body: "json" })
//   .wrap("/game/:gameId/actions/play-cards", send);
// keep this
app.post("/room/:gameCode/actions/play-cards", playCardHandler, { body: "json" })
app.post("/room/:gameCode/actions/pass-turn", passCardHandler, { body: "json" })

// delete this
// app
//   .post("/game/:gameId/actions/pass-turn", handlePassTurn, { body: "json" })
//   .wrap("/game/:gameId/actions/pass-turn", send);

app
  .post("/room", createRoom, {
    body: "json",
  })

app.post('/room/:gameCode/actions/wstoken', (ctx) => {
  const { userId, userName } = ctx.data;
  const { gameCode } = ctx.params;
  const rawToken: WSToken = {userId, userName, gameCode}
  const token = btoa(JSON.stringify(rawToken))

  return new Response(token, {
    headers: {
        "Content-Type": "application/text",
        "Access-control-allow-origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS"
    }
  })
}, {
  body: 'json'
})

app
  .post("/room/:gameCode/actions/join", joinRoom, {
    body: "json",
  })
// app.post('/room/:gameCode/action/leave', leaveRoom, {
//   body: 'json'
  // .wrap("/room/:gameCode/action/start", send);
app.post('/room/:gameCode/action/sit', sitInGameSlot, {
  body: 'json'
})

app.post("/room/:gameCode/action/start", startGame, {
  body: 'json'
})

app.listen();
console.log("Starting big 2 server on port: ", PORT);
