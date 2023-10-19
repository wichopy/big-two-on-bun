import { describe, expect, test } from "bun:test";
import {
  Card,
  isStraight,
  isGreaterCombo,
  getComboCharacteristics,
  sortForStraight,
  areAllSameSuite,
} from "./logic";

describe("areAllSameSuite", () => {
  test("returns true if all cards are the same suite", () => {
    expect(
      areAllSameSuite([
        {
          suite: "Club",
          value: "2",
        },
        {
          suite: "Club",
          value: "3",
        },
        {
          suite: "Club",
          value: "4",
        },
      ]),
    ).toBe(true);
  });
  test("returns false if not all cards are the same suite", () => {
    expect(
      areAllSameSuite([
        {
          suite: "Diamond",
          value: "2",
        },
        {
          suite: "Club",
          value: "3",
        },
        {
          suite: "Club",
          value: "4",
        },
      ]),
    ).toBe(false);
  });
});

describe("sorting", () => {
  test("should sort cards by value", () => {
    expect(
      sortForStraight([
        {
          suite: "Diamond",
          value: "3",
        },
        {
          suite: "Club",
          value: "2",
        },
        {
          suite: "Spade",
          value: "5",
        },
        {
          suite: "Heart",
          value: "4",
        },
        {
          suite: "Diamond",
          value: "6",
        },
      ]),
    ).toStrictEqual([
      {
        suite: "Club",
        value: "2",
      },
      {
        suite: "Diamond",
        value: "3",
      },
      {
        suite: "Heart",
        value: "4",
      },
      {
        suite: "Spade",
        value: "5",
      },
      {
        suite: "Diamond",
        value: "6",
      },
    ]);
  });

  test("A low straight", () => {
    expect(
      sortForStraight([
        {
          suite: "Diamond",
          value: "A",
        },
        {
          suite: "Club",
          value: "2",
        },
        {
          suite: "Spade",
          value: "5",
        },
        {
          suite: "Heart",
          value: "4",
        },
        {
          suite: "Diamond",
          value: "3",
        },
      ]),
    ).toStrictEqual([
      {
        suite: "Diamond",
        value: "A",
      },
      {
        suite: "Club",
        value: "2",
      },
      {
        suite: "Diamond",
        value: "3",
      },
      {
        suite: "Heart",
        value: "4",
      },
      {
        suite: "Spade",
        value: "5",
      },
    ]);
  });
});

const straight26: Card[] = [
  {
    suite: "Club",
    value: "2",
  },
  {
    suite: "Diamond",
    value: "3",
  },
  {
    suite: "Heart",
    value: "4",
  },
  {
    suite: "Spade",
    value: "5",
  },
  {
    suite: "Diamond",
    value: "6",
  },
];
const straight7J: Card[] = [
  {
    suite: "Club",
    value: "7",
  },
  {
    suite: "Diamond",
    value: "8",
  },
  {
    suite: "Heart",
    value: "9",
  },
  {
    suite: "Spade",
    value: "10",
  },
  {
    suite: "Diamond",
    value: "J",
  },
];
const straightFlush37Diamond: Card[] = [
  {
    suite: "Diamond",
    value: "3",
  },
  {
    suite: "Diamond",
    value: "4",
  },
  {
    suite: "Diamond",
    value: "5",
  },
  {
    suite: "Diamond",
    value: "6",
  },
  {
    suite: "Diamond",
    value: "7",
  },
];
const straightFlush10ASpade: Card[] = [
  {
    suite: "Spade",
    value: "A",
  },
  {
    suite: "Spade",
    value: "K",
  },
  {
    suite: "Spade",
    value: "Q",
  },
  {
    suite: "Spade",
    value: "J",
  },
  {
    suite: "Spade",
    value: "10",
  },
];
const fourofakind: Card[] = [
  {
    value: "4",
    suite: "Club",
  },
  {
    value: "4",
    suite: "Diamond",
  },
  {
    value: "4",
    suite: "Spade",
  },
  {
    value: "4",
    suite: "Heart",
  },
  {
    value: "3",
    suite: "Club",
  },
];

describe("getComboCharacteristics", () => {
  test("straight flush", () => {
    expect(getComboCharacteristics(straightFlush10ASpade)).toEqual({
      flushSuite: "Spade",
      hasQuadruple: false,
      hasTriple: false,
      isStraight: true,
      flushHighValue: "A",
      straightHighValueSuite: "Spade",
      rank: "straight-flush",
      straightHighValue: "A",
      straightLowValue: "10",
    });
  });

  test("four of a kind", () => {
    expect(getComboCharacteristics(fourofakind)).toEqual({
      hasQuadruple: true,
      quadrupleValue: "4",
      hasTriple: false,
      isStraight: false,
      rank: "four-of-a-kind",
    });
  });
});

describe("isStraight", () => {
  test("detects an A starting straight", () => {
    expect(isStraight(["A", "2", "3", "4", "5"])).toBe(true);
  });

  test("detects a 3 starting straight", () => {
    expect(isStraight(["3", "4", "5", "6", "7"])).toBe(true);
  });

  test("detects a 10 starting straight", () => {
    expect(isStraight(["10", "J", "Q", "K", "A"])).toBe(true);
  });

  test("reject non straights", () => {
    expect(isStraight(["9", "J", "Q", "K", "A"])).toBe(false);
  });

  test("reject non straights", () => {
    expect(isStraight(["6", "8", "9", "J", "Q"])).toBe(false);
  });
});

describe("compareCombos", () => {
  test("the ranks", () => {
    expect(isGreaterCombo(straightFlush37Diamond, fourofakind)).toBe(false);
    expect(isGreaterCombo(straight7J, fourofakind)).toBe(true);
  });
  test("straights", () => {
    expect(isGreaterCombo(straight26, straight7J)).toBe(true);
  });
  test.todo("flushes");
  test.todo("full houses");
  test.todo("fourofakind");
  test("straight flushes", () => {
    expect(isGreaterCombo(straightFlush37Diamond, straightFlush10ASpade)).toBe(
      true,
    );
  });
});
