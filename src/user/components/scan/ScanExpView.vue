<script setup>
// ScanExpView.vue
// Ports the ScanExperiment logic from psiturk-example-v2/static/js/task.js into Smile.
// jQuery UI is used for drag-and-drop, matching the original implementation.

import { ref, nextTick, onMounted } from 'vue'
import $ from 'jquery'
import _ from 'underscore'

// jQuery UI requires a global `jQuery` before its modules are evaluated.
// Set it here (module body runs before onMounted) so dynamic imports below find it.
window.jQuery = $
window.$ = $

import useViewAPI from '@/core/composables/useViewAPI'

import {
  WORDS,
  COLORS,
  REDACTED_SYMBOL,
  createGrounding,
  getScanSeedSignature,
  convertCommandToWords,
  removeSingletons,
  redactOutput,
  hasPassed,
  buildStageOrder,
  parseResponse,
  actionsToColors,
} from './scanLogic'

import { subtasks_train, subtasks_test, stims1_test, stims2_test, stims3_test, stims4_train, stims4_test } from './scanStimuli'

const api = useViewAPI()

// ---------------------------------------------------------------------------
// Seeded PRNG for testing — override Math.random when ?seed=N is in the URL.
// Use the same seed value in both Smile and psiturk serve.js to get identical
// stimulus orderings side-by-side. Example: http://localhost:3020?seed=42
// ---------------------------------------------------------------------------
// Put seed in the base query string (before #) so changing it forces a full page reload.
// URL format: http://localhost:3020/.../?seed=42#/experiment/
function getTestSeed() {
  const searchSeed = new URLSearchParams(window.location.search).get('seed')
  if (searchSeed !== null) return searchSeed

  const [, hashQuery = ''] = window.location.hash.split('?')
  return new URLSearchParams(hashQuery).get('seed')
}

