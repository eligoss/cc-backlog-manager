# Character Voice Templates

This document provides templates and examples for creating distinct character voices that differentiate naturally in dialogue and narration.

## Voice Template Structure

Use this template when developing a new character voice:

```yaml
voice-template:
  name: "[Template Name]"
  archetype: [cynical-hero|wise-elder|naive-youth|scheming-noble|etc]
  base-influence: [zelazny-corwin|tolkien-gandalf|tolkien-frodo|etc]

  traits:
    - [Primary personality trait]
    - [Secondary personality trait]
    - [Tertiary personality trait]

  speech-patterns:
    internal: "[Sentence structure and rhythm for internal monologue]"
    dialogue: "[Pattern for spoken dialogue]"
    under-stress: "[How speech changes under pressure]"

  vocabulary:
    uses-often: [Words/phrases this character favors]
    avoids: [Words/phrases this character wouldn't use]
    signature: [Unique expressions that mark this character]

  voice-example: |
    "[2-3 sentences demonstrating this voice in both dialogue
    and internal monologue]"
```

## Preset Voice Templates

### 1. Cynical Warrior (Zelazny-Corwin)

**Archetype:** cynical-hero
**Base Influence:** Zelazny's Corwin from Chronicles of Amber

**Traits:**
- Self-aware and sardonic
- Experienced but not jaded
- Philosophical without preaching
- Loyal despite skepticism
- Survivor mentality

**Speech Patterns:**

*Internal Monologue:*
- Short declarative sentences
- Second-guessing of own decisions
- Dry humor undercutting tension
- Practical assessment of situations
- Philosophical asides delivered lightly

*Dialogue:*
- Direct and economical
- Sarcasm as default mode
- Rarely explains reasoning fully
- Questions authority casually
- Understatement in crisis

*Under Stress:*
- Shorter sentences
- Humor sharpens to cutting
- Brutal honesty emerges
- Falls back on training
- Dark wit increases

**Vocabulary:**

*Uses Often:*
- "Could be worse"
- "Not my first choice"
- "Fair enough"
- "Probably should have..."
- "I've seen worse"
- "Math is simple"
- "History will/won't..."

*Avoids:*
- Formal academic language
- Flowery metaphors
- Absolute certainties
- Earnest declarations
- Pleading or begging
- Excessive apologies

*Signature:*
- "That's going to be a problem"
- Casual acknowledgment of danger
- Self-deprecating combat commentary
- References to past mistakes as lessons

**Voice Example:**

```
The troll was bigger than I'd expected. That happened a lot
lately. Things were always bigger, meaner, or more numerous
than intelligence suggested.

I'd stopped trusting intelligence reports around the third
ambush.

"You don't have to do this," I told the troll.

It smiled. Trolls shouldn't smile. Nothing good ever follows
a smiling troll.

"Didn't think so," I said, and drew.
```

### 2. Wise Mentor (Tolkien-Gandalf)

**Archetype:** wise-elder
**Base Influence:** Tolkien's Gandalf

**Traits:**
- Ancient but not aloof
- Patient with the deserving
- Impatient with willful ignorance
- Carries burden of foresight
- Hope despite knowledge

**Speech Patterns:**

*Internal Monologue:*
- Longer, more formal sentences
- References to deep history
- Weighing of consequences
- Acceptance of necessity
- Sorrow for what must be done

*Dialogue:*
- Formal but not pompous
- Teaching through questions
- Measured rhythm and cadence
- Strategic revelation of knowledge
- Occasional archaic construction

*Under Stress:*
- Authority voice emerges
- Commands become absolute
- Ancient power shows through
- No wasted words
- Formal language intensifies

**Vocabulary:**

*Uses Often:*
- "Long have I..."
- "Yet it may be..."
- "Such was the way..."
- "In the elder days..."
- "Doom" (fate)
- "Kinsman"
- "Wisely said"

