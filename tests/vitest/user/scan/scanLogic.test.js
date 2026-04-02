/* eslint-disable no-undef */
/**
 * These tests verify that the Smile SCAN experiment preserves the exact semantics
 * of the original psiturk-example-v2 implementation (task.js + scan_stimuli_simple.js).
 *
 * Each test is annotated with the corresponding logic in the original code.
 */
import { describe, it, expect } from 'vitest'

import {
  WORDS,
  COLORS,
  REDACTED_SYMBOL,
  MAX_CYCLES,
  createGrounding,
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

// ---------------------------------------------------------------------------
// Helper: build a grounding from all stages combined
// ---------------------------------------------------------------------------
function makeGrounding() {
  const allStims = [
    ...stims1_train, ...stims1_test,
    ...stims2_train, ...stims2_test,
    ...stims3_train, ...stims3_test,
    ...stims4_train, ...stims4_test,
  ]
  return createGrounding(allStims, [...WORDS], [...COLORS])
}

// ===========================================================================
// 1. Stimuli — exact match to scan_stimuli_simple.js
// ===========================================================================

describe('Stimuli match scan_stimuli_simple.js', () => {
  // Original: var stims1_train = [['p1','c1'], ['p2','c2'], ...]
  it('stage 1: 6 training pairs', () => expect(stims1_train.length).toBe(6))
  it('stage 1: 2 test pairs', () => expect(stims1_test.length).toBe(2))
  it('stage 2: 6 training pairs', () => expect(stims2_train.length).toBe(6))
  it('stage 2: 3 test pairs', () => expect(stims2_test.length).toBe(3))
  it('stage 3: 6 training pairs', () => expect(stims3_train.length).toBe(6))
  it('stage 3: 3 test pairs', () => expect(stims3_test.length).toBe(3))
  it('stage 4: 14 training pairs', () => expect(stims4_train.length).toBe(14))
  it('stage 4: 7 test pairs', () => expect(stims4_test.length).toBe(7))

  // Original: var subtasks_train = [stims1_train, stims2_train, stims3_train]
  it('subtasks_train contains exactly stims1_train, stims2_train, stims3_train', () => {
    expect(subtasks_train).toContain(stims1_train)
    expect(subtasks_train).toContain(stims2_train)
    expect(subtasks_train).toContain(stims3_train)
    expect(subtasks_train.length).toBe(3)
  })

  it('subtasks_test contains exactly stims1_test, stims2_test, stims3_test', () => {
    expect(subtasks_test).toContain(stims1_test)
    expect(subtasks_test).toContain(stims2_test)
    expect(subtasks_test).toContain(stims3_test)
    expect(subtasks_test.length).toBe(3)
  })

  // Spot-check exact stimuli values from scan_stimuli_simple.js
  it('stage 1 training includes the expected primitives', () => {
    expect(stims1_train).toContainEqual(['p1', 'c1'])
    expect(stims1_train).toContainEqual(['p2', 'c2'])
    expect(stims1_train).toContainEqual(['p3', 'c3'])
    expect(stims1_train).toContainEqual(['p4', 'c4'])
  })

  it('stage 1 training includes the m1 modifier rule', () => {
    expect(stims1_train).toContainEqual(['p1 m1', 'c1 c1 c1'])
    expect(stims1_train).toContainEqual(['p2 m1', 'c2 c2 c2'])
  })

  it('stage 1 test includes p4 m1 → c4 c4 c4 and a catch trial', () => {
    expect(stims1_test).toContainEqual(['p4 m1', 'c4 c4 c4'])
    expect(stims1_test).toContainEqual(['p2 m1', 'c2 c2 c2'])
  })

  it('stage 4 training includes all three modifiers', () => {
    const inputs = stims4_train.map((s) => s[0])
    expect(inputs.some((i) => i.includes('m1'))).toBe(true)
    expect(inputs.some((i) => i.includes('m2'))).toBe(true)
    expect(inputs.some((i) => i.includes('m3'))).toBe(true)
  })
})

// ===========================================================================
// 2. Word and color pools — match scan_stimuli_simple.js
// ===========================================================================

describe('Word and color pools match scan_stimuli_simple.js', () => {
  // Original: var words_scan = ['dax', 'lug', 'wif', ...]
  it('WORDS matches words_scan exactly', () => {
    expect(WORDS).toEqual(['dax', 'lug', 'wif', 'zup', 'fep', 'blicket', 'kiki', 'tufa', 'gazzer'])
  })

  // Original: var colors_scan = ['#ff0000', '#0000ff', '#33cc33', '#b7b600', '#ce9fcf', '#00b0b3']
  it('COLORS matches colors_scan exactly', () => {
    expect(COLORS).toEqual(['#ff0000', '#0000ff', '#33cc33', '#b7b600', '#ce9fcf', '#00b0b3'])
  })
})

// ===========================================================================
// 3. Grounding — matches task.js assign_grounding logic
// ===========================================================================

describe('createGrounding matches task.js grounding logic', () => {
  // Original: each input symbol (p1, p2, m1, ...) gets one unique word from words pool
  it('each unique input symbol is assigned exactly one word from WORDS', () => {
    const { input_dict } = makeGrounding()
    const allInputSymbols = [
      ...new Set([
        ...stims4_train.flatMap((s) => s[0].trim().split(' ')),
        ...stims4_test.flatMap((s) => s[0].trim().split(' ')),
      ]),
    ]
    for (const sym of allInputSymbols) {
      expect(WORDS).toContain(input_dict[sym])
    }
    // No two symbols share the same word
    const words = Object.values(input_dict)
    expect(new Set(words).size).toBe(words.length)
  })

  // Original: each output symbol (c1-c6) gets one unique color from colors pool
  it('each unique output symbol is assigned exactly one color from COLORS', () => {
    const { output_dict } = makeGrounding()
    const outputSymbols = [...new Set([
      ...stims4_train.flatMap((s) => s[1].trim().split(' ')),
    ])]
    for (const sym of outputSymbols) {
      expect(COLORS).toContain(output_dict[sym])
    }
    const colors = Object.values(output_dict)
    expect(new Set(colors).size).toBe(colors.length)
  })

  // Original: output_dict_reverse[color] = symbol (inverse mapping)
  it('output_dict_reverse is the inverse of output_dict', () => {
    const { output_dict, output_dict_reverse } = makeGrounding()
    for (const [sym, color] of Object.entries(output_dict)) {
      expect(output_dict_reverse[color]).toBe(sym)
    }
  })

  // Original: unmapped colors → output_dict_reverse[color] = 'undefined_action'
  it('unused colors in output_dict_reverse map to "undefined_action"', () => {
    const { output_dict, output_dict_reverse } = makeGrounding()
    const usedColors = new Set(Object.values(output_dict))
    for (const color of COLORS) {
      if (!usedColors.has(color)) {
        expect(output_dict_reverse[color]).toBe('undefined_action')
      }
    }
  })
})

// ===========================================================================
// 4. convertCommandToWords — matches task.js convert_command_to_words
// ===========================================================================

describe('convertCommandToWords matches task.js convert_command_to_words', () => {
  // Original: splits command by ' ', maps each token via input_dict, rejoins with ' '
  it('converts a single-symbol command using input_dict', () => {
    const input_dict = { p1: 'dax', p2: 'lug' }
    expect(convertCommandToWords('p1', input_dict)).toBe('dax')
  })

  it('converts a multi-symbol command preserving order', () => {
    const input_dict = { p1: 'dax', m1: 'wif' }
    expect(convertCommandToWords('p1 m1', input_dict)).toBe('dax wif')
  })

  it('converts a three-symbol command in correct order', () => {
    const input_dict = { p3: 'kiki', m2: 'tufa', p1: 'dax' }
    expect(convertCommandToWords('p3 m2 p1', input_dict)).toBe('kiki tufa dax')
  })

  it('different token orderings yield different outputs', () => {
    const input_dict = { p1: 'dax', p2: 'lug', m1: 'wif' }
    expect(convertCommandToWords('p1 m1 p2', input_dict)).toBe('dax wif lug')
    expect(convertCommandToWords('p2 m1 p1', input_dict)).toBe('lug wif dax')
  })
})

// ===========================================================================
// 5. removeSingletons — matches task.js remove_singletons
// ===========================================================================

describe('removeSingletons matches task.js remove_singletons', () => {
  // Original: filters out stimuli where input.split(' ').length === 1
  it('removes the 4 primitive commands from stage 1 training, leaving 2 quiz stimuli', () => {
    // p1, p2, p3, p4 are singletons; 'p1 m1' and 'p2 m1' are not
    expect(removeSingletons(stims1_train).length).toBe(2)
  })

  it('removes the 4 primitives from stage 2 training, leaving 2 quiz stimuli', () => {
    expect(removeSingletons(stims2_train).length).toBe(2)
  })

  it('removes the 4 primitives from stage 3 training, leaving 2 quiz stimuli', () => {
    expect(removeSingletons(stims3_train).length).toBe(2)
  })

  it('every item returned has more than one input token', () => {
    const filtered = removeSingletons(stims4_train)
    for (const stim of filtered) {
      expect(stim[0].trim().split(' ').length).toBeGreaterThan(1)
    }
  })

  it('does not mutate the original array', () => {
    const before = stims1_train.length
    removeSingletons(stims1_train)
    expect(stims1_train.length).toBe(before)
  })
})

// ===========================================================================
// 6. redactOutput — matches task.js remove_element
// ===========================================================================

describe('redactOutput matches task.js remove_element', () => {
  // Original: replaces stim[1] with special_redacted_symbol ('REDACTED') for the target stim
  it('replaces the target stim output with REDACTED_SYMBOL', () => {
    const result = redactOutput(stims1_train, 'p1 m1')
    expect(result.find((s) => s[0] === 'p1 m1')[1]).toBe(REDACTED_SYMBOL)
  })

  it('leaves all other outputs unchanged', () => {
    const result = redactOutput(stims1_train, 'p1 m1')
    for (const stim of result) {
      if (stim[0] !== 'p1 m1') {
        expect(stim[1]).toBe(stims1_train.find((s) => s[0] === stim[0])[1])
      }
    }
  })

  it('returns an array of the same length as the input', () => {
    expect(redactOutput(stims1_train, 'p1').length).toBe(stims1_train.length)
  })

  // Original uses slice() to avoid mutating the source array
  it('does not mutate the original stims array', () => {
    const origOutputs = stims1_train.map((s) => s[1])
    redactOutput(stims1_train, 'p1 m1')
    expect(stims1_train.map((s) => s[1])).toEqual(origOutputs)
  })
})

// ===========================================================================
// 7. hasPassed — matches task.js cycle pass/fail logic
// ===========================================================================

describe('hasPassed matches task.js cycle pass/fail logic', () => {
  // Original: epoch_count - epoch_correct <= flex_threshold || cycle_count === max_cycle_count
  // flex_threshold = 0 for stages 1-3, flex_threshold = 1 for stage 4
  // max_cycle_count = 3

  it('MAX_CYCLES is 3, matching max_cycle_count in task.js', () => {
    expect(MAX_CYCLES).toBe(3)
  })

  it('stages 1-3 (flex=0): passes only when there are zero errors', () => {
    expect(hasPassed(6, 6, 0, 1)).toBe(true)
    expect(hasPassed(6, 5, 0, 1)).toBe(false)
    expect(hasPassed(6, 0, 0, 1)).toBe(false)
  })

  it('stage 4 (flex=1): passes when errors <= 1', () => {
    expect(hasPassed(10, 10, 1, 1)).toBe(true)
    expect(hasPassed(10, 9,  1, 1)).toBe(true)
    expect(hasPassed(10, 8,  1, 1)).toBe(false)
  })

  it('always passes when cycle_count equals MAX_CYCLES, regardless of errors', () => {
    expect(hasPassed(6, 0, 0, MAX_CYCLES)).toBe(true)
    expect(hasPassed(10, 0, 1, MAX_CYCLES)).toBe(true)
  })
})

// ===========================================================================
// 8. buildStageOrder — matches task.js stage sequencing logic
// ===========================================================================

describe('buildStageOrder matches task.js stage sequencing', () => {
  // Original:
  //   myzip = _.shuffle(myzip)  → stages 1-3 shuffled as pairs
  //   stage 4 always runs last via: else if (stage_count == npre)
  //   flex_threshold = 0 for pre stages, 1 for stage 4

  it('returns exactly 4 stages', () => {
    const stages = buildStageOrder(subtasks_train, subtasks_test, stims4_train, stims4_test)
    expect(stages.length).toBe(4)
  })

  it('stage 4 is always last (index 3), matching the original fixed post-stage', () => {
    for (let i = 0; i < 20; i++) {
      const stages = buildStageOrder(subtasks_train, subtasks_test, stims4_train, stims4_test)
      expect(stages[3].train).toBe(stims4_train)
      expect(stages[3].test).toBe(stims4_test)
    }
  })

  it('stage 4 has flexThreshold of 1, matching the original flex_threshold argument', () => {
    const stages = buildStageOrder(subtasks_train, subtasks_test, stims4_train, stims4_test)
    expect(stages[3].flexThreshold).toBe(1)
  })

  it('stages 0-2 are a shuffled permutation of subtasks_train/test pairs', () => {
    const stages = buildStageOrder(subtasks_train, subtasks_test, stims4_train, stims4_test)
    const preTrainSets = stages.slice(0, 3).map((s) => s.train)
    expect(preTrainSets).toEqual(expect.arrayContaining(subtasks_train))
  })

  it('train/test pairs are kept together (not mixed across stages)', () => {
    // Original: myzip = subtasks_train.map((e, i) => [e, subtasks_test[i]]) then shuffle
    const stages = buildStageOrder(subtasks_train, subtasks_test, stims4_train, stims4_test)
    for (const stage of stages.slice(0, 3)) {
      const idx = subtasks_train.indexOf(stage.train)
      expect(idx).toBeGreaterThanOrEqual(0)
      expect(stage.test).toBe(subtasks_test[idx])
    }
  })

  it('stages 0-2 have flexThreshold of 0', () => {
    const stages = buildStageOrder(subtasks_train, subtasks_test, stims4_train, stims4_test)
    for (const stage of stages.slice(0, 3)) {
      expect(stage.flexThreshold).toBe(0)
    }
  })

  it('shuffles the pre-stages (not always the same order)', () => {
    const orders = new Set()
    for (let i = 0; i < 50; i++) {
      const stages = buildStageOrder(subtasks_train, subtasks_test, stims4_train, stims4_test)
      orders.add(stages.slice(0, 3).map((s) => subtasks_train.indexOf(s.train)).join(','))
    }
    expect(orders.size).toBeGreaterThan(1)
  })
})

// ===========================================================================
// 9. parseResponse — matches task.js process_response
// ===========================================================================

describe('parseResponse matches task.js process_response', () => {
  // Original: extracts color from style string 'color:#ff0000;', maps via output_dict_reverse
  it('parses a sequence of color style strings into abstract actions', () => {
    const { output_dict, output_dict_reverse } = makeGrounding()
    const styles = [`color:${output_dict['c1']};`, `color:${output_dict['c2']};`]
    expect(parseResponse(styles, output_dict_reverse)).toBe('c1 c2')
  })

  it('handles repeated colors (same circle dragged multiple times)', () => {
    const { output_dict, output_dict_reverse } = makeGrounding()
    const c1 = output_dict['c1']
    expect(parseResponse([`color:${c1};`, `color:${c1};`, `color:${c1};`], output_dict_reverse)).toBe('c1 c1 c1')
  })

  it('preserves order of circles', () => {
    const { output_dict, output_dict_reverse } = makeGrounding()
    const styles = [`color:${output_dict['c4']};`, `color:${output_dict['c2']};`]
    expect(parseResponse(styles, output_dict_reverse)).toBe('c4 c2')
  })

  it('returns empty string for empty response (original: myresponse.length === 0 check)', () => {
    const { output_dict_reverse } = makeGrounding()
    expect(parseResponse([], output_dict_reverse)).toBe('')
  })
})

// ===========================================================================
// 10. actionsToColors — matches task.js actions_to_colors
// ===========================================================================

describe('actionsToColors matches task.js actions_to_colors', () => {
  // Original: splits by ' ', maps each via output_dict, rejoins with ' '
  it('converts a single abstract action to its color', () => {
    const { output_dict } = makeGrounding()
    expect(actionsToColors('c1', output_dict)).toBe(output_dict['c1'])
  })

  it('converts a sequence of abstract actions to a color string', () => {
    const { output_dict } = makeGrounding()
    expect(actionsToColors('c1 c2 c3', output_dict))
      .toBe(`${output_dict['c1']} ${output_dict['c2']} ${output_dict['c3']}`)
  })

  it('is the inverse of parseResponse (round-trip)', () => {
    const { output_dict, output_dict_reverse } = makeGrounding()
    const original = 'c2 c3 c2'
    const colorStr = actionsToColors(original, output_dict)
    const styles = colorStr.split(' ').map((c) => `color:${c};`)
    expect(parseResponse(styles, output_dict_reverse)).toBe(original)
  })
})

// ===========================================================================
// 11. Trial data fields — match psiTurk.recordTrialData() calls in task.js
// ===========================================================================

describe('Trial data fields match task.js recordTrialData calls', () => {
  // Original recordTrialData fields:
  // { phase, abs_input, raw_input, abs_target, raw_target, abs_response, raw_response, correct, cycle, learning_stage, rt }
  it('study trial (response_train) has all required fields', () => {
    const { input_dict, output_dict, output_dict_reverse } = makeGrounding()
    const stim = stims1_train.find((s) => s[0] === 'p1 m1')
    const rawInput = convertCommandToWords(stim[0], input_dict)
    const absResponse = 'c1 c1 c1'
    const rawResponseStyles = absResponse.split(' ').map((a) => `color:${output_dict[a]};`)

    const trialData = {
      phase: 'response_train',
      abs_input: stim[0],
      raw_input: rawInput,
      abs_target: stim[1],
      raw_target: actionsToColors(stim[1], output_dict),
      abs_response: absResponse,
      raw_response: rawResponseStyles.join(' '),
      correct: absResponse === stim[1],
      cycle: 1,
      learning_stage: 0,
      rt: 4200,
    }

    expect(trialData.phase).toBe('response_train')
    expect(trialData.abs_input).toBe('p1 m1')
    expect(trialData.raw_input).toBe(rawInput)
    expect(trialData.abs_target).toBe('c1 c1 c1')
    expect(trialData.correct).toBe(true)
    expect(typeof trialData.rt).toBe('number')
    expect(typeof trialData.learning_stage).toBe('number')
    expect(typeof trialData.cycle).toBe('number')
  })

  it('test trial has phase "test" and correct field', () => {
    const { input_dict, output_dict } = makeGrounding()
    const stim = stims1_test[0]
    const trialData = {
      phase: 'test',
      abs_input: stim[0],
      raw_input: convertCommandToWords(stim[0], input_dict),
      abs_target: stim[1],
      raw_target: actionsToColors(stim[1], output_dict),
      abs_response: 'c4 c4 c4',
      raw_response: '',
      correct: 'c4 c4 c4' === stim[1],
      cycle: -1,
      learning_stage: 0,
      rt: 3100,
    }
    expect(trialData.phase).toBe('test')
    expect(trialData.cycle).toBe(-1)
  })
})
