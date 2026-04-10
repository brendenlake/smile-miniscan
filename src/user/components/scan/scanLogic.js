// Pure JS experiment logic, ported from psiturk-example-v2/static/js/task.js.
// No DOM, no Vue — importable and testable in isolation.

import _ from 'underscore'

export { WORDS, COLORS } from './scanStimuli'

export const REDACTED_SYMBOL = 'REDACTED'
export const MAX_CYCLES = 3

/**
 * Return the signature used to determine whether persisted SCAN randomization
 * should be regenerated.
 *
 * URL seed takes precedence because ScanExpView overrides Math.random locally
 * when ?seed=N is present. Otherwise, a fixed Smile seed is keyed off the
 * browser-persisted seed ID. When random seeding is enabled, return null so we
 * preserve the existing persisted state across reloads.
 *
 * @param {{ urlSeed?: string|null, useSeed?: boolean, seedID?: string }} options
 * @returns {string|null}
 */
export function getScanSeedSignature({ urlSeed = null, useSeed = false, seedID = '' } = {}) {
  if (urlSeed !== null) return `url:${urlSeed}`
  if (useSeed && seedID) return `store:${seedID}`
  return null
}

/**
 * Build input/output grounding from all stimuli.
 *
 * Mirrors task.js: input symbols are mapped to words via shift() from a
 * shuffled pool; output symbols are mapped to colors the same way.
 * Symbols are processed in the order they appear; duplicates are skipped
 * (matching the `if (!(sym in dict))` guard in the original).
 *
 * @param {Array} allStims - All [input, output] pairs from every stage
 * @param {string[]} words  - Shuffled copy of WORDS to draw from
 * @param {string[]} colors - Shuffled copy of COLORS to draw from
 * @returns {{ input_dict, output_dict, output_dict_reverse }}
 */
/**
 * Build input/output grounding by processing each stage in order, exactly
 * mirroring psiturk's ScanExperiment constructor logic:
 *   stims = _.shuffle(train.concat(test))
 *   stims_train = _.shuffle(stims_train)
 *   stims_test  = _.shuffle(stims_test)
 *   input_symbols  = Array.from(new Set(...)); _.shuffle(input_symbols)
 *   output_symbols = Array.from(new Set(...)); _.shuffle(output_symbols)
 *
 * This replicates the exact PRNG draw counts per stage, so a seeded
 * Math.random produces the same primitive assignments as psiturk.
 *
 * @param {Array<{train, test}>} stageOrder - stages in presentation order
 * @param {string[]} words  - shuffled word pool (mutated via shift())
 * @param {string[]} colors - shuffled color pool (mutated via shift())
 */
export function createGrounding(stageOrder, words, colors, debugStages = null) {
  const input_dict = {}
  const output_dict = {}
  const output_dict_reverse = {}

  for (const [stageIndex, stage] of stageOrder.entries()) {
    // Mirror precompute_grounding's three stims shuffles (draws discarded, matching psiturk)
    const stims = _.shuffle([...stage.train, ...stage.test])
    _.shuffle(stage.train)
    _.shuffle(stage.test)

    // Collect input symbols in shuffled-stim encounter order, then shuffle
    const inputSymbols = []
    for (const stim of stims) {
      for (const sym of stim[0].trim().split(' ')) {
        if (!inputSymbols.includes(sym)) inputSymbols.push(sym)
      }
    }
    const shuffledInputSymbols = _.shuffle(inputSymbols)
    for (const sym of shuffledInputSymbols) {
      if (!(sym in input_dict)) input_dict[sym] = words.shift()
    }

    // Collect output symbols in shuffled-stim encounter order, then shuffle
    const outputSymbols = []
    for (const stim of stims) {
      for (const sym of stim[1].trim().split(' ')) {
        if (!outputSymbols.includes(sym)) outputSymbols.push(sym)
      }
    }
    const shuffledOutputSymbols = _.shuffle(outputSymbols)
    for (const sym of shuffledOutputSymbols) {
      if (!(sym in output_dict)) {
        const color = colors.shift()
        output_dict[sym] = color
        output_dict_reverse[color] = sym
      }
    }

    if (debugStages) {
      debugStages[stageIndex] = {
        inputSymbols: [...shuffledInputSymbols],
        outputSymbols: [...shuffledOutputSymbols],
      }
    }

    // Mirror precompute_grounding lines 196-199 in task.js: result discarded, but
    // consumes PRNG draws to keep the seeded stream in sync with psiturk.
    const epochStims = stage.train.filter((s) => s[0].trim().split(' ').length > 1)
    _.shuffle(epochStims)
  }

  // Remaining colors map to 'undefined_action'
  for (const color of colors) {
    output_dict_reverse[color] = 'undefined_action'
  }

  return { input_dict, output_dict, output_dict_reverse }
}

