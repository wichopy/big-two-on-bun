import { Router } from '@stricjs/router';
import { Card, Value, decodemapping }  from './logic'
import { Game } from './game'
import { CORS, writeHead } from '@stricjs/utils';

console.log("I'm running Bun on port 3000");

const cors = new CORS();
const send =  writeHead({ headers: cors.headers });

const DEBUG_MODE = true
const ENABLE_CORS = true
// routes
// GET /api/game/:gameId -> returns game state
// POST /api/game -> create game -> return game id
// POST /api/game/:gameId/actions/play-cards
// POST /api/game/:gameId/actions/pass-turn
// POST /api/game/:gameId/action/apply-powerup

const games: {
  [key: string]: Game
} = {}
function handleCreateGame(ctx, server) {
  const uniqueID = crypto.randomUUID()
  console.log('creating game at unique id', uniqueID)
  games[uniqueID] = new Game()
  if (DEBUG_MODE) {
    const resp = new Response(JSON.stringify({
      id: uniqueID,
      ...games[uniqueID],
    }))
    if (ENABLE_CORS) {
      resp.headers.set('Access-Control-Allow-Origin', '*')
      resp.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    }

    return resp
  }

  const resp = new Response(JSON.stringify({
    id: uniqueID
  }))
  if (ENABLE_CORS) {
    resp.headers.set('Access-Control-Allow-Origin', '*')
    resp.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  }

  return resp
}


const app = new Router({
  port: 3000
});

function decodeCards(cardStr: string[]) {
  return cardStr.map(crdstr => {
    return new Card(
      decodemapping[crdstr.charAt(0)],
      crdstr.slice(1) as Value
    )
  })
}

app.get('/game/:gameId', (ctx) => {
  const { gameId } = ctx.params

  const res = new Response(JSON.stringify({
    id: gameId,
      ...games[gameId],
  }))

  if (ENABLE_CORS) {
    res.headers.set('Access-Control-Allow-Origin', '*')
    res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  }

  return res
})

app.post('/game', handleCreateGame)
app.post('/game/:gameId/actions/play-cards', (ctx, server) => {
  const { gameId } = ctx.params
  const game = games[gameId]
  console.log('play card action', ctx.data)
  const { playerId, cards } = ctx.data
  console.log('body', playerId, cards)
  const decodedCards = decodeCards(cards)
  const result = game.performAction(playerId, 'playCards', decodedCards)
  console.log('action result', gameId, result)
  if (DEBUG_MODE) {
    const res = new Response(JSON.stringify({
      id: gameId,
      ...games[gameId],
    }))

    if (ENABLE_CORS) {
      res.headers.set('Access-Control-Allow-Origin', '*')
      res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    }
    return res
  }

  return result
}, { body: 'json' }).wrap('/game/:gameId/actions/play-cards', send)

app.post('/game/:gameId/actions/pass-turn', (ctx, server) => {
  const { gameId } = ctx.params
  const game = games[gameId]
  const { playerId } = ctx.data
  const result = game.performAction(playerId, 'passTurn')
  console.log('action result', gameId, result)
  if (DEBUG_MODE) {
    return new Response(JSON.stringify({
      id: gameId,
      ...games[gameId],
    }))
  }

  return result
}, { body: 'json' }).wrap('/game/:gameId/actions/pass-turn', send)

app.listen();

// Bun.serve({
//   port: 3000,
//   fetch(request: Request) {
//     console.log(`[${request.method}] ${request.url}`);
//     return new Response("Hello World from CodeSandbox");
//   },

// })
// export default ;
