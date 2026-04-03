<script setup>
// ScanInstructionsView.vue
// Two-page instructions view ported from psiturk-example-v2/templates/instructions/.
// Page 1: text overview (instruct-1.html)
// Page 2: interactive drag-and-drop practice (instruct-2.html) — must answer correctly to proceed

import { ref, nextTick } from 'vue'
import $ from 'jquery'

// jQuery UI requires a global `jQuery` before its modules are evaluated.
window.jQuery = $
window.$ = $

import useViewAPI from '@/core/composables/useViewAPI'
import { Button } from '@/uikit/components/ui/button'
import { COLORS } from '@/user/components/scan/scanStimuli'

const api = useViewAPI()

const page = ref(1)          // 1 or 2
const demoMsg = ref('')      // feedback message on page 2
const demoPassed = ref(false) // true once participant correctly enters 4 green circles

const GREEN = '#33cc33'      // matches color_green in instruct-2.html

function goToPage2() {
  page.value = 2
  nextTick(() => setupDemo())
}

function goToPage1() {
  page.value = 1
}

function finish() {
  api.goNextView()
}

// ---------------------------------------------------------------------------
// Interactive demo — mirrors instruct-2.html inline script
// ---------------------------------------------------------------------------
async function setupDemo() {
  // Load jQuery UI widgets after window.jQuery is set
  await import('jquery-ui/ui/version')
  await import('jquery-ui/ui/widget')
  await import('jquery-ui/ui/data')
  await import('jquery-ui/ui/plugin')
  await import('jquery-ui/ui/scroll-parent')
  await import('jquery-ui/ui/disable-selection')
  await import('jquery-ui/ui/widgets/mouse')
  await import('jquery-ui/ui/widgets/draggable')
  await import('jquery-ui/ui/widgets/sortable')
  $('#DEMO_source_array').html('')
  for (const color of COLORS) {
    const $circle = makeDemoCircle(color, 'DEMO_source_li')
    $circle.on('click', function () {
      $('#DEMO_response_array').append(makeDemoCircle(color, 'DEMO_source_response'))
    })
    $('#DEMO_source_array').append($circle)
  }

  // Drag-and-drop setup — matches instruct-2.html jQuery UI init
  $('#DEMO_response_array').sortable()
  $('#DEMO_response_array').disableSelection()
  $('.DEMO_source_li').draggable({ helper: 'clone', connectToSortable: '#DEMO_response_array' })
  $('.DEMO_source_li').disableSelection()
}

function makeDemoCircle(color, cssClass) {
  return $('<li>')
    .attr('class', cssClass)
    .html($('<span>').attr('style', `color:${color};`).html('&#x25CF'))
}

function demoReset() {
  $('#DEMO_response_array').html('')
  demoMsg.value = ''
}

// Mirrors instruct-2.html check_response() and submit()
function demoSubmit() {
  const styles = $('#DEMO_response_array span')
    .map(function () { return $(this).attr('style') })
    .get()

  const correct =
    styles.length === 4 && styles.every((s) => s === `color:${GREEN};`)

  if (correct) {
    demoMsg.value = 'Correct response! Please click the Quiz button to proceed.'
    demoPassed.value = true
  } else {
    demoMsg.value = 'Incorrect response! Please try again.'
    demoPassed.value = false
  }
}
</script>

