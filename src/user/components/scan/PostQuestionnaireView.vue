<script setup>
// PostQuestionnaireView.vue
// Ported from psiturk-example-v2/templates/postquestionnaire.html

import { reactive } from 'vue'
import useViewAPI from '@/core/composables/useViewAPI'
import { Button } from '@/uikit/components/ui/button'

const api = useViewAPI()

if (!api.persist.isDefined('postquestionnaire')) {
  api.persist.postquestionnaire = reactive({
    survey_txt_strategy: '',
    external_aid: 'NA',
    clarity: 'NA',
    screensize: 'NA',
    survey_txt_trouble: '',
  })
}

const form = api.persist.postquestionnaire
const errorMsg = reactive({ text: '' })

function finish() {
  // Require all dropdowns to be answered
  if (form.external_aid === 'NA' || form.clarity === 'NA' || form.screensize === 'NA') {
    errorMsg.text = 'Please answer all questions before continuing.'
    return
  }
  errorMsg.text = ''
  api.recordPageData(api.persist.postquestionnaire)
  api.saveData(true)
  api.goNextView()
}
</script>

<template>
  <div class="post-questionnaire mx-auto max-w-3xl px-6 py-4">
    <h1 class="text-3xl font-bold mb-2">Task Complete</h1>
    <hr class="mb-4" />

    <p class="mb-4">
      You are finished! Thank you for your contributions to science. You will be eligible for full
      payment once you answer the following questions.
    </p>

    <div class="instructions-well">

      <!-- Strategy -->
      <div class="question mb-5">
        <label class="font-medium">
          What was your general strategy for completing the task?
        </label>
        <br />
        <textarea
          id="survey_txt_strategy"
          v-model="form.survey_txt_strategy"
          rows="5"
          cols="50"
          class="border rounded p-1 mt-1 w-full"
        />
      </div>

      <!-- External aids -->
      <div class="question mb-5 flex items-start gap-6">
        <label class="font-medium flex-1">
          Did you use any external aids to help with the task (note taking, pen and paper, taking a
          screen shot, etc.)? It's okay if you did. Please answer honestly — you will receive full
          payment either way.
        </label>
        <select id="external_aid" v-model="form.external_aid" class="border rounded p-1 mt-1">
          <option value="NA">ENTER RESPONSE</option>
          <option value="Yes">Yes</option>
          <option value="No">No</option>
        </select>
      </div>

      <!-- Instruction clarity -->
      <div class="question mb-5 flex items-start gap-6">
        <label class="font-medium flex-1">
          Were the instructions for the task clear?
        </label>
        <select id="clarity" v-model="form.clarity" class="border rounded p-1 mt-1">
          <option value="NA">ENTER RESPONSE</option>
          <option value="1">Very clear</option>
          <option value="0">Moderately clear</option>
          <option value="-1">Not clear</option>
        </select>
      </div>

      <!-- Screen size -->
      <div class="question mb-5 flex items-start gap-6">
        <label class="font-medium flex-1">
          Was the experimental display too large for the size of your screen?
        </label>
        <select id="screensize" v-model="form.screensize" class="border rounded p-1 mt-1">
          <option value="NA">ENTER RESPONSE</option>
          <option value="Yes">Yes</option>
          <option value="No">No</option>
        </select>
      </div>

      <!-- Technical issues -->
      <div class="question mb-5">
        <label class="font-medium">
          Did you have any technical problems with the site? Please describe:
        </label>
        <br />
        <textarea
          id="survey_txt_trouble"
          v-model="form.survey_txt_trouble"
          rows="5"
          cols="50"
          class="border rounded p-1 mt-1 w-full"
        />
      </div>

    </div>

    <hr class="my-4" />

    <p v-if="errorMsg.text" class="text-red-600 mb-2">{{ errorMsg.text }}</p>

    <div class="flex justify-end">
      <Button variant="default" size="lg" @click="finish">
        Continue <i-fa6-solid-arrow-right class="ml-1" />
      </Button>
    </div>
  </div>
</template>

<style scoped>
.instructions-well {
  padding: 1rem;
  background: #f5f5f5;
  border: 1px solid #e3e3e3;
  border-radius: 4px;
}
</style>
