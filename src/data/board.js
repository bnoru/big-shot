export const players = [
  { id: 'red', name: 'Bruno', money: 10, loans: 0 },
  { id: 'blue', name: 'Jogador 2', money: 10, loans: 0 },
  { id: 'gold', name: 'Jogador 3', money: 10, loans: 0 },
  { id: 'ivory', name: 'Jogador 4', money: 10, loans: 0 },
];

// The numbers are internal IDs only. They are intentionally not rendered on the board.
// Clockwise order: 5 top, 4 right, 5 bottom, 4 left = 18 spaces.
export const auctionSpaces = [
  { id: 1, side: 'top', slot: 1 },
  { id: 2, side: 'top', slot: 2 },
  { id: 3, side: 'top', slot: 3 },
  { id: 4, side: 'top', slot: 4 },
  { id: 5, side: 'top', slot: 5 },
  { id: 6, side: 'right', slot: 1 },
  { id: 7, side: 'right', slot: 2 },
  { id: 8, side: 'right', slot: 3 },
  { id: 9, side: 'right', slot: 4 },
  { id: 10, side: 'bottom', slot: 5 },
  { id: 11, side: 'bottom', slot: 4 },
  { id: 12, side: 'bottom', slot: 3 },
  { id: 13, side: 'bottom', slot: 2 },
  { id: 14, side: 'bottom', slot: 1 },
  { id: 15, side: 'left', slot: 4 },
  { id: 16, side: 'left', slot: 3 },
  { id: 17, side: 'left', slot: 2 },
  { id: 18, side: 'left', slot: 1 },
];

export const districts = [
  {
    id: 'gold',
    name: 'Distrito dourado',
    lotIds: ['gold-11', 'gold-10', 'gold-x2', 'gold-9'],
  },
  {
    id: 'blue',
    name: 'Distrito azul',
    lotIds: ['blue-11', 'blue-x2', 'blue-10', 'blue-9'],
  },
  {
    id: 'green',
    name: 'Distrito verde',
    lotIds: ['green-18', 'green-17', 'green-16'],
  },
  {
    id: 'purple',
    name: 'Distrito roxo',
    lotIds: ['purple-20', 'purple-21'],
  },
];

// Coordinates refer to the 926 × 959 source image. The hit circles are intentionally
// centered on the printed value markers rather than trying to redraw the illustrated borders.
export const lots = [
  {
    id: 'gold-11', district: 'gold', value: 11,
    hit: { x: 273, y: 104, r: 74 }, anchor: { x: 273, y: 104 },
    scoringAdjacent: [],
  },
  {
    id: 'gold-10', district: 'gold', value: 10,
    hit: { x: 89, y: 274, r: 72 }, anchor: { x: 89, y: 274 },
    scoringAdjacent: [],
  },
  {
    id: 'gold-x2', district: 'gold', value: 0, multiplier: 2,
    hit: { x: 270, y: 294, r: 68 }, anchor: { x: 270, y: 294 },
    scoringAdjacent: ['gold-9', 'gold-10', 'gold-11'],
  },
  {
    id: 'gold-9', district: 'gold', value: 9,
    hit: { x: 199, y: 385, r: 68 }, anchor: { x: 199, y: 385 },
    scoringAdjacent: [],
  },

  {
    id: 'blue-11', district: 'blue', value: 11,
    hit: { x: 617, y: 102, r: 74 }, anchor: { x: 617, y: 102 },
    scoringAdjacent: [],
  },
  {
    id: 'blue-x2', district: 'blue', value: 0, multiplier: 2,
    hit: { x: 608, y: 294, r: 68 }, anchor: { x: 608, y: 294 },
    scoringAdjacent: ['blue-9', 'blue-10', 'blue-11'],
  },
  {
    id: 'blue-10', district: 'blue', value: 10,
    hit: { x: 799, y: 250, r: 72 }, anchor: { x: 799, y: 250 },
    scoringAdjacent: [],
  },
  {
    id: 'blue-9', district: 'blue', value: 9,
    hit: { x: 710, y: 385, r: 68 }, anchor: { x: 710, y: 385 },
    scoringAdjacent: [],
  },

  {
    id: 'green-18', district: 'green', value: 18,
    hit: { x: 250, y: 571, r: 80 }, anchor: { x: 250, y: 571 },
    scoringAdjacent: [],
  },
  {
    id: 'green-17', district: 'green', value: 17,
    hit: { x: 94, y: 730, r: 80 }, anchor: { x: 94, y: 730 },
    scoringAdjacent: [],
  },
  {
    id: 'green-16', district: 'green', value: 16,
    hit: { x: 320, y: 820, r: 80 }, anchor: { x: 320, y: 820 },
    scoringAdjacent: [],
  },

  {
    id: 'purple-20', district: 'purple', value: 20,
    hit: { x: 747, y: 549, r: 88 }, anchor: { x: 747, y: 549 },
    scoringAdjacent: [],
  },
  {
    id: 'purple-21', district: 'purple', value: 21,
    hit: { x: 712, y: 819, r: 88 }, anchor: { x: 712, y: 819 },
    scoringAdjacent: [],
  },
];

export const lotsById = Object.fromEntries(lots.map((lot) => [lot.id, lot]));
export const districtsById = Object.fromEntries(districts.map((district) => [district.id, district]));