*Avoids:*
- Modern slang
- Casual contractions (in formal moments)
- Dismissive language
- Crude expressions
- Absolute predictions
- Unnecessary obscurity

*Signature:*
- "A wizard is never late..."
- Historical parallels to current situations
- Cryptic hints that prove accurate
- "This too shall pass" mentality

**Voice Example:**

```
"You speak of things you do not fully understand," Elrond
said, though his voice held no rebuke. "The Pattern is not
merely a source of power. It is a living thing, woven into
the fabric of reality itself."

He paused, considering his words.

"To walk it is to be changed. Forever. You will carry its
mark until the ending of the world, and that mark will set
you apart from all others. Even from those you love."

His eyes held mine. "Are you prepared for such a burden?"
```

### 3. Noble Schemer (Zelazny-Eric)

**Archetype:** scheming-noble
**Base Influence:** Zelazny's Eric and other Amber princes

**Traits:**
- Intelligent and calculating
- Ambitious without apology
- Polite as weapon
- Long-term strategic thinking
- Sees people as pieces on board

**Speech Patterns:**

*Internal Monologue:*
- Analytical and detached
- Always calculating angles
- Contingency planning constant
- Emotional distance from actions
- Self-justification subtle

*Dialogue:*
- Formal and precise
- Subtext layered thick
- Questions as traps
- Compliments as threats
- Never says more than necessary

*Under Stress:*
- Becomes more formal
- Control tightens verbally
- Threats become explicit
- Mask slips briefly
- Returns to icy calm

**Vocabulary:**

*Uses Often:*
- "Interesting"
- "I had expected..."
- "You disappoint me"
- "Unfortunately..."
- "Regrettably necessary"
- "You understand, of course"
- "How... unfortunate"

*Avoids:*
- Casual language
- Genuine compliments
- Admitting weakness
- Losing composure
- Explaining motivations
- Honest emotional expression

*Signature:*
- Everything is "interesting"
- Faint praise hiding insults
- Implications instead of statements
- Strategic use of silence

**Voice Example:**

```
"You've made remarkable progress," he said. The compliment
hung in the air like a knife.

I waited. With Eric, the danger was always in what came next.

"Father would be proud. If he were here to see it." He smiled.
"Such a pity about his... absence."

There it was. The threat wrapped in concern, the accusation
dressed as sympathy. He knew something. Or thought he did.

"I appreciate your confidence," I said carefully.

"Oh, I have every confidence." His smile widened. "That's
what concerns me."
```

### 4. Innocent Abroad (Tolkien-Frodo)

**Archetype:** naive-youth
**Base Influence:** Tolkien's Frodo Baggins

**Traits:**
- Naive but not stupid
- Courage despite fear
- Growing through adversity
- Questions without cynicism
- Hope as default state

**Speech Patterns:**

*Internal Monologue:*
- Wonder mixed with uncertainty
- Questions about how things work
- Observations without interpretation
- Growing understanding over time
- Maintains moral clarity

*Dialogue:*
- Genuine questions
- Hesitant assertions
- Polite even under pressure
- Growing confidence through arc
- Humor gentle, not biting

*Under Stress:*
- Falls back on core values
- Determination replaces hesitation
- Quiet courage emerges
- Simplicity becomes strength
- "Must be done" mentality

**Vocabulary:**

*Uses Often:*
- "I don't understand, but..."
- "Is it always...?"
- "What should I do?"
- "I'll try"
- "That doesn't seem right"
- "Please"
- "I'm sorry, but no"

*Avoids:*
- Cynical observations
- Cruel humor
- Assuming worst of people
- Giving up explicitly
- Strategic manipulation
- Casual violence

*Signature:*
- Apologizes even when not at fault
- Questions that reveal truth
- Moral stands despite cost
- "I will do what I must"

**Voice Example:**

