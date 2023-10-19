import { Router } from '@stricjs/router';
import { Card, Value, decodemapping }  from './logic'
import { Game } from './game'

console.log("I'm running Bun on port 3000");

const DEBUG_MODE = true
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
    return new Response(JSON.stringify({
      id: uniqueID,
      ...games[uniqueID],
    }))
  }

  return uniqueID
}


const app = new Router({
  port: 3000
});

function decodeCards(cardStr: string[]) {
  return cardStr.map(crdstr => {
    return new Card(
      decodemapping[crdstr.charAt(0)],
      crdstr.charAt(1) as Value
    )
  })
}

app.post('/game', handleCreateGame)
app.post('/game/:gameId/actions/play-cards', (ctx, server) => {
  const { gameId } = ctx.params
  const game = games[gameId]
  console.log(ctx.data)
  const { playerId, cards } = ctx.data
  console.log('body', playerId, cards)
  const decodedCards = decodeCards(cards)
  const result = game.performAction(playerId, 'playCards', decodedCards)
  console.log('action result', gameId, result)
  if (DEBUG_MODE) {
    return new Response(JSON.stringify({
      id: gameId,
      ...games[gameId],
    }))
  }

  return result
}, { body: 'json' })

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
})

app.listen();

// Bun.serve({
//   port: 3000,
//   fetch(request: Request) {
//     console.log(`[${request.method}] ${request.url}`);
//     return new Response("Hello World from CodeSandbox");
//   },

// })
// export default ;
