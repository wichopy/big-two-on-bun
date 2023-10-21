export const suites = [
  "Spade" as const,
  "Heart" as const,
  "Club" as const,
  "Diamond" as const,
];

export type Suite = (typeof suites)[number];

export const values = [
  "A" as const,
  "K" as const,
  "Q" as const,
  "J" as const,
  "10" as const,
  "9" as const,
  "8" as const,
  "7" as const,
  "6" as const,
  "5" as const,
  "4" as const,
  "3" as const,
  "2" as const,
];

export const valuesForStraights = [
  "2" as const,
  "3" as const,
  "4" as const,
  "5" as const,
  "6" as const,
  "7" as const,
  "8" as const,
  "9" as const,
  "10" as const,
  "J" as const,
  "Q" as const,
  "K" as const,
  "A" as const,
];

export const valuesRankForRest = [
  "3" as const,
  "4" as const,
  "5" as const,
  "6" as const,
  "7" as const,
  "8" as const,
  "9" as const,
  "10" as const,
  "J" as const,
  "Q" as const,
  "K" as const,
  "A" as const,
  "2" as const,
];

export type SuiteSymbols = "D" | "S" | "C" | "H";

export type Value = (typeof values)[number];

export type SuiteValue = `${SuiteSymbols}${Value}`;

const comboRanks = [
  "straight-flush",
  "four-of-a-kind",
  "full-house",
  "flush",
  "straight",
] as const;

type ComboRanks = (typeof comboRanks)[number];

export const decodemapping = {
  'D': 'Diamond',
  'S': 'Spade',
  'C': 'Club',
  'H': 'Heart',
}

export class Card {
  suite: Suite;
  value: Value;

  constructor(suite: Suite, value: Value){
    this.suite = suite;
    this.value = value;
  }

  // serialize() {
  //   return {
  //     suite: this.suite,
  //     value: this.value,
  //   }
  // }
}

export const sortForFlush = (cards: Card[]) => {
  cards.sort((a, b) => {
    return (
      valuesRankForRest.indexOf(a.value) - valuesRankForRest.indexOf(b.value)
    );
  });

  return cards;
};

export const sortForStraight = (cards: Card[]) => {
  cards.sort((a, b) => {
    return (
      valuesForStraights.indexOf(a.value) - valuesForStraights.indexOf(b.value)
    );
  });
  // for A - 5 straights
  if (cards[0].value === "2" && cards[4].value === "A") {
    const popped = cards.pop();
    cards.unshift(popped);
  }
  return cards;
};

export const areAllSameSuite = (cards: Card[]) => {
  const map = {
    Diamond: 0,
    Heart: 0,
    Club: 0,
    Spade: 0,
  };

  cards.forEach((c) => {
    map[c.suite] += 1;
  });

  const firstNonZeroIndex = suites.findIndex((s) => map[s] !== 0);
  return suites.every((s, i) => map[s] === 0 || i === firstNonZeroIndex);
};

export interface ComboCharacteristics {
  rank?: ComboRanks;
  hasTriple: boolean;
  hasQuadruple: boolean;
  tripleValue?: string;
  quadrupleValue?: string;
  flushSuite?: Suite;
  flushHighValue?: string;
  isStraight: boolean;
  straightLowValue?: string;
  straightHighValue?: string;
  straightHighValueSuite?: Suite;
}

export function isStraight(comboValues: string[]) {
  if (
    comboValues[0] === "A" &&
    comboValues[1] === "2" &&
    comboValues[2] === "3" &&
    comboValues[3] === "4" &&
    comboValues[4] === "5"
  ) {
    return true;
  }

  const initialIndex = valuesForStraights.findIndex(
    (v) => v === comboValues[0],
  );
  for (let i = 0; i < 5; i++) {
    if (valuesForStraights[i + initialIndex] !== comboValues[i]) {
      return false;
    }
  }

  return true;
}

export function isHigherOrEqualRank(rank1: ComboRanks, rank2: ComboRanks) {
  return (
    comboRanks.findIndex((r) => r === rank2) <=
    comboRanks.findIndex((r) => r === rank1)
  );
}

export function isHigherRank(rank1: ComboRanks, rank2: ComboRanks) {
  return (
    comboRanks.findIndex((r) => r === rank2) <
    comboRanks.findIndex((r) => r === rank1)
  );
}

export function isHigherValue(val1: Value, val2: Value) {
  return (
    valuesRankForRest.findIndex((v) => v === val2) >
    valuesRankForRest.findIndex((v) => v === val1)
  );
}

export function isHigherSuite(suite1: Suite, suite2: Suite) {
  return (
    suites.findIndex((s) => s === suite2) <
    suites.findIndex((s) => s === suite1)
  );
}

export function getHighestSuite(...suites: Suite[]) {
  return suites[Math.min(...suites.map((suitesIn) => suites.findIndex((s) => s === suitesIn)))];
}

