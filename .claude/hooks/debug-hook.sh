#!/bin/bash
# Debug hook to see what data is passed to hooks

# Capture stdin
INPUT=$(cat)

# Log to debug file
echo "=== Hook Input Debug ===" > /tmp/hook_debug.log
echo "Timestamp: $(date)" >> /tmp/hook_debug.log
echo "Input: $INPUT" >> /tmp/hook_debug.log
echo "Environment Variables:" >> /tmp/hook_debug.log
env | grep -i claude >> /tmp/hook_debug.log
env | grep -i session >> /tmp/hook_debug.log
env | grep -i agent >> /tmp/hook_debug.log
echo "PWD: $PWD" >> /tmp/hook_debug.log
echo "PPID: $PPID" >> /tmp/hook_debug.log
echo "$$: $$" >> /tmp/hook_debug.log

# Pass through unchanged
echo "$INPUT"
