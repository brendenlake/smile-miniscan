export const WORDS = ['dax', 'lug', 'wif', 'zup', 'fep', 'blicket', 'kiki', 'tufa', 'gazzer']
export const COLORS = ['#ff0000', '#0000ff', '#33cc33', '#b7b600', '#ce9fcf', '#00b0b3']

export const stims1_train = [
  ['p1', 'c1'],
  ['p2', 'c2'],
  ['p3', 'c3'],
  ['p4', 'c4'],
  ['p4 m1 p2', 'c2 c4'],
  ['p4 m1 p4', 'c4 c4'],
]

export const stims1_test = [
  ['p3 m1 p1', 'c1 c3'],
  ['p3 m1 p4', 'c4 c3'],
  ['p4 m1 p4', 'c4 c4'], // catch trial
]

export const stims2_train = [
  ['p1', 'c1'],
  ['p2', 'c2'],
  ['p3', 'c3'],
  ['p4', 'c4'],
  ['p1 m2', 'c1 c1'],
  ['p4 m2', 'c4 c4'],
]

export const stims2_test = [
  ['p3 m2', 'c3 c3'],
  ['p4 m2', 'c4 c4'], // catch trial
]

export const stims3_train = [
  ['p1', 'c1'],
  ['p2', 'c2'],
  ['p3', 'c3'],
  ['p4', 'c4'],
  ['p4 m3 p3', 'c3 c4'],
  ['p3 m3 p4', 'c4 c3'],
]

export const stims3_test = [
  ['p1 m3 p4', 'c4 c1'],
  ['p1 m3 p3', 'c3 c1'],
  ['p3 m3 p4', 'c4 c3'], // catch trial
]

export const stims4_train = [
  ['p1', 'c1'],
  ['p2', 'c2'],
  ['p3', 'c3'],
  ['p4', 'c4'],
  ['p4 m1 p2', 'c2 c4'],
  ['p4 m1 p4', 'c4 c4'],
  ['p1 m2', 'c1 c1'],
  ['p4 m2', 'c4 c4'],
  ['p4 m3 p3', 'c3 c4'],
  ['p3 m3 p4', 'c4 c3'],
  ['p2 m2 m3 p4 m3 p4', 'c4 c4 c2 c2'],
  ['p1 m3 p3 m2 m3 p3', 'c3 c3 c1 c3 c1'],
  ['p1 m1 p3 m2 m2', 'c3 c3 c3 c3 c1'],
  ['p3 m1 p4 m2 m2', 'c4 c4 c4 c4 c3'],
]

export const stims4_test = [
  ['p2 m1 p1 m2', 'c1 c1 c2'],
  ['p1 m1 p1 m3 p3', 'c3 c1 c1'],
  ['p4 m2 m2', 'c4 c4 c4 c4'],
  ['p4 m1 p1 m2', 'c1 c1 c4'],
  ['p3 m2 m3 p4', 'c4 c3 c3'],
  ['p3 m1 p4 m2 m2', 'c4 c4 c4 c4 c3'], // catch trial
  ['p1 m1 p3 m2 m2', 'c3 c3 c3 c3 c1'], // catch trial
]

// Stages 1-3 (pre-training): shuffled in random order each participant
export const subtasks_train = [stims1_train, stims2_train, stims3_train]
export const subtasks_test = [stims1_test, stims2_test, stims3_test]
// Stage 4 (post-training): always runs last
export const stims_post_train = stims4_train
export const stims_post_test = stims4_test

// Grammar:
//  fep -> GREEN 
//   blicket -> YELLOW 
//   wif -> BLUE 
//   tufa -> PINK 
//   u1 zup x1 -> [x1] [u1] 
//   x1 kiki -> [x1] [x1] 
//   x1 gazzer x2 -> [x2] [x1] 
//    
