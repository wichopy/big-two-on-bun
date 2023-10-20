import { Router } from '@stricjs/router';
import { Card, Value, decodemapping }  from './logic'
import { Game } from './game'
import { CORS, writeHead } from '@stricjs/utils';

const cors = new CORS();
const send =  writeHead({ headers: cors.headers });

const DEBUG_MODE = true
const ENABLE_CORS = true
const PORT = 3000
// POST /api/game/:gameId/action/apply-powerup


const app = new Router({
  port: PORT,
});

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
  console.log('action result', gameId, playerId, result)
  if (DEBUG_MODE) {
    return new Response(JSON.stringify({
      id: gameId,
      ...games[gameId],
    }))
  }

  return result
}, { body: 'json' }).wrap('/game/:gameId/actions/pass-turn', send)

app.listen();
console.log('Starting big 2 server on port: ', PORT)