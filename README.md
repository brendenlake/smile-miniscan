# Experiment on systematic generalization with the MiniSCAN task

The experiment is outlined in the following paper
<br>
Lake, B. M. and Baroni, M. (2023). Human-like systematic generalization through a meta-learning neural network. Nature, 623, 115-121.

To run in Smile, please install smile as descrbied in the docs. then run:
<br>
`npm run dev`
<br>
To run with a specific seed, add an argument to the url such as:<br>
`http://localhost:3020/brendenlake/smile-miniscan/main/#/experiment?seed=42`

To download the data, please run:
<br>
`npm run getdata`
<br>

To run the original code in the 2023 paper, run as:
<br>
`node psiturk-example-v2/serve.js`
<br>
To run with a specific seed, an argument like this:<br>
`http://localhost:3333/?seed=42`

To run tests to compare the two code bases:
<br>
`npx vitest run tests/vitest/user/scan/scanLogic.test.js`

## Smile

This repo uses Smile. The Smile project is a new way to develop rich and interactive online experiments. Smile prioritizes modularity and reusability. Unlike tools that cater to non-programmers, Smile is designed to help reasonably competent programmers accomplish more in less time.

Online docs: [https://smile.gureckislab.org](https://smile.gureckislab.org)

## Smile License

MIT License © 2022 [Todd Gureckis](https://todd.gureckislab.org)

_Initial development was supported by National Science Foundation Grant [BCS-2121102](https://www.nsf.gov/awardsearch/showAward?AWD_ID=2121102&HistoricalAwards=false) to T. M. Gureckis._
