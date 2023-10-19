import { describe, expect, test } from 'bun:test'
import { Game, GameState } from './game'

const mockGameState: GameState = {
  currentPlayerTurn: "player 4",
  playerRotation: [ "player 1", "player 2", "player 3", "player 4" ],
  lastPlayedCards: undefined,
  lastPlayedCardsPlayer: undefined,
  gameStatus: "first-turn",
  players: {
    "player 1": {
      cards: [
        {
          suite: "Diamond",
          value: "9",
        }, {
          suite: "Spade",
          value: "J",
        }, {
          suite: "Club",
          value: "6",
        }, {
          suite: "Club",
          value: "A",
        }, {
          suite: "Spade",
          value: "6",
        }, {
          suite: "Diamond",
          value: "10",
        }, {
          suite: "Diamond",
          value: "A",
        }, {
          suite: "Heart",
          value: "5",
        }, {
          suite: "Heart",
          value: "K",
        }, {
          suite: "Spade",
          value: "A",
        }, {
          suite: "Diamond",
          value: "7",
        }, {
          suite: "Diamond",
          value: "6",
        }, {
          suite: "Club",
          value: "J",
        }
      ],
      name: "player 1",
      status: "empty",
      id: "player 1"
    },
    "player 2": {
      cards: [
        {
          suite: "Spade",
          value: "2",
        }, {
          suite: "Club",
          value: "5",
        }, {
          suite: "Diamond",
          value: "4",
        }, {
          suite: "Club",
          value: "4",
        }, {
          suite: "Heart",
          value: "A",
        }, {
          suite: "Heart",
          value: "9",
        }, {
          suite: "Club",
          value: "9",
        }, {
          suite: "Spade",
          value: "7",
        }, {
          suite: "Diamond",
          value: "8",
        }, {
          suite: "Diamond",
          value: "5",
        }, {
          suite: "Diamond",
          value: "K",
        }, {
          suite: "Spade",
          value: "5",
        }, {
          suite: "Spade",
          value: "3",
        }
      ],
      status: "empty",
      name: "player 2",
      id: "player 2"
    },
    "player 3": {
      cards: [
        {
          suite: "Diamond",
          value: "J",
        }, {
          suite: "Heart",
          value: "2",
        }, {
          suite: "Club",
          value: "3",
        }, {
          suite: "Diamond",
          value: "2",
        }, {
          suite: "Club",
          value: "2",
        }, {
          suite: "Heart",
          value: "8",
        }, {
          suite: "Spade",
          value: "K",
        }, {
          suite: "Spade",
          value: "10",
        }, {
          suite: "Heart",
          value: "4",
        }, {
          suite: "Heart",
          value: "6",
        }, {
          suite: "Club",
          value: "10",
        }, {
          suite: "Spade",
          value: "8",
        }, {
          suite: "Spade",
          value: "9",
        }
      ],
      status: "empty",
      name: "player 3",
      id: "player 3"
    },
    "player 4": {
      cards: [
        {
          suite: "Club",
          value: "7",
        }, {
          suite: "Diamond",
          value: "3",
        }, {
          suite: "Heart",
          value: "Q",
        }, {
          suite: "Diamond",
          value: "Q",
        }, {
          suite: "Heart",
          value: "3",
        }, {
          suite: "Heart",
          value: "10",
        }, {
          suite: "Spade",
          value: "Q",
        }, {
          suite: "Club",
          value: "8",
        }, {
          suite: "Club",
          value: "Q",
        }, {
          suite: "Club",
          value: "K",
        }, {
          suite: "Heart",
          value: "7",
        }, {
          suite: "Spade",
          value: "4",
        }, {
          suite: "Heart",
          value: "J",
        }
      ],
      status: "empty",
      name: "player 4",
      id: "player 4"
    }
  },
  // setNextTurn: [Function: setNextTurn],
  // performAction: [Function: performAction]
}

describe('Game', () => {
  test('initial state', () => {
    const game = new Game()

    Object.values(game.players).forEach((player) => {
      expect(player.cards.length).toBe(13)
      // console.log(player.cards)
      // console.log(game)
    })
  })

  test('start playing game', () => {
    const game = new Game(mockGameState)

    let result = game.performAction('player 4', 'playCards', [
      {
        suite: "Heart",
        value: "3",
      },
      {
        suite: "Diamond",
        value: "3",
      }
    ])

    expect(game.lastPlayedCards).toEqual([
      {
        suite: "Heart",
        value: "3",
      },
      {
        suite: "Diamond",
        value: "3",
      }
    ])
    expect(game.players['player 4'].cards.length).toBe(11)
    expect(game.currentPlayerTurn).toBe('player 1')

    result = game.performAction('player 1', 'playCards', [
      {
        suite: "Spade",
        value: "J",
      },
      {
        suite: "Club",
        value: "J",
      }        
    ])

    expect(game.players['player 1'].cards.length).toBe(11)
    expect(game.currentPlayerTurn).toBe('player 2')
  })
})