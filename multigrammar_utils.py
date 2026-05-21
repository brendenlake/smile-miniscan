import numpy as np
import datetime
# key parameters
# max_cycles = 3 # max number of cycles through the training patterns
# max_stages = 4 # maximum number of learning stages
# catch_threshold = 0.8 # exclude participants that missed more catch trials than this threshold
# use_exclusions = True # exclude participants that failed checks? (True/False)

def convert_input_abs(mystr):
    return mystr


def convert_response_abs(mystr):
    return mystr


def train_analysis(df, verbose=False, max_cycles=3, max_stages=4):
    pass_threshold = 100.
    pass_threshold_final = 90.
    sids = df['participant_id'].unique()
    if verbose:
        print(" study phase analysis:")
    fail_list = []
    for s in sids:
        if verbose: print("  Worker" + " " + s, end=' ')
        df_subj = df.loc[df['participant_id'] == s]
        abs_commands = df_subj['abs_input'].values
        abs_targets = df_subj['abs_target'].values
        needed_last_cycle = False
        for ls in range(max_stages):
            df_stage = df_subj.loc[df_subj['learning_stage'] == ls]
            mycycle = df_stage.loc[df_stage['cycle'] == max_cycles, 'correct']
            mycycle = mycycle.values
            mypass = True
            if mycycle.size > 0:
                needed_last_cycle = True
                mymean = np.mean(mycycle) * 100.
                mythreshold = pass_threshold
                if ls == max_stages - 1:
                    mythreshold = pass_threshold_final
                mypass = mymean >= mythreshold
                myacc = round(mymean, 1)
                if verbose: print("study stage " + str(ls) + " cycle 3 : " + str(myacc) + "% correct")
                if not mypass:
                    if verbose: print('**FAIL**')
                    fail_list.append({'participant_id': s, 'learning_stage': ls})
        if not needed_last_cycle:
            if verbose: print("never needed a final cycle (#", max_cycles, ") for any learning stage")
    return fail_list


def print_survey(df_survey):
    opt_clarity = {'1': "Very clear", '0': "Moderately clear", '-1': "Not clear", 'NA': "NA"}
    print("")
    print("Analyzing survey results...")
    workerids = []
    used_aids = []
    list_surveys = []
    for i, part in df_survey.iterrows():
        workerids.append(part['participant_id'])
        print("  Worker " + str(i) + " (" + part['participant_id'] + ")")
        print("     Technical trouble: " + part['survey_txt_trouble'])
        print("     Strategy: " + part['survey_txt_strategy'])
        list_surveys.append(part['survey_txt_strategy'])
        print("     External Aid: " + part['external_aid'])
        if part['external_aid'] != 'No':
            used_aids.append(part['participant_id'])
        print("     AI Assistance: " + part['ai_aid'])
        if part['ai_aid'] != 'No':
            used_aids.append(part['participant_id'])
        if 'survey_txt_externa_aid' in part:
            print("     External Aid details: " + part['survey_txt_externa_aid'])
        print("     Clarity: " + opt_clarity[part['clarity']])
        print("     Display Issue: " + part['screensize'])
        print(" ")
    print("  Aggregate Technical trouble?")
    for i, part in df_survey.iterrows():
        print(part['survey_txt_trouble'] + ';')
    print("")
    if len(used_aids) > 0:
        print("  WARNING: Participants who used external aids or AI assistance: ")
        for u in used_aids:
            print(u)
        print("")
    else:
        print("  No participants used external aids or AI assistance.")
    print("")


