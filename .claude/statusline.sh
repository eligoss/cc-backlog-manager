#!/bin/bash
# Claude Code Statusline - Accurate Token Tracking
# Properly calculates context usage by filtering out sidechain (subagent) tokens
# Reference: https://codelynx.dev/posts/calculate-claude-code-context

input=$(cat)

MODEL=$(echo "$input" | jq -r '.model.display_name')
CONTEXT_SIZE=$(echo "$input" | jq -r '.context_window.context_window_size')
TRANSCRIPT_PATH=$(echo "$input" | jq -r '.transcript_path // empty')

# ANSI color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
DIM='\033[2m'
RESET='\033[0m'

# Function to calculate tokens from transcript (filters sidechains)
calculate_from_transcript() {
    local transcript="$1"
    if [ -f "$transcript" ]; then
        # Get the most recent main chain entry (not sidechain, not error)
        # Filter: isSidechain != true AND isApiErrorMessage != true AND has message.usage
        local usage=$(cat "$transcript" 2>/dev/null | \
            jq -s '[.[] | select(.isSidechain != true and .isApiErrorMessage != true and .message.usage != null)] | last | .message.usage // empty' 2>/dev/null)

        if [ -n "$usage" ] && [ "$usage" != "null" ] && [ "$usage" != "" ]; then
            local input_tokens=$(echo "$usage" | jq '.input_tokens // 0')
            local cache_create=$(echo "$usage" | jq '.cache_creation_input_tokens // 0')
            local cache_read=$(echo "$usage" | jq '.cache_read_input_tokens // 0')
            echo "$((input_tokens + cache_create + cache_read)):$cache_create:$cache_read"
            return 0
        fi
    fi
    return 1
}

# Function to calculate tokens from current_usage (fallback)
calculate_from_usage() {
    local usage=$(echo "$input" | jq '.context_window.current_usage')
    if [ "$usage" != "null" ] && [ -n "$usage" ]; then
        local input_tokens=$(echo "$usage" | jq '.input_tokens // 0')
        local cache_create=$(echo "$usage" | jq '.cache_creation_input_tokens // 0')
        local cache_read=$(echo "$usage" | jq '.cache_read_input_tokens // 0')
        echo "$((input_tokens + cache_create + cache_read)):$cache_create:$cache_read"
        return 0
    fi
    return 1
}

# Try transcript first (accurate, filters sidechains), then fall back to current_usage
TOKEN_DATA=""
if [ -n "$TRANSCRIPT_PATH" ]; then
    TOKEN_DATA=$(calculate_from_transcript "$TRANSCRIPT_PATH")
fi

if [ -z "$TOKEN_DATA" ]; then
    TOKEN_DATA=$(calculate_from_usage)
fi

