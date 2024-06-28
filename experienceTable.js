// Define a function to calculate GP gained and new character level
function calculateGainedGPAndLevel(currentXP, newXP) {
  let currentLevel, currentGP, newLevel, newGP;

  const experienceTable = {
    0: { totalPoints: 0, totalGP: 0, gpForThisPoint: 0, characterLevel: 3 },
    1: { totalPoints: 65, totalGP: 65, gpForThisPoint: 65, characterLevel: 3 },
    2: {
      totalPoints: 130,
      totalGP: 130,
      gpForThisPoint: 65,
      characterLevel: 4,
    },
    3: {
      totalPoints: 235,
      totalGP: 235,
      gpForThisPoint: 105,
      characterLevel: 4,
    },
    4: {
      totalPoints: 340,
      totalGP: 340,
      gpForThisPoint: 105,
      characterLevel: 5,
    },
    5: {
      totalPoints: 450,
      totalGP: 450,
      gpForThisPoint: 110,
      characterLevel: 5,
    },
    6: {
      totalPoints: 560,
      totalGP: 560,
      gpForThisPoint: 110,
      characterLevel: 5,
    },
    7: {
      totalPoints: 670,
      totalGP: 670,
      gpForThisPoint: 110,
      characterLevel: 6,
    },
    8: {
      totalPoints: 840,
      totalGP: 840,
      gpForThisPoint: 170,
      characterLevel: 6,
    },
    9: {
      totalPoints: 1010,
      totalGP: 1010,
      gpForThisPoint: 170,
      characterLevel: 6,
    },
    10: {
      totalPoints: 1180,
      totalGP: 1180,
      gpForThisPoint: 170,
      characterLevel: 7,
    },
    11: {
      totalPoints: 1360,
      totalGP: 1360,
      gpForThisPoint: 180,
      characterLevel: 7,
    },
    12: {
      totalPoints: 1540,
      totalGP: 1540,
      gpForThisPoint: 180,
      characterLevel: 7,
    },
    13: {
      totalPoints: 1720,
      totalGP: 1720,
      gpForThisPoint: 180,
      characterLevel: 7,
    },
    14: {
      totalPoints: 1900,
      totalGP: 1900,
      gpForThisPoint: 180,
      characterLevel: 8,
    },
    15: {
      totalPoints: 2150,
      totalGP: 2150,
      gpForThisPoint: 250,
      characterLevel: 8,
    },
    16: {
      totalPoints: 2400,
      totalGP: 2400,
      gpForThisPoint: 250,
      characterLevel: 8,
    },
    17: {
      totalPoints: 2650,
      totalGP: 2650,
      gpForThisPoint: 250,
      characterLevel: 8,
    },
    18: {
      totalPoints: 2900,
      totalGP: 2900,
      gpForThisPoint: 250,
      characterLevel: 9,
    },
    19: {
      totalPoints: 3185,
      totalGP: 3185,
      gpForThisPoint: 285,
      characterLevel: 9,
    },
    20: {
      totalPoints: 3470,
      totalGP: 3470,
      gpForThisPoint: 285,
      characterLevel: 9,
    },
    21: {
      totalPoints: 3755,
      totalGP: 3755,
      gpForThisPoint: 285,
      characterLevel: 9,
    },
    22: {
      totalPoints: 4040,
      totalGP: 4040,
      gpForThisPoint: 285,
      characterLevel: 9,
    },
    23: {
      totalPoints: 4325,
      totalGP: 4325,
      gpForThisPoint: 285,
      characterLevel: 10,
    },
    24: {
      totalPoints: 4725,
      totalGP: 4725,
      gpForThisPoint: 400,
      characterLevel: 10,
    },
    25: {
      totalPoints: 5125,
      totalGP: 5125,
      gpForThisPoint: 400,
      characterLevel: 10,
    },
    26: {
      totalPoints: 5525,
      totalGP: 5525,
      gpForThisPoint: 400,
      characterLevel: 10,
    },
    27: {
      totalPoints: 5925,
      totalGP: 5925,
      gpForThisPoint: 400,
      characterLevel: 10,
    },
    28: {
      totalPoints: 6325,
      totalGP: 6325,
      gpForThisPoint: 400,
      characterLevel: 11,
    },
    29: {
      totalPoints: 6805,
      totalGP: 6805,
      gpForThisPoint: 480,
      characterLevel: 11,
    },
    30: {
      totalPoints: 7285,
      totalGP: 7285,
      gpForThisPoint: 480,
      characterLevel: 11,
    },
    31: {
      totalPoints: 7765,
      totalGP: 7765,
      gpForThisPoint: 480,
      characterLevel: 11,
    },
    32: {
      totalPoints: 8245,
      totalGP: 8245,
      gpForThisPoint: 480,
      characterLevel: 11,
    },
    33: {
      totalPoints: 8725,
      totalGP: 8725,
      gpForThisPoint: 480,
      characterLevel: 11,
    },
    34: {
      totalPoints: 9205,
      totalGP: 9205,
      gpForThisPoint: 480,
      characterLevel: 12,
    },
    35: {
      totalPoints: 9895,
      totalGP: 9895,
      gpForThisPoint: 690,
      characterLevel: 12,
    },
    36: {
      totalPoints: 10585,
      totalGP: 10585,
      gpForThisPoint: 690,
      characterLevel: 12,
    },
    37: {
      totalPoints: 11275,
      totalGP: 11275,
      gpForThisPoint: 690,
      characterLevel: 12,
    },
    38: {
      totalPoints: 11965,
      totalGP: 11965,
      gpForThisPoint: 690,
      characterLevel: 12,
    },
    39: {
      totalPoints: 12655,
      totalGP: 12655,
      gpForThisPoint: 690,
      characterLevel: 12,
    },
    40: {
      totalPoints: 13345,
      totalGP: 13345,
      gpForThisPoint: 690,
      characterLevel: 13,
    },
    41: {
      totalPoints: 14245,
      totalGP: 14245,
      gpForThisPoint: 900,
      characterLevel: 13,
    },
    42: {
      totalPoints: 15145,
      totalGP: 15145,
      gpForThisPoint: 900,
      characterLevel: 13,
    },
    43: {
      totalPoints: 16045,
      totalGP: 16045,
      gpForThisPoint: 900,
      characterLevel: 13,
    },
    44: {
      totalPoints: 16945,
      totalGP: 16945,
      gpForThisPoint: 900,
      characterLevel: 13,
    },
    45: {
      totalPoints: 17845,
      totalGP: 17845,
      gpForThisPoint: 900,
      characterLevel: 13,
    },
    46: {
      totalPoints: 18745,
      totalGP: 18745,
      gpForThisPoint: 900,
      characterLevel: 13,
    },
    47: {
      totalPoints: 19645,
      totalGP: 19645,
      gpForThisPoint: 900,
      characterLevel: 14,
    },
    48: {
      totalPoints: 20955,
      totalGP: 20955,
      gpForThisPoint: 1310,
      characterLevel: 14,
    },
    49: {
      totalPoints: 22265,
      totalGP: 22265,
      gpForThisPoint: 1310,
      characterLevel: 14,
    },
    50: {
      totalPoints: 23575,
      totalGP: 23575,
      gpForThisPoint: 1310,
      characterLevel: 14,
    },
    51: {
      totalPoints: 24885,
      totalGP: 24885,
      gpForThisPoint: 1310,
      characterLevel: 14,
    },
    52: {
      totalPoints: 26195,
      totalGP: 26195,
      gpForThisPoint: 1310,
      characterLevel: 14,
    },
    53: {
      totalPoints: 27505,
      totalGP: 27505,
      gpForThisPoint: 1310,
      characterLevel: 14,
    },
    54: {
      totalPoints: 28815,
      totalGP: 28815,
      gpForThisPoint: 1310,
      characterLevel: 15,
    },
    55: {
      totalPoints: 30515,
      totalGP: 30515,
      gpForThisPoint: 1700,
      characterLevel: 15,
    },
    56: {
      totalPoints: 32215,
      totalGP: 32215,
      gpForThisPoint: 1700,
      characterLevel: 15,
    },
    57: {
      totalPoints: 33915,
      totalGP: 33915,
      gpForThisPoint: 1700,
      characterLevel: 15,
    },
    58: {
      totalPoints: 35615,
      totalGP: 35615,
      gpForThisPoint: 1700,
      characterLevel: 15,
    },
    59: {
      totalPoints: 37315,
      totalGP: 37315,
      gpForThisPoint: 1700,
      characterLevel: 15,
    },
    60: {
      totalPoints: 39015,
      totalGP: 39015,
      gpForThisPoint: 1700,
      characterLevel: 15,
    },
    61: {
      totalPoints: 40715,
      totalGP: 40715,
      gpForThisPoint: 1700,
      characterLevel: 15,
    },
    62: {
      totalPoints: 42415,
      totalGP: 42415,
      gpForThisPoint: 1700,
      characterLevel: 16,
    },
    63: {
      totalPoints: 44995,
      totalGP: 44995,
      gpForThisPoint: 2580,
      characterLevel: 16,
    },
    64: {
      totalPoints: 47575,
      totalGP: 47575,
      gpForThisPoint: 2580,
      characterLevel: 16,
    },
    65: {
      totalPoints: 50155,
      totalGP: 50155,
      gpForThisPoint: 2580,
      characterLevel: 16,
    },
    66: {
      totalPoints: 52735,
      totalGP: 52735,
      gpForThisPoint: 2580,
      characterLevel: 16,
    },
    67: {
      totalPoints: 55315,
      totalGP: 55315,
      gpForThisPoint: 2580,
      characterLevel: 16,
    },
    68: {
      totalPoints: 57895,
      totalGP: 57895,
      gpForThisPoint: 2580,
      characterLevel: 16,
    },
    69: {
      totalPoints: 60475,
      totalGP: 60475,
      gpForThisPoint: 2580,
      characterLevel: 16,
    },
    70: {
      totalPoints: 63055,
      totalGP: 63055,
      gpForThisPoint: 2580,
      characterLevel: 17,
    },
    71: {
      totalPoints: 66615,
      totalGP: 66615,
      gpForThisPoint: 3560,
      characterLevel: 17,
    },
    72: {
      totalPoints: 70175,
      totalGP: 70175,
      gpForThisPoint: 3560,
      characterLevel: 17,
    },
    73: {
      totalPoints: 73735,
      totalGP: 73735,
      gpForThisPoint: 3560,
      characterLevel: 17,
    },
    74: {
      totalPoints: 77295,
      totalGP: 77295,
      gpForThisPoint: 3560,
      characterLevel: 17,
    },
    75: {
      totalPoints: 80855,
      totalGP: 80855,
      gpForThisPoint: 3560,
      characterLevel: 17,
    },
    76: {
      totalPoints: 84415,
      totalGP: 84415,
      gpForThisPoint: 3560,
      characterLevel: 17,
    },
    77: {
      totalPoints: 87975,
      totalGP: 87975,
      gpForThisPoint: 3560,
      characterLevel: 17,
    },
    78: {
      totalPoints: 91535,
      totalGP: 91535,
      gpForThisPoint: 3560,
      characterLevel: 17,
    },
    79: {
      totalPoints: 95095,
      totalGP: 95095,
      gpForThisPoint: 3560,
      characterLevel: 18,
    },
    80: {
      totalPoints: 100875,
      totalGP: 100875,
      gpForThisPoint: 5780,
      characterLevel: 18,
    },
    81: {
      totalPoints: 106655,
      totalGP: 106655,
      gpForThisPoint: 5780,
      characterLevel: 18,
    },
    82: {
      totalPoints: 112435,
      totalGP: 112435,
      gpForThisPoint: 5780,
      characterLevel: 18,
    },
    83: {
      totalPoints: 118215,
      totalGP: 118215,
      gpForThisPoint: 5780,
      characterLevel: 18,
    },
    84: {
      totalPoints: 123995,
      totalGP: 123995,
      gpForThisPoint: 5780,
      characterLevel: 18,
    },
    85: {
      totalPoints: 129775,
      totalGP: 129775,
      gpForThisPoint: 5780,
      characterLevel: 18,
    },
    86: {
      totalPoints: 135555,
      totalGP: 135555,
      gpForThisPoint: 5780,
      characterLevel: 18,
    },
    87: {
      totalPoints: 141335,
      totalGP: 141335,
      gpForThisPoint: 5780,
      characterLevel: 18,
    },
    88: {
      totalPoints: 147115,
      totalGP: 147115,
      gpForThisPoint: 5780,
      characterLevel: 19,
    },
    89: {
      totalPoints: 155990,
      totalGP: 155990,
      gpForThisPoint: 8875,
      characterLevel: 19,
    },
    90: {
      totalPoints: 164865,
      totalGP: 164865,
      gpForThisPoint: 8875,
      characterLevel: 19,
    },
    91: {
      totalPoints: 173740,
      totalGP: 173740,
      gpForThisPoint: 8875,
      characterLevel: 19,
    },
    92: {
      totalPoints: 182615,
      totalGP: 182615,
      gpForThisPoint: 8875,
      characterLevel: 19,
    },
    93: {
      totalPoints: 191490,
      totalGP: 191490,
      gpForThisPoint: 8875,
      characterLevel: 19,
    },
    94: {
      totalPoints: 200365,
      totalGP: 200365,
      gpForThisPoint: 8875,
      characterLevel: 19,
    },
    95: {
      totalPoints: 209240,
      totalGP: 209240,
      gpForThisPoint: 8875,
      characterLevel: 19,
    },
    96: {
      totalPoints: 218115,
      totalGP: 218115,
      gpForThisPoint: 8875,
      characterLevel: 19,
    },
    97: {
      totalPoints: 226990,
      totalGP: 226990,
      gpForThisPoint: 8875,
      characterLevel: 19,
    },
    98: {
      totalPoints: 235865,
      totalGP: 235865,
      gpForThisPoint: 8875,
      characterLevel: 20,
    },
    99: {
      totalPoints: 245865,
      totalGP: 245865,
      gpForThisPoint: 10000,
      characterLevel: 20,
    },
    100: {
      totalPoints: 255865,
      totalGP: 255865,
      gpForThisPoint: 10000,
      characterLevel: 20,
    },
    101: {
      totalPoints: 265865,
      totalGP: 265865,
      gpForThisPoint: 10000,
      characterLevel: 20,
    },
    102: {
      totalPoints: 275865,
      totalGP: 275865,
      gpForThisPoint: 10000,
      characterLevel: 20,
    },
    103: {
      totalPoints: 285865,
      totalGP: 285865,
      gpForThisPoint: 10000,
      characterLevel: 20,
    },
    104: {
      totalPoints: 295865,
      totalGP: 295865,
      gpForThisPoint: 10000,
      characterLevel: 20,
    },
    105: {
      totalPoints: 305865,
      totalGP: 305865,
      gpForThisPoint: 10000,
      characterLevel: 20,
    },
    106: {
      totalPoints: 315865,
      totalGP: 315865,
      gpForThisPoint: 10000,
      characterLevel: 20,
    },
    107: {
      totalPoints: 325865,
      totalGP: 325865,
      gpForThisPoint: 10000,
      characterLevel: 20,
    },
    108: {
      totalPoints: 335865,
      totalGP: 335865,
      gpForThisPoint: 10000,
      characterLevel: 20,
    },
    109: {
      totalPoints: 345865,
      totalGP: 345865,
      gpForThisPoint: 10000,
      characterLevel: 20,
    },
    110: {
      totalPoints: 355865,
      totalGP: 355865,
      gpForThisPoint: 10000,
      characterLevel: 20,
    },
    111: {
      totalPoints: 365865,
      totalGP: 365865,
      gpForThisPoint: 10000,
      characterLevel: 20,
    },
    112: {
      totalPoints: 375865,
      totalGP: 375865,
      gpForThisPoint: 10000,
      characterLevel: 20,
    },
    113: {
      totalPoints: 385865,
      totalGP: 385865,
      gpForThisPoint: 10000,
      characterLevel: 20,
    },
    114: {
      totalPoints: 395865,
      totalGP: 395865,
      gpForThisPoint: 10000,
      characterLevel: 20,
    },
    115: {
      totalPoints: 405865,
      totalGP: 405865,
      gpForThisPoint: 10000,
      characterLevel: 20,
    },
    116: {
      totalPoints: 415865,
      totalGP: 415865,
      gpForThisPoint: 10000,
      characterLevel: 20,
    },
    117: {
      totalPoints: 425865,
      totalGP: 425865,
      gpForThisPoint: 10000,
      characterLevel: 20,
    },
    118: {
      totalPoints: 435865,
      totalGP: 435865,
      gpForThisPoint: 10000,
      characterLevel: 20,
    },
    119: {
      totalPoints: 445865,
      totalGP: 445865,
      gpForThisPoint: 10000,
      characterLevel: 20,
    },
    120: {
      totalPoints: 455865,
      totalGP: 455865,
      gpForThisPoint: 10000,
      characterLevel: 20,
    },
    121: {
      totalPoints: 465865,
      totalGP: 465865,
      gpForThisPoint: 10000,
      characterLevel: 20,
    },
    122: {
      totalPoints: 475865,
      totalGP: 475865,
      gpForThisPoint: 10000,
      characterLevel: 20,
    },
    123: {
      totalPoints: 485865,
      totalGP: 485865,
      gpForThisPoint: 10000,
      characterLevel: 20,
    },
    124: {
      totalPoints: 495865,
      totalGP: 495865,
      gpForThisPoint: 10000,
      characterLevel: 20,
    },
    125: {
      totalPoints: 505865,
      totalGP: 505865,
      gpForThisPoint: 10000,
      characterLevel: 20,
    },
    126: {
      totalPoints: 515865,
      totalGP: 515865,
      gpForThisPoint: 10000,
      characterLevel: 20,
    },
    127: {
      totalPoints: 525865,
      totalGP: 525865,
      gpForThisPoint: 10000,
      characterLevel: 20,
    },
    128: {
      totalPoints: 535865,
      totalGP: 535865,
      gpForThisPoint: 10000,
      characterLevel: 20,
    },
    129: {
      totalPoints: 545865,
      totalGP: 545865,
      gpForThisPoint: 10000,
      characterLevel: 20,
    },
    130: {
      totalPoints: 555865,
      totalGP: 555865,
      gpForThisPoint: 10000,
      characterLevel: 20,
    },
    131: {
      totalPoints: 565865,
      totalGP: 565865,
      gpForThisPoint: 10000,
      characterLevel: 20,
    },
    132: {
      totalPoints: 575865,
      totalGP: 575865,
      gpForThisPoint: 10000,
      characterLevel: 20,
    },
    133: {
      totalPoints: 585865,
      totalGP: 585865,
      gpForThisPoint: 10000,
      characterLevel: 20,
    },
    134: {
      totalPoints: 595865,
      totalGP: 595865,
      gpForThisPoint: 10000,
      characterLevel: 20,
    },
    135: {
      totalPoints: 605865,
      totalGP: 605865,
      gpForThisPoint: 10000,
      characterLevel: 20,
    },
  };

  // Find current level and GP
  for (let xp in experienceTable) {
    if (parseInt(xp) <= currentXP) {
      currentLevel = experienceTable[xp].characterLevel;
      currentGP = experienceTable[xp].totalGP;
    } else {
      break;
    }
  }

  // Find new level and GP
  for (let xp in experienceTable) {
    if (parseInt(xp) <= newXP) {
      newLevel = experienceTable[xp].characterLevel;
      newGP = experienceTable[xp].totalGP;
    } else {
      break;
    }
  }

  // Calculate GP gained and new character level
  const gpGained = newGP - currentGP;
  const characterLevel = newLevel;

  return { gpGained, characterLevel };
}

// // Example usage:
// const currentXP = 0;
// const newXP = 2;

// const result = calculateGainedGPAndLevel(experienceTable, currentXP, newXP);
// console.log(`GP Gained: ${result.gpGained}`);
// console.log(`New Character Level: ${result.characterLevel}`);
// export { calculateGainedGPAndLevel };

module.exports = calculateGainedGPAndLevel;