export function getComboCharacteristics(combo: Card[]) {
  const characteristics: ComboCharacteristics = {
    hasTriple: false,
    hasQuadruple: false,
    isStraight: false,
  };
  let rank: ComboRanks;
  const suiteCounter = {
    Diamond: 0,
    Heart: 0,
    Club: 0,
    Spade: 0,
  };
  const valuesTracker = {};
  sortForFlush(combo);
  combo.forEach((c) => {
    suiteCounter[c.suite] += 1;
    if (!valuesTracker[c.value]) {
      valuesTracker[c.value] = 0;
    }
    valuesTracker[c.value] += 1;
  });

  Object.entries(valuesTracker).forEach((entry) => {
    if (entry[1] === 4) {
      characteristics.hasQuadruple = true;
      characteristics.quadrupleValue = entry[0];
      rank = "four-of-a-kind";
    }
    if (entry[1] === 3) {
      characteristics.hasTriple = true;
      characteristics.tripleValue = entry[0];
      rank = "full-house";
    }
  });

  const isSameSuite = areAllSameSuite(combo);
  if (isSameSuite) {
    rank = "flush";
    characteristics.flushSuite = combo[0].suite;
    characteristics.flushHighValue = combo[4].value;
  }

  sortForStraight(combo);
  const isStraightBool = isStraight(combo.map((c) => c.value));
  characteristics.isStraight = isStraightBool;
  if (isStraightBool) {
    characteristics.straightLowValue = combo[0].value;
    characteristics.straightHighValue = combo[4].value;
    characteristics.straightHighValueSuite = combo[4].suite;
  }

  if (isStraightBool && isSameSuite) {
    rank = "straight-flush";
  } else if (isStraightBool) {
    rank = "straight";
  }
  characteristics.rank = rank;
  return characteristics;
}

// https://www.pagat.com/climbing/bigtwo.html
export function isGreaterCombo(cardsOnTable: Card[], cardsToPlay: Card[]) {
  // determine what the current combo is
  const cardsOnTableChars = getComboCharacteristics(cardsOnTable);
  const cardsToPlayChars = getComboCharacteristics(cardsToPlay);

  // straight -> flush -> full house -> 4 of a kind -> straight flush
  if (!isHigherOrEqualRank(cardsOnTableChars.rank, cardsToPlayChars.rank)) {
    return false;
  }

  if (isHigherRank(cardsOnTableChars.rank, cardsToPlayChars.rank)) {
    return true;
  }

  // they are equal, so no we must go by rules for the different combos
  const theRank = cardsOnTableChars.rank;
  if (theRank === "straight") {
    if (
      isHigherValue(
        cardsOnTableChars.straightHighValue,
        cardsToPlayChars.straightHighValue,
      )
    ) {
      return true;
    }
    if (
      cardsOnTableChars.straightHighValue === cardsToPlayChars.straightHighValue
    ) {
      return isHigherSuite(
        cardsOnTableChars.straightHighValueSuite,
        cardsToPlayChars.straightHighValueSuite,
      );
    }

    return false;
  }

  if (theRank === "flush") {
    if (
      isHigherSuite(cardsOnTableChars.flushSuite, cardsToPlayChars.flushSuite)
    ) {
      return true;
    }
    if (cardsOnTableChars.flushSuite === cardsToPlayChars.flushSuite) {
      return isHigherValue(
        cardsOnTableChars.flushHighValue,
        cardsToPlayChars.flushHighValue,
      );
    }
    return false;
  }

  if (theRank === "full-house") {
    return isHigherValue(
      cardsOnTableChars.tripleValue,
      cardsToPlayChars.tripleValue,
    );
  }

  if (theRank === "four-of-a-kind") {
    return isHigherValue(
      cardsOnTableChars.quadrupleValue,
      cardsToPlayChars.quadrupleValue,
    );
  }

  // straight flush
  if (
    isHigherSuite(cardsOnTableChars.flushSuite, cardsToPlayChars.flushSuite)
  ) {
    return true;
  }

  if (cardsOnTableChars.flushSuite === cardsToPlayChars.flushSuite) {
    return isHigherValue(
      cardsOnTableChars.flushHighValue,
      cardsToPlayChars.flushHighValue,
    );
  }

  return false;
}

function isHigherSuiteDoubles(dub1: Card[], dub2: Card[]) {
  const highestInDub1 = getHighestSuite(...dub1.map(c => c.suite))
  const highestInDub2 = getHighestSuite(...dub2.map(c => c.suite))

  return isHigherSuite(highestInDub1, highestInDub2)
}

function isValidCombo(cardsToPlay: Card[]) {
  const chars = getComboCharacteristics(cardsToPlay)

  if (!chars.isStraight && !chars.flushSuite && !chars.hasTriple && !chars.hasQuadruple) {
    return false
  }

  return true
}

export function validatePlay(lastPlayed: Card[] | undefined, currentPlay: Card[]) {
  if (!lastPlayed) {
    if (currentPlay.length < 5) {
      let first = currentPlay[0].value
      if (!currentPlay.every(c => c.value === first)) {
        console.log('not all same value')
        return false
      }

      return true
    }

    return isValidCombo(currentPlay)    
  }

  if (lastPlayed.length !== currentPlay.length) {
    return false;
  }

  if (lastPlayed.length === 5) {
    return isGreaterCombo(lastPlayed, currentPlay);
  }

  if (lastPlayed.length === 2) {
    let first = currentPlay[0].value
    if (!currentPlay.every(c => c.value === first)) {
      console.log('not all same value')
      return false
    }
    return isHigherValue(lastPlayed[0].value, currentPlay[0].value) || isHigherSuiteDoubles(lastPlayed, currentPlay)
  }

  if (lastPlayed.length === 1) {
    return isHigherValue(lastPlayed[0].value, currentPlay[0].value) || isHigherSuite(lastPlayed[0].suite, currentPlay[0].suite);
  }

  let first = currentPlay[0].value
  if (!currentPlay.every(c => c.value === first)) {
    console.log('not all same value')
    return false
  }
  return isHigherValue(lastPlayed[0].value, currentPlay[0].value);
}

export function verifyUserHasCards(playerCards, cards) {
  return cards.every(c => playerCards.find(pc => pc.suite === c.suite && pc.value === c.value))
}