const _testSeed = getTestSeed()
const debugMappingVisible = ref(false)
function applyTestSeed(seedValue) {
  if (seedValue === null) return
  let s = parseInt(seedValue, 10)
  Math.random = function () {
    s |= 0; s = (s + 0x6D2B79F5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
applyTestSeed(_testSeed)

const currentSeedSignature = getScanSeedSignature({
  urlSeed: _testSeed,
  useSeed: api.store.browserPersisted.useSeed,
  seedID: api.store.getSeedID,
})
const SCAN_RANDOMIZATION_VERSION = 'underscore-1.13.8-v5'
const SCAN_DEBUG_BUILD = '2026-04-09-epoch-fix'

function getStageId(stage) {
  const firstTest = stage?.test?.[0]?.[0]
  if (firstTest === stims1_test[0][0]) return 1
  if (firstTest === stims2_test[0][0]) return 2
  if (firstTest === stims3_test[0][0]) return 3
  if (firstTest === stims4_test[0][0]) return 4
  return null
}

// ---------------------------------------------------------------------------
// Persistent state: grounding, stage order, pool colors, current stage index.
// Survives page reload so participants don't restart from stage 1.
// ---------------------------------------------------------------------------
function initPersist() {
  // Reset before the SCAN-specific setup so framework/library startup cannot
  // perturb the seeded stream.

  // Match psiturk's global initialization sequence (precompute_grounding handles per-stage):
  // 1. task.js: apply_test_seed()  [matches applyTestSeed above]
  // 2. task.js: myzip = _.shuffle(myzip)  [stage order]
  // 3. task.js: colors = _.shuffle(colors_scan)
  // 4. task.js: words  = _.shuffle(words_scan)
  // 5. task.js: colors_post = _.shuffle(colors)
  // Per-stage constructor draws (7-9) and epoch draw (10) happen lazily in initStageState/next().
  applyTestSeed(_testSeed)                         
  const stageOrder = buildStageOrder(subtasks_train, subtasks_test, stims4_train, stims4_test)
  const colors = _.shuffle(COLORS)             
  const mappingColors = [...COLORS]
  const words = _.shuffle(WORDS)               
  const colors_post = _.shuffle(colors)        
  const debugStageInfo = []
  const initialDebugPools = {
    colors: [...colors],
    mappingColors: [...mappingColors],
    words: [...words],
    colorsPost: [...colors_post],
  }

  // Live psiturk traces show output mappings are consumed from the original
  // colors_scan order, while the displayed response pool uses colors_post from
  // the seeded shuffle above.
  const grounding = createGrounding(stageOrder, words, mappingColors, debugStageInfo)

  api.persist.scan = {
    grounding,
    stageOrder: stageOrder.map((s) => ({
      train: s.train,
      test: s.test,
      flexThreshold: s.flexThreshold,
    })),
    colors_post,
    debugPools: initialDebugPools,
    debugStageInfo,
    stageIdx: 0,
    seedSignature: currentSeedSignature,
    randomizationVersion: SCAN_RANDOMIZATION_VERSION,
  }
}

if (_testSeed !== null) {
  // In URL-seeded test mode, always rebuild from a fresh PRNG stream.
  initPersist()
} else if (!api.persist.isDefined('scan')) {
  initPersist()
} else {
  const s = api.persist.scan

  // Reinitialize when the active fixed seed or URL seed changes.
  if (s.randomizationVersion !== SCAN_RANDOMIZATION_VERSION) {
    initPersist()
  } else if (currentSeedSignature !== null && s.seedSignature !== currentSeedSignature) {
    initPersist()
  } else if (!s.stageOrder || s.stageIdx >= s.stageOrder.length) {
    // Reset stale state — e.g. stageIdx left at nstage from a previous completed run
    initPersist()
  }
}

const p = api.persist.scan
const { input_dict, output_dict, output_dict_reverse, stageStimSnapshots } = p.grounding
const colors_post = p.colors_post
const debugPools = p.debugPools || { colorsScan: [], colors: [], words: [], colorsPost: [] }
const debugStageInfo = p.debugStageInfo || []
const nstage = p.stageOrder.length // 4

if (_testSeed !== null) {
  window.__smileScanDebug = {
    seed: _testSeed,
    underscoreVersion: _.VERSION,
    seedSignature: currentSeedSignature,
    randomizationVersion: SCAN_RANDOMIZATION_VERSION,
    debugBuild: SCAN_DEBUG_BUILD,
    debugPools,
    colorsPost: colors_post,
    stageOrder: p.stageOrder.map((stage, index) => ({
      index,
      stageId: getStageId(stage),
      firstTrain: stage.train[0]?.[0],
      firstTest: stage.test[0]?.[0],
      flexThreshold: stage.flexThreshold,
    })),
    debugStageInfo,
    stageStimSnapshots,
    input_dict,
    output_dict,
    output_dict_reverse,
  }
  console.log('[Smile SCAN debug]', window.__smileScanDebug)
}

// Current stage shorthand
const currentStage = () => p.stageOrder[p.stageIdx]

function getUniqueSymbols(stims, sideIndex) {
  const symbols = []
  for (const stim of stims) {
    for (const sym of stim[sideIndex].trim().split(' ')) {
      if (!symbols.includes(sym)) symbols.push(sym)
    }
  }
  return symbols
}

function getCurrentStageInputMappings() {
  const stage = currentStage()
  if (!stage) return []

  const symbols = getUniqueSymbols([...stage.train, ...stage.test], 0)
  return symbols
    .filter((sym) => input_dict[sym] !== undefined)
    .map((sym) => ({ symbol: sym, value: input_dict[sym] }))
}

function getCurrentStageOutputMappings() {
  const stage = currentStage()
  if (!stage) return []

  const symbols = getUniqueSymbols([...stage.train, ...stage.test], 1)
  return symbols
    .filter((sym) => output_dict[sym] !== undefined)
    .map((sym) => ({ symbol: sym, value: output_dict[sym] }))
}

function getCurrentStageDebugInfo() {
  return debugStageInfo[p.stageIdx] || { inputSymbols: [], outputSymbols: [] }
}

// ---------------------------------------------------------------------------
// Reactive UI state
// ---------------------------------------------------------------------------
// uiPhase drives which sections are shown, mirroring the show/hide logic in task.js
const uiPhase = ref('study_table') // 'study_table' | 'memory_quiz' | 'test_instructions' | 'test'
const isRepeatCycle = ref(false)   // true when showing study table after a failed cycle
const repeatMsg = ref('')
const testMsg = ref('')
const feedbackVisible = ref(false)
const feedbackCorrect = ref(false)
const submitMessage = ref('')
const stageCountText = ref('')
const trialCountText = ref('')
const currentStimWords = ref('')

// ---------------------------------------------------------------------------
// In-memory state — mirrors task.js ScanExperiment instance variables.
// Resets on page reload (user re-studies the current stage — acceptable).
// ---------------------------------------------------------------------------
let cycleCount = 0
let epochCorrect = 0
let epochCount = 0
let stims_epoch = []            // quiz queue for current cycle (non-singletons, shuffled)
let stims_orig_epoch = []       // used for trial count display
let stims_train_shuffled = []   // train shuffled at stage init (draw 8); epoch basis
let stims_test = []             // test queue for current stage
let currentStim = null     // current [input, output] pair
let stage = ''             // 'response_train' | 'feedback_train' | 'test'
let wordon = null

// ---------------------------------------------------------------------------
// next() — mirrors task.js next(). Called to advance the quiz phase.
// ---------------------------------------------------------------------------
function next() {
  if (stims_epoch.length === 0) {
    if (cycleCount > 0) {
      // End of a cycle — check pass/fail
      if (hasPassed(epochCount, epochCorrect, currentStage().flexThreshold, cycleCount)) {
        // Passed — transition to test instructions
        testMsg.value =
          '<strong>Congratulations! You have passed the study phase.</strong><br><br>'
        uiPhase.value = 'test_instructions'
        nextTick(() => makeExampleTable(currentStage().train))
        return
      } else {
        // Failed — show repeat message, return to study table
        const errors = epochCount - epochCorrect
        const flex = currentStage().flexThreshold
        if (flex === 0) {
          repeatMsg.value = `<strong>Please try again! You made ${errors} errors. Please retry the quiz until you get all of the answers correct.</strong><br><br>`
        } else {
          repeatMsg.value = `<strong>Please try again! You made ${errors} errors. Please retry the quiz until you get no more than ${flex} answer wrong.</strong><br><br>`
        }
        isRepeatCycle.value = true
      }
    }

    // Advance cycle and refill epoch (matches original: cycle_count += 1 after both first and repeat)
    cycleCount += 1
    epochCorrect = 0
    epochCount = 0
    // stims_orig_epoch = removeSingletons([...stims_train_shuffled])
    // stims_epoch = _.shuffle(stims_orig_epoch)
    stims_epoch = stageStimSnapshots[p.stageIdx].epochStims

    // Show study table (first time or after failure)
    uiPhase.value = 'study_table'
    stageCountText.value = `Stage ${p.stageIdx + 1} of ${nstage}`
    nextTick(() => makeExampleTable(currentStage().train))
    return
  }

  // Show next quiz trial
  currentStim = stims_epoch.shift()
  currentStimWords.value = convertCommandToWords(currentStim[0], input_dict)
  stage = 'response_train'
  wordon = Date.now()
  epochCount += 1  // increment here so trial_count shows correct number
  trialCountText.value = `Study trial ${epochCount} of ${stims_orig_epoch.length}`
  stageCountText.value = `Stage ${p.stageIdx + 1} of ${nstage}`
  feedbackVisible.value = false
  clearResponse()
  submitMessage.value = ''
  nextTick(() => {
    makeExampleTable(redactOutput(currentStage().train, currentStim[0]))
    enableDragSort(true)
  })
}

// ---------------------------------------------------------------------------
// nextTest() — mirrors task.js next_test()
// ---------------------------------------------------------------------------
function nextTest() {
  if (stims_test.length === 0) {
    // Stage complete — advance to next stage
    p.stageIdx += 1
    if (p.stageIdx < nstage) {
      initStageState()
    } else {
      api.goNextView()
    }
    return
  }

  currentStim = stims_test.shift()
  currentStimWords.value = convertCommandToWords(currentStim[0], input_dict)
  stage = 'test'
  testMsg.value = ''
  wordon = Date.now()
  const totalTest = currentStage().test.length
  const doneTest = totalTest - stims_test.length
  trialCountText.value = `Test trial ${doneTest} of ${totalTest}`
  stageCountText.value = `Stage ${p.stageIdx + 1} of ${nstage}`
  clearResponse()
  submitMessage.value = ''
  nextTick(() => makeExampleTable(currentStage().train))
}

// ---------------------------------------------------------------------------
// Stage initialization — called on mount and when advancing to a new stage
// ---------------------------------------------------------------------------
function initStageState() {
  cycleCount = 0
  epochCorrect = 0
  epochCount = 0
  stims_epoch = []

  const stageSnapshot = stageStimSnapshots[p.stageIdx]
  // stims_train_shuffled = stageSnapshot.train.map((stim) => [...stim]) // copy to avoid mutating the original
  stims_test = stageSnapshot.test.map((stim) => [...stim])

  isRepeatCycle.value = false
  repeatMsg.value = ''
  next() // will show study table (fills epoch, sets uiPhase='study_table')
}

// ---------------------------------------------------------------------------
// Button handlers
// ---------------------------------------------------------------------------

// "Continue to quiz" button — matches task.js comp_quiz_button click → switch_memory_quiz()
function onContinueToQuiz() {
  uiPhase.value = 'memory_quiz'
  nextTick(() => next())
}

// "Continue to test" button — matches task.js comp_test_button click → switch_test()
function onContinueToTest() {
  uiPhase.value = 'test'
  nextTick(() => nextTest())
}

// Submit button — matches task.js response_handler()
function handleSubmit() {
  const styles = getResponseStyles()
  if (styles.length === 0) {
    submitMessage.value = 'Response array is empty.'
    return
  }

  const absResponse = parseResponse(styles, output_dict_reverse)
  const rawResponse = styles.join(' ')
  const rt = Date.now() - wordon
  const isCorrect = absResponse === currentStim[1]

  // Record data — matches task.js psiTurk.recordTrialData({...})
  api.stepData.phase = stage
  api.stepData.abs_input = currentStim[0]
  api.stepData.raw_input = currentStimWords.value
  api.stepData.abs_target = currentStim[1]
  api.stepData.raw_target = actionsToColors(currentStim[1], output_dict)
  api.stepData.abs_response = absResponse
  api.stepData.raw_response = rawResponse
  api.stepData.correct = isCorrect
  api.stepData.cycle = stage === 'test' ? -1 : cycleCount
  api.stepData.learning_stage = p.stageIdx
  api.stepData.rt = rt
  api.recordStep()

  if (stage === 'response_train') {
    if (isCorrect) epochCorrect += 1
    // Show feedback — matches task.js show_feedback()
    feedbackCorrect.value = isCorrect
    feedbackVisible.value = true
    if (!isCorrect) {
      // Populate feedback_array with correct answer circles
      $('#feedback_array').html('')
      for (const sym of currentStim[1].split(' ')) {
        $('#feedback_array').append(makeCircle(output_dict[sym], 'feedback_li'))
      }
    }
    stage = 'feedback_train'
    enableDragSort(false)
  } else if (stage === 'test') {
    // No feedback in test — advance directly
    nextTest()
  }
}

// "Continue" button after quiz feedback — matches task.js continue_handler()
function handleContinue() {
  clearResponse()
  $('#feedback_array').html('')
  feedbackVisible.value = false
  enableDragSort(true)
  nextTick(() => next())
}

// Reset button — matches task.js reset_button handler
function handleReset() {
  if (stage !== 'feedback_train') {
    clearResponse()
  }
}

// ---------------------------------------------------------------------------
// jQuery UI setup — mirrors task.js post_pool(), sortable/draggable init
// ---------------------------------------------------------------------------

// Populate the pool with colored circles and make them draggable.
// Mirrors task.js post_pool() and the draggable setup.
function setupPool() {
  $('#source_array').html('')
  for (const color of colors_post) {
    const $circle = makeCircle(color, 'source_li')
    // Click to add a copy to response_array — mirrors task.js f_new_circle
    $circle.on('click', function () {
      if (stage === 'feedback_train') return
      const $copy = makeCircle(color, 'source_response')
      $('#response_array').append($copy)
    })
    $('#source_array').append($circle)
  }
  // Make pool items draggable with clone helper — matches task.js setup
  $('.source_li').draggable({ helper: 'clone', connectToSortable: '#response_array' })
  $('.source_li').disableSelection()
}

function enableDragSort(enabled) {
  $('.source_li').draggable({ disabled: !enabled })
  $('#response_array').sortable({ disabled: !enabled })
}

function clearResponse() {
  $('#response_array').html('')
}

function getResponseStyles() {
  return $('#response_array span')
    .map(function () {
      return $(this).attr('style')
    })
    .get()
}

// ---------------------------------------------------------------------------
// Circle and table DOM helpers — mirrors task.js make_circle, make_example_table
// ---------------------------------------------------------------------------

// Mirrors task.js make_circle(mycolor, myclass)
function makeCircle(color, cssClass) {
  return $('<li>')
    .attr('class', cssClass)
    .html($('<span>').attr('style', `color:${color};`).html('&#x25CF'))
}

// Mirrors task.js make_example_table() + sort_helper()
function makeExampleTable(stims) {
  // Sort by command length then alphabetically — matches task.js sort_helper
  const sorted = stims.slice().sort((a, b) => {
    const diff = a[0].trim().split(' ').length - b[0].trim().split(' ').length
    return diff !== 0 ? diff : a[0].localeCompare(b[0])
  })

  const ncol = 2
  const space = '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'
  const nrow = Math.ceil(sorted.length / ncol)
  const $table = $('#table-example')
  $table.html('')

  let sc = 0
  for (let r = 0; r < nrow; r++) {
    const $row = $('<tr>')
    for (let c = 0; c < ncol; c++) {
      if (sc < sorted.length) {
        const stim = sorted[sc]
        const $cmd = $('<td>').text(convertCommandToWords(stim[0], input_dict))
        const $circles = makeCirclesCell(stim[1])
        $row.append($cmd).append($circles).append($('<td>').html(space))
      } else {
        $row.append($('<td>')).append($('<td>')).append($('<td>').html(space))
      }
      sc++
    }
    $table.append($row)
  }
}

// Mirrors task.js make_circles_cell()
function makeCirclesCell(output) {
  const $list = $('<ul>')
  if (output === REDACTED_SYMBOL) {
    $list.append(
      $('<li>').attr('class', 'data_li').html(
        $('<span>').attr('style', 'color:#000000;font-size:40px;display:inline-block;transform:scaleX(1.3) scaleY(0.5);').html('&#x25AC')
      )
    )
  } else {
    for (const sym of output.trim().split(' ')) {
      $list.append(makeCircle(output_dict[sym], 'data_li'))
    }
  }
  return $('<td>').append($list)
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------
onMounted(async () => {
  // Load jQuery UI widgets after window.jQuery is set (dynamic import defers evaluation)
  await import('jquery-ui/ui/version')
  await import('jquery-ui/ui/widget')
  await import('jquery-ui/ui/data')
  await import('jquery-ui/ui/plugin')
  await import('jquery-ui/ui/scroll-parent')
  await import('jquery-ui/ui/disable-selection')
  await import('jquery-ui/ui/widgets/mouse')
  await import('jquery-ui/ui/widgets/draggable')
  await import('jquery-ui/ui/widgets/sortable')
  $('#response_array').sortable()
  $('#response_array').disableSelection()

  // Populate the pool (stays populated for the whole view lifetime)
  setupPool()

  // Start the stage state machine
  initStageState()
})
</script>

<template>
  <div class="scan-exp mx-auto max-w-4xl px-6 py-4">

    <div v-if="_testSeed !== null" class="scan-debug-panel mb-4">
      <div class="scan-debug-title" style="cursor:pointer;user-select:none;" @click="debugMappingVisible = !debugMappingVisible">
        Seed {{ _testSeed }} current-stage mapping (build {{ SCAN_DEBUG_BUILD }})
        <span style="font-size:0.8em;margin-left:6px;">{{ debugMappingVisible ? '▲' : '▼' }}</span>
      </div>
      <div v-show="debugMappingVisible">
        <div class="scan-debug-meta">words: {{ debugPools.words.join(', ') }}</div>
        <div class="scan-debug-meta">colors: {{ debugPools.colors.join(', ') }}</div>
        <div class="scan-debug-meta">input order: {{ getCurrentStageDebugInfo().inputSymbols.join(', ') }}</div>
        <div class="scan-debug-meta">output order: {{ getCurrentStageDebugInfo().outputSymbols.join(', ') }}</div>
        <div class="scan-debug-grid">
          <div>
            <div class="scan-debug-subtitle">Input symbols</div>
            <div v-for="entry in getCurrentStageInputMappings()" :key="`in-${entry.symbol}`" class="scan-debug-row">
              <span>{{ entry.symbol }}</span>
              <span>{{ entry.value }}</span>
            </div>
          </div>
          <div>
            <div class="scan-debug-subtitle">Output symbols</div>
            <div v-for="entry in getCurrentStageOutputMappings()" :key="`out-${entry.symbol}`" class="scan-debug-row">
              <span>{{ entry.symbol }}</span>
              <span>{{ entry.value }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ------------------------------------------------------------------ -->
    <!-- Phase instruction banners                                            -->
    <!-- ------------------------------------------------------------------ -->

    <!-- Study table: first-time instructions -->
    <div v-show="uiPhase === 'study_table' && !isRepeatCycle">
      <strong>
        This is the study phase of {{ stageCountText }}. Please study the following commands
        and their corresponding outputs. When you are ready, press &lt;continue&gt; to be
        quizzed on their content.
        <br /><br />
        You do not need to memorize the whole set right now. The output for each command will
        be covered in turn, and you will be asked to reproduce the covered output with the rest
        of the reference set visible.
      </strong>
    </div>

    <!-- Study table: repeat instructions after failed cycle -->
    <div v-show="uiPhase === 'study_table' && isRepeatCycle" v-html="repeatMsg" />

    <!-- Memory quiz instructions -->
    <div v-show="uiPhase === 'memory_quiz'">
      <strong>
        The commands/outputs are shown below for reference (the one to be evaluated is covered
        &#x25AC).
      </strong>
    </div>

    <!-- Test phase instructions (shown on test_instructions and during test) -->
    <div v-show="uiPhase === 'test_instructions' || uiPhase === 'test'">
      <span v-html="testMsg" />
      <strong>
        You have now entered the TEST phase of {{ stageCountText }}. You will be asked to
        predict the correct response for novel commands. The list below provides all of the
        commands you have studied previously, which is available for reference during the test
        phase.
      </strong>
    </div>

    <!-- ------------------------------------------------------------------ -->
    <!-- Example table — always visible, content changes per phase           -->
    <!-- ------------------------------------------------------------------ -->
    <div class="mt-3">
      <table id="table-example" />

      <!-- Continue to quiz button (study_table only) -->
      <div v-show="uiPhase === 'study_table'" class="mt-3">
        <button id="comp_quiz_button" class="btn btn-primary btn-lg" @click="onContinueToQuiz">
          Continue to quiz
        </button>
      </div>

      <!-- Continue to test button (test_instructions only) -->
      <div v-show="uiPhase === 'test_instructions'" class="mt-3">
        <button id="comp_test_button" class="btn btn-primary btn-lg" @click="onContinueToTest">
          Continue to test
        </button>
      </div>

      <hr class="mt-3" />
    </div>

    <!-- ------------------------------------------------------------------ -->
    <!-- Trial interface — shown during memory_quiz and test phases          -->
    <!-- ------------------------------------------------------------------ -->
    <div v-show="uiPhase === 'memory_quiz' || uiPhase === 'test'">
      <p>
        Please evaluate the following command
        (<span>{{ stageCountText }}</span
        >; <span id="trial_count">{{ trialCountText }}</span
        >):
      </p>

      <!-- Current command (mirrors task.js show_words / #stim #word) -->
      <div id="stim">
        <div
          id="word"
          style="font-size: 30px; font-weight: bold; margin: 10px"
        >
          {{ currentStimWords }}
        </div>
      </div>

      <br />

      <!-- Color pool — populated via jQuery in setupPool() -->
      Pool (click or drag):
      <ul id="source_array" style="width: 450px; height: 70px; background: #eee" />

      <br />

      <!-- Response box -->
      Response to command:
      <button id="reset_button" class="btn btn-default" @click="handleReset">Reset</button>
      <ul id="response_array" style="width: 75%; height: 70px" />

      <!-- Submit -->
      <div v-show="!feedbackVisible" class="mt-2">
        <span id="submit_message" style="color: red">{{ submitMessage }}</span
        ><br />
        <button id="submit_button" class="btn btn-primary btn-lg" @click="handleSubmit">
          Submit
        </button>
      </div>

      <!-- Feedback (quiz phase only) — mirrors task.js show_feedback() -->
      <div id="container-feedback" v-show="feedbackVisible" class="mt-2">
        <br />
        <span id="feedback_text">
          <template v-if="feedbackCorrect">Your response is CORRECT!</template>
          <template v-else>
            Your response is INCORRECT. Please see the correct response below:
          </template>
        </span>

        <!-- Correct answer circles (incorrect responses only) -->
        <div id="container-feedback-array" v-show="!feedbackCorrect">
          <ul id="feedback_array" style="border-style: solid; width: 75%; height: 70px" />
        </div>

        <br />
        <button id="continue_button" class="btn btn-primary btn-lg" @click="handleContinue">
          Continue
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Mirrors stage.html styles */
:deep(ul) {
  list-style-type: none;
  margin: 0;
  padding: 5px;
  display: flex;
  align-items: center;
}

:deep(li) {
  font-size: 42px;
}

:deep(.source_li) {
  cursor: pointer;
}

:deep(#response_array) {
  border: 1px solid black;
}

:deep(.data_li) {
  font-size: 30px;
}

:deep(.feedback_li) {
  font-size: 30px;
}

:deep(li) span {
  display: block;
  text-align: center;
  text-decoration: none;
}

/* Bootstrap-compatible button styles */
.btn {
  display: inline-block;
  padding: 6px 12px;
  font-size: 14px;
  font-weight: 400;
  line-height: 1.42857143;
  text-align: center;
  cursor: pointer;
  border: 1px solid transparent;
  border-radius: 4px;
}

.btn-primary {
  color: #fff;
  background-color: #337ab7;
  border-color: #2e6da4;
}

.btn-primary:hover {
  background-color: #286090;
}

.btn-default {
  color: #333;
  background-color: #fff;
  border-color: #ccc;
}

.btn-default:hover {
  background-color: #e6e6e6;
}

.btn-lg {
  padding: 10px 16px;
  font-size: 18px;
  border-radius: 6px;
}

.scan-debug-panel {
  border: 1px solid #bbb;
  background: #f8f8f8;
  padding: 12px;
  font-family: monospace;
  font-size: 13px;
}

.scan-debug-title {
  font-weight: bold;
  margin-bottom: 8px;
}

.scan-debug-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
}

.scan-debug-subtitle {
  font-weight: bold;
  margin-bottom: 6px;
}

.scan-debug-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}
</style>
