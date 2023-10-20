import { Card, validatePlay, verifyUserHasCards, sortForFlush } from './logic';
import { Deck } from './deck';

type PlayerStatus = 'empty' | 'filled'

type Actions = 'playCards' | 'passTurn' | 'playPowerup'

type GameStatus = 'first-turn' | 'in-progress' | 'over'

const ErrorInvalidPlay = 'invalid-play' as const
const ErrorDontHaveCards = 'dont-have-cards' as const
const ErrorNoCards = 'no-cards' as const
const SuccessValidPlay = 'valid-play' as const
const PassTurn = 'pass-turn' as const
const GameOver = 'game-over' as const

export interface GameState {
  currentPlayerTurn: string;
  playerRotation: string[];
  lastPlayedCards?: Card[];
  lastPlayedCardsPlayer?: string;
  gameStatus: GameStatus
  players: {
    [playerId: string]: {
      cards: Card[]
      status: PlayerStatus
      name: string
      id: string
    }
  }
}

export class Game {
  currentPlayerTurn: string;
  playerRotation: string[];
  lastPlayedCards?: Card[];
  lastPlayedCardsPlayer?: string;
  gameStatus: GameStatus
  players: {
    [playerId: string]: {
      cards: Card[]
      status: PlayerStatus
      name: string
      id: string
    }
  }

  constructor(gameState?: GameState) {
    if (gameState) {
      this.currentPlayerTurn = gameState.currentPlayerTurn;
      this.playerRotation = gameState.playerRotation;
      this.lastPlayedCards = gameState.lastPlayedCards;
      this.lastPlayedCardsPlayer = gameState.lastPlayedCardsPlayer;
      this.players = gameState.players;
      this.gameStatus = gameState.gameStatus;

      return
    }
    // take cards, shuffle deck, deal to players
    // find player with diamond 3, they are the first to start
    this.currentPlayerTurn = ''; // person with diamond 3
    const deck = new Deck();
    this.players = {}
    this.players['player 1'] = {
      cards: [],
      name: 'player 1',
      status: 'empty',
      id: 'player 1'
    }
    this.players['player 2'] = {
      cards: [],
      status: 'empty',
      name: 'player 2',
      id: 'player 2'
    }
    this.players['player 3'] = {
      cards: [],
      status: 'empty',
      name: 'player 3',
      id: 'player 3'
    }
    this.players['player 4'] = {
      cards: [],
      status: 'empty',
      name: 'player 4',
      id: 'player 4'
    }
  
    while(deck.cards.length > 0) {
      for (let playerId in this.players) {
        this.players[playerId].cards.push(deck.draw())
      }
    }

    Object.values(this.players).forEach(player => {
      sortForFlush(player.cards)
    })

    Object.entries(this.players).forEach(entry => {
      if (entry[1].cards.find(c => c.suite === 'Diamond' && c.value === '3')) {
        this.currentPlayerTurn = entry[0]
      }
    })

    this.playerRotation = Object.keys(this.players)
    this.gameStatus = 'first-turn'
  }

  private setNextTurn() {
    const currentplayerindex = this.playerRotation.findIndex(
      (p) => p === this.currentPlayerTurn,
    );
    if (currentplayerindex === this.playerRotation.length - 1) {
      this.currentPlayerTurn = this.playerRotation[0];
    } else {
      this.currentPlayerTurn = this.playerRotation[currentplayerindex + 1];
    }
  }

  public performAction(playerId: string, action: Actions, cards?: Card[]) {
    if (action === 'playCards') {
      if (!cards?.length) {
        return ErrorNoCards
      }
      
      if (
        this.lastPlayedCards && validatePlay(this.lastPlayedCards, cards) ||
        this.lastPlayedCardsPlayer === playerId ||
        this.gameStatus === 'first-turn'
      ) {
        if (!verifyUserHasCards(this.players[playerId].cards, cards)) {
          return ErrorDontHaveCards
        }
        this.gameStatus = 'in-progress'
        this.lastPlayedCards = cards
        this.lastPlayedCardsPlayer = playerId
        this.players[playerId].cards = this.players[playerId].cards.filter(c => !cards.find(cd => cd.suite === c.suite && cd.value === c.value))
        if (this.players[playerId].cards.length === 0) {
          this.gameStatus = 'over'
          return GameOver
        }
        this.setNextTurn()
        // TODO: Autopass players turns if they don't have any possible moves
        return SuccessValidPlay
      } else {
        return ErrorInvalidPlay
      }
    }

    if (action === 'passTurn') {
      if (this.gameStatus === 'first-turn' || this.lastPlayedCardsPlayer === playerId) {
        console.log('you cannot pass this turn')
        return ErrorInvalidPlay
      }
      this.setNextTurn()
      return PassTurn
    }
  }
}
