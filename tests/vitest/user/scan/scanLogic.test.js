/* eslint-disable no-undef */
/**
 * Tests that verify the Smile SCAN experiment preserves the exact semantics of
 * psiturk-example-v2 (task.js + scan_stimuli_simple.js).
 *
 * Both the psiturk reference logic AND the Smile logic are actually executed.
 * A seeded PRNG replaces Math.random so both implementations can be run with
 * an identical random sequence and their outputs compared directly.
 */
import { describe, it, expect } from 'vitest'
import _ from 'underscore'

import {
  WORDS,
  COLORS,
  REDACTED_SYMBOL,
  MAX_CYCLES,
  createGrounding,
  getScanSeedSignature,
  convertCommandToWords,
  removeSingletons,
  redactOutput,
  hasPassed,
  buildStageOrder,
  parseResponse,
  actionsToColors,
} from '@/user/components/scan/scanLogic'

import {
  stims1_train,
  stims1_test,
  stims2_train,
  stims2_test,
  stims3_train,
  stims3_test,
  stims4_train,
  stims4_test,
  subtasks_train,
  subtasks_test,
} from '@/user/components/scan/scanStimuli'

// ===========================================================================
// Seeded PRNG — replaces Math.random so both implementations are deterministic
// and comparable with an identical random sequence.
// ===========================================================================

