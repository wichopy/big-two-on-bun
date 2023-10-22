import { Router } from "@stricjs/router";
import { Card, Value, decodemapping } from "./logic";
import { Game } from "./game";
import {
  handleNewRoom,
  joinRoomByGameCode,
  startGame as startRoomGame,
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

const ERROR_INVALID_ROOM_REQUEST = "ERR-001";

const app = new Router({
  port: PORT,
});

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
      gameCode: room.gameCode,
      hostName: room.hostName,
      status: room.status,
    }),
    {
      headers: {
        "Content-Type": "application/json",
        "Access-control-allow-origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS"
      },
    }
  );
  // res.headers.set('Content-Type', 'application/json')

  return res;
}

function joinRoom(ctx, server) {
  const { gameCode, userId, userName } = ctx.data;

  if (!gameCode || !userId) {
    const resp = new Response(
      JSON.stringify(
        serverError(
          "game code and user id is needed",
          ERROR_INVALID_ROOM_REQUEST
        )
      )
    );
    resp.status = 400;

    return resp;
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
app
  .post("/room/:gameCode/actions/join", joinRoom, {
    body: "json",
  })
// app.post('/room/:gameCode/action/leave', leaveRoom, {
//   body: 'json'
// }).wrap('/room/:gameCode/action/leave', send)
app
  .post("/room/:gameCode/action/start", startGame, {
    body: "json",
  })
  .wrap("/room/:gameCode/action/start", send);
// app.post('/room/:gameCode/action/sit', sitInGameSlot, {
//   body: 'json'
// }).wrap('/room/:gameCode/action/sit', send)

app.listen();
console.log("Starting big 2 server on port: ", PORT);
