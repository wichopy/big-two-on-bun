import { Handler, Router } from "@stricjs/router";
import { Card, Value, decodemapping } from "./logic";
import { Game, getGame } from "./game";
import {
  handleNewRoom,
  joinRoomByGameCode,
  startGame as startRoomGame,
  readRoom as readRoomGame,
} from "./gamerooms";
import { CORS, writeHead } from "@stricjs/utils";

const cors = new CORS();
const send = writeHead({ headers: cors.headers });

const DEBUG_MODE = true;
const ENABLE_CORS = true;
const PORT = 3000;
// POST /api/game/:gameId/action/apply-powerup

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
  },
  message(ws, data) {
    const channel = makeGameChannel(ws.data.gameCode)
    ws.publish(channel, data)
  },
  close(ws) {
    const meta = extractFromMeta(ws)
    const channel = makeGameChannel(meta.gameCode)
    ws.unsubscribe(channel)
    ws.publish(channel, `${meta.userName} has left the game`)
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
  const { userId, userName } = ctx.data;

  if (!userId) {
    const resp = new Response(
      JSON.stringify(
        serverError("user id is needed", ERROR_INVALID_ROOM_REQUEST)
      )
    );
    resp.status = 400;

    return resp;
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

function startGame(ctx, server) {
  const { gameCode } = ctx.data;

  // if (!gameCode || !gameId) {
  //   const resp = new Response(JSON.stringify(serverError('game code and game id is needed', ERROR_INVALID_ROOM_REQUEST)))
  //   resp.status = 400

  //   return resp
  // }
  // const room = store[gameCode]
  // room.startGame(gameId)
  startRoomGame(gameCode);

  return new Response(JSON.stringify({}));
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

function handlePlayCards(ctx, server) {
  const { gameId } = ctx.params;
  const game = games[gameId];
  console.log("play card action", ctx.data);
  const { playerId, cards } = ctx.data;
  console.log("body", playerId, cards);
  const decodedCards = decodeCards(cards);
  const result = game.performAction(playerId, "playCards", decodedCards);
  console.log("action result", gameId, result);
  if (DEBUG_MODE) {
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
  }

  return result;
}

function handlePassTurn(ctx, server) {
  const { gameId } = ctx.params;
  const game = games[gameId];
  const { playerId } = ctx.data;
  const result = game.performAction(playerId, "passTurn");
  console.log("action result", gameId, playerId, result);
  if (DEBUG_MODE) {
    return new Response(
      JSON.stringify({
        id: gameId,
        ...games[gameId],
      })
    );
  }

  return result;
}

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
app
  .post("/game/:gameId/actions/play-cards", handlePlayCards, { body: "json" })
  .wrap("/game/:gameId/actions/play-cards", send);
app
  .post("/game/:gameId/actions/pass-turn", handlePassTurn, { body: "json" })
  .wrap("/game/:gameId/actions/pass-turn", send);

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
app
  .post("/room/:gameCode/action/start", startGame, {
    body: "json",
  })
  .wrap("/room/:gameCode/action/start", send);
app.post('/room/:gameCode/action/sit', sitInGameSlot, {
  body: 'json'
})
app.listen();
console.log("Starting big 2 server on port: ", PORT);