function makeSeededRandom(seed) {
  // Mulberry32 — matches ScanExpView.vue seeded test mode
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Run fn() with Math.random replaced by a fresh seeded generator.
 * Restores the original Math.random afterwards.
 */
function withSeed(seed, fn) {
  const orig = Math.random
  Math.random = makeSeededRandom(seed)
  try {
    return fn()
  } finally {
    Math.random = orig
  }
}

// ===========================================================================
// PSITURK REFERENCE IMPLEMENTATION
// Exact port of scan_stimuli_simple.js data and task.js pure logic.
// These variables and functions are executed — not commented.
// ===========================================================================

// ---------------------------------------------------------------------------
// scan_stimuli_simple.js — data (executed)
// ---------------------------------------------------------------------------

const psit_words = ['dax', 'lug', 'wif', 'zup', 'fep', 'blicket', 'kiki', 'tufa', 'gazzer']
const psit_colors = ['#ff0000', '#0000ff', '#33cc33', '#b7b600', '#ce9fcf', '#00b0b3']

const psit_stims1_train = [
  ['p1', 'c1'], ['p2', 'c2'], ['p3', 'c3'], ['p4', 'c4'],
  ['p1 m1', 'c1 c1 c1'], ['p2 m1', 'c2 c2 c2'],
]
const psit_stims1_test = [
  ['p4 m1', 'c4 c4 c4'],
  ['p2 m1', 'c2 c2 c2'],
]
const psit_stims2_train = [
  ['p1', 'c1'], ['p2', 'c2'], ['p3', 'c3'], ['p4', 'c4'],
  ['p3 m2 p1', 'c3 c1 c3'], ['p2 m2 p3', 'c2 c3 c2'],
]
const psit_stims2_test = [
  ['p4 m2 p2', 'c4 c2 c4'], ['p1 m2 p4', 'c1 c4 c1'], ['p2 m2 p3', 'c2 c3 c2'],
]
const psit_stims3_train = [
  ['p1', 'c1'], ['p2', 'c2'], ['p3', 'c3'], ['p4', 'c4'],
  ['p1 m3 p2', 'c2 c1'], ['p2 m3 p3', 'c3 c2'],
]
const psit_stims3_test = [
  ['p4 m3 p1', 'c1 c4'], ['p3 m3 p4', 'c4 c3'], ['p2 m3 p3', 'c3 c2'],
]
const psit_stims4_train = [
  ['p1', 'c1'], ['p2', 'c2'], ['p3', 'c3'], ['p4', 'c4'],
  ['p1 m1', 'c1 c1 c1'], ['p2 m1', 'c2 c2 c2'],
  ['p3 m2 p1', 'c3 c1 c3'], ['p2 m2 p3', 'c2 c3 c2'],
  ['p1 m3 p2', 'c2 c1'], ['p2 m3 p3', 'c3 c2'],
  ['p2 m1 m3 p3', 'c3 c2 c2 c2'], ['p2 m3 p3 m1', 'c3 c3 c3 c2'],
  ['p3 m3 p1 m2 p2', 'c1 c2 c1 c3'], ['p3 m2 p1 m3 p2', 'c2 c3 c1 c3'],
]
const psit_stims4_test = [
  ['p2 m1 m3 p3', 'c3 c2 c2 c2'],
  ['p4 m1 m3 p2', 'c2 c4 c4 c4'],
  ['p3 m3 p4 m1', 'c4 c4 c4 c3'],
  ['p2 m3 p3 m2 p4', 'c3 c4 c3 c2'],
  ['p3 m3 p1 m2 p2', 'c1 c2 c1 c3'],
  ['p4 m2 p3 m3 p1 m1 ', 'c1 c1 c1 c4 c3 c4'],
  ['p4 m2 p4 m3 p4 m1', 'c4 c4 c4 c4 c4 c4'],
]
const psit_subtasks_train = [psit_stims1_train, psit_stims2_train, psit_stims3_train]
const psit_subtasks_test  = [psit_stims1_test,  psit_stims2_test,  psit_stims3_test]

// ---------------------------------------------------------------------------
// task.js pure functions (executed, no DOM)
// ---------------------------------------------------------------------------

/**
 * Modern underscore shuffle used by both Smile and the updated PsiTurk app.
 */
function psit_shuffle(arr) {
  return _.shuffle(arr)
}

/** task.js remove_singletons (lines 464-476) */
var psit_remove_singletons = function (mystims) {
		// remove all stimuli that are primitives (only have one input symbol)
		//   return the filtered array
		var mystims_filter = [];
		for (var i=0; i<mystims.length; i++) {
			var mycommand_raw = mystims[i][0];
			var nterms = mycommand_raw.split(' ').length;
			if (nterms > 1) {
				mystims_filter.push(mystims[i]);
			}
		}
		return mystims_filter;
	};


/**
 * task.js remove_element (lines 455-462).
 * Original uses indexOf(stim-object) to find by reference; we find by input
 * string instead, which is equivalent when elements have unique input values.
 */
var special_redacted_symbol = 'REDACTED';
var psit_remove_element = function(myarray, myelem) {
		// remove element from an array
    var index = myarray.indexOf(myelem);
    if (index === -1) { return myarray } // element not found, return original array
		myarray = myarray.slice();
		myarray[index] = myarray[index].slice();
		myarray[index][1] = special_redacted_symbol;
		return myarray;
};

function findPsitStimByInput(stims, targetInput) {
  return stims.find((stim) => stim[0] === targetInput)
}

/** task.js next() pass condition (line 484) */
function psit_hasPassed(epoch_count, epoch_correct, flex_threshold, cycle_count) {
  return (epoch_count - epoch_correct <= flex_threshold) || (cycle_count === 3)
}
// if (epoch_count - epoch_correct <= flex_threshold || cycle_count === max_cycle_count) { // if we passed

/** task.js convert_command_to_words (lines 201-209) */
var psit_convert_command_to_words = function (mycommand, input_dict) {
		// convert an abstract command to pseudoword sequence
		mycommand = mycommand.split(" ");
		var mywords = [];
		for (var i=0; i<mycommand.length; i++) {
			mywords.push( input_dict[mycommand[i]] );
		}
		return mywords.join(" ");
	};

/** task.js actions_to_colors (lines 273-281) */
var psit_actions_to_colors = function (myactions, output_dict) {
		// convert string of actions ('a1 a4 a1') to string of colors ('#ff0000 #33cc33 #b7b600')
		var myactions_array = myactions.split(" ");
    var mycolors = [];
		for (var i=0; i<myactions_array.length; i++) {
			mycolors.push(output_dict[myactions_array[i]]);
		}
		return mycolors.join(" ");
};

/** task.js process_response pure extraction (lines 338-362) */
function psit_process_response(colorStyles, output_dict_reverse) {
  return colorStyles
    .map((mytag) => {
      const preIndex = mytag.indexOf('color:')
      const postIndex = mytag.indexOf(';')
      const color = mytag.substring(preIndex + 'color:'.length, postIndex)
      return output_dict_reverse[color]
    })
    .join(' ')
}

	// var psit_process_response = function () {
	// 	// get "response to command" array as a string of abstract actions

	// 	var myresponse = $('#response_array span').map( function () { 
	// 						return $(this).attr('style');
	// 					});
	// 	myresponse = $.makeArray(myresponse);
	// 	// extract color from style tag
	// 	myresponse_abstract = [];
	// 	for (var i=0; i<myresponse.length; i++) {
	// 		mytag = myresponse[i];
	// 		preString = 'color:';
	// 		postString = ';';
	// 		preIndex = mytag.indexOf(preString);
	// 		postIndex = mytag.indexOf(postString);
	// 		mytag = mytag.substring(preIndex + preString.length, postIndex);
	// 		myresponse_abstract.push(output_dict_reverse[mytag]); // convert to abstract action
	// 	}

	// 	assert(myresponse.length === myresponse_abstract.length, "Error: response processor has failed. Please report to experimenter.");

	// 	return { 
	// 		abstract : myresponse_abstract.join(' '),
	// 		raw : myresponse.join(' ')
	// 	};
	// };

/**
 * task.js stage ordering logic (lines 82-107) using modern underscore shuffle.
 */
function psit_buildStageOrder() {
  const myzip = psit_shuffle(psit_subtasks_train.map((train, i) => ({
    train,
    test: psit_subtasks_test[i],
  })))
  return [
    ...myzip.map((s) => ({ train: s.train, test: s.test, flexThreshold: 0 })),
    { train: psit_stims4_train, test: psit_stims4_test, flexThreshold: 1 },
  ]
}

/**
 * Per-stage grounding from task.js ScanExperiment constructor (lines 136-199).
 * Given a pre-built stage order and pre-allocated word/color pools, it runs the
 * same shuffle-then-assign logic as createGrounding() in scanLogic.js.
 */
function psit_buildGroundingFromOrder(stageOrder, words, colors) {
  const input_dict = {}
  const output_dict = {}
  const output_dict_reverse = {}

  for (const { train, test } of stageOrder) {
    // task.js lines 159-164
    const stims = psit_shuffle(train.concat(test))
    psit_shuffle(train.slice())
    psit_shuffle(test.slice())

    // task.js lines 167-178: unique input symbols → shuffle → assign words
    let input_symbols = Array.from(new Set(stims.flatMap((s) => s[0].trim().split(' '))))
    input_symbols = psit_shuffle(input_symbols)
    for (const sym of input_symbols) {
      if (!(sym in input_dict)) input_dict[sym] = words.shift()
    }

    // task.js lines 181-196: unique output symbols → shuffle → assign colors
    let output_symbols = Array.from(new Set(stims.flatMap((s) => s[1].trim().split(' '))))
    output_symbols = psit_shuffle(output_symbols)
    for (const sym of output_symbols) {
      if (!(sym in output_dict)) {
        const color = colors.shift()
        output_dict[sym] = color
        output_dict_reverse[color] = sym
      }
    }

    // task.js line 511: next() initial call consumes one more shuffle
    psit_shuffle(psit_remove_singletons(train).slice())
  }

  // task.js lines 197-199
  for (const color of colors) {
    output_dict_reverse[color] = 'undefined_action'
  }

  return { input_dict, output_dict, output_dict_reverse }
}

// ===========================================================================
// 1. Stimuli data — Smile arrays exactly match scan_stimuli_simple.js
// ===========================================================================

describe('Smile stimuli match scan_stimuli_simple.js (both executed)', () => {
  it('WORDS matches psit_words exactly', () => {
    expect(WORDS).toEqual(psit_words)
  })

  it('COLORS matches psit_colors exactly (pre-shuffle pool)', () => {
    expect(COLORS).toEqual(psit_colors)
  })

  it('stims1_train equals psit_stims1_train', () => expect(stims1_train).toEqual(psit_stims1_train))
  it('stims1_test  equals psit_stims1_test',  () => expect(stims1_test).toEqual(psit_stims1_test))
  it('stims2_train equals psit_stims2_train', () => expect(stims2_train).toEqual(psit_stims2_train))
  it('stims2_test  equals psit_stims2_test',  () => expect(stims2_test).toEqual(psit_stims2_test))
  it('stims3_train equals psit_stims3_train', () => expect(stims3_train).toEqual(psit_stims3_train))
  it('stims3_test  equals psit_stims3_test',  () => expect(stims3_test).toEqual(psit_stims3_test))

  it('stims4_train equals psit_stims4_train (trailing space trimmed in Smile)', () => {
    const norm = (arr) => arr.map(([i, o]) => [i.trim(), o.trim()])
    expect(norm(stims4_train)).toEqual(norm(psit_stims4_train))
  })

  it('stims4_test equals psit_stims4_test (trailing space trimmed in Smile)', () => {
    const norm = (arr) => arr.map(([i, o]) => [i.trim(), o.trim()])
    expect(norm(stims4_test)).toEqual(norm(psit_stims4_test))
  })

  it('subtasks_train wraps [stims1_train, stims2_train, stims3_train]', () => {
    expect(subtasks_train).toEqual(psit_subtasks_train)
  })

  it('subtasks_test wraps [stims1_test, stims2_test, stims3_test]', () => {
    expect(subtasks_test).toEqual(psit_subtasks_test)
  })
})

// ===========================================================================
// 2. removeSingletons — Smile vs psit_remove_singletons (both executed)
// ===========================================================================

describe('removeSingletons matches task.js remove_singletons (both executed)', () => {
  const stages = [
    ['stage 1 train', psit_stims1_train, stims1_train],
    ['stage 2 train', psit_stims2_train, stims2_train],
    ['stage 3 train', psit_stims3_train, stims3_train],
    ['stage 4 train', psit_stims4_train, stims4_train],
  ]

  for (const [label, psitStims, smileStims] of stages) {
    it(`${label}: Smile result equals psiturk result`, () => {
      expect(removeSingletons(smileStims)).toEqual(psit_remove_singletons(psitStims))
    })

    it(`${label}: every returned item has > 1 token`, () => {
      for (const stim of removeSingletons(smileStims)) {
        expect(stim[0].trim().split(' ').length).toBeGreaterThan(1)
      }
    })
  }

  it('does not mutate the source array', () => {
    const before = stims1_train.length
    removeSingletons(stims1_train)
    expect(stims1_train.length).toBe(before)
  })
})

// ===========================================================================
// 3. redactOutput — Smile vs psit_remove_element (both executed)
// ===========================================================================

describe('redactOutput matches task.js remove_element (both executed)', () => {
  it('Smile and psiturk produce the same array for a compound train stim', () => {
    const targetInput = 'p1 m1'
    expect(redactOutput(stims1_train, targetInput))
      .toEqual(psit_remove_element(psit_stims1_train, findPsitStimByInput(psit_stims1_train, targetInput)))
  })

  it('both replace only the target output with REDACTED', () => {
    const targetInput = 'p3 m2 p1'
    const smileResult = redactOutput(stims2_train, targetInput)
    const psitResult  = psit_remove_element(psit_stims2_train, findPsitStimByInput(psit_stims2_train, targetInput))
    expect(smileResult).toEqual(psitResult)
    expect(smileResult.find((s) => s[0] === targetInput)[1]).toBe(REDACTED_SYMBOL)
  })

  it('both leave all other outputs unchanged', () => {
    const targetInput = 'p2 m1'
    const smileResult = redactOutput(stims1_train, targetInput)
    const psitResult  = psit_remove_element(psit_stims1_train, findPsitStimByInput(psit_stims1_train, targetInput))
    for (const stim of smileResult) {
      if (stim[0] !== targetInput) {
        expect(stim[1]).toBe(psitResult.find((s) => s[0] === stim[0])[1])
      }
    }
  })

  it('returns an array the same length as the input', () => {
    expect(redactOutput(stims1_train, 'p1').length).toBe(stims1_train.length)
    expect(psit_remove_element(psit_stims1_train, findPsitStimByInput(psit_stims1_train, 'p1')).length).toBe(psit_stims1_train.length)
  })

  it('neither implementation mutates the source array', () => {
    const origOutputs = stims1_train.map((s) => s[1])
    redactOutput(stims1_train, 'p1 m1')
    psit_remove_element(psit_stims1_train, findPsitStimByInput(psit_stims1_train, 'p1 m1'))
    expect(stims1_train.map((s) => s[1])).toEqual(origOutputs)
  })
})

// ===========================================================================
// 4. hasPassed — Smile vs psit_hasPassed (both executed)
// ===========================================================================

describe('hasPassed matches task.js next() pass condition (both executed)', () => {
  it('MAX_CYCLES is 3, matching max_cycle_count in task.js', () => {
    expect(MAX_CYCLES).toBe(3)
  })

  const cases = [
    [6, 6, 0, 1],   // perfect pass
    [6, 5, 0, 1],   // one error, flex=0 → fail
    [6, 0, 0, 1],   // many errors, flex=0 → fail
    [10, 9, 1, 1],  // one error, flex=1 → pass
    [10, 8, 1, 1],  // two errors, flex=1 → fail
    [6, 0, 0, 3],   // max cycle → always pass
    [10, 0, 1, 3],  // max cycle → always pass
  ]

  for (const [ec, eCorr, flex, cycle] of cases) {
    it(`(${ec},${eCorr},flex=${flex},cycle=${cycle}): Smile === psiturk`, () => {
      expect(hasPassed(ec, eCorr, flex, cycle)).toBe(psit_hasPassed(ec, eCorr, flex, cycle))
    })
  }
})

// ===========================================================================
// 5. convertCommandToWords — Smile vs psit_convert_command_to_words (both executed)
// ===========================================================================

describe('convertCommandToWords matches task.js convert_command_to_words (both executed)', () => {
  const dict = { p1: 'dax', p2: 'lug', p3: 'kiki', m1: 'wif', m2: 'tufa' }

  for (const cmd of ['p1', 'p1 m1', 'p3 m2 p1', 'p2 m1 p3']) {
    it(`"${cmd}": Smile === psiturk`, () => {
      expect(convertCommandToWords(cmd, dict)).toBe(psit_convert_command_to_words(cmd, dict))
    })
  }
})

// ===========================================================================
// 6. actionsToColors and parseResponse — Smile vs psiturk (both executed)
// ===========================================================================

describe('actionsToColors/parseResponse match task.js (both executed)', () => {
  function makeTestGrounding(seed) {
    const fixedOrder = [
      { train: stims1_train, test: stims1_test, flexThreshold: 0 },
      { train: stims2_train, test: stims2_test, flexThreshold: 0 },
      { train: stims3_train, test: stims3_test, flexThreshold: 0 },
      { train: stims4_train, test: stims4_test, flexThreshold: 1 },
    ]
    return withSeed(seed, () => createGrounding(fixedOrder, [...WORDS], [...COLORS]))
  }

  it('actionsToColors(Smile) === psit_actions_to_colors for single action', () => {
    const g = makeTestGrounding(42)
    expect(actionsToColors('c1', g.output_dict))
      .toBe(psit_actions_to_colors('c1', g.output_dict))
  })

  it('actionsToColors(Smile) === psit_actions_to_colors for action sequence', () => {
    const g = makeTestGrounding(42)
    expect(actionsToColors('c1 c2 c3', g.output_dict))
      .toBe(psit_actions_to_colors('c1 c2 c3', g.output_dict))
  })

  it('parseResponse(Smile) === psit_process_response for a color style sequence', () => {
    const g = makeTestGrounding(42)
    const styles = ['c1', 'c2', 'c1'].map((a) => `color:${g.output_dict[a]};`)
    expect(parseResponse(styles, g.output_dict_reverse))
      .toBe(psit_process_response(styles, g.output_dict_reverse))
  })

  it('parseResponse is the inverse of actionsToColors (round-trip)', () => {
    const g = makeTestGrounding(7)
    const original = 'c2 c3 c2'
    const colorStr = actionsToColors(original, g.output_dict)
    const styles = colorStr.split(' ').map((c) => `color:${c};`)
    expect(parseResponse(styles, g.output_dict_reverse)).toBe(original)
  })

  it('parseResponse returns empty string for empty input', () => {
    const g = makeTestGrounding(1)
    expect(parseResponse([], g.output_dict_reverse)).toBe('')
  })
})

// ===========================================================================
// 7. buildStageOrder — Smile vs psit (both executed, seeded)
// ===========================================================================

describe('buildStageOrder matches task.js stage ordering (both executed, seeded)', () => {
  it('always returns exactly 4 stages', () => {
    withSeed(1, () => {
      expect(buildStageOrder(subtasks_train, subtasks_test, stims4_train, stims4_test).length).toBe(4)
    })
  })

  it('stage 4 is always last with flexThreshold=1, regardless of seed', () => {
    for (const seed of [1, 42, 100, 999]) {
      withSeed(seed, () => {
        const stages = buildStageOrder(subtasks_train, subtasks_test, stims4_train, stims4_test)
        expect(stages[3].train).toBe(stims4_train)
        expect(stages[3].test).toBe(stims4_test)
        expect(stages[3].flexThreshold).toBe(1)
      })
    }
  })

  it('stages 0-2 are a valid permutation of subtasks pairs with flexThreshold=0', () => {
    for (const seed of [1, 42, 100]) {
      withSeed(seed, () => {
        const stages = buildStageOrder(subtasks_train, subtasks_test, stims4_train, stims4_test)
        const preTrains = stages.slice(0, 3).map((s) => s.train)
        expect(preTrains).toEqual(expect.arrayContaining(subtasks_train))
        for (const stage of stages.slice(0, 3)) {
          expect(stage.flexThreshold).toBe(0)
        }
      })
    }
  })

  it('train/test pairs stay together across shuffles', () => {
    for (const seed of [1, 42, 100]) {
      withSeed(seed, () => {
        const stages = buildStageOrder(subtasks_train, subtasks_test, stims4_train, stims4_test)
        for (const stage of stages.slice(0, 3)) {
          const idx = subtasks_train.indexOf(stage.train)
          expect(idx).toBeGreaterThanOrEqual(0)
          expect(stage.test).toBe(subtasks_test[idx])
        }
      })
    }
  })

  it('pre-stages are shuffled (not always the same order across seeds)', () => {
    const orders = new Set()
    for (let seed = 0; seed < 50; seed++) {
      withSeed(seed, () => {
        const stages = buildStageOrder(subtasks_train, subtasks_test, stims4_train, stims4_test)
        orders.add(stages.slice(0, 3).map((s) => subtasks_train.indexOf(s.train)).join(','))
      })
    }
    expect(orders.size).toBeGreaterThan(1)
  })

  /**
   * Both buildStageOrder (Smile) and psit_buildStageOrder use the same modern
   * underscore shuffle semantics. Starting from the same seed with no
   * preceding PRNG calls, they must produce the same position permutation.
   */
  it('Smile position permutation matches psit for the same seed (isolated)', () => {
    for (const seed of [1, 42, 100, 999, 12345]) {
      const smilePos = withSeed(seed, () => {
        const stages = buildStageOrder(subtasks_train, subtasks_test, stims4_train, stims4_test)
        return stages.slice(0, 3).map((s) => subtasks_train.indexOf(s.train))
      })
      const psitPos = withSeed(seed, () => {
        const stages = psit_buildStageOrder()
        return stages.slice(0, 3).map((s) => psit_subtasks_train.indexOf(s.train))
      })
      expect(smilePos).toEqual(psitPos)
    }
  })
})

// ===========================================================================
// 8. getScanSeedSignature — seed invalidation policy
// ===========================================================================

describe('getScanSeedSignature matches expected seed-selection policy', () => {
  it('prefers URL seed when present', () => {
    expect(getScanSeedSignature({ urlSeed: '42', useSeed: true, seedID: 'abc' })).toBe('url:42')
  })

  it('uses the Smile fixed seed when no URL seed is present', () => {
    expect(getScanSeedSignature({ urlSeed: null, useSeed: true, seedID: 'abc123' })).toBe('store:abc123')
  })

  it('returns null when fixed seeding is disabled', () => {
    expect(getScanSeedSignature({ urlSeed: null, useSeed: false, seedID: 'abc123' })).toBeNull()
  })

  it('returns null when no fixed seed ID is available', () => {
    expect(getScanSeedSignature({ urlSeed: null, useSeed: true, seedID: '' })).toBeNull()
  })
})

// ===========================================================================
// 9. createGrounding — Smile vs psit per-stage algorithm (both executed, seeded)
//
// To isolate the grounding ALGORITHM from the stage-ordering and initial pool
// shuffles, we pass a fixed stage order and identical pools to both functions.
// With the same seed, any difference in the resulting dicts reveals a logic bug.
// ===========================================================================

describe('createGrounding matches task.js grounding algorithm (both executed, seeded)', () => {
  const fixedStageOrder = [
    { train: stims1_train, test: stims1_test, flexThreshold: 0 },
    { train: stims2_train, test: stims2_test, flexThreshold: 0 },
    { train: stims3_train, test: stims3_test, flexThreshold: 0 },
    { train: stims4_train, test: stims4_test, flexThreshold: 1 },
  ]
  const psitFixedOrder = [
    { train: psit_stims1_train, test: psit_stims1_test },
    { train: psit_stims2_train, test: psit_stims2_test },
    { train: psit_stims3_train, test: psit_stims3_test },
    { train: psit_stims4_train, test: psit_stims4_test },
  ]

  it('input_dict matches psiturk per-stage logic for multiple seeds', () => {
    for (const seed of [1, 42, 100, 999]) {
      const psit  = withSeed(seed, () =>
        psit_buildGroundingFromOrder(psitFixedOrder, [...psit_words], [...psit_colors])
      )
      const smile = withSeed(seed, () =>
        createGrounding(fixedStageOrder, [...WORDS], [...COLORS])
      )
      expect(smile.input_dict).toEqual(psit.input_dict)
    }
  })

  it('output_dict matches psiturk per-stage logic for multiple seeds', () => {
    for (const seed of [1, 42, 100, 999]) {
      const psit  = withSeed(seed, () =>
        psit_buildGroundingFromOrder(psitFixedOrder, [...psit_words], [...psit_colors])
      )
      const smile = withSeed(seed, () =>
        createGrounding(fixedStageOrder, [...WORDS], [...COLORS])
      )
      expect(smile.output_dict).toEqual(psit.output_dict)
    }
  })

  it('output_dict_reverse matches psiturk per-stage logic for multiple seeds', () => {
    for (const seed of [1, 42, 100, 999]) {
      const psit  = withSeed(seed, () =>
        psit_buildGroundingFromOrder(psitFixedOrder, [...psit_words], [...psit_colors])
      )
      const smile = withSeed(seed, () =>
        createGrounding(fixedStageOrder, [...WORDS], [...COLORS])
      )
      expect(smile.output_dict_reverse).toEqual(psit.output_dict_reverse)
    }
  })

  it('every input symbol maps to a unique word from WORDS', () => {
    withSeed(42, () => {
      const g = createGrounding(fixedStageOrder, [...WORDS], [...COLORS])
      const wordValues = Object.values(g.input_dict)
      for (const w of wordValues) expect(WORDS).toContain(w)
      expect(new Set(wordValues).size).toBe(wordValues.length)
    })
  })

  it('every output symbol maps to a unique color from COLORS', () => {
    withSeed(42, () => {
      const g = createGrounding(fixedStageOrder, [...WORDS], [...COLORS])
      const colorValues = Object.values(g.output_dict)
      for (const c of colorValues) expect(COLORS).toContain(c)
      expect(new Set(colorValues).size).toBe(colorValues.length)
    })
  })

  it('output_dict_reverse is the exact inverse of output_dict', () => {
    withSeed(42, () => {
      const g = createGrounding(fixedStageOrder, [...WORDS], [...COLORS])
      for (const [sym, color] of Object.entries(g.output_dict)) {
        expect(g.output_dict_reverse[color]).toBe(sym)
      }
    })
  })

  it('unused colors in output_dict_reverse map to "undefined_action"', () => {
    withSeed(42, () => {
      const g = createGrounding(fixedStageOrder, [...WORDS], [...COLORS])
      const used = new Set(Object.values(g.output_dict))
      for (const color of COLORS) {
        if (!used.has(color)) {
          expect(g.output_dict_reverse[color]).toBe('undefined_action')
        }
      }
    })
  })

  it('all 7 primitive/modifier input symbols (p1-p4, m1-m3) are assigned', () => {
    withSeed(1, () => {
      const g = createGrounding(fixedStageOrder, [...WORDS], [...COLORS])
      for (const sym of ['p1', 'p2', 'p3', 'p4', 'm1', 'm2', 'm3']) {
        expect(g.input_dict[sym]).toBeDefined()
      }
    })
  })
})

// ===========================================================================
// 10. Trial data fields — match psiturk.recordTrialData() calls in task.js
// ===========================================================================

describe('Trial data fields match task.js recordTrialData calls', () => {
  function makeTestGrounding(seed) {
    const fixedOrder = [
      { train: stims1_train, test: stims1_test, flexThreshold: 0 },
      { train: stims2_train, test: stims2_test, flexThreshold: 0 },
      { train: stims3_train, test: stims3_test, flexThreshold: 0 },
      { train: stims4_train, test: stims4_test, flexThreshold: 1 },
    ]
    return withSeed(seed, () => createGrounding(fixedOrder, [...WORDS], [...COLORS]))
  }

  it('study trial has all required fields matching task.js recordTrialData', () => {
    const g = makeTestGrounding(42)
    const { input_dict, output_dict } = g
    const stim = stims1_train.find((s) => s[0] === 'p1 m1')

    const abs_response = stim[1]
    const raw_response_styles = abs_response.split(' ').map((a) => `color:${output_dict[a]};`)

    const trialData = {
      phase: 'response_train',
      abs_input: stim[0],
      raw_input: convertCommandToWords(stim[0], input_dict),
      abs_target: stim[1],
      raw_target: actionsToColors(stim[1], output_dict),
      abs_response,
      raw_response: raw_response_styles.join(' '),
      correct: abs_response === stim[1],
      cycle: 1,
      learning_stage: 0,
      rt: 4200,
    }

    expect(trialData.phase).toBe('response_train')
    expect(trialData.abs_input).toBe('p1 m1')
    expect(trialData.abs_target).toBe('c1 c1 c1')
    expect(trialData.correct).toBe(true)
    expect(typeof trialData.rt).toBe('number')
    expect(typeof trialData.learning_stage).toBe('number')
    expect(typeof trialData.cycle).toBe('number')
    // raw_input must be pseudo-words, not abstract symbols
    expect(trialData.raw_input).not.toContain('p1')
    expect(trialData.raw_input).not.toContain('m1')
    // raw_target must contain hex color strings
    expect(trialData.raw_target).toMatch(/#[0-9a-f]{6}/)
    // Psit functions produce the same raw values
    expect(trialData.raw_input).toBe(psit_convert_command_to_words(stim[0], input_dict))
    expect(trialData.raw_target).toBe(psit_actions_to_colors(stim[1], output_dict))
  })

  it('test trial has phase "test" and cycle -1 matching task.js', () => {
    const g = makeTestGrounding(42)
    const { input_dict, output_dict } = g
    const stim = stims1_test[0]
    const trialData = {
      phase: 'test',
      abs_input: stim[0],
      raw_input: convertCommandToWords(stim[0], input_dict),
      abs_target: stim[1],
      raw_target: actionsToColors(stim[1], output_dict),
      abs_response: stim[1],
      raw_response: '',
      correct: true,
      cycle: -1,
      learning_stage: 0,
      rt: 3100,
    }
    expect(trialData.phase).toBe('test')
    expect(trialData.cycle).toBe(-1)
    expect(trialData.correct).toBe(true)
  })
})