if [ -n "$TOKEN_DATA" ]; then
    # Parse token data (format: total:cache_create:cache_read)
    CURRENT_TOKENS=$(echo "$TOKEN_DATA" | cut -d: -f1)
    CACHE_CREATE_TOKENS=$(echo "$TOKEN_DATA" | cut -d: -f2)
    CACHE_READ_TOKENS=$(echo "$TOKEN_DATA" | cut -d: -f3)

    # Auto-compact threshold: Claude Code triggers at ~95% of context window
    # Reference: https://github.com/anthropics/claude-code/issues/9964
    AUTOCOMPACT_THRESHOLD=$((CONTEXT_SIZE * 95 / 100))

    # Calculate percentage against autocompact threshold
    PERCENT_TO_COMPACT=$((CURRENT_TOKENS * 100 / AUTOCOMPACT_THRESHOLD))

    # Calculate tokens remaining until autocompact
    TOKENS_TO_COMPACT=$((AUTOCOMPACT_THRESHOLD - CURRENT_TOKENS))

    # Format token count (k for thousands)
    if [ $CURRENT_TOKENS -ge 1000 ]; then
        TOKEN_DISPLAY="$((CURRENT_TOKENS / 1000))k"
    else
        TOKEN_DISPLAY="${CURRENT_TOKENS}"
    fi

    # Format tokens to compact (k for thousands)
    if [ $TOKENS_TO_COMPACT -ge 1000 ]; then
        COMPACT_DISPLAY="$((TOKENS_TO_COMPACT / 1000))k"
    elif [ $TOKENS_TO_COMPACT -lt 0 ]; then
        COMPACT_DISPLAY="0"
    else
        COMPACT_DISPLAY="${TOKENS_TO_COMPACT}"
    fi

    # Calculate cache hit ratio if cache is being used
    CACHE_INFO=""
    if [ $CACHE_READ_TOKENS -gt 0 ]; then
        TOTAL_CACHEABLE=$((CACHE_CREATE_TOKENS + CACHE_READ_TOKENS))
        if [ $TOTAL_CACHEABLE -gt 0 ]; then
            CACHE_HIT_RATIO=$((CACHE_READ_TOKENS * 100 / TOTAL_CACHEABLE))
            CACHE_INFO=" ${DIM}[Cache: ${CACHE_HIT_RATIO}%]${RESET}"
        fi
    fi

    # Determine color based on proximity to autocompact threshold
    WARNING=""
    if [ $PERCENT_TO_COMPACT -lt 70 ]; then
        COLOR=$GREEN
    elif [ $PERCENT_TO_COMPACT -lt 90 ]; then
        COLOR=$YELLOW
    else
        COLOR=$RED
        WARNING=" ⚠"
    fi

    # Create progress bar (20 characters wide) based on autocompact threshold
    BAR_WIDTH=20
    FILLED=$((PERCENT_TO_COMPACT * BAR_WIDTH / 100))
    # Ensure we don't exceed bar width
    if [ $FILLED -gt $BAR_WIDTH ]; then
        FILLED=$BAR_WIDTH
    fi
    if [ $FILLED -lt 0 ]; then
        FILLED=0
    fi
    EMPTY=$((BAR_WIDTH - FILLED))

    # Build progress bar with autocompact marker at 100% position
    BAR=""
    for ((i=0; i<FILLED; i++)); do
        if [ $i -eq $((BAR_WIDTH - 1)) ] && [ $PERCENT_TO_COMPACT -ge 100 ]; then
            BAR="${BAR}│"
        else
            BAR="${BAR}█"
        fi
    done

    # Add the autocompact marker if we haven't reached it yet
    if [ $FILLED -lt $BAR_WIDTH ]; then
        BAR="${BAR}│"
        EMPTY=$((EMPTY - 1))
    fi

    for ((i=0; i<EMPTY; i++)); do
        BAR="${BAR}░"
    done

    # Build compact info text
    if [ $TOKENS_TO_COMPACT -gt 0 ]; then
        COMPACT_TEXT="${DIM}Context left until auto-compact: $((100 - PERCENT_TO_COMPACT))%${RESET}"
    else
        COMPACT_TEXT="${RED}[COMPACTING]${RESET}"
    fi

    # Output: Model | Context: [████│░░░] 53% (75k) [Cache: 85%] ⚠
    #         Context left until auto-compact: 47%
    echo -e "${CYAN}${MODEL}${RESET} | Context: ${COLOR}[${BAR}]${RESET} ${PERCENT_TO_COMPACT}% ${DIM}(${TOKEN_DISPLAY})${RESET}${CACHE_INFO}${WARNING}"
    echo -e "${COMPACT_TEXT}"
else
    # No usage data
    AUTOCOMPACT_THRESHOLD=$((CONTEXT_SIZE * 95 / 100))
    if [ $AUTOCOMPACT_THRESHOLD -ge 1000 ]; then
        COMPACT_DISPLAY="$((AUTOCOMPACT_THRESHOLD / 1000))k"
    else
        COMPACT_DISPLAY="${AUTOCOMPACT_THRESHOLD}"
    fi

    echo -e "${CYAN}${MODEL}${RESET} | Context: ${GREEN}[│░░░░░░░░░░░░░░░░░░░]${RESET} 0% ${DIM}(0)${RESET}"
    echo -e "${DIM}Context left until auto-compact: 100%${RESET}"
fi
