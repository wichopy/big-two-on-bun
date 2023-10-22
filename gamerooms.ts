import { Game, createGame } from './game'

const rooms = {}

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
    this.players = {}
    this.currentGameId = ''
    this.status = 'waiting'
  }

  getViewerData() {
    return {
      hostName: this.hostName,
      gameCode: this.gameCode,
      viewers: this.viewers,
      players: this.players,
      status: this.status,
    }
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
    this.viewers.push(user)
  }

  leaveRoom(userId: string) {
    this.viewers = this.viewers.filter(user => user.id !== userId)
    delete this.players[userId]
  }

  sitInGameSlot(userId: string, gameSlot: string) {
    const player = {
      userId,
      gameSlot,
      name: this.viewers.find(user => user.id === userId).name
    }
    this.players[userId] = player
    this.viewers = this.viewers.filter(user => user.id !== userId)
  }

  startGame() {
    const game = createGame({
      numPlayers: this.players.size,
    })
    const playerKeys = Object.keys(this.players)
    Object.values(game.game.players).forEach((player, i) => {
      this.players[playerKeys[i]].gameSlot = player.id
    })
    // const game = new Game({
    //   numPlayers: this.players.size,
    // })
    this.currentGameId = game.id
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