```
I didn't know what I was supposed to do. Nobody had explained
the rules—if there were rules. Everything was new and strange
and bigger than I'd expected.

But I knew what was right. That hadn't changed.

"No," I said quietly. "I won't help you do that."

He stared at me like I'd grown a second head. Maybe people
didn't say no to him very often.

"You don't understand the situation," he said.

"I understand enough. You want me to hurt people who haven't
done anything wrong. The answer is no."
```

### 5. Ancient Power (Blended: Dworkin/Tom Bombadil)

**Archetype:** ancient-other
**Base Influence:** Zelazny's Dworkin + Tolkien's Tom Bombadil

**Traits:**
- Beyond normal concerns
- Operates on different timeframe
- Wisdom or madness (or both)
- Powerful but constrained by choice
- Sees patterns mortals miss

**Speech Patterns:**

*Internal Monologue:*
- Nonlinear associations
- Time references inconsistent
- Reality treated as flexible
- Deep truths stated simply
- Amusement at mortal concerns

*Dialogue:*
- Sometimes cryptic
- Sometimes perfectly clear
- Metaphor and literal mixed
- Temporal confusion
- Rhyme or song fragments

*Under Stress:*
- Becomes more focused
- Power shows in word choice
- Reality bends to emphasis
- Ancient language emerges
- Commands with weight

**Vocabulary:**

*Uses Often:*
- "Once" (any time period)
- "Will be/has been" (tense mixing)
- "The Pattern sings/weeps/laughs"
- "I remember when..."
- Proper names from deep history
- Made-up words that still make sense

*Avoids:*
- Linear time references
- Current politics
- Explaining clearly (when unhelpful)
- Concern for personal safety
- Normal social conventions

*Signature:*
- Treats past and future as present
- Knows things impossible to know
- Cryptic until suddenly precise
- Song or verse without warning

**Voice Example:**

```
"The unicorn wept," he said suddenly. "Did you know that?
When Dworkin drew the Pattern. Of course you didn't. You
weren't there. Neither was I. But I remember it anyway."

He looked at me with eyes that had seen too much.

"Or will remember it. Time is funny that way. Slippery.
Like trying to hold water in your hands. Except when it
isn't." He smiled. "Then it's like trying to hold stone.
Heavy. Inevitable."

"I don't understand," I said.

"Good," he said. "Understanding is overrated. Doing is what
matters. Will you do it? Did you do it? Are you doing it now?"

I had no idea what he was talking about.

"Yes," I said anyway.

"Excellent!" He clapped his hands once. "Then it's already
done."
```

## Voice Differentiation Techniques

### Sentence Length Patterns

**Cynical Warrior:**
- Average 8-12 words
- Mix of very short (3-5) and medium (12-15)
- Rarely exceeds 20 words

**Wise Mentor:**
- Average 15-20 words
- Range from 10-30 words
- Comfortable with complexity

**Noble Schemer:**
- Average 12-15 words
- Precisely controlled length
- Each word chosen deliberately

**Innocent Abroad:**
- Average 10-14 words
- Simple constructions
- Growing complexity through arc

**Ancient Power:**
- Highly variable
- Can be 3 words or 40
- No predictable pattern

### Contraction Usage