def test_analysis(df, df_train, fail_list, stimuli, mode='pure', verbose=False,
                  max_cycles=3, max_stages=4, catch_threshold=0.8, use_exclusions=True):
    print("")
    assert stimuli in ['separate', 'composition', '']
    if not use_exclusions:
        fail_list = []

    sids = df['participant_id'].unique()
    abs_commands = df['abs_input'].unique()
    abs_commands_train = df_train['abs_input'].unique()
    converted_commands = [convert_input_abs(c) for c in abs_commands]
    pure_test_commands = [c for c in converted_commands if c not in abs_commands_train]
    catch_test_commands = [c for c in converted_commands if c in abs_commands_train]
    myinputs = df['abs_input'].values
    sel_pure = np.array([convert_input_abs(c) in pure_test_commands for c in myinputs])
    sel_separate = np.array([ls < max_stages - 1 for ls in df['learning_stage'].values])
    df = df.copy()

    if mode == 'pure':
        print("Analyzing the PURE test patterns:")
        if stimuli == 'separate':
            df = df.iloc[sel_pure & sel_separate]
            fail_list = [f for f in fail_list if f['learning_stage'] < max_stages - 1]
        elif stimuli == 'composition':
            df = df.iloc[sel_pure & np.logical_not(sel_separate)]
        else:
            assert False
        abs_commands = [convert_input_abs(c) for c in df['abs_input'].unique()]
        print("* Removing " + str(len(fail_list)) + " separate stages due to failing the study phase. *")
        n1 = df.shape[0]
        for f in fail_list:
            df = df.drop(df[(df['participant_id'] == f['participant_id']) & (df['learning_stage'] == f['learning_stage'])].index)
        n2 = df.shape[0]
        print('   dropped ' + str(n1 - n2) + " of " + str(n1) + " total test trials")

    elif mode == 'catch':
        print("Analyzing the CATCH test patterns:")
        df = df.iloc[np.logical_not(sel_pure)]
        abs_commands = catch_test_commands
    else:
        print("Test mode is not valid.")
        assert False

    df_pivot = df.copy()
    df_pivot = df_pivot.pivot(index='participant_id', columns='abs_input', values='correct')
    subj_means = df_pivot.mean(axis=1, skipna=True)

    if mode == 'pure':
        for s in sids:
            if verbose: print("  Worker" + " " + s)
            if s in subj_means.index:
                if verbose: print("    " + str(round(100. * subj_means[s], 1)) + "% correct")
            else:
                if verbose: print("     was removed for failing the study for this phase.")
    else:
        all_pass = True
        for s in sids:
            if subj_means[s] < catch_threshold:
                print("  WARNING: Worker" + " " + s + ' failed the catch trials.')
                print("    " + str(round(100. * subj_means[s], 1)) + "% correct (n=" + str(len(abs_commands)) + ')')
                all_pass = False
        if all_pass:
            print("   * ALL workers passed the catch trials. *")
        return

    v_subj_means = subj_means.values * 100.
    v_subj_flat = np.nanmean(np.array(df_pivot.values, dtype=float)) * 100.

    names = [x.split(':', 1)[0] for x in subj_means.keys().values]
    dict_subj_means = dict(zip(names, v_subj_means.tolist()))

    print("")
    print('* OVERALL TEST PERFORMANCE: ' + str(round(np.mean(v_subj_means), 1)) + '% (ave. over subj.; n = ' + str(len(v_subj_means)) + ') *')
    print('* OVERALL TEST PERFORMANCE: ' + str(round(v_subj_flat, 1)) + "% (flattened so each stage has equal weight)")

    response_by_item = {c: [] for c in abs_commands}
    target_by_item = {c: [] for c in abs_commands}
    length_by_item = {c: [] for c in abs_commands}
    for index, row in df.iterrows():
        mycommand = convert_input_abs(row['abs_input'])
        myresponse = convert_response_abs(row['abs_response'])
        mytarget = convert_response_abs(row['abs_target'])
        response_by_item[mycommand].append(myresponse)
        target_by_item[mycommand] = mytarget
        length_by_item[mycommand] = len(mytarget.split())

    print("")
    print("Short analysis of individual test items:")
    for key in sorted(length_by_item, key=length_by_item.__getitem__):
        myresponses = response_by_item[key]
        mytarget = target_by_item[key]
        myacc = np.array([float(r == mytarget) for r in myresponses], dtype=float)
        myacc_mean = round(np.mean(myacc) * 100., 1)
        print('  ' + str(myacc_mean) + '% (n=' + str(myacc.size) + ')' + ' : ', end=' ')
        print(key + ' -> ' + mytarget)
        if myacc_mean < 100.:
            print('  errors:', [r for r in myresponses if r != mytarget])

    return dict_subj_means

def test_analysis_low_performers(my_participant_id, df, df_train, max_stages=4):
        
    abs_commands = df['abs_input'].unique()
    abs_commands_train = df_train['abs_input'].unique()
    converted_commands = [convert_input_abs(c) for c in abs_commands]
    pure_test_commands = [c for c in converted_commands if c not in abs_commands_train]
    catch_test_commands = [c for c in converted_commands if c in abs_commands_train]
    myinputs = df['abs_input'].values
    sel_pure = np.array([convert_input_abs(c) in pure_test_commands for c in myinputs])
    sel_separate = np.array([ls < max_stages - 1 for ls in df['learning_stage'].values])

    # individual queries only
    df_indiv = df.copy().iloc[sel_pure & sel_separate]
    df_indiv = df_indiv.loc[df_indiv['participant_id'] == my_participant_id]
    abs_commands = df_indiv['abs_input'].values
    abs_targets = df_indiv['abs_target'].values
    abs_responses = df_indiv['abs_response'].values
    print("Individual queries:")
    for c, t, r in zip(abs_commands, abs_targets, abs_responses):
        c = convert_input_abs(c)
        t = convert_response_abs(t)
        r = convert_response_abs(r)
        if r != t:
            print('  ' + c + ' -> ' + r + ' (target: ' + t + ')')
        else:
            print('  ' + c + ' -> ' + r + ' (correct)')

    # compositional queries only
    df_comp = df.copy().iloc[sel_pure & np.logical_not(sel_separate)]    
    df_comp = df_comp.loc[df_comp['participant_id'] == my_participant_id]
    abs_commands = df_comp['abs_input'].values
    abs_targets = df_comp['abs_target'].values
    abs_responses = df_comp['abs_response'].values
    print('Compositional queries:')
    for c, t, r in zip(abs_commands, abs_targets, abs_responses):
        c = convert_input_abs(c)
        t = convert_response_abs(t)
        r = convert_response_abs(r)
        if r != t:
            print('  ' + c + ' -> ' + r + ' (target: ' + t + ')')
        else:
            print('  ' + c + ' -> ' + r + ' (correct)')