<template>
  <div class="scan-instructions mx-auto max-w-3xl px-6 py-4">

    <!-- ------------------------------------------------------------------ -->
    <!-- Page 1: Overview (instruct-1.html)                                  -->
    <!-- ------------------------------------------------------------------ -->
    <div v-show="page === 1">
      <h1>Instructions</h1>
      <hr />

      <div class="instructions-well">

        <!-- original: Please read these instructions carefully. You will be quizzed on their content before the experiment begins.  -->

        <p>
          Please read these instructions carefully. You will be quizzed on their content before
          the experiment begins.
        </p>


        <!-- Original: This study has to do with how people learn input-output associations.
          You will be asked to learn a set of commands and their corresponding outputs. 
          Each command is a series of nonsense words, and the output for a command is a series of colored circles. -->

        <p>
          This study has to do with how people learn input-output associations. You will be asked
          to learn a set of commands and their corresponding outputs. Each command is a series of
          nonsense words, and the output for a command is a series of colored circles.
        </p>

        <!-- Original: The HIT is divided into <b>4 stages</b>. 
         Each stage will introduce new commands for you to learn, although some commands are shared across stages. 
         Each stage has both a study phase and a test phase, as described below: -->

         <!--<ul>
         <li><b>Study phases.</b> 
          For each stage, the study phase asks you to study a set of input-output associations. 
          To evaluate your learning, you will be asked to reproduce the correct output for each input command.
           You will repeatedly cycle through the items until you produce them correctly (or you complete three cycles). 
           Corrective feedback will be provided.
           <li><b>Test phases.</b> For each stage, the test phase will show you novel input commands, and your task is to predict their outputs.
           You will have access to the study list for reference. No feedback will be provided during this phase.
           </li>
        </ul> -->

        <p>
          The task is divided into <b>4 stages</b>. Each stage will introduce new commands for you
          to learn, although some commands are shared across stages. Each stage has both a study
          phase and a test phase, as described below:
        </p>
        <ul class="instructions-list">
          <li>
            <b>Study phases.</b> For each stage, the study phase asks you to study a set of
            input-output associations. To evaluate your learning, you will be asked to reproduce
            the correct output for each input command. You will repeatedly cycle through the items
            until you produce them correctly (or you complete three cycles). Corrective feedback
            will be provided.
          </li>
          <li>
            <b>Test phases.</b> For each stage, the test phase will show you novel input commands,
            and your task is to predict their outputs. You will have access to the study list for
            reference. No feedback will be provided during this phase.
          </li>
        </ul>        

        <!-- Original: After you complete the study and test phases, the next stage will begin.
          Please be advised that the fourth stage is longer and more difficult than the previous three. -->

        <p>
          After you complete the study and test phases, the next stage will begin. Please be
          advised that the fourth stage is longer and more difficult than the previous three.
        </p>

        <!-- Please only use the information on the screen to complete the task.
         Do not take notes or use external aids to help with the task (do not use pen and paper, take a screen shot, etc.).
         This is important for the scientific validity of the study. -->

        <p>
          Please only use the information on the screen to complete the task. Do not take notes or
          use external aids to help with the task (do not use pen and paper, take a screen shot,
          etc.). This is important for the scientific validity of the study.
        </p>
      </div>

      <hr />

      <div class="nav-row">
        <div />
        <Button variant="default" size="lg" @click="goToPage2">
          Next <i-fa6-solid-arrow-right class="ml-1" />
        </Button>
      </div>
    </div>

    <!-- ------------------------------------------------------------------ -->
    <!-- Page 2: Interactive practice (instruct-2.html)                      -->
    <!-- ------------------------------------------------------------------ -->
    <div v-show="page === 2">
      <h1>Instructions</h1>
      <hr />

      <!-- Original:       p>
            Here is how to use the response interface. 
            Please practice making an output response by adding <b>four green circles</b> to the response box.
             You can enter your response as follows:
            <dl>
                <dd>- You can drag the circles from the pool to the response box.</dd>
                <dd>- Alternatively, you can click the circles in the pool, to move them to the response box.</dd>
                <dd>- You can drag circles within the response box to re-order them.</dd>
                <dd>- The Reset button clears the response box.</dd>
            </dl>
            Please use the interface below to select your response.
        </p>
 -->

      <div class="instructions-well">
        <p>
          Here is how to use the response interface. Please practice making an output response by
          adding <b>four green circles</b> to the response box. You can enter your response as
          follows:
        </p>
        <dl>
          <dd>- You can drag the circles from the pool to the response box.</dd>
          <dd>- Alternatively, you can click the circles in the pool, to move them to the response box.</dd>
          <dd>- You can drag circles within the response box to re-order them.</dd>
          <dd>- The Reset button clears the response box.</dd>
        </dl>
        <p>Please use the interface below to select your response.</p>

        <br />

        Pool (click or drag):
        <ul id="DEMO_source_array" style="width: 450px; height: 70px; background: #eee" />

        <br />

        Response:
        <button id="DEMO_reset_button" class="btn btn-default" :disabled="demoPassed" @click="demoReset">Reset</button>
        <ul id="DEMO_response_array" style="width: 75%; height: 70px" />

        <br />
        <span id="DEMO_msg">{{ demoMsg }}</span>
        <br />
        <button id="DEMO_submit_button" class="btn btn-primary btn-lg mt-2" @click="demoSubmit">
          Submit
        </button>
      </div>

      <hr />

      <div class="nav-row">
        <Button variant="outline" size="lg" @click="goToPage1">
          <i-fa6-solid-arrow-left class="mr-1" /> Previous
        </Button>
        <Button
          v-if="demoPassed"
          variant="default"
          size="lg"
          @click="finish"
        >
          Go to quiz <i-fa6-solid-arrow-right class="ml-1" />
        </Button>
      </div>
    </div>

  </div>
</template>

<style scoped>
h1 {
  font-size: 1.875rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}

hr {
  margin: 1rem 0;
}

.instructions-well {
  padding: 1rem;
  background: #f5f5f5;
  border: 1px solid #e3e3e3;
  border-radius: 4px;
  margin-bottom: 1rem;
}

:deep(#DEMO_source_array),
:deep(#DEMO_response_array) {
  list-style-type: none;
  margin: 0;
  padding: 5px;
  display: flex;
  align-items: center;
}

:deep(#DEMO_source_array li),
:deep(#DEMO_response_array li) {
  font-size: 42px;
}

:deep(#DEMO_source_array li) {
  cursor: pointer;
}

:deep(#DEMO_response_array) {
  border: 1px solid black;
}

:deep(#DEMO_source_array li) span,
:deep(#DEMO_response_array li) span {
  display: block;
  text-align: center;
  text-decoration: none;
}

p {
  margin-bottom: 0.75rem;
}

dl dd {
  margin-left: 1rem;
  margin-bottom: 0.25rem;
}

.instructions-list {
  list-style-type: disc;
  margin-left: 1.5rem;
  margin-bottom: 0.75rem;
}

.instructions-list li {
  margin-bottom: 0.5rem;
}

.nav-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.btn {
  display: inline-block;
  padding: 6px 12px;
  font-size: 14px;
  font-weight: 400;
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

.mt-2 {
  margin-top: 0.5rem;
}
</style>
