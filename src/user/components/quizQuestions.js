// Quiz questions ported from psiturk-example-v2/templates/prequiz.html
// All 6 questions are on a single page, all single-select.
// value="1" in the original marks the correct answer.

export const QUIZ_QUESTIONS = [
  {
    id: 'pg1',
    questions: [
      {
        id: 'q1',
        question: 'Each command is a series of:',
        multiSelect: false,
        answers: ['English words', 'Nonsense words', 'Colored circles'],
        correctAnswer: ['Nonsense words'],
      },
      {
        id: 'q2',
        question: 'The output for a command is a series of:',
        multiSelect: false,
        answers: ['English words', 'Nonsense words', 'Colored circles'],
        correctAnswer: ['Colored circles'],
      },
      {
        id: 'q3',
        question: 'In the study phases, your task is to:',
        multiSelect: false,
        answers: [
          'Reproduce the output for each command.',
          'Click on each command to reveal its output.',
          'Count the number of unique commands.',
        ],
        correctAnswer: ['Reproduce the output for each command.'],
      },
      {
        id: 'q4',
        question: 'How many stages does this experiment have?',
        multiSelect: false,
        answers: ['1', '2', '3', '4'],
        correctAnswer: ['4'],
      },
      {
        id: 'q5',
        question: 'You can drag items in the response box to reorder them.',
        multiSelect: false,
        answers: ['True', 'False'],
        correctAnswer: ['True'],
      },
      {
        id: 'q6',
        question: 'Are you allowed to take notes during the study?',
        multiSelect: false,
        answers: ['Yes', 'No'],
        correctAnswer: ['No'],
      },
    ],
  },
]
