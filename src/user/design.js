/**
 * @file design.js
 * @description Configures the overall logic and timeline of the experiment.
 * The timeline defines the sequence of phases that the experiment goes through.
 *
 * Experiment ported from psiturk-example-v2 (SCAN task — concept learning and generalization).
 * Reference files: psiturk-example-v2/static/js/task.js, psiturk-example-v2/templates/
 *
 * @module design
 */

import { markRaw } from 'vue'
import { processQuery, initService } from '@/core/utils/utils'

// 1. Import built-in View components
import AdvertisementView from '@/builtins/advertisement/AdvertisementView.vue'
import MTurkRecruitView from '@/builtins/mturk/MTurkRecruitView.vue'
import InformedConsentView from '@/builtins/informedConsent/InformedConsentView.vue'
import DemographicSurveyView from '@/builtins/demographicSurvey/DemographicSurveyView.vue'
import DeviceSurveyView from '@/builtins/deviceSurvey/DeviceSurveyView.vue'
import InstructionsQuizView from '@/builtins/instructionsQuiz/InstructionsQuiz.vue'
import DebriefView from '@/builtins/debrief/DebriefView.vue'
import TaskFeedbackSurveyView from '@/builtins/taskFeedbackSurvey/TaskFeedbackSurveyView.vue'
import ThanksView from '@/builtins/thanks/ThanksView.vue'
import WithdrawView from '@/builtins/withdraw/WithdrawView.vue'
import WindowSizerView from '@/builtins/windowSizer/WindowSizerView.vue'

// 2. Import user View components
import ScanInstructionsView from '@/user/components/instructions/ScanInstructionsView.vue'
import ScanExpView from '@/user/components/scan/ScanExpView.vue'
import PostQuestionnaireView from '@/user/components/scan/PostQuestionnaireView.vue'

// 3. Import smile API and timeline
import useAPI from '@/core/composables/useAPI'
const api = useAPI()

import Timeline from '@/core/timeline/Timeline'
const timeline = new Timeline(api)

// 4. Set runtime configuration options
api.setRuntimeConfig('allowRepeats', false)
api.setRuntimeConfig('colorMode', 'light')
api.setRuntimeConfig('responsiveUI', true)

api.setRuntimeConfig('windowsizerRequest', { width: 800, height: 600 })
api.setRuntimeConfig('windowsizerAggressive', true)

api.setRuntimeConfig('anonymousMode', false)
api.setRuntimeConfig('labURL', 'https://lake-lab.github.io/')
api.setRuntimeConfig('brandLogoFn', 'universitylogo.png')

api.setRuntimeConfig('maxWrites', 1000)
api.setRuntimeConfig('minWriteInterval', 2000)
api.setRuntimeConfig('autoSave', true)

api.setRuntimeConfig('estimated_time', '40 minutes')
api.setRuntimeConfig('payrate', '$4 base payment')

// Set the informed consent text on the menu bar
import InformedConsentText from './components/InformedConsentText.vue'
api.setAppComponent('informed_consent_text', InformedConsentText)

// 5. No between-subjects conditions for this experiment

// 6. Define the timeline

// Welcome screen for non-referral participants
timeline.pushSeqView({
  path: '/welcome',
  name: 'welcome_anonymous',
  component: AdvertisementView,
  meta: {
    prev: undefined,
    next: 'consent',
    allowAlways: true,
    requiresConsent: false,
  },
  beforeEnter: () => {
    api.getBrowserFingerprint()
  },
})

// Welcome screen for referral from a recruitment service (e.g., Prolific)
timeline.pushSeqView({
  path: '/welcome/:service',
  name: 'welcome_referred',
  component: AdvertisementView,
  meta: {
    prev: undefined,
    next: 'consent',
    allowAlways: true,
    requiresConsent: false,
  },
  beforeEnter: (to) => {
    if (initService(to.params.service) === false) return false
    processQuery(to.query, to.params.service)
    api.getBrowserFingerprint()
  },
})

// Special page that loads in the iframe on mturk.com
timeline.registerView({
  name: 'mturk',
  component: MTurkRecruitView,
  props: {
    estimated_time: api.getConfig('estimated_time'),
    payrate: api.getConfig('payrate'),
  },
  meta: { allowAlways: true, requiresConsent: false },
  beforeEnter: (to) => {
    processQuery(to.query, 'mturk')
  },
})

// Informed consent
timeline.pushSeqView({
  name: 'consent',
  component: InformedConsentView,
  props: {
    informedConsentText: markRaw(InformedConsentText),
  },
  meta: {
    requiresConsent: false,
    setConsented: true,
  },
})

// // Demographic survey
// timeline.pushSeqView({
//   name: 'demograph',
//   component: DemographicSurveyView,
// })

// Window sizer
timeline.pushSeqView({
  name: 'windowsizer',
  component: WindowSizerView,
})

// Instructions (2 pages with interactive practice)
timeline.pushSeqView({
  name: 'instructions',
  component: ScanInstructionsView,
})

// Comprehension quiz (6 questions, must pass to proceed)
import { QUIZ_QUESTIONS } from './components/quizQuestions'
timeline.pushSeqView({
  name: 'quiz',
  component: InstructionsQuizView,
  props: {
    questions: QUIZ_QUESTIONS,
    returnTo: 'instructions',
    randomizeQandA: false,
  },
})

// Main SCAN experiment (4 stages)
timeline.pushSeqView({
  name: 'exp',
  path: '/experiment',
  component: ScanExpView,
})

// Post-task questionnaire
timeline.pushSeqView({
  name: 'postquestionnaire',
  component: PostQuestionnaireView,
  meta: { setDone: true },
})

// // Debriefing
// import DebriefText from '@/user/components/DebriefText.vue'
// timeline.pushSeqView({
//   name: 'debrief',
//   component: DebriefView,
//   props: {
//     debriefText: markRaw(DebriefText),
//   },
// })

// // Device survey
// timeline.pushSeqView({
//   name: 'device',
//   component: DeviceSurveyView,
// })

// // Task feedback survey (marks experiment as done)
// timeline.pushSeqView({
//   name: 'feedback',
//   component: TaskFeedbackSurveyView,
//   meta: { setDone: true },
// })

// Thanks / completion screen
timeline.pushSeqView({
  name: 'thanks',
  component: ThanksView,
  meta: {
    requiresDone: true,
    resetApp: api.getConfig('allowRepeats'),
  },
})

// Withdrawal handler
timeline.registerView({
  name: 'withdraw',
  meta: {
    requiresWithdraw: true,
    resetApp: api.getConfig('allowRepeats'),
  },
  component: WithdrawView,
})

timeline.build()

export default timeline
