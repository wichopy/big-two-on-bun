import { Card } from './logic'
import { Game, createGame, getGame } from './game'

interface User {
  id: string
  name: string
}

interface Player {
  gameSlot: string
  userId: string
  name: string
}

function generateGameCode() {
  return Math.random().toString(36).substring(2, 6).toUpperCase()
}

const store: Record<string, Room> = {}

interface GameRoom {
  currentGameId: string
  // If room is empty, delete room
  hostId: string // the user id that created the room, or if he leaves, randomly pick someone else in the room
  players: Map<string, Player>
  password?: string
  gameCode: string
  viewers: User[]
}
// a game room houses a game instance and its players

// players join game rooms in order to play

// with a game state, a game instane can be created if the game room server ever fails

type RoomStatus = 'waiting' | 'playing'

export class Room {
  hostId: string
  hostName: string
  currentGameId: string
  gameCode: string
  viewers: User[]
  players: Record<string, Player>
  status: RoomStatus

  constructor({
    hostId,
    hostName,
  }: {
    hostId: string
    hostName: string
  }) {
    this.gameCode = generateGameCode()
    this.hostId = hostId
    this.hostName = hostName
    this.viewers = []
    this.players = {
      'player 1': null,
      'player 2': null,
      'player 3': null,
      'player 4': null,
    }
    this.currentGameId = ''
    this.status = 'waiting'
  }

  isInRoom(userId: string) {
    return this.hostId === userId || this.isViewer(userId) || this.isPlayer(userId)
  }

  isViewer(userId: string) {
    return this.viewers.some(user => user.id === userId)
  }

  isPlayer(userId: string) {
    return Object.values(this.players).some(player => player.userId === userId)
  }

  joinRoom(user: User) {
    console.log('adding user', user, 'to game', this.gameCode)
    this.viewers.push(user)
  }

  // Handle what happens in mid game??
  leaveRoom(userId: string) {
    this.viewers = this.viewers.filter(user => user.id !== userId)
    const entry = Object.entries(this.players).find(entry => entry[1].userId === userId)
    if (entry) {
      delete this.players[entry[0]]
    }
  }

  unsitFromGameSlot(userId: string) {
    // Can only do when game is not in progress
    if (this.currentGameId) {
      throw new Error('cannot unsit from game slot when game is in progress')
    }

    if (!this.isPlayer(userId)) {
      throw new Error('user is not a player')
    }

    if (this.status !== 'waiting') {
      throw new Error('cannot unsit from game slot when game is in progress')
    }

    const slot = Object.entries(this.players).find(entry => entry[1].userId === userId)[0]
    this.viewers.push({
      id: this.players[slot].userId,
      name: this.players[slot].name,
    })
    this.players[slot] = null
  }

  sitInGameSlot(userId: string, gameSlot: string) {
    console.log(`add player ${userId} to slot ${gameSlot}`)
    const validUserIds = [this.hostId, ...this.viewers.map(user => user.id)]
    if (!validUserIds.find(id => id === userId)) {
      throw new Error('user is not a viewer or host')
    }
    
    const player = {
      userId,
      gameSlot,
      name: this.viewers.find(user => user.id === userId)?.name || this.hostName
    }
    this.players[gameSlot] = player
    this.viewers = this.viewers.filter(user => user.id !== userId)
  }

  startGame() {
    if (!!this.currentGameId) {
      throw new Error('game already started')
    }
  
    const slotstokeep = Object.entries(this.players).map(entry => entry[1] ? entry[0] : null).filter(Boolean)
    const game = createGame({
      numPlayers: slotstokeep.length,
      slotsToKeep: slotstokeep,
    })
    this.currentGameId = game.id
    this.status === 'playing'
  }

  getSlotByPlayerId(userId: string) {
    return Object.keys(this.players).find(key => this.players[key].userId === userId)
  }

  playCards(userId: string, cards: Card[]) {
    const game = getGame(this.currentGameId)
    const slot = this.getSlotByPlayerId(userId)
    if (game.currentPlayerTurn !== slot) {
      throw new Error('not your turn')
    }
    const result = game.performAction(slot, 'playCards', cards)
    if (result === 'game-over') {
      this.status = 'waiting'
      this.currentGameId = ''
    }
    return result
  }

  passTurn(userId: string) {
    const game = getGame(this.currentGameId)
    const slot = this.getSlotByPlayerId(userId)
    const result = game.performAction(slot, 'passTurn')
    return result
  }

  getViewerData() {
    const game = getGame(this.currentGameId)
    return {
      hostName: this.hostName,
      gameCode: this.gameCode,
      viewers: this.viewers,
      players: this.players,
      roomStatus: this.status,
      ...game.getViewerData(),
    }
  }

  getPlayerUpdate(slot) {
    const game = getGame(this.currentGameId)
    return {
      ...game.getPlayerData(slot),
      slot,
    }
  }
}

export function handleNewRoom(userId: string, userName: string) {
  console.log('creating new room')
  const room = new Room({
    hostId: userId,
    hostName: userName,
  })

  store[room.gameCode] = room
  console.log(`new room stored at ${room.gameCode}`)
  return room
}

export function joinRoomByGameCode(gameCode: string, userId: string, userName: string) {
  const room = store[gameCode]
  if (!room) {
    throw new Error('room does not exist')
  }

  room.joinRoom({
    id: userId,
    name: userName,
  })

  return room
}

export function readRoom(gameCode) {
  return store[gameCode]
}

export function startGame(gameCode: string) {
  const room = store[gameCode]

  room.startGame()
}

export function getRoomIdByGameId(gameId: string) {
  return Object.entries(store).find(entry => entry[1].currentGameId === gameId)?.[1]
}