| Character Type | Contractions |
|----------------|--------------|
| Cynical Warrior | Frequent (don't, won't, I'm) |
| Wise Mentor | Rare in formal moments, yes in casual |
| Noble Schemer | Almost never |
| Innocent Abroad | Frequent |
| Ancient Power | Random or zero |

### Question Patterns

**Cynical Warrior:**
- Rhetorical questions common
- Assumes listener understands
- "You see where this is going?"

**Wise Mentor:**
- Teaching questions
- Encourages thought
- "What do you think will happen?"

**Noble Schemer:**
- Trap questions
- Already knows answer
- "You understand what this means?"

**Innocent Abroad:**
- Genuine questions
- Seeks information
- "What does that mean?"

**Ancient Power:**
- Unanswerable questions
- Or too-simple questions
- "Is/Was/Will be?"

### Response to Threats

**Cynical Warrior:**
```
"That's a terrible idea. We're doing it anyway, aren't we?"
```

**Wise Mentor:**
```
"You speak of things that should not be spoken lightly.
Yet I see the necessity. Very well."
```

**Noble Schemer:**
```
"How... aggressive. I wonder if you've thought this through.
No? I suspected as much."
```

**Innocent Abroad:**
```
"I'm scared. But we have to do this, don't we? I'll try."
```

**Ancient Power:**
```
"Threats. How mortal. How now. How then. Yes, the doing of
the thing. Let us do it."
```

## Creating Custom Voices

### Step 1: Choose Base Archetype

Start with one of the five templates, or blend two:
- Cynical Warrior (modern, sardonic)
- Wise Mentor (formal, historical)
- Noble Schemer (calculating, precise)
- Innocent Abroad (genuine, learning)
- Ancient Power (otherworldly, cryptic)

### Step 2: Define Three Core Traits

Pick personality traits that affect speech:
- Arrogant → Never admits uncertainty
- Curious → Asks constant questions
- Paranoid → Assumes worst case always
- Optimistic → Finds silver linings
- Methodical → Explains reasoning step-by-step

### Step 3: Establish Vocabulary Tier

**High/Formal:**
- Latinate vocabulary
- Complete sentences
- Complex constructions
- Few/no contractions

**Middle/Standard:**
- Mix of formal and casual
- Contractions in casual moments
- Clear, direct language
- Moderate complexity

**Low/Casual:**
- Anglo-Saxon root words
- Frequent contractions
- Sentence fragments acceptable
- Colloquial expressions

### Step 4: Set Speech Rhythms

- **Sentence length:** Short (8-10), Medium (12-16), Long (18-25)
- **Variation:** High, Medium, Low
- **Paragraph length:** 1-2 sentences, 3-4 sentences, 5+ sentences
- **Interruption tendency:** High, Medium, Low

### Step 5: Choose Signature Elements

Give the character 2-3 unique markers:
- Favorite phrase or expression
- Specific metaphor source (sailing, gardening, warfare)
- Speech tick (repeats words, asks rhetorical questions)
- Cultural marker (formal address, specific oath)

### Step 6: Test Voice Consistency

Write the same situation from different character POVs:

**Situation:** Character discovers a betrayal

**Cynical Warrior:**
```
I should've seen it coming. The signs were all there. I'd
just been too busy staying alive to add them up.

Stupid. And potentially fatal.
```

**Wise Mentor:**
```
Betrayal is a bitter thing, made more bitter by the knowledge
that it was inevitable. I had seen the seeds of it long ago,
and yet hoped they might not take root.

Hope, it seems, is not always wisdom.
```

**Noble Schemer:**
```
Interesting. I had anticipated disloyalty, of course—one
always does. But the timing is... unfortunate. This will
require adjustments to the plan.

How inconvenient.
```

**Innocent Abroad:**
```
They lied to me. The whole time, they were lying, and I
believed them. I trusted them.

That was my mistake. I won't make it again.
```

**Ancient Power:**
```
Betrayal, they call it. As if loyalty were written in stone
rather than water. Everything flows, changes, becomes other
than it was. Will be. Has been. Is being now.

The Pattern weeps. Or laughs. Hard to tell.
```

## Voice Consistency Checklist

When writing dialogue and internal monologue:

- [ ] Vocabulary level matches character background
- [ ] Sentence length consistent with established pattern
- [ ] Contraction use matches character formality
- [ ] Questions fit character's motivation (teaching, trapping, genuine)
- [ ] Topics noticed align with character priorities
- [ ] Signature phrases appear naturally (not forced)
- [ ] Response to stress follows established pattern
- [ ] Humor type matches character (dry, absent, cutting, gentle)
- [ ] Paragraph rhythm consistent with previous scenes
- [ ] Can identify speaker without tags in multi-character scenes

---

**Next:** See [PACING-STRUCTURE.md](./PACING-STRUCTURE.md) for scene rhythm and narrative arc structure.