/**
 * Convert an abstract command string to its pseudo-word representation.
 * Mirrors task.js convert_command_to_words.
 */
export function convertCommandToWords(command, input_dict) {
  return command
    .trim()
    .split(' ')
    .map((sym) => input_dict[sym])
    .join(' ')
}

/**
 * Remove stimuli whose input command is a single token (primitive).
 * Mirrors task.js remove_singletons — these are excluded from quiz cycles.
 */
export function removeSingletons(stims) {
  return stims.filter((s) => s[0].trim().split(' ').length > 1)
}

/**
 * Return a copy of stims_train with the target stim's output replaced by
 * REDACTED_SYMBOL, for display during the quiz phase.
 * Mirrors task.js remove_element.
 *
 * @param {Array} stims_train - Training stimuli array
 * @param {string} targetInput - The input string of the stim to redact
 */
export function redactOutput(stims_train, targetInput) {
  return stims_train.map((s) =>
    s[0] === targetInput ? [s[0], REDACTED_SYMBOL] : [s[0], s[1]]
  )
}

/**
 * Determine whether the participant passed the current quiz cycle.
 * Mirrors the pass condition in task.js next():
 *   epoch_count - epoch_correct <= flex_threshold || cycle_count === max_cycle_count
 *
 * @param {number} epochCount   - Total trials attempted this cycle
 * @param {number} epochCorrect - Correct trials this cycle
 * @param {number} flexThreshold - Allowed errors (0 for stages 1-3, 1 for stage 4)
 * @param {number} cycleCount   - Current cycle number (1-based)
 */
export function hasPassed(epochCount, epochCorrect, flexThreshold, cycleCount) {
  const errors = epochCount - epochCorrect
  return errors <= flexThreshold || cycleCount >= MAX_CYCLES
}

/**
 * Build the full 4-stage ordering for a participant.
 * Mirrors task.js: stages 1-3 are shuffled as train/test pairs; stage 4 is always last.
 *
 * @returns {Array<{ train, test, flexThreshold }>}
 */
export function buildStageOrder(subtasks_train, subtasks_test, postTrain, postTest) {
  // Zip pre-stages into pairs then shuffle, mirroring:
  //   myzip = subtasks_train.map((e, i) => [e, subtasks_test[i]])
  //   myzip = _.shuffle(myzip)
  const zipped = subtasks_train.map((train, i) => ({ train, test: subtasks_test[i] }))
  const shuffled = _.shuffle(zipped)

  return [
    ...shuffled.map((s) => ({ train: s.train, test: s.test, flexThreshold: 0 })),
    { train: postTrain, test: postTest, flexThreshold: 1 },
  ]
}

/**
 * Parse an array of CSS color style strings into a space-separated abstract
 * action string. Mirrors task.js process_response.
 *
 * @param {string[]} colorStyles - e.g. ['color:#ff0000;', 'color:#0000ff;']
 * @param {Object} output_dict_reverse - color → abstract symbol
 */
export function parseResponse(colorStyles, output_dict_reverse) {
  if (colorStyles.length === 0) return ''
  return colorStyles
    .map((style) => {
      const start = style.indexOf('color:') + 6
      const end = style.indexOf(';', start)
      const color = style.substring(start, end)
      return output_dict_reverse[color]
    })
    .join(' ')
}

/**
 * Convert a space-separated abstract action string to a space-separated
 * color string. Mirrors task.js actions_to_colors.
 */
export function actionsToColors(actions, output_dict) {
  return actions
    .trim()
    .split(' ')
    .map((a) => output_dict[a])
    .join(' ')
}

