from __future__ import print_function
import re
import argparse
import random

parser = argparse.ArgumentParser(description='Script to generate and schedule navigation tasks')
parser.add_argument('--train_size', type=int, default=10000,
                    help='task instances shown during training')
args = parser.parse_args()

task_repository = {}
task_set = set()

primitive_task_set = set()

command="p1"
primitive_task_set.add(command)
task_repository[command]="c1"

command="p2"
primitive_task_set.add(command)
task_repository[command]="c2"

command="p3"
primitive_task_set.add(command)
task_repository[command]="c3"

command="p4"
primitive_task_set.add(command)
task_repository[command]="c4"

task_set = task_set | primitive_task_set

twice_task_set = set()

for primitive_command in task_set:
    command = primitive_command + " m1"
    twice_task_set.add(command)
    task_repository[command]=task_repository[primitive_command] + " " + task_repository[primitive_command]

three_times_task_set = set()

for primitive_command in task_set:
    command = primitive_command + " m2"
    three_times_task_set.add(command)
    task_repository[command]=task_repository[primitive_command] + " " + task_repository[primitive_command] + " " + task_repository[primitive_command]

task_set = task_set | twice_task_set | three_times_task_set

and_task_set = set()

for primitive_command_1 in task_set:
    for primitive_command_2 in task_set:
        command = primitive_command_1 + " conj1 " + primitive_command_2
        and_task_set.add(command)
        task_repository[command]=task_repository[primitive_command_1] + " "+ task_repository[primitive_command_2]

after_task_set = set()

for primitive_command_1 in task_set:
    for primitive_command_2 in task_set:
        command = primitive_command_1 + " conj2 " + primitive_command_2
        after_task_set.add(command)
        task_repository[command]=task_repository[primitive_command_2] + " "+ task_repository[primitive_command_1]

task_set = task_set | and_task_set | after_task_set

def print_as_javascript(task_repository):
    print('[', end='')
    for idx,selected_task in enumerate(task_repository):
        print("['" + selected_task + "', " + "'" + task_repository[selected_task] + "']", end='')
        if idx < len(task_repository)-1:
            print(",")
    print(']')

print_as_javascript(task_repository)
# for selected_task in task_repository:
    # print("[[" + selected_task + "], [" + task_repository[selected_task] + "]],")