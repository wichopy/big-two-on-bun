import { Card, validatePlay, verifyUserHasCards, sortForFlush } from './logic';
import { Deck } from './deck';

type PlayerStatus = 'empty' | 'filled'

type Actions = 'playCards' | 'passTurn' | 'playPowerup'

type GameStatus = 
  // waiting for game to start
  'waiting'
  // its the first turn, so the player with the diamond 3 goes first
  | 'first-turn'
  // game is in progress
  | 'in-progress'
  // game is over, need to start a new game
  | 'over'

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
  log: string[];
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
  log: string[];
  gameStatus: GameStatus
  players: {
    [playerId: string]: {
      cards: Card[]
      status: PlayerStatus
      name: string
      id: string
    }
  }

  constructor({
    numPlayers = 4,
    gameState,
  }:{
    numPlayers?: number
    gameState?: GameState
  } = {}) {
    if (gameState) {
      this.currentPlayerTurn = gameState.currentPlayerTurn;
      this.playerRotation = gameState.playerRotation;
      this.lastPlayedCards = gameState.lastPlayedCards;
      this.lastPlayedCardsPlayer = gameState.lastPlayedCardsPlayer;
      this.players = gameState.players;
      this.gameStatus = gameState.gameStatus;
      this.log = gameState.log;
      return
    }

    if (numPlayers < 2 || numPlayers > 4) {
      throw new Error('invalid number of players')
    }
    // take cards, shuffle deck, deal to players
    // find player with diamond 3, they are the first to start
    this.currentPlayerTurn = ''; // person with diamond 3
    const deck = new Deck();
    this.players = {}
    this.log = []
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

    this.log.push('A new game was started')

    Object.entries(this.players).forEach(entry => {
      if (entry[1].cards.find(c => c.suite === 'Diamond' && c.value === '3')) {
        this.currentPlayerTurn = entry[0]
        this.log.push(`${this.currentPlayerTurn} goes first.`)
      }
    })

    if (numPlayers < 4) {
      let deleteCount = 0
      for (let player of Object.values(this.players)) {
        if (deleteCount < 4 - numPlayers && this.currentPlayerTurn !== player.id) {
          console.log('delete player', player)
          delete this.players[player.id]
          deleteCount += 1
        }
      }
    }
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

  // This method is for better UX. Certain moves are guarenteed to not be beatable, so we shouldnt wait for everyone to pass on these.
  // Be careful here as we dont want to expose people's hands unintentionally, this should only apply in 2 cases:
  // - the big 2 is played
  // - Someone plays multiple cards, and everyone else has less cards than the played cards
  private setToNextTurnWithValidMoves() {
    if (this.lastPlayedCards?.length === 1 && this.lastPlayedCards[0].value === '2' && this.lastPlayedCards[0].suite === 'Spade') {
      // same players turn again
      this.log.push(`big 2 was played, so player ${this.currentPlayerTurn} goes again`)
      return
    }

    if (this.lastPlayedCards?.length > 1) {
      this.setNextTurn()
      console.log('set next player', this.currentPlayerTurn)
      this.log.push(`It is now ${this.currentPlayerTurn}'s turn`)
      while (this.players[this.currentPlayerTurn].cards.length < this.lastPlayedCards.length) {
        if (this.currentPlayerTurn === this.lastPlayedCardsPlayer) {
          console.log('or its your turn again', this.currentPlayerTurn !== this.lastPlayedCardsPlayer)
          this.log.push(`No one had enough cards, its ${this.currentPlayerTurn}'s turn again`)
          return
        }
        console.log(this.currentPlayerTurn, ' has number of cards', this.players[this.currentPlayerTurn].cards.length, ' which is less than', this.lastPlayedCards.length)
        this.log.push(`${this.currentPlayerTurn} doesnt have enough cards, skip to next player`)
        this.setNextTurn()
        console.log('finding the next player with enough cards to counter', this.currentPlayerTurn)
        this.log.push(`It is now ${this.currentPlayerTurn}'s turn`)
      }
      return
    }

    this.setNextTurn()
    this.log.push(`It is now ${this.currentPlayerTurn}'s turn`)
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
        if (!validatePlay(undefined, cards)){
          return ErrorInvalidPlay
        }
        this.gameStatus = 'in-progress'
        this.lastPlayedCards = cards
        this.lastPlayedCardsPlayer = playerId
        this.players[playerId].cards = this.players[playerId].cards.filter(c => !cards.find(cd => cd.suite === c.suite && cd.value === c.value))
        this.log.push(`player ${playerId} played cards ${cards.map(c => `${c.value} ${c.suite}`)} `)
        if (this.players[playerId].cards.length === 0) {
          this.log.push(`Game is over, player ${playerId} won!`)
          this.gameStatus = 'over'
          return GameOver
        }
        this.setToNextTurnWithValidMoves()
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
      this.log.push(`player ${playerId} passed their turn`)
      this.setToNextTurnWithValidMoves()
      return PassTurn
    }
  }
}
