import { Card, Suite, Value } from './logic'

export class Deck {
  cards: Card[]
  constructor() {
    this.cards = []
    const suites: Suite[] = ['Diamond', 'Spade', 'Club', 'Heart']
    const values: Value[] = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K','A', '2']
    for (let suite of suites) {
      for (let value of values) {
        this.cards.push(new Card(suite, value))
      }
    }

    // shuffle deck
    this.cards.sort(() => Math.random() - 0.25)
    this.cards.sort(() => Math.random() - 0.5)
    this.cards.sort(() => Math.random() - 0.75)
  }

  draw(): Card {
    return this.cards.pop()
  }
}
