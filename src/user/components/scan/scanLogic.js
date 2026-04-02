// Pure JS experiment logic, ported from psiturk-example-v2/static/js/task.js.
// No DOM, no Vue — importable and testable in isolation.

export { WORDS, COLORS } from './scanStimuli'

export const REDACTED_SYMBOL = 'REDACTED'
export const MAX_CYCLES = 3

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
export function createGrounding(allStims, words, colors) {
  const input_dict = {}
  const output_dict = {}
  const output_dict_reverse = {}

  // Collect and deduplicate input symbols in encounter order
  const inputSymbols = []
  for (const stim of allStims) {
    for (const sym of stim[0].trim().split(' ')) {
      if (!inputSymbols.includes(sym)) inputSymbols.push(sym)
    }
  }
  for (const sym of inputSymbols) {
    if (!(sym in input_dict)) {
      input_dict[sym] = words.shift()
    }
  }

  // Collect and deduplicate output symbols in encounter order
  const outputSymbols = []
  for (const stim of allStims) {
    for (const sym of stim[1].trim().split(' ')) {
      if (!outputSymbols.includes(sym)) outputSymbols.push(sym)
    }
  }
  for (const sym of outputSymbols) {
    if (!(sym in output_dict)) {
      const color = colors.shift()
      output_dict[sym] = color
      output_dict_reverse[color] = sym
    }
  }

  // Remaining (unused) colors map to 'undefined_action'
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
  shuffleArray(zipped)

  return [
    ...zipped.map((s) => ({ train: s.train, test: s.test, flexThreshold: 0 })),
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

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Fisher-Yates in-place shuffle (lodash _.shuffle equivalent) */
function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}
