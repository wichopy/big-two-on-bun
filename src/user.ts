interface UserContext {
  userId: string; // Auto assigned by server if annonymous
}

interface GameContext {
  gameId: string; // the game room they are in
  score: number; // score is calculated by how many cards you have left over at the end of the round.
}

type RequestContext = UserContext & GameContext;

interface UserData {
  totalCombos: number;
  totalStraightsPlayed: number;
  totalFlushesPlayed: number;
  totalFullHousesPlayed: number;
  totalFourOfAKindPlayed: number;
  totalDoublesPlayed: number;
  totalSinglesPlayed: number;
  totalPasses: number;
  wins: number;
  sumOfScores: number;
}


// export class Player {
//   name: string;
//   cards: Card[];

//   constructor(name, cards) {
//     this.name = name;
//     this.cards = cards;
//   }

//   pass() {}

//   play(cards: Card[]) {
//     return cards;
//   }

//   removeCardsFromHand(cards: Card[]) {
//     cards.forEach((c) => {
//       const index = this.cards.findIndex((card) => c === card);
//       this.cards.splice(index, 1);
//     });
//   }
// }
