(function (global) {
  "use strict";

  const TOKEN_RE = /[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*|[^\s\p{L}\p{N}_]/gu;
  const WORD_RE = /[\p{L}\p{N}]/u;
  const NO_SPACE_BEFORE = new Set([",", ".", "!", "?", ";", ":", "%", ")", "]", "}"]);
  const NO_SPACE_AFTER = new Set(["(", "[", "{"]);
  const SURFACE_CATEGORIES = ["ph", "basic", "pn", "num", "prep", "adj", "n", "v", "adv"];
  const MODIFIER_CATEGORIES = new Set(["adj", "poss"]);
  const AUXILIARY_PRONOUNS = new Set(["ey", "yel", "mey", "eya", "yela", "meya", "eyma", "yelma", "meyma"]);
  const VOWELS = new Set(["a", "e", "i", "o", "u"]);
  const ARTICLES = new Set(["a", "an", "the"]);
  const RELATIVE_CONNECTORS = new Set(["that", "which", "whose", "who", "whom", "where", "when"]);
  const REFLEXIVE_PRONOUNS = new Set(["myself", "yourself", "himself", "herself", "itself", "ourselves", "yourselves", "themselves", "oneself"]);
  const SUBJECT_PRONOUNS = new Set(["i", "you", "he", "she", "it", "we", "they"]);
  const ADVERBIAL_WH_MODIFIERS = new Set(["wherever", "whenever", "however"]);
  const CLAUSE_COMPLEMENT_VERBS = new Set([
    "agree", "believe", "decide", "expect", "feel", "forget", "hope", "imagine",
    "know", "learn", "promise", "remember", "say", "seem", "suppose", "think",
    "understand", "want", "wish",
  ]);
  const CONTROLLED_INFINITIVE_VERBS = new Set([
    "agree", "attempt", "begin", "care", "choose", "come", "continue", "decide",
    "expect", "fail", "feel", "forget", "go", "help", "hope", "intend", "learn", "like",
    "love", "need", "plan", "prefer", "promise", "remember", "start", "try", "want",
    "wish",
  ]);
  const OBJECT_CONTROL_INFINITIVE_VERBS = new Set([
    "advise", "allow", "ask", "encourage", "expect", "force", "invite", "need",
    "order", "persuade", "remind", "teach", "tell", "want", "warn",
  ]);
  const PREVERB_ADVERBS = new Set(["yene"]);
  const DATIVE_VERBS = new Set([
    "give", "gift", "hand", "lend", "loan", "offer", "pay", "promise", "read", "sell",
    "send", "show", "teach", "tell", "throw", "wish", "write",
  ]);
  const ENGLISH_AUXILIARIES = new Set([
    "am", "is", "are", "was", "were", "be", "been", "being",
    "will", "would", "can", "could", "may", "might", "must", "shall", "should",
    "do", "does", "did", "have", "has", "had",
  ]);
  const ENGLISH_DETERMINERS = new Set([
    "a", "an", "the", "this", "that", "these", "those",
    "my", "your", "his", "her", "its", "our", "their", "whose",
    "some", "any", "each", "every", "either", "neither", "both", "all",
    "no", "many", "few", "several", "much", "enough",
  ]);
  const POSSESSIVE_DETERMINERS = new Set(["my", "your", "his", "her", "its", "our", "their"]);
  const NEGATIVE_PREFIX_EXCEPTIONS = new Set([
    "inflammable", "ingenious", "innocent", "invaluable",
  ]);
  const ENGLISH_CLAUSE_BOUNDARIES = new Set([",", ";", ":", ".", "!", "?"]);
  const NUMBER_ALIASES = {
    "0": ["zero"], "1": ["one"], "2": ["two"], "3": ["three"], "4": ["four"],
    "5": ["five"], "6": ["six"], "7": ["seven"], "8": ["eight"], "9": ["nine"], "10": ["ten"],
    "100": ["hundred", "hundreds"], "1000": ["thousand", "thousands"],
    "1000000": ["million", "millions"], "1000000000": ["billion", "billions"],
    "100th": ["hundredth"], "1000th": ["thousandth"],
    "1000000th": ["millionth"], "1000000000th": ["billionth"],
    "1/2": ["half", "one half"], "1/3": ["one third"],
    "1/4": ["quarter", "one quarter", "one fourth"], "1/5": ["one fifth"],
    "1/6": ["one sixth"], "1/7": ["one seventh"], "1/8": ["one eighth"],
    "1/9": ["one ninth"], "1/10": ["one tenth"], "1/100": ["one hundredth"],
    "1/1000": ["one thousandth"], "1/1000000": ["one millionth"],
    "1/1000000000": ["one billionth"],
    "5 times": ["five times"], "6 times": ["six times"], "7 times": ["seven times"],
    "8 times": ["eight times"], "9 times": ["nine times"], "10 times": ["ten times"],
    "100 times": ["hundred times", "one hundred times"],
    "1000 times": ["thousand times", "one thousand times"],
    "1000000 times": ["million times", "one million times"],
    "1000000000 times": ["billion times", "one billion times"],
  };
  const CONTRACTIONS = {
    // In Yapo Teya's supported informal register, "ain't" is normalized to
    // the negative past copula (niyesil), as specified by the language author.
    "ain't": ["was", "not"], "amn't": ["am", "not"],
    "can't": ["can", "not"], "cannot": ["can", "not"], "won't": ["will", "not"],
    "don't": ["do", "not"], "doesn't": ["does", "not"], "didn't": ["did", "not"],
    "isn't": ["is", "not"], "aren't": ["are", "not"], "wasn't": ["was", "not"],
    "weren't": ["were", "not"], "hasn't": ["has", "not"], "haven't": ["have", "not"],
    "hadn't": ["had", "not"], "wouldn't": ["would", "not"], "couldn't": ["could", "not"],
    "shouldn't": ["should", "not"], "i'm": ["I", "am"], "you're": ["you", "are"],
    "we're": ["we", "are"], "they're": ["they", "are"], "he's": ["he", "is"],
    "she's": ["she", "is"], "it's": ["it", "is"], "that's": ["that", "is"],
    "who's": ["who", "is"], "what's": ["what", "is"], "where's": ["where", "is"],
    "when's": ["when", "is"], "why's": ["why", "is"], "how's": ["how", "is"],
    "there's": ["there", "is"], "here's": ["here", "is"],
    "i've": ["I", "have"], "you've": ["you", "have"],
    "we've": ["we", "have"], "they've": ["they", "have"], "i'd": ["I", "would"],
    "you'd": ["you", "would"], "he'd": ["he", "would"], "she'd": ["she", "would"],
    "we'd": ["we", "would"], "they'd": ["they", "would"], "it'd": ["it", "would"],
    "that'd": ["that", "would"], "there'd": ["there", "would"], "who'd": ["who", "would"],
    "i'll": ["I", "will"],
    "you'll": ["you", "will"], "he'll": ["he", "will"], "she'll": ["she", "will"],
    "we'll": ["we", "will"], "they'll": ["they", "will"], "it'll": ["it", "will"],
    "that'll": ["that", "will"], "there'll": ["there", "will"], "who'll": ["who", "will"],
    "imma": ["I", "will"],
  };

  const IRREGULAR_PLURALS = {
    child: "children", person: "people", human: "humans", man: "men", woman: "women",
    mouse: "mice", foot: "feet", tooth: "teeth", goose: "geese", fish: "fish",
  };
  const IRREGULAR_PAST = {
    arise: "arose", awake: "awoke", be: "was", bear: "bore", beat: "beat",
    become: "became", begin: "began", bend: "bent", bet: "bet", bind: "bound",
    bite: "bit", bleed: "bled", blow: "blew", break: "broke", breed: "bred",
    bring: "brought", broadcast: "broadcast", build: "built", burst: "burst", buy: "bought",
    catch: "caught", choose: "chose", cling: "clung", come: "came", cost: "cost",
    creep: "crept", cut: "cut", deal: "dealt", dig: "dug", do: "did", draw: "drew",
    drink: "drank", drive: "drove", eat: "ate", fall: "fell", feed: "fed",
    feel: "felt", fight: "fought", find: "found", flee: "fled", fling: "flung",
    fly: "flew", forbid: "forbade", forget: "forgot", forgive: "forgave", freeze: "froze",
    get: "got", give: "gave", go: "went", grind: "ground", grow: "grew", hang: "hung",
    have: "had", hear: "heard", hide: "hid", hit: "hit", hold: "held", hurt: "hurt",
    keep: "kept", kneel: "knelt", know: "knew", lay: "laid", lead: "led", lean: "leant",
    leap: "leapt", leave: "left", lend: "lent", let: "let", lie: "lay", light: "lit",
    lose: "lost", make: "made", mean: "meant", meet: "met", pay: "paid", prove: "proved",
    put: "put", read: "read", ride: "rode", ring: "rang", rise: "rose", run: "ran",
    say: "said", see: "saw", seek: "sought", sell: "sold", send: "sent", set: "set",
    shake: "shook", shine: "shone", shoot: "shot", show: "showed", shrink: "shrank",
    shut: "shut", sing: "sang", sink: "sank", sit: "sat", sleep: "slept", slide: "slid",
    speak: "spoke", spend: "spent", spin: "spun", split: "split", spread: "spread",
    spring: "sprang", stand: "stood", steal: "stole", stick: "stuck", sting: "stung",
    stink: "stank", strike: "struck", swear: "swore", sweep: "swept", swim: "swam",
    swing: "swung", take: "took", teach: "taught", tear: "tore", tell: "told",
    think: "thought", throw: "threw", understand: "understood", wake: "woke",
    wear: "wore", weep: "wept", win: "won", wind: "wound", write: "wrote",
  };
  const IRREGULAR_PARTICIPLES = {
    arise: "arisen", awake: "awoken", be: "been", bear: "borne", beat: "beaten",
    become: "become", begin: "begun", bend: "bent", bet: "bet", bind: "bound",
    bite: "bitten", bleed: "bled", blow: "blown", break: "broken", breed: "bred",
    bring: "brought", broadcast: "broadcast", build: "built", burst: "burst", buy: "bought",
    catch: "caught", choose: "chosen", cling: "clung", come: "come", cost: "cost",
    creep: "crept", cut: "cut", deal: "dealt", dig: "dug", do: "done", draw: "drawn",
    drink: "drunk", drive: "driven", eat: "eaten", fall: "fallen", feed: "fed",
    feel: "felt", fight: "fought", find: "found", flee: "fled", fling: "flung",
    fly: "flown", forbid: "forbidden", forget: "forgotten", forgive: "forgiven", freeze: "frozen",
    get: "gotten", give: "given", go: "gone", grind: "ground", grow: "grown", hang: "hung",
    have: "had", hear: "heard", hide: "hidden", hit: "hit", hold: "held", hurt: "hurt",
    keep: "kept", kneel: "knelt", know: "known", lay: "laid", lead: "led", lean: "leant",
    leap: "leapt", leave: "left", lend: "lent", let: "let", lie: "lain", light: "lit",
    lose: "lost", make: "made", mean: "meant", meet: "met", pay: "paid", prove: "proven",
    put: "put", read: "read", ride: "ridden", ring: "rung", rise: "risen", run: "run",
    say: "said", see: "seen", seek: "sought", sell: "sold", send: "sent", set: "set",
    shake: "shaken", shine: "shone", shoot: "shot", show: "shown", shrink: "shrunk",
    shut: "shut", sing: "sung", sink: "sunk", sit: "sat", sleep: "slept", slide: "slid",
    speak: "spoken", spend: "spent", spin: "spun", split: "split", spread: "spread",
    spring: "sprung", stand: "stood", steal: "stolen", stick: "stuck", sting: "stung",
    stink: "stunk", strike: "struck", swear: "sworn", sweep: "swept", swim: "swum",
    swing: "swung", take: "taken", teach: "taught", tear: "torn", tell: "told",
    think: "thought", throw: "thrown", understand: "understood", wake: "woken",
    wear: "worn", weep: "wept", win: "won", wind: "wound", write: "written",
  };
  const IRREGULAR_COMPARATIVES = {
    good: "better", well: "better", bad: "worse", far: "farther", little: "less", many: "more", much: "more",
    strong: "stronger",
  };
  const IRREGULAR_SUPERLATIVES = {
    good: "best", well: "best", bad: "worst", far: "farthest", little: "least", many: "most", much: "most",
    strong: "strongest",
  };
  const DEFAULT_OVERRIDES = {
    fikom: "days",
    maymulte: "more",
    nimaymulte: "no more",
    nipoti: "can't",
    toli: "fall",
    ey: "they/them",
    yel: "they/them",
    mey: "they/them",
    eya: "their",
    yela: "their",
    meya: "their",
    eyma: "their",
    yelma: "their",
    meyma: "their",
  };

  function tokenize(text) {
    return String(text || "").match(TOKEN_RE) || [];
  }

  function keyFor(tokensOrText) {
    const tokens = typeof tokensOrText === "string" ? tokenize(tokensOrText) : tokensOrText;
    return tokens.map((token) => token.toLocaleLowerCase()).join("\u0001");
  }

  function unique(values) {
    return [...new Set(values.filter(Boolean))];
  }

  function joinTokens(tokens) {
    let result = "";
    let previous = "";
    for (const token of tokens) {
      if (!result || NO_SPACE_BEFORE.has(token) || NO_SPACE_AFTER.has(previous) || token === "'") {
        result += token;
      } else {
        result += ` ${token}`;
      }
      previous = token;
    }
    return result;
  }

  function matchCase(source, translation) {
    const letters = [...source].filter((character) => /\p{L}/u.test(character)).join("");
    if (letters.length > 1 && letters === letters.toLocaleUpperCase()) return translation.toLocaleUpperCase();
    if (/^\p{Lu}/u.test(source) && translation) return translation[0].toLocaleUpperCase() + translation.slice(1);
    return translation;
  }

  function applyInitialCase(source, translation) {
    if (!/^[^\p{L}]*\p{Lu}/u.test(source) || !translation) return translation;
    return translation.replace(/\p{L}/u, (letter) => letter.toLocaleUpperCase());
  }

  function pluralizeWord(word) {
    const lower = word.toLocaleLowerCase();
    if (IRREGULAR_PLURALS[lower]) return matchCase(word, IRREGULAR_PLURALS[lower]);
    if (/[^aeiou]y$/i.test(word)) return `${word.slice(0, -1)}ies`;
    if (/(s|x|z|ch|sh)$/i.test(word)) return `${word}es`;
    if (/fe$/i.test(word)) return `${word.slice(0, -2)}ves`;
    if (/f$/i.test(word)) return `${word.slice(0, -1)}ves`;
    return `${word}s`;
  }

  function inflectPhrase(phrase, inflector, position = "last") {
    const words = phrase.split(/\s+/).filter(Boolean);
    if (!words.length) return phrase;
    const index = position === "first" ? 0 : words.length - 1;
    words[index] = inflector(words[index]);
    return words.join(" ");
  }

  function pluralizePhrase(phrase) {
    return inflectPhrase(phrase, pluralizeWord, "last");
  }

  function inflectFirstYapoWord(phrase, inflector) {
    const words = phrase.split(/\s+/).filter(Boolean);
    if (!words.length) return phrase;
    words[0] = inflector(words[0]);
    return words.join(" ");
  }

  function pluralizeYapoNounPhrase(phrase) {
    return inflectFirstYapoWord(phrase, (word) => word.endsWith("o") ? `${word.slice(0, -1)}om` : word);
  }

  function tenseYapoVerbPhrase(phrase, suffix) {
    return inflectFirstYapoWord(phrase, (word) => word.endsWith("i") ? `${word.slice(0, -1)}${suffix}` : word);
  }

  function pastWord(word) {
    const lower = word.toLocaleLowerCase();
    if (IRREGULAR_PAST[lower]) return matchCase(word, IRREGULAR_PAST[lower]);
    if (/e$/i.test(word)) return `${word}d`;
    if (/[^aeiou]y$/i.test(word)) return `${word.slice(0, -1)}ied`;
    if (/^[^aeiou]*[aeiou][^aeiouwxy]$/i.test(word)) return `${word}${word.slice(-1)}ed`;
    return `${word}ed`;
  }

  function pastPhrase(phrase) {
    return inflectPhrase(phrase, pastWord, "first");
  }

  function thirdPersonWord(word) {
    if (/[^aeiou]y$/i.test(word)) return `${word.slice(0, -1)}ies`;
    if (/(s|x|z|ch|sh|o)$/i.test(word)) return `${word}es`;
    return `${word}s`;
  }

  function gerundWord(word) {
    if (/ie$/i.test(word)) return `${word.slice(0, -2)}ying`;
    if (/e$/i.test(word) && !/(ee|ye|oe)$/i.test(word)) return `${word.slice(0, -1)}ing`;
    if (/^[^aeiou]*[aeiou][^aeiouwxy]$/i.test(word)) return `${word}${word.slice(-1)}ing`;
    return `${word}ing`;
  }

  function participleWord(word) {
    return IRREGULAR_PARTICIPLES[word.toLocaleLowerCase()] || pastWord(word);
  }

  function inflectFirstWord(phrase, inflector) {
    return inflectPhrase(phrase, inflector, "first");
  }

  function expandContractions(tokens) {
    const expanded = [];
    for (let index = 0; index < tokens.length; index += 1) {
      const token = tokens[index];
      const normalized = token.toLocaleLowerCase().replaceAll("’", "'");
      const following = tokens[index + 1]?.toLocaleLowerCase();
      if ((token === "'" || token === "’") && following === "tis") {
        expanded.push("it", "is");
        index += 1;
        continue;
      }
      if ((token === "'" || token === "’") && following === "twas") {
        expanded.push("it", "was");
        index += 1;
        continue;
      }
      if ((token === "'" || token === "’") && following === "stead") {
        expanded.push("instead");
        index += 1;
        continue;
      }
      if (normalized === "to-day") {
        expanded.push("today");
        continue;
      }
      const replacement = CONTRACTIONS[normalized];
      expanded.push(...(replacement || [token]));
    }
    return expanded;
  }

  function comparativeWord(word) {
    const lower = word.toLocaleLowerCase();
    if (IRREGULAR_COMPARATIVES[lower]) return matchCase(word, IRREGULAR_COMPARATIVES[lower]);
    if (/[^aeiou]y$/i.test(word)) return `${word.slice(0, -1)}ier`;
    if (/e$/i.test(word)) return `${word}r`;
    if (/^[^aeiou]*[aeiou][^aeiouwxy]$/i.test(word)) return `${word}${word.slice(-1)}er`;
    if (word.length <= 5) return `${word}er`;
    return `more ${word}`;
  }

  function superlativeWord(word) {
    const lower = word.toLocaleLowerCase();
    if (IRREGULAR_SUPERLATIVES[lower]) return matchCase(word, IRREGULAR_SUPERLATIVES[lower]);
    if (/[^aeiou]y$/i.test(word)) return `${word.slice(0, -1)}iest`;
    if (/e$/i.test(word)) return `${word}st`;
    if (/^[^aeiou]*[aeiou][^aeiouwxy]$/i.test(word)) return `${word}${word.slice(-1)}est`;
    if (word.length <= 5) return `${word}est`;
    return `most ${word}`;
  }

  function possessiveEnglish(value) {
    return /s$/i.test(value) ? `${value}'` : `${value}'s`;
  }

  function possessiveYapo(value) {
    const last = value.slice(-1).toLocaleLowerCase();
    return value + (VOWELS.has(last) ? "y" : "a");
  }

  function cloneDictionaries(dictionaries) {
    const clone = {};
    for (const [category, dictionary] of Object.entries(dictionaries || {})) {
      clone[category] = {};
      for (const [word, meanings] of Object.entries(dictionary || {})) {
        clone[category][word] = [...meanings];
      }
    }
    return clone;
  }

  class GrammarTranslator {
    constructor(dictionaries, customEntries = [], preferences = {}) {
      this.dictionaries = cloneDictionaries(dictionaries);
      this.customEntryKeys = new Set();
      this.disabledPhrases = { yapo: new Set(), english: new Set() };
      // These roles belong only to the current text. They deliberately do not
      // enter either dictionary or localStorage and the word remains unknown.
      this.temporaryEnglishCategories = new Map();
      this.maximumTemporaryEnglishPhrase = 1;
      this.preferences = { yapo: { ...(preferences.yapo || {}) }, english: { ...(preferences.english || {}) } };
      for (const entry of customEntries) this.addCustom(entry, false);
      this.rebuild();
    }

    preferenceKey(source, category = "") {
      const word = String(source || "").trim().toLocaleLowerCase();
      return category ? `${word}\u0001${category}` : word;
    }

    preferenceFor(side, source, category = "") {
      const preferences = this.preferences[side] || {};
      const categorized = preferences[this.preferenceKey(source, category)];
      if (categorized !== undefined || (side === "english" && category)) return categorized;
      return preferences[this.preferenceKey(source)];
    }

    setPreference(side, source, target, category = "") {
      if (!["yapo", "english"].includes(side)) return false;
      const key = this.preferenceKey(source, category);
      const value = String(target || "").trim();
      if (!key || !value) return false;
      this.preferences[side][key] = value;
      return true;
    }

    setPhraseEnabled(side, phrase, enabled) {
      if (!this.disabledPhrases[side]) return false;
      const key = keyFor(phrase);
      if (enabled) this.disabledPhrases[side].delete(key);
      else this.disabledPhrases[side].add(key);
      return true;
    }

    preferredMeaning(source, meanings, category = "") {
      const preferred = this.preferenceFor("yapo", source, category);
      if (!preferred) return meanings;
      return [preferred, ...meanings.filter((meaning) => meaning.toLocaleLowerCase() !== preferred.toLocaleLowerCase())];
    }

    preferredEnglishOption(source, options) {
      const legacyPreferred = this.preferences.english[this.preferenceKey(source)];
      const optionCategories = new Set(options.map((option) => option.category));
      if (legacyPreferred && optionCategories.size === 1) {
        return [...options].sort((left, right) =>
          Number(right.yapo.toLocaleLowerCase() === legacyPreferred.toLocaleLowerCase())
          - Number(left.yapo.toLocaleLowerCase() === legacyPreferred.toLocaleLowerCase()));
      }
      const queues = new Map();
      for (const option of options) {
        if (!queues.has(option.category)) queues.set(option.category, []);
        queues.get(option.category).push(option);
      }
      for (const [category, queue] of queues) {
        const preferred = this.preferenceFor("english", source, category);
        if (!preferred) continue;
        queue.sort((left, right) => Number(right.yapo.toLocaleLowerCase() === preferred.toLocaleLowerCase())
          - Number(left.yapo.toLocaleLowerCase() === preferred.toLocaleLowerCase()));
      }
      return options.map((option) => queues.get(option.category).shift());
    }

    addCustom(entry, rebuild = true) {
      const category = String(entry.category || "");
      const yapo = String(entry.yapo || "").trim();
      const english = String(entry.english || "").trim();
      if (!this.dictionaries[category] || !yapo || !english) return false;
      this.customEntryKeys.add(this.customKey(category, yapo, english));
      const meanings = this.dictionaries[category][yapo] || (this.dictionaries[category][yapo] = []);
      if (!meanings.some((meaning) => meaning.toLocaleLowerCase() === english.toLocaleLowerCase())) meanings.push(english);
      if (rebuild) this.rebuild();
      return true;
    }

    customKey(category, yapo, english) {
      return `${category}\u0001${String(yapo).trim().toLocaleLowerCase()}\u0001${String(english).trim().toLocaleLowerCase()}`;
    }

    isCustom(category, yapo, english) {
      return this.customEntryKeys.has(this.customKey(category, yapo, english));
    }

    removeCustom(entry) {
      const category = String(entry.category || "");
      const yapo = String(entry.yapo || "").trim();
      const english = String(entry.english || "").trim();
      const key = this.customKey(category, yapo, english);
      if (!this.customEntryKeys.delete(key)) return false;
      const storedKey = Object.keys(this.dictionaries[category] || {}).find((word) => word.toLocaleLowerCase() === yapo.toLocaleLowerCase());
      if (storedKey) {
        this.dictionaries[category][storedKey] = this.dictionaries[category][storedKey]
          .filter((meaning) => meaning.toLocaleLowerCase() !== english.toLocaleLowerCase());
        if (!this.dictionaries[category][storedKey].length) delete this.dictionaries[category][storedKey];
      }
      this.rebuild();
      return true;
    }

    rebuild() {
      this.yapoEntries = new Map();
      this.yapoPhrases = new Map();
      this.englishIndex = new Map();
      this.englishVerbLemmas = new Map();
      this.maximumYapoPhrase = 1;
      this.maximumEnglishPhrase = 1;

      for (const category of SURFACE_CATEGORIES) {
        for (const [word, meanings] of Object.entries(this.dictionaries[category] || {})) {
          const normalized = word.toLocaleLowerCase();
          let effectiveCategory = category;
          if (category === "pn"
            && (normalized.endsWith("a") || meanings.every((meaning) => /^(my|your|his|her|our|their|of )/i.test(meaning)))) {
            effectiveCategory = "poss";
          } else if (category === "num" && meanings.some((meaning) => /^(?:once|twice|thrice|\d+ times?|(?:one|two|three|four|five|six|seven|eight|nine|ten) times?)$/i.test(meaning))) {
            effectiveCategory = "adv";
          } else if (category === "num" && meanings.some((meaning) => /^(?:first|second|third|\d+(?:st|nd|rd|th)|(?:four|fif|six|seven|eigh|nin|ten)th)$/i.test(meaning))) {
            effectiveCategory = "adj";
          } else if (category === "ph") {
            const phraseWords = tokenize(word).filter((token) => WORD_RE.test(token));
            if (phraseWords.length && phraseWords.every((token) => Object.keys(this.dictionaries.v || {})
              .some((verb) => verb.toLocaleLowerCase() === token.toLocaleLowerCase()))) effectiveCategory = "v";
          }
          const entry = { yapo: word, category: effectiveCategory, dictionaryCategory: category, meanings: [...meanings], lemmaMeanings: [...meanings], tense: "present" };
          this.yapoEntries.set(normalized, entry);
          const tokens = tokenize(word);
          if (tokens.length > 1) {
            this.yapoPhrases.set(keyFor(tokens), entry);
            this.maximumYapoPhrase = Math.max(this.maximumYapoPhrase, tokens.length);
          }
          if (!AUXILIARY_PRONOUNS.has(normalized) && !normalized.endsWith("-")) {
            const score = category === "ph" ? -5 : 20 + SURFACE_CATEGORIES.indexOf(category);
            meanings.forEach((meaning) => this.addEnglishOption(meaning, word, effectiveCategory, score));
            if (category === "num") {
              meanings.forEach((meaning) => {
                const aliases = NUMBER_ALIASES[String(meaning).replaceAll(",", "")] || [];
                aliases.forEach((alias) => this.addEnglishOption(alias, word, "num", 0));
              });
            }
          }
        }
      }

      this.buildGeneratedForms();
      this.addEnglishOption("would", "li", "marker", 0);
      this.addEnglishOption("am", "yesi", "v", 0);
      this.addEnglishOption("is", "yesi", "v", 0);
      this.addEnglishOption("are", "yesi", "v", 0);
      this.addEnglishOption("be", "yesi", "v", 0);
      this.addEnglishOption("was", "yesil", "v", 0);
      this.addEnglishOption("were", "yesil", "v", 0);
      this.addEnglishOption("been", "yesil", "v", 0);
      this.addEnglishOption("will be", "yesish", "v", 0);
      this.addEnglishOption("has", "imi", "v", 0);
      this.addEnglishOption("y'all", "tum", "pn", 0);
      this.addEnglishOption("yes", "tish", "basic", -10);
      this.addEnglishOption("this", "tish", "adj", -10);
      this.addEnglishOption("that", "tish", "basic", -10);
      this.addEnglishOption("these", "tish", "adj", -10);
      this.addEnglishOption("those", "tish", "adj", -10);
      this.addEnglishOption("who", "kiyo", "pn", -10);
      this.addEnglishOption("whom", "kiyo", "pn", -10);
      this.addEnglishOption("more", "maymulte", "adv", -10);
      this.addEnglishOption("no more", "nimay", "adv", -10);
      this.addEnglishOption("can't", "nipoti", "v", -10);
      this.addEnglishOption("cannot", "nipoti", "v", -10);
      for (const reflexive of REFLEXIVE_PRONOUNS) this.addEnglishOption(reflexive, "sey", "pn", -10);
      this.addEnglishOption("never", "tempo nish", "adv", -10);
      this.addEnglishOption("always", "tempo ale", "adv", -10);
      this.registerGenerated("tempo nish", "adv", ["never"], ["never"], "present");
      this.registerGenerated("tempo ale", "adv", ["always"], ["always"], "present");
      this.addEnglishOption("probably", "kish", "adv", -10);
      this.addEnglishOption("perhaps", "kish", "adv", -10);
      this.addEnglishOption("whenever", "tempo ki", "adv", -10);
      this.addEnglishOption("also", "take", "adv", -10);
      this.addEnglishOption("as well", "take", "adv", -10);
      this.addEnglishOption("by", "kun", "prep", -10);
      this.addEnglishOption("could", "potil", "v", -10);
      this.addEnglishOption("may", "poti", "v", -11);
      this.addEnglishOption("care to", "cemi", "v", -11);
      this.addEnglishOption("mind", "nipachi", "v", -11);
      this.addEnglishOption("habitually", "ale", "adv", -11);
      this.addEnglishOption("at all", "lon ale", "adv", -11);
      this.addEnglishOption("not", "nish", "basic", -11);
      this.addEnglishOption("no one", "omo nish", "n", -11);
      this.addEnglishOption("every", "ale", "adj", -11);
      this.addEnglishOption("ask of", "reki", "v", -11);
      this.addEnglishOption("asks of", "reki", "v", -11);
      this.addEnglishOption("asked of", "rekil", "v", -11);
      this.addEnglishOption("asking of", "reki", "v", -11);
      this.addEnglishOption("go out", "ekti", "v", -11);
      this.addEnglishOption("goes out", "ekti", "v", -11);
      this.addEnglishOption("went out", "ektil", "v", -11);
      this.addEnglishOption("going out", "ekti", "v", -11);
      this.addEnglishOption("was going out", "ektil", "v", -12);
      this.addEnglishOption("get on", "iti kun", "v", -12);
      this.addEnglishOption("gets on", "iti kun", "v", -12);
      this.addEnglishOption("getting on", "iti kun", "v", -12);
      this.addEnglishOption("as to", "pen", "prep", -12);
      this.addEnglishOption("now", "lon tempo tish", "adv", -12);
      this.registerGenerated("lon ale", "adv", ["at all"], ["at all"], "present");
      this.registerGenerated("omo nish", "n", ["no one"], ["no one"], "present");
      this.registerGenerated("iti kun", "v", ["get on"], ["get on"], "present");
      this.registerGenerated("lon tempo tish", "adv", ["now"], ["now"], "present");
      this.addEnglishOption("come in", "sisi", "v", -11);
      this.addEnglishOption("came in", "sisil", "v", -11);
      this.addEnglishOption("coming in", "sisi", "v", -11);
      this.addEnglishOption("will come in", "sisish", "v", -11);
      this.addEnglishOption("carry on", "cini", "v", -11);
      this.addEnglishOption("carries on", "cini", "v", -11);
      this.addEnglishOption("carried on", "cinil", "v", -11);
      this.addEnglishOption("carrying on", "cini", "v", -11);
      this.addEnglishOption("take out", "yali", "v", -11);
      this.addEnglishOption("takes out", "yali", "v", -11);
      this.addEnglishOption("took out", "yalil", "v", -11);
      this.addEnglishOption("taking out", "yali", "v", -11);
      this.addEnglishOption("such", "tish", "adj", -10);
      this.addEnglishOption("some", "ki", "adj", -10);
      this.addEnglishOption("all", "ale", "adj", -10);
      for (const options of this.englishIndex.values()) options.sort((a, b) => a.score - b.score || a.yapo.localeCompare(b.yapo));
      this.usableEntries = this.yapoEntries.size;
    }

    addEnglishOption(english, yapo, category, score) {
      const tokens = tokenize(english);
      if (!tokens.length) return;
      const key = keyFor(tokens);
      const options = this.englishIndex.get(key) || [];
      // The same YT surface may legitimately represent more than one part of
      // speech. Keep those alternatives distinct so syntax (and per-POS
      // defaults in the UI) can select the right role.
      if (!options.some((option) => option.yapo.toLocaleLowerCase() === yapo.toLocaleLowerCase()
        && option.category === category)) {
        options.push({ yapo, category, score });
      }
      this.englishIndex.set(key, options);
      this.maximumEnglishPhrase = Math.max(this.maximumEnglishPhrase, tokens.length);
    }

    buildGeneratedForms() {
      for (const [word, entry] of [...this.yapoEntries.entries()]) {
        if (entry.category === "n" && word.endsWith("o")) {
          const plural = pluralizeYapoNounPhrase(word);
          const meanings = unique(entry.meanings.map(pluralizePhrase));
          this.registerGenerated(plural, "n", meanings, entry.meanings, "plural");
          meanings.forEach((meaning) => this.addEnglishOption(meaning, plural, "n", 3));
        }
        if (entry.category === "v" && word.endsWith("i")) {
          const past = tenseYapoVerbPhrase(word, "il");
          const future = tenseYapoVerbPhrase(word, "ish");
          const pastMeanings = unique(entry.meanings.map(pastPhrase));
          const futureMeanings = unique(entry.meanings.map((meaning) => `will ${meaning}`));
          this.registerGenerated(past, "v", pastMeanings, entry.meanings, "past");
          this.registerGenerated(future, "v", futureMeanings, entry.meanings, "future");
          pastMeanings.forEach((meaning) => this.addEnglishOption(meaning, past, "v", 2));
          futureMeanings.forEach((meaning) => this.addEnglishOption(meaning, future, "v", 2));
          entry.meanings.forEach((meaning) => {
            this.addEnglishOption(`don't ${meaning}`, `ni${word}`, "v", 1);
            this.addEnglishOption(`do not ${meaning}`, `ni${word}`, "v", 1);
            if (/^be\s+/iu.test(meaning)) {
              const complement = meaning.replace(/^be\s+/iu, "");
              for (const copula of ["am", "is", "are"]) this.addEnglishOption(`${copula} ${complement}`, word, "v", 1);
              for (const copula of ["was", "were", "been"]) this.addEnglishOption(`${copula} ${complement}`, past, "v", 1);
              this.addEnglishOption(`will be ${complement}`, future, "v", 1);
            }
            // A generated English verb form must not outrank an explicitly
            // listed noun/adjective with the same spelling (for example
            // "building" or "working"). Verb context still selects it below.
            this.addEnglishOption(inflectFirstWord(meaning, thirdPersonWord), word, "v", 40);
            this.addEnglishOption(inflectFirstWord(meaning, gerundWord), word, "v", 40);
            this.addEnglishOption(inflectFirstWord(meaning, participleWord), past, "v", 40);
            const first = meaning.split(/\s+/)[0]?.toLocaleLowerCase();
            if (first) {
              const base = meaning;
              const pastSurface = pastPhrase(meaning);
              const forms = [
                meaning,
                inflectFirstWord(meaning, thirdPersonWord),
                inflectFirstWord(meaning, gerundWord),
                inflectFirstWord(meaning, participleWord),
                pastSurface,
              ];
              for (const form of forms) {
                const firstForm = form.split(/\s+/)[0]?.toLocaleLowerCase();
                if (firstForm && !this.englishVerbLemmas.has(firstForm)) {
                  this.englishVerbLemmas.set(firstForm, { base: first, past: pastSurface.split(/\s+/)[0] });
                }
              }
            }
          });
        }
        if ((entry.category === "adj" || entry.category === "adv") && !word.includes(" ")) {
          entry.meanings.forEach((meaning) => {
            this.addEnglishOption(comparativeWord(meaning), `may${word}`, entry.category, 1);
            this.addEnglishOption(superlativeWord(meaning), `ney${word}`, entry.category, 1);
            this.addEnglishOption(`very ${meaning}`, `mu${word}`, entry.category, 1);
            this.addEnglishOption(`so ${meaning}`, `mu${word}`, entry.category, 1);
            this.addEnglishOption(`too ${meaning}`, `mu${word}`, entry.category, 1);
            this.addEnglishOption(`not ${meaning}`, `ni${word}`, entry.category, 1);
          });
        }
      }
      this.addEnglishOption("they", "yum", "pn", 0);
      this.addEnglishOption("them", "yum", "pn", 0);
      this.addEnglishOption("their", "yuma", "poss", 0);
      for (const degreePhrase of ["so much", "too much", "so many", "too many"]) {
        this.addEnglishOption(degreePhrase, "mumulta", "adj", 0);
        this.addEnglishOption(degreePhrase, "mumulte", "adv", 1);
      }
    }

    registerGenerated(yapo, category, meanings, lemmaMeanings, tense) {
      if (!this.yapoEntries.has(yapo)) {
        this.yapoEntries.set(yapo, { yapo, category, meanings, lemmaMeanings, tense });
      }
      const entry = this.yapoEntries.get(yapo);
      const tokens = tokenize(yapo);
      if (tokens.length > 1) {
        this.yapoPhrases.set(keyFor(tokens), entry);
        this.maximumYapoPhrase = Math.max(this.maximumYapoPhrase, tokens.length);
      }
    }

    analyzeYapoWord(word, depth = 0) {
      const normalized = word.toLocaleLowerCase();
      const exact = this.yapoEntries.get(normalized);
      if (exact) {
        let meanings = DEFAULT_OVERRIDES[normalized]
          ? [DEFAULT_OVERRIDES[normalized], ...exact.meanings.filter((meaning) => meaning !== DEFAULT_OVERRIDES[normalized])]
          : [...exact.meanings];
        meanings = this.preferredMeaning(word, meanings, exact.category);
        return { ...exact, meanings };
      }
      if (DEFAULT_OVERRIDES[normalized]) {
        const category = AUXILIARY_PRONOUNS.has(normalized) ? "pn" : (normalized === "nipoti" ? "v" : "basic");
        return { yapo: word, category, meanings: this.preferredMeaning(word, [DEFAULT_OVERRIDES[normalized]], category), lemmaMeanings: [DEFAULT_OVERRIDES[normalized]], tense: "present" };
      }
      if (depth < 4) {
        for (const prefix of ["ney", "may", "mu", "ni"]) {
          if (!normalized.startsWith(prefix) || normalized.length <= prefix.length) continue;
          const base = this.analyzeYapoWord(word.slice(prefix.length), depth + 1);
          if (!base) continue;
          return this.applyPrefix(prefix, word, base);
        }
      }
      if (/^[\p{L}\p{N}]+$/u.test(word) && /^[\p{Lu}]/u.test(word)
        && (normalized.endsWith("a") || normalized.endsWith("y"))) {
        const base = word.slice(0, -1);
        const suffix = normalized.slice(-1);
        if ((suffix === "a" && !VOWELS.has(base.slice(-1).toLocaleLowerCase())) || (suffix === "y" && VOWELS.has(base.slice(-1).toLocaleLowerCase()))) {
          const translatedBase = this.yapoEntries.get(base.toLocaleLowerCase())?.meanings[0] || base;
          return { yapo: word, category: "poss", meanings: [possessiveEnglish(translatedBase)], lemmaMeanings: [translatedBase], tense: "present" };
        }
      }
      return null;
    }

    applyPrefix(prefix, original, base) {
      let meanings;
      if (prefix === "may") meanings = base.meanings.map(comparativeWord);
      else if (prefix === "ney") meanings = base.meanings.map(superlativeWord);
      else if (prefix === "mu") meanings = base.meanings.map((meaning) => `very ${meaning}`);
      else if (prefix === "ni" && base.category !== "v") meanings = base.meanings.map((meaning) => `not ${meaning}`);
      else {
        const lemmas = base.lemmaMeanings || base.meanings;
        if (base.tense === "past") meanings = lemmas.map((meaning) => `didn't ${meaning}`);
        else if (base.tense === "future") meanings = lemmas.map((meaning) => `won't ${meaning}`);
        else meanings = lemmas.map((meaning) => `don't ${meaning}`);
      }
      return { ...base, yapo: original, meanings: unique(meanings), prefixes: [prefix, ...(base.prefixes || [])] };
    }

    lookupYapoPhrase(tokens, position) {
      const available = Math.min(this.maximumYapoPhrase, tokens.length - position);
      for (let length = available; length > 1; length -= 1) {
        const phraseKey = keyFor(tokens.slice(position, position + length));
        if (this.disabledPhrases.yapo.has(phraseKey)) continue;
        const entry = this.yapoPhrases.get(phraseKey);
        if (entry) return { entry: { ...entry, meanings: this.preferredMeaning(joinTokens(tokens.slice(position, position + length)), entry.meanings, entry.category) }, length };
      }
      return null;
    }

    lookupEnglish(tokens, position) {
      const available = Math.min(Math.max(this.maximumEnglishPhrase, this.maximumTemporaryEnglishPhrase), tokens.length - position);
      for (let length = available; length >= 1; length -= 1) {
        const phraseKey = keyFor(tokens.slice(position, position + length));
        const temporaryCategory = this.temporaryEnglishCategories.get(phraseKey);
        if (temporaryCategory) {
          const surface = joinTokens(tokens.slice(position, position + length));
          return {
            options: [{ yapo: surface, category: temporaryCategory, score: -100, temporaryUnknown: true }],
            length,
            temporaryUnknown: true,
          };
        }
        if (length > 1 && this.disabledPhrases.english.has(phraseKey)) continue;
        const options = this.englishIndex.get(phraseKey);
        if (options?.length) return { options: this.preferredEnglishOption(joinTokens(tokens.slice(position, position + length)), options), length };
      }
      const generatedNegative = this.negativePrefixedEnglishOptions(tokens[position]);
      if (generatedNegative.length) return { options: generatedNegative, length: 1, generatedNegative: true };
      return null;
    }

    negativePrefixedEnglishOptions(token) {
      const surface = String(token || "");
      const lower = surface.toLocaleLowerCase();
      if (!WORD_RE.test(surface) || NEGATIVE_PREFIX_EXCEPTIONS.has(lower)) return [];
      const candidates = [
        ["dis", lower.startsWith("dis")],
        ["non-", lower.startsWith("non-")],
        ["non", lower.startsWith("non")],
        ["un", lower.startsWith("un")],
        ["im", /^im[bmp]/u.test(lower)],
        ["ir", /^irr/u.test(lower)],
        ["il", /^ill/u.test(lower)],
        ["in", /^in(?![rl])/u.test(lower)],
      ];
      for (const [prefix, applies] of candidates) {
        if (!applies) continue;
        const base = lower.slice(prefix.length);
        if (base.length < 3) continue;
        const baseOptions = this.englishIndex.get(keyFor(base)) || [];
        const contentOptions = baseOptions.filter((option) => ["n", "adj", "v", "adv"].includes(option.category));
        if (!contentOptions.length) continue;
        return this.preferredEnglishOption(base, contentOptions).map((option) => ({
          ...option,
          yapo: option.yapo.toLocaleLowerCase().startsWith("ni") ? option.yapo : `ni${option.yapo.replace(/-$/u, "")}`,
          score: (option.score || 0) + 2,
          generatedNegative: true,
        }));
      }
      return [];
    }

    englishUnitPerson(unit) {
      if (!unit) return null;
      const source = tokenize(String(unit.source || ""))
        .find((token) => WORD_RE.test(token))?.toLocaleLowerCase() || "";
      if (["there", "here"].includes(source)) return "third";
      if ([
        "nothing", "nobody", "someone", "somebody", "something",
        "everyone", "everybody", "everything", "anyone", "anybody", "anything",
        "one", "each", "either", "neither", "none", "all",
      ].includes(source) || /^(?:no|some|every|any)\s+one$/u.test(source)) return "third";
      if (!["n", "pn", "ph"].includes(unit.category)) return null;
      if (REFLEXIVE_PRONOUNS.has(source)) return null;
      if (["i", "we", "you"].includes(source)) return "non-third";
      if (["su", "sum", "tu", "tum"].includes(String(unit.text || "").toLocaleLowerCase())) return "non-third";
      return "third";
    }

    englishVerbIsThirdPerson(unit) {
      const surface = tokenize(String(unit?.source || ""))
        .find((token) => WORD_RE.test(token))?.toLocaleLowerCase() || "";
      if (["is", "has", "does"].includes(surface)) return true;
      if (["was", "were", "had", "did"].includes(surface)) return false;
      const lemma = this.englishVerbLemmas.get(surface)?.base;
      if (lemma) return surface !== lemma && thirdPersonWord(lemma) === surface;
      return /(?:s|es)$/u.test(surface) && !/(?:ss|us)$/u.test(surface);
    }

    completeSubjectlessEnglishClauses(units) {
      const boundaryType = (unit) => {
        if (unit.category === "punct" && /[,;:.!?]/u.test(unit.text)) return "reset";
        const source = String(unit.source || "").toLocaleLowerCase();
        if (unit.category === "marker" && unit.text === "tish"
          && ["that", "which", "who", "whom", "whose"].includes(source)) return "subject";
        if (unit.category === "marker" && ["tish", "la"].includes(unit.text)) return "reset";
        if (["ya", "kay", "te"].includes(unit.text) && ["and", "or", "but"].includes(source)) return "inherit";
        return "";
      };
      const result = [];
      let segment = [];
      let previousPerson = null;
      let mayInherit = false;

      const finishSegment = (nextBoundary = null) => {
        if (!segment.length) return;
        let firstVerb = segment.findIndex((unit) => unit.category === "v");
        if (firstVerb < 0) {
          result.push(...segment);
          segment = [];
          return;
        }
        let subject = segment.slice(0, firstVerb)
          .reverse().find((unit) => this.englishUnitPerson(unit));
        const firstVerbSource = tokenize(String(segment[firstVerb]?.source || ""))
          .find((token) => WORD_RE.test(token))?.toLocaleLowerCase() || "";
        const invertedQuestion = /^(?:am|is|are|was|were|can|could|may|might|must|shall|should|will|would)$/u.test(firstVerbSource)
          && segment.slice(firstVerb + 1).some((unit) => unit.category === "pn"
            || ["there", "here"].includes(String(unit.source || "").toLocaleLowerCase()));
        if (!subject && invertedQuestion) {
          subject = segment.slice(firstVerb + 1).find((unit) => unit.category === "pn"
            || ["there", "here"].includes(String(unit.source || "").toLocaleLowerCase()));
        }
        let person = this.englishUnitPerson(subject);
        const nonFiniteModifier = /ing$/u.test(firstVerbSource);

        const pleaseIndex = segment.findIndex((unit) => unit.category === "v"
          && /^please$/iu.test(String(unit.source || "")));
        if (pleaseIndex >= 0) {
          const commandIndex = segment.findIndex((unit, index) => index > pleaseIndex && unit.category === "v");
          if (commandIndex >= 0 && segment[commandIndex - 1]?.text !== "to") {
            segment.splice(commandIndex, 0, { text: "to", category: "marker", source: "(implicit imperative)" });
          }
          if (!subject) {
            segment.unshift({ text: "su", category: "pn", source: "(implicit I)" });
            person = "non-third";
            firstVerb += 1;
          }
        }

        if (!subject && pleaseIndex < 0 && !nonFiniteModifier && mayInherit !== "subject") {
          const firstSource = String(segment[firstVerb]?.source || "");
          if (/^thank(?:s|ed|ing)?$/iu.test(firstSource)) {
            segment.splice(firstVerb, 0, { text: "su", category: "pn", source: "(implicit I)" });
            person = "non-third";
          } else {
            const reflexiveSource = segment.map((unit) => String(unit.source || "").toLocaleLowerCase())
              .find((source) => REFLEXIVE_PRONOUNS.has(source));
            const reflexiveIndex = segment.findIndex((unit) => REFLEXIVE_PRONOUNS.has(String(unit.source || "").toLocaleLowerCase()));
            const reflexiveSubject = {
              myself: "su", ourselves: "sum", yourself: "tu", yourselves: "tum",
              himself: "yu", herself: "yu", itself: "yu", themselves: "yum", oneself: "yu",
            }[reflexiveSource];
            if (reflexiveSubject) {
              segment.splice(Math.min(firstVerb, Math.max(0, reflexiveIndex)), 0, { text: reflexiveSubject, category: "pn", source: "(implicit reflexive subject)" });
              person = ["yu", "yum"].includes(reflexiveSubject) ? "third" : "non-third";
            } else {
              const inheritedThird = mayInherit && previousPerson === "third";
              const generatedSubject = inheritedThird || this.englishVerbIsThirdPerson(segment[firstVerb]) ? "yu" : "to";
              if (segment[firstVerb - 1]?.text !== generatedSubject) {
                segment.splice(firstVerb, 0, {
                  text: generatedSubject,
                  category: generatedSubject === "yu" ? "pn" : "marker",
                  source: generatedSubject === "yu" ? "(implicit third-person subject)" : "(implicit imperative)",
                });
              }
              person = generatedSubject === "yu" ? "third" : null;
            }
          }
        }
        if (mayInherit === "subject") person = "third";
        if (person) previousPerson = person;
        result.push(...segment);
        segment = [];
      };

      for (const unit of units) {
        const boundary = boundaryType(unit);
        if (!boundary) {
          segment.push(unit);
          continue;
        }
        finishSegment(unit);
        result.push(unit);
        mayInherit = boundary === "subject" ? "subject" : boundary === "inherit";
      }
      finishSegment();
      return result;
    }

    temporaryEnglishCategory(value) {
      return this.temporaryEnglishCategories.get(keyFor(value)) || "";
    }

    setTemporaryEnglishCategory(value, category) {
      const key = keyFor(value);
      if (!key) return false;
      if (!category) this.temporaryEnglishCategories.delete(key);
      else if (["basic", "n", "adj", "v", "adv", "pn", "num", "prep"].includes(category)) {
        this.temporaryEnglishCategories.set(key, category);
      } else return false;
      this.maximumTemporaryEnglishPhrase = Math.max(1, ...[...this.temporaryEnglishCategories.keys()]
        .map((phrase) => tokenize(phrase).length));
      return true;
    }

    clearTemporaryEnglishCategories() {
      this.temporaryEnglishCategories.clear();
      this.maximumTemporaryEnglishPhrase = 1;
    }

    inferEnglishCategoryAt(text, characterOffset = 0) {
      const tokens = tokenize(text);
      if (!tokens.length) return "basic";
      let wordIndex = 0;
      let cursor = 0;
      for (let index = 0; index < tokens.length; index += 1) {
        const tokenIndex = String(text).indexOf(tokens[index], cursor);
        if (tokenIndex < 0) continue;
        if (characterOffset >= tokenIndex && characterOffset <= tokenIndex + tokens[index].length) wordIndex = index;
        cursor = tokenIndex + tokens[index].length;
      }
      return this.inferUnknownEnglishCategory(tokens, wordIndex);
    }

    translatePreservingFormat(text, translateSentence) {
      const pieces = String(text || "").split(/(\r\n|\n|\r)/);
      let output = "";
      let translatedParts = 0;
      let unknownWords = 0;
      for (const piece of pieces) {
        if (/^(\r\n|\n|\r)$/u.test(piece)) {
          output += piece;
          continue;
        }
        const sentences = piece.match(/[^.!?]+[.!?]+|[^.!?]+$/gu) || [piece];
        for (const sentence of sentences) {
          const leading = sentence.match(/^\s*/u)?.[0] || "";
          const trailing = sentence.match(/\s*$/u)?.[0] || "";
          const core = sentence.slice(leading.length, sentence.length - trailing.length);
          if (!core) {
            output += sentence;
            continue;
          }
          const result = translateSentence(core);
          output += leading + result.text + trailing;
          translatedParts += result.translatedParts;
          unknownWords += result.unknownWords;
        }
      }
      return { text: output, translatedParts, unknownWords };
    }

    translateYapo(text) {
      return this.translatePreservingFormat(text, (sentence) => this.translateYapoSentence(sentence));
    }

    translateYapoQuestionBody(tokensOrText, whPrefix = [], whIsSubject = false) {
      const tokens = (typeof tokensOrText === "string" ? tokenize(tokensOrText) : tokensOrText)
        .filter((token) => token !== "?");
      const verbIndex = tokens.findIndex((token) => this.analyzeYapoWord(token)?.category === "v");
      if (verbIndex < 0) {
        const fallback = this.translateYapoSimple(tokens);
        return {
          text: joinTokens([...whPrefix, ...tokenize(fallback.text)]),
          translatedParts: fallback.translatedParts + whPrefix.length,
          unknownWords: fallback.unknownWords,
        };
      }
      const analysis = this.analyzeYapoWord(tokens[verbIndex]);
      let subjectIndex = -1;
      for (let index = 0; index < verbIndex; index += 1) {
        const candidate = this.analyzeYapoWord(tokens[index]);
        if (candidate && ["n", "pn"].includes(candidate.category)) {
          subjectIndex = index;
          break;
        }
        if (!candidate && /^\p{Lu}[\p{L}\p{M}'’\-]*$/u.test(tokens[index])) {
          subjectIndex = index;
          break;
        }
      }

      if (whIsSubject || subjectIndex < 0) {
        const complement = this.translateYapoSimple(tokens.slice(verbIndex + 1));
        const negative = analysis.prefixes?.includes("ni") || /^ni/u.test(tokens[verbIndex].toLocaleLowerCase());
        const base = analysis.lemmaMeanings?.[0] || analysis.meanings?.[0] || "do";
        let predicateTokens = [];
        if (/^(?:yesi|yesil|yesish|niyesi|niyesil|niyesish)$/iu.test(tokens[verbIndex])) {
          predicateTokens = analysis.tense === "future" ? ["will", ...(negative ? ["not"] : []), "be"]
            : [analysis.tense === "past" ? "was" : "is", ...(negative ? ["not"] : [])];
        } else if (analysis.tense === "future") {
          predicateTokens = ["will", ...(negative ? ["not"] : []), ...tokenize(base)];
        } else if (analysis.tense === "past") {
          predicateTokens = [negative ? "did" : (analysis.meanings?.[0] || base), ...(negative ? ["not", ...tokenize(base)] : [])];
        } else {
          predicateTokens = negative ? ["does", "not", ...tokenize(base)] : [thirdPersonWord(base)];
        }
        return {
          text: joinTokens([...whPrefix, ...predicateTokens, ...tokenize(complement.text)]),
          translatedParts: complement.translatedParts + whPrefix.length + 1,
          unknownWords: complement.unknownWords,
        };
      }

      const modifier = this.translateYapoSimple(tokens.slice(0, subjectIndex));
      const subject = this.translateYapoSimple(tokens.slice(subjectIndex, verbIndex));
      const complement = this.translateYapoSimple(tokens.slice(verbIndex + 1));
      const subjectSource = tokens[subjectIndex].toLocaleLowerCase();
      const subjectAnalysis = this.analyzeYapoWord(tokens[subjectIndex]);
      const pluralSubject = ["tu", "sum", "tum", "yum", "ey", "yel", "mey"].includes(subjectSource)
        || subjectAnalysis?.tense === "plural";
      const thirdPerson = subjectSource === "yu"
        || (subjectAnalysis?.category === "n" && !subjectSource.endsWith("m"));
      const negative = analysis.prefixes?.includes("ni") || /^ni/u.test(tokens[verbIndex].toLocaleLowerCase());
      const lemma = analysis.lemmaMeanings?.[0] || analysis.meanings?.[0] || "do";
      const complementTokens = tokenize(complement.text);
      let auxiliary = "";
      let lexical = tokenize(lemma);

      if (/^(?:yesi|yesil|yesish|niyesi|niyesil|niyesish)$/iu.test(tokens[verbIndex])) {
        if (analysis.tense === "future") auxiliary = negative ? "will not be" : "will be";
        else if (analysis.tense === "past") auxiliary = pluralSubject ? "were" : "was";
        else if (subjectSource === "su") auxiliary = "am";
        else auxiliary = pluralSubject ? "are" : "is";
        lexical = [];
        if (negative && analysis.tense !== "future") complementTokens.unshift("not");
      } else if (/^(?:ni)?poti$/iu.test(tokens[verbIndex])) {
        auxiliary = negative ? "can not" : "can";
        lexical = [];
      } else if (analysis.tense === "future") {
        auxiliary = negative ? "will not" : "will";
      } else if (analysis.tense === "past") {
        auxiliary = negative ? "did not" : "did";
      } else {
        auxiliary = negative ? (thirdPerson ? "does not" : "do not") : (thirdPerson ? "does" : "do");
      }

      const auxiliaryTokens = tokenize(auxiliary);
      const delayedNot = auxiliaryTokens.at(-1)?.toLocaleLowerCase() === "not" ? auxiliaryTokens.pop() : null;
      return {
        text: joinTokens([
          ...whPrefix,
          ...auxiliaryTokens,
          ...tokenize(subject.text),
          ...(delayedNot ? [delayedNot] : []),
          ...tokenize(modifier.text),
          ...lexical,
          ...complementTokens,
        ]),
        translatedParts: modifier.translatedParts + subject.translatedParts + complement.translatedParts + 1 + whPrefix.length,
        unknownWords: modifier.unknownWords + subject.unknownWords + complement.unknownWords,
      };
    }

    translateYapoQuestion(tokensOrText) {
      const tokens = typeof tokensOrText === "string" ? tokenize(tokensOrText) : [...tokensOrText];
      if (tokens.at(-1) === "?") tokens.pop();
      const lower = tokens.map((token) => token.toLocaleLowerCase());
      let result = null;

      if (lower[0] === "ki") {
        result = this.translateYapoQuestionBody(tokens.slice(1));
      } else if (lower[0] === "loko" && lower[1] === "kiya" && lower[2] === "la") {
        result = this.translateYapoQuestionBody(tokens.slice(3), ["where"]);
      } else if (lower[0] === "tempo" && lower[1] === "kiya" && lower[2] === "la") {
        result = this.translateYapoQuestionBody(tokens.slice(3), ["when"]);
      } else if (lower[0] === "pen" && lower[1] === "kiyo" && lower[2] === "la") {
        result = this.translateYapoQuestionBody(tokens.slice(3), ["why"]);
      } else {
        const expandedIndex = lower.findIndex((token, index) => token === "kiya" && lower[index + 1] === "la");
        if (expandedIndex > 0) {
          const phrase = this.translateYapoSimple(tokens.slice(0, expandedIndex));
          result = this.translateYapoQuestionBody(tokens.slice(expandedIndex + 2), ["what", ...tokenize(phrase.text)]);
          result.translatedParts += phrase.translatedParts;
          result.unknownWords += phrase.unknownWords;
        } else {
          const howIndex = lower.indexOf("kiye");
          const objectIndex = lower.indexOf("kiyo");
          if (howIndex >= 0) {
            const body = [...tokens];
            body.splice(howIndex, 1);
            result = this.translateYapoQuestionBody(body, ["how"]);
          } else if (objectIndex >= 0) {
            const body = [...tokens];
            body.splice(objectIndex > 0 && lower[objectIndex - 1] === "e" ? objectIndex - 1 : objectIndex, objectIndex > 0 && lower[objectIndex - 1] === "e" ? 2 : 1);
            const hasSubject = body.slice(0, body.findIndex((token) => this.analyzeYapoWord(token)?.category === "v"))
              .some((token) => ["n", "pn"].includes(this.analyzeYapoWord(token)?.category));
            result = this.translateYapoQuestionBody(body, ["what"], !hasSubject);
          }
        }
      }
      if (!result) return null;
      result.text = joinTokens([...tokenize(result.text), "?"]);
      return result;
    }

    translateYapoSentence(text) {
      const tokens = tokenize(text);
      const lowerTokens = tokens.map((token) => token.toLocaleLowerCase());
      let adverbialOperator = null;
      let adverbialBodyStart = -1;
      let questionShapedBody = false;
      if (lowerTokens[0] === "cere" && lowerTokens[1] === "la") {
        adverbialOperator = "no matter";
        adverbialBodyStart = 2;
        questionShapedBody = true;
      } else if (lowerTokens[0] === "loko" && lowerTokens[1] === "ki" && lowerTokens[2] === "la") {
        adverbialOperator = "wherever";
        adverbialBodyStart = 3;
      } else if (lowerTokens[0] === "tempo" && lowerTokens[1] === "ki" && lowerTokens[2] === "la") {
        adverbialOperator = "whenever";
        adverbialBodyStart = 3;
      }
      if (adverbialOperator) {
        const commaIndex = tokens.findIndex((token, index) => index >= adverbialBodyStart && token === ",");
        const terminal = [".", "!", "?"].includes(tokens.at(-1)) ? tokens.at(-1) : null;
        const bodyEnd = commaIndex >= 0 ? commaIndex : (terminal ? tokens.length - 1 : tokens.length);
        const bodyTokens = tokens.slice(adverbialBodyStart, bodyEnd);
        const body = questionShapedBody
          ? (this.translateYapoQuestion([...bodyTokens, "?"]) || this.translateYapoSimple(bodyTokens))
          : this.translateYapoSimple(bodyTokens);
        const bodyText = body.text.replace(/\?$/u, "");
        const main = commaIndex >= 0 ? this.translateYapoSimple(tokens.slice(commaIndex + 1)) : null;
        return {
          text: applyInitialCase(text, joinTokens([
            adverbialOperator, ...tokenize(bodyText),
            ...(main ? [",", ...tokenize(main.text)] : []),
            ...(!main && terminal ? [terminal] : []),
          ])),
          translatedParts: body.translatedParts + (main?.translatedParts || 0) + 1,
          unknownWords: body.unknownWords + (main?.unknownWords || 0),
        };
      }
      if (tokens.includes("?")) {
        const question = this.translateYapoQuestion(tokens);
        if (question) {
          question.text = applyInitialCase(text, question.text);
          return question;
        }
      }
      const liIndex = tokens.findIndex((token) => token.toLocaleLowerCase() === "li");
      if (liIndex >= 0) {
        const laIndex = tokens.findIndex((token, index) => index > liIndex && token.toLocaleLowerCase() === "la");
        let firstStructure = null;
        const structureEnd = laIndex > liIndex ? laIndex : tokens.length;
        for (let index = liIndex + 1; index < structureEnd; index += 1) {
          if (!WORD_RE.test(tokens[index])) continue;
          const lower = tokens[index].toLocaleLowerCase();
          if (["nimaymulte", "maymulte", "kish", "akol", "in", "yene"].includes(lower)) continue;
          const analysis = this.analyzeYapoWord(tokens[index]);
          if (analysis && ["v", "n", "pn"].includes(analysis.category)) {
            firstStructure = analysis.category;
            break;
          }
          if (!analysis && !["e", "to", "a", "pi"].includes(lower)) {
            firstStructure = "n";
            break;
          }
        }
        if (laIndex > liIndex && firstStructure !== "v") {
          const prelude = this.translateYapoSimple(tokens.slice(0, liIndex));
          const condition = this.translateYapoSimple(tokens.slice(liIndex + 1, laIndex));
          const consequence = this.translateYapoSimple(tokens.slice(laIndex + 1));
          return {
            text: applyInitialCase(text, joinTokens([...tokenize(prelude.text), "if", ...tokenize(condition.text), "then", ...tokenize(consequence.text)])),
            translatedParts: prelude.translatedParts + condition.translatedParts + consequence.translatedParts + 2,
            unknownWords: prelude.unknownWords + condition.unknownWords + consequence.unknownWords,
          };
        }
      }
      const result = this.translateYapoSimple(tokens);
      result.text = applyInitialCase(text, result.text);
      return result;
    }

    translateYapoSimple(tokensOrText) {
      const tokens = typeof tokensOrText === "string" ? tokenize(tokensOrText) : tokensOrText;
      const units = [];
      let position = 0;
      let translatedParts = 0;
      let unknownWords = 0;
      while (position < tokens.length) {
        const token = tokens[position];
        if (!WORD_RE.test(token)) {
          units.push({ text: token, category: "punct", source: token });
          position += 1;
          continue;
        }
        const lower = token.toLocaleLowerCase();
        if (["e", "to", "li", "la", "a", "pi"].includes(lower)) {
          units.push({ text: lower, category: "marker", source: token });
          position += 1;
          continue;
        }
        if (lower === "kun" && tokens[position + 1]?.toLocaleLowerCase() === "sey") {
          const firstVerbIndex = units.findIndex((unit) => unit.category === "v");
          const subjectSource = units.slice(0, firstVerbIndex < 0 ? units.length : firstVerbIndex)
            .reverse().find((unit) => ["n", "pn"].includes(unit.category))?.source?.toLocaleLowerCase();
          const reflexive = ({
            su: "myself", tu: "yourself", yu: "himself", sum: "ourselves",
            tum: "yourselves", yum: "themselves",
          })[subjectSource] || "oneself";
          units.push({ text: reflexive, category: "adv", source: joinTokens(tokens.slice(position, position + 2)) });
          translatedParts += 1;
          position += 2;
          continue;
        }
        const phrase = this.lookupYapoPhrase(tokens, position);
        if (phrase) {
          units.push({ text: phrase.entry.meanings[0], category: phrase.entry.category, source: joinTokens(tokens.slice(position, position + phrase.length)) });
          translatedParts += 1;
          position += phrase.length;
          continue;
        }
        if (lower === "tish") {
          const previousSemantic = [...units].reverse().find((unit) => !["punct", "marker"].includes(unit.category));
          const immediatePrevious = units[units.length - 1];
          const atClauseStart = !previousSemantic || (immediatePrevious?.category === "punct" && /[.!?;:]/.test(immediatePrevious.text));
          const adjectivePosition = ["n", "adj"].includes(previousSemantic?.category);
          units.push({ text: atClauseStart ? "yes" : (adjectivePosition ? "this" : "that"), category: adjectivePosition ? "adj" : "basic", source: token });
          translatedParts += 1;
          position += 1;
          continue;
        }
        const analysis = this.analyzeYapoWord(token);
        if (analysis) {
          let translated = analysis.meanings[0];
          const previousMarker = units[units.length - 1]?.category === "marker" ? units[units.length - 1]?.text : "";
          if (analysis.category === "pn" && previousMarker === "e") {
            translated = analysis.meanings.find((meaning) => /^(me|you|him|her|it|us|them)$/i.test(meaning)) || translated;
          }
          if (["yesi", "yesil", "yesish"].includes(lower)) {
            const previousLi = units[units.length - 1]?.category === "marker" && units[units.length - 1]?.text === "li";
            const subject = [...units].reverse().find((unit) => ["n", "pn"].includes(unit.category));
            const subjectSource = subject?.source?.toLocaleLowerCase();
            const pluralSubject = ["tu", "sum", "tum", "yum", "ey", "yel", "mey"].includes(subjectSource)
              || subject?.analysis?.tense === "plural";
            if (lower === "yesish") translated = "will be";
            else if (previousLi) translated = "be";
            else if (lower === "yesil") translated = pluralSubject ? "were" : "was";
            else if (subjectSource === "su") translated = "am";
            else translated = pluralSubject ? "are" : "is";
          }
          units.push({ text: translated, category: analysis.category, source: token, analysis });
          translatedParts += 1;
        } else {
          const properName = /^\p{Lu}[\p{L}\p{M}'’\-]*$/u.test(token);
          units.push({ text: token, category: properName ? "n" : "unknown", properName, source: token });
          if (!properName) unknownWords += 1;
        }
        position += 1;
      }

      const possessiveMarker = units.findIndex((unit) => unit.category === "marker" && unit.text === "a");
      if (possessiveMarker > 0 && possessiveMarker < units.length - 1) {
        const left = units[possessiveMarker - 1];
        const right = units[possessiveMarker + 1];
        if (left.category === "n" && ["n", "pn", "unknown"].includes(right.category)) {
          units.splice(possessiveMarker - 1, 3, { text: possessiveEnglish(right.text), category: "poss" }, left);
        }
      }

      // nimaymulte is post-verbal in Yapo Teya but idiomatically precedes the
      // English lexical verb ("no more fall"). Keep the move inside the same
      // clause and leave ordinary adverbs untouched.
      for (let index = 0; index < units.length; index += 1) {
        if (String(units[index].source || "").toLocaleLowerCase() !== "nimaymulte") continue;
        let verbIndex = -1;
        for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
          if (units[cursor].category === "punct" && /[,;:.!?]/u.test(units[cursor].text)) break;
          if (units[cursor].category === "v") {
            verbIndex = cursor;
            break;
          }
        }
        if (verbIndex < 0) continue;
        const modifier = units.splice(index, 1)[0];
        units.splice(verbIndex, 0, modifier);
      }

      let reordered = [];
      for (let index = 0; index < units.length; index += 1) {
        const unit = units[index];
        if (unit.category === "n") {
          const nouns = [unit];
          let cursor = index + 1;
          while (cursor < units.length && units[cursor].category === "n") {
            nouns.push(units[cursor]);
            cursor += 1;
          }
          const modifiers = [];
          while (cursor < units.length && MODIFIER_CATEGORIES.has(units[cursor].category)) {
            modifiers.push(units[cursor]);
            cursor += 1;
          }
          if (nouns.length === 1) {
            reordered.push(...modifiers.reverse(), nouns[0]);
          } else {
            reordered.push(nouns[0]);
            for (let nounIndex = 1; nounIndex < nouns.length; nounIndex += 1) {
              reordered.push({ text: "of", category: "literal" });
              if (nounIndex === nouns.length - 1) reordered.push(...modifiers.reverse());
              reordered.push(nouns[nounIndex]);
            }
          }
          index = cursor - 1;
          continue;
        }
        if (unit.category === "marker" && unit.text === "pi") {
          reordered.push({ text: "of", category: "literal" });
          continue;
        }
        reordered.push(unit);
      }

      const output = [];
      for (let index = 0; index < reordered.length; index += 1) {
        const unit = reordered[index];
        if (unit.category !== "marker") {
          let surfaceText = unit.text;
          if (unit.category === "v" && unit.analysis?.tense === "present"
            && !/^(?:am|is|are|be)$/iu.test(surfaceText)) {
            let subject = null;
            for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
              const candidate = reordered[cursor];
              if ((candidate.category === "punct" && /[,;:.!?]/u.test(candidate.text))
                || (candidate.category === "marker" && candidate.text === "tish")) break;
              if (["n", "pn"].includes(candidate.category)) {
                subject = candidate;
                break;
              }
            }
            const sourceSubject = String(subject?.source || "").toLocaleLowerCase();
            const thirdPersonSubject = sourceSubject === "yu"
              || (subject?.category === "n" && !sourceSubject.endsWith("m"));
            if (thirdPersonSubject) surfaceText = inflectFirstWord(surfaceText, thirdPersonWord);
          }
          output.push(surfaceText);
          if (unit.category === "prep") {
            const next = reordered.slice(index + 1).find((candidate) => candidate.category !== "punct");
            if (next?.category === "n") output.push("the");
          }
          continue;
        }
        if (unit.text === "e" || unit.text === "la") continue;
        if (unit.text === "a") output.push("of");
        if (unit.text === "li") {
          const next = reordered.slice(index + 1).find((candidate) => ["v", "n", "pn", "unknown"].includes(candidate.category));
          output.push(next?.category === "v" ? "would" : "if");
        }
        if (unit.text === "to") continue;
      }
      return { text: joinTokens(output), translatedParts, unknownWords };
    }

    normalizeEnglishTokens(tokensOrText, forceProgressive = false) {
      const raw = typeof tokensOrText === "string" ? tokenize(tokensOrText) : tokensOrText;
      const tokens = expandContractions(raw);
      const output = [];
      for (let index = 0; index < tokens.length; index += 1) {
        const lower = tokens[index].toLocaleLowerCase();
        const next = tokens[index + 1]?.toLocaleLowerCase();
        const afterNext = tokens[index + 2]?.toLocaleLowerCase();
        const afterThird = tokens[index + 3]?.toLocaleLowerCase();

        // Colloquial "(be) gonna" is only a future auxiliary. The lexical
        // predicate that follows it carries Yapo's -ish future suffix.
        if (["am", "is", "are", "was", "were"].includes(lower) && next === "gonna") {
          output.push("will");
          index += 1;
          continue;
        }
        if (lower === "gonna") {
          output.push("will");
          continue;
        }

        if (["has", "have", "had"].includes(lower) && next === "been") {
          output.push("was");
          index += 1;
          continue;
        }

        if (lower === "will" && ["have", "be"].includes(next)) {
          let verbIndex = index + 2;
          if (tokens[verbIndex]?.toLocaleLowerCase() === "been") verbIndex += 1;
          const lemma = this.englishVerbLemmas.get(tokens[verbIndex]?.toLocaleLowerCase());
          if (lemma) {
            if (next === "be") {
              const agentIndex = tokens.findIndex((candidate, candidateIndex) => candidateIndex > verbIndex
                && candidate.toLocaleLowerCase() === "by");
              if (agentIndex > verbIndex) tokens[agentIndex] = "by-passive";
            }
            output.push(tokens[index], lemma.base);
            index = verbIndex;
            continue;
          }
        }

        if (["has", "have", "had"].includes(lower)) {
          let verbIndex = index + 1;
          if (tokens[verbIndex]?.toLocaleLowerCase() === "been") verbIndex += 1;
          const lemma = this.englishVerbLemmas.get(tokens[verbIndex]?.toLocaleLowerCase());
          if (lemma) {
            // Yapo Teya has no separate perfect aspect. Every completed
            // present/past perfect is represented by the simple past.
            output.push(lemma.past);
            index = verbIndex;
            continue;
          }
        }

        if (["am", "is", "are", "was", "were"].includes(lower)) {
          let verbIndex = index + 1;
          while (verbIndex < tokens.length) {
            const candidate = tokens[verbIndex];
            const candidateLookup = this.lookupEnglish(tokens, verbIndex);
            const isModifier = ["always", "never", "just", "only", "probably", "perhaps", "still"].includes(candidate.toLocaleLowerCase())
              || candidateLookup?.options.some((option) => option.category === "adv");
            if (!isModifier || /ing$/iu.test(candidate)) break;
            verbIndex += Math.max(1, candidateLookup?.length || 1);
          }
          const progressive = tokens[verbIndex];
          const lemma = this.englishVerbLemmas.get(progressive?.toLocaleLowerCase());
          const progressiveLookup = this.lookupEnglish(tokens, verbIndex);
          const interveningModifier = verbIndex > index + 1;
          const following = tokens[verbIndex + 1]?.toLocaleLowerCase();
          const verbalContinuation = following === "to"
            || REFLEXIVE_PRONOUNS.has(following)
            || Boolean(this.lookupEnglish(tokens, verbIndex + 1)?.options.some((option) => ["n", "pn"].includes(option.category)));
          const explicitAdjective = progressiveLookup?.options.some((option) => option.category === "adj");
          if (lemma && /ing$/iu.test(progressive)
            && (!explicitAdjective || interveningModifier || verbalContinuation || forceProgressive)) {
            output.push(...tokens.slice(index + 1, verbIndex));
            output.push(["was", "were"].includes(lower) ? lemma.past : lemma.base);
            index = verbIndex;
            continue;
          }
        }

        output.push(tokens[index]);
      }
      return output;
    }

    normalizeEnglishPeriphrases(tokensOrText) {
      const tokens = [...(typeof tokensOrText === "string" ? tokenize(tokensOrText) : tokensOrText)];
      const output = [];
      for (let index = 0; index < tokens.length; index += 1) {
        const lower = tokens[index].toLocaleLowerCase();
        const next = tokens[index + 1]?.toLocaleLowerCase();
        const third = tokens[index + 2]?.toLocaleLowerCase();
        const fourth = tokens[index + 3]?.toLocaleLowerCase();
        if (lower === "will" && next === "be" && third === "able" && fourth === "to") {
          output.push("will", "can");
          index += 3;
          continue;
        }
        if (lower === "will" && next === "not" && third === "be"
          && tokens[index + 3]?.toLocaleLowerCase() === "able"
          && tokens[index + 4]?.toLocaleLowerCase() === "to") {
          output.push("will", "not", "can");
          index += 4;
          continue;
        }
        if (["should", "must", "might", "may", "would", "could"].includes(lower)
          && next === "be" && third === "able" && fourth === "to") {
          output.push(tokens[index], "can");
          index += 3;
          continue;
        }
        if (["am", "is", "are", "was", "were"].includes(lower) && next === "able" && third === "to") {
          output.push(["was", "were"].includes(lower) ? "could" : "can");
          index += 2;
          continue;
        }
        if (["am", "is", "are", "was", "were"].includes(lower)) {
          const participle = tokens[index + 1]?.toLocaleLowerCase();
          const lemma = this.englishVerbLemmas.get(participle);
          const isParticiple = lemma
            && (IRREGULAR_PARTICIPLES[lemma.base] === participle || /ed$/u.test(participle));
          const passiveAgentIndex = isParticiple ? tokens.findIndex((candidate, candidateIndex) => candidateIndex > index + 1
            && (candidate.toLocaleLowerCase() === "by" || /[,;:.!?]/u.test(candidate))) : -1;
          const passiveAgent = passiveAgentIndex > index + 1
            && tokens[passiveAgentIndex].toLocaleLowerCase() === "by";
          if (passiveAgent) {
            tokens[passiveAgentIndex] = "by-passive";
            output.push(["was", "were"].includes(lower) ? participle : lemma.base);
            index += 1;
            continue;
          }
        }
        if (lower === "used" && next === "to" && this.tokenHasEnglishCategory(tokens, index + 2, "v")) {
          const lemma = this.englishVerbLemmas.get(third)?.base || third;
          output.push(pastWord(lemma), "habitually");
          index += 2;
          continue;
        }
        if (["am", "is", "are", "was", "were"].includes(lower)
          && next === "going" && third === "to" && this.tokenHasEnglishCategory(tokens, index + 3, "v")) {
          output.push(["was", "were"].includes(lower) ? "wanted" : "want");
          index += 2;
          continue;
        }
        output.push(tokens[index]);
      }
      return output;
    }

    extractEnglishClauseModifiers(tokensOrText) {
      const tokens = expandContractions(typeof tokensOrText === "string" ? tokenize(tokensOrText) : tokensOrText);
      const kept = [];
      const prefixes = [];
      let additive = false;
      let probable = false;
      const temporalPhrases = [];
      const firstBoundary = tokens.findIndex((token) => token === "," || token === ";");
      for (let index = 0; index < tokens.length; index += 1) {
        const lower = tokens[index].toLocaleLowerCase();
        const next = tokens[index + 1]?.toLocaleLowerCase();
        const inOpeningClause = firstBoundary < 0 || index < firstBoundary;
        if (inOpeningClause && lower === "as" && next === "well") {
          additive = true;
          index += 1;
          continue;
        }
        if (inOpeningClause && lower === "also") {
          additive = true;
          continue;
        }
        if (inOpeningClause && lower === "too" && (!next || !WORD_RE.test(tokens[index + 1]))) {
          additive = true;
          continue;
        }
        if (inOpeningClause && ["never", "always", "sometimes", "often", "usually", "rarely"].includes(lower)) {
          const companions = [];
          while (kept.length) {
            const previous = kept[kept.length - 1];
            const previousLower = previous.toLocaleLowerCase();
            const previousLookup = WORD_RE.test(previous) ? this.lookupEnglish([previous], 0) : null;
            const canTravelWithModifier = ["not", "as", "almost", "nearly", "quite", "very", "so", "too"].includes(previousLower)
              || Boolean(previousLookup?.options.some((option) => ["adv", "adj"].includes(option.category)));
            if (!canTravelWithModifier) break;
            companions.unshift(kept.pop());
          }
          if (companions.length === 1 && companions[0].toLocaleLowerCase() === "not"
            && (lower === "never" || lower === "always")) {
            temporalPhrases.push(["tempo", lower === "always" ? "niale" : "ninish"]);
          } else {
            const translated = companions.length
              ? this.translateEnglishSimple([...companions, tokens[index]], false)
              : (lower === "never" || lower === "always")
                ? { text: joinTokens(["tempo", lower === "never" ? "nish" : "ale"]), translatedParts: 1, unknownWords: 0 }
                : this.translateEnglishSimple([tokens[index]], false);
            temporalPhrases.push(tokenize(translated.text));
          }
          continue;
        }
        if (inOpeningClause && (lower === "maybe" || lower === "probably" || lower === "perhaps")) {
          probable = true;
          continue;
        }
        if (inOpeningClause && lower === "may" && index + 1 < tokens.length
          && this.tokenHasEnglishCategory(tokens, index + 1, "v")
          && tokens[index - 1]?.toLocaleLowerCase() !== "you") {
          probable = true;
          continue;
        }
        if (inOpeningClause && lower === "might") {
          probable = true;
          kept.push("will");
          continue;
        }
        kept.push(tokens[index]);
      }
      while (kept[0] === ",") kept.shift();
      if (additive) prefixes.push("take", "la");
      for (const phrase of temporalPhrases) prefixes.push(...phrase, ...(phrase.at(-1)?.toLocaleLowerCase() === "la" ? [] : ["la"]));
      if (probable) prefixes.push("kish");
      return { tokens: kept, prefixes };
    }

    isDefiniteEnglishVerb(tokens, position) {
      const lower = tokens[position]?.toLocaleLowerCase();
      // A bare -ing form is not a finite predicate.  Treating it as one made
      // gerund subjects such as "Meeting you was..." open a false embedded
      // clause before their object.  Progressive forms are normalized before
      // this predicate test, so their lexical verb no longer needs this path.
      if (/ing$/iu.test(lower || "")) return false;
      if (["am", "is", "are", "was", "were", "be", "been", "being", "will", "would", "can", "could", "do", "does", "did", "have", "has", "had"].includes(lower)) return true;
      const lookup = this.lookupEnglish(tokens, position);
      if (!lookup) return this.inferUnknownEnglishCategory(tokens, position) === "v";
      if (!lookup.options.some((option) => option.category === "v")) return false;
      const lemma = this.englishVerbLemmas.get(lower);
      if (lemma && lower !== lemma.base) return true;
      return !lookup.options.some((option) => ["n", "adj", "adv", "prep", "pn"].includes(option.category));
    }

    hasEnglishPredicate(tokens, start = 0) {
      for (let index = start; index < tokens.length; index += 1) {
        if ([",", ";", ".", "!", "?"].includes(tokens[index])) break;
        if (this.isDefiniteEnglishVerb(tokens, index)) return true;
      }
      return false;
    }

    hasEnglishPredicateAfterSubject(tokens, start) {
      let articleSeen = false;
      let prepositionalSupplement = false;
      for (let index = start; index < tokens.length; index += 1) {
        const token = tokens[index];
        const lower = token.toLocaleLowerCase();
        if ([",", ";", ".", "!", "?"].includes(token)) break;
        if (lower === "to" && this.tokenHasEnglishCategory(tokens, index + 1, "v")) continue;
        if (ARTICLES.has(lower)) {
          articleSeen = true;
          continue;
        }
        const lookup = this.lookupEnglish(tokens, index);
        if (lookup?.options.some((option) => option.category === "prep")) {
          prepositionalSupplement = true;
          index += Math.max(0, lookup.length - 1);
          continue;
        }
        if (prepositionalSupplement && lookup?.options.some((option) => ["n", "pn", "adj", "poss"].includes(option.category))) {
          index += Math.max(0, lookup.length - 1);
          continue;
        }
        if (["not", "always", "never", "just", "only", "probably", "perhaps", "still"].includes(lower)
          || lookup?.options.every((option) => ["adv", "adj"].includes(option.category))) continue;
        if (this.isDefiniteEnglishVerb(tokens, index)) return true;
        if (!articleSeen && lookup?.options.some((option) => option.category === "v")) {
          const laterDefiniteVerb = tokens.slice(index + 1).some((_candidate, offset) =>
            this.isDefiniteEnglishVerb(tokens, index + 1 + offset));
          return !laterDefiniteVerb;
        }
        return false;
      }
      return false;
    }

    hasEnglishClausePredicate(tokens) {
      if (this.hasEnglishPredicate(tokens)) return true;
      const subjectIndex = tokens.findIndex((token) => SUBJECT_PRONOUNS.has(token.toLocaleLowerCase()));
      return subjectIndex >= 0 && this.hasEnglishPredicateAfterSubject(tokens, subjectIndex + 1);
    }

    leadingModifierBoundary(tokens) {
      if (["this", "that", "these", "those"].includes(tokens[0]?.toLocaleLowerCase())
        && this.englishDemonstrativeModifiesNoun(tokens, 0)) return -1;
      for (let index = 1; index < tokens.length; index += 1) {
        const subjectLookup = this.lookupEnglish(tokens, index);
        const pronounSubject = SUBJECT_PRONOUNS.has(tokens[index].toLocaleLowerCase());
        const subjectCandidate = pronounSubject
          || (Boolean(subjectLookup?.options.some((option) => ["n", "pn"].includes(option.category)))
            && !this.isDefiniteEnglishVerb(tokens, index))
          || /^\p{Lu}[\p{L}\p{M}'’\-]*$/u.test(tokens[index]);
        if (!subjectCandidate) continue;
        const prefix = tokens.slice(0, index).filter((token) => token !== ",");
        if (!prefix.some((token) => WORD_RE.test(token))) continue;
        if (prefix.some((token) => SUBJECT_PRONOUNS.has(token.toLocaleLowerCase()))) continue;
        const previousLookup = this.lookupEnglish(tokens, index - 1);
        if (ARTICLES.has(tokens[index - 1]?.toLocaleLowerCase())
          || previousLookup?.options.some((option) => ["adj", "poss", "prep"].includes(option.category))) continue;
        const prefixHead = prefix.find((token) => WORD_RE.test(token));
        const prefixHeadLookup = prefixHead ? this.lookupEnglish([prefixHead], 0) : null;
        if (/ing$/iu.test(prefixHead || "")
          && prefixHeadLookup?.options.some((option) => option.category === "n")) continue;
        if (prefix.every((token) => ["maybe", "probably", "perhaps", "only", "just"].includes(token.toLocaleLowerCase()))) continue;
        if (prefix.some((token) => [
          "if", "that", "which", "whose", "who", "whom", "where", "when", "how",
          "wherever", "whenever", "however", "and", "or", "but", "so", "then",
          "even", "though", "tho", "although", "because", "cause",
        ].includes(token.toLocaleLowerCase()))) continue;
        if (this.hasEnglishClausePredicate(prefix) || !this.hasEnglishPredicateAfterSubject(tokens, index + 1)) continue;
        return index;
      }
      return -1;
    }

    translateEnglishClause(tokensOrText, allowImperative = true, forceInitialVerb = false) {
      const expanded = expandContractions(typeof tokensOrText === "string" ? tokenize(tokensOrText) : tokensOrText);
      let leadingModifier = null;
      // A complete multiword dictionary noun is one syntactic unit. Do not
      // split an unknown-looking first component off as a clause modifier.
      const completeLookup = this.lookupEnglish(expanded, 0);
      const subjectIndex = completeLookup?.length === expanded.length
        ? -1
        : this.leadingModifierBoundary(expanded);
      if (subjectIndex > 0) {
        const modifierTokens = expanded.slice(0, subjectIndex).filter((token) => token !== ",");
        leadingModifier = this.translateEnglishSimple(modifierTokens, false);
        tokensOrText = expanded.slice(subjectIndex);
      }
      const modifiers = this.extractEnglishClauseModifiers(tokensOrText);
      const tokens = this.normalizeEnglishTokens(modifiers.tokens, modifiers.prefixes.includes("tempo"));
      const result = this.translateEnglishSimple(tokens, allowImperative, forceInitialVerb);
      if (leadingModifier?.text) {
        const modifierOutput = tokenize(leadingModifier.text);
        result.text = joinTokens([
          ...modifierOutput,
          ...(modifierOutput.at(-1)?.toLocaleLowerCase() === "la" ? [] : ["la"]),
          ...tokenize(result.text.replace(/^Su\b/u, "su")),
        ]);
        result.translatedParts += leadingModifier.translatedParts + 1;
        result.unknownWords += leadingModifier.unknownWords;
      }
      if (modifiers.prefixes.length) {
        const clauseText = result.text.replace(/^Su\b/u, "su");
        result.text = joinTokens([...modifiers.prefixes, ...tokenize(clauseText)]);
        result.translatedParts += modifiers.prefixes.includes("la") ? 2 : 1;
      }
      return result;
    }

    translateEnglish(text) {
      return this.translatePreservingFormat(text, (sentence) => this.translateEnglishSentence(sentence));
    }

    // Unknown words must stay unknown (and therefore red/clickable in the UI),
    // but assigning a temporary syntactic role prevents one missing dictionary
    // entry from destroying the word order of the whole clause. This method
    // never writes to a dictionary and never invents a Yapo spelling.
    inferUnknownEnglishCategory(tokensOrText, position, units = []) {
      const tokens = typeof tokensOrText === "string"
        ? expandContractions(tokenize(tokensOrText))
        : tokensOrText;
      const token = tokens[position] || "";
      if (!WORD_RE.test(token)) return "punct";

      const lower = token.toLocaleLowerCase();
      const known = this.lookupEnglish(tokens, position);
      if (known) return known.options[0]?.category || "basic";
      if (ARTICLES.has(lower)) return "basic";

      let clauseStart = 0;
      for (let index = position - 1; index >= 0; index -= 1) {
        if (ENGLISH_CLAUSE_BOUNDARIES.has(tokens[index])) {
          clauseStart = index + 1;
          break;
        }
      }
      let clauseUnitStart = 0;
      for (let index = units.length - 1; index >= 0; index -= 1) {
        if (units[index].category === "punct" && ENGLISH_CLAUSE_BOUNDARIES.has(units[index].text)) {
          clauseUnitStart = index + 1;
          break;
        }
      }
      const clauseUnits = units.slice(clauseUnitStart);
      const previousSemantic = [...clauseUnits].reverse()
        .find((unit) => !["punct", "marker"].includes(unit.category));
      let previousWordIndex = -1;
      for (let index = position - 1; index >= clauseStart; index -= 1) {
        if (WORD_RE.test(tokens[index])) {
          previousWordIndex = index;
          break;
        }
      }
      const previousLower = previousWordIndex >= 0 ? tokens[previousWordIndex].toLocaleLowerCase() : "";
      const previousLookup = previousWordIndex >= 0 ? this.lookupEnglish(tokens, previousWordIndex) : null;

      const isUnknownWord = (index) => index >= clauseStart && index < tokens.length
        && WORD_RE.test(tokens[index])
        && !ARTICLES.has(tokens[index].toLocaleLowerCase())
        && !this.lookupEnglish(tokens, index);
      let runEnd = position + 1;
      while (isUnknownWord(runEnd)) runEnd += 1;
      const nextLookup = this.lookupEnglish(tokens, runEnd);
      const nextIsNoun = Boolean(nextLookup?.options.some((option) => ["n", "pn"].includes(option.category)))
        && !nextLookup?.options.some((option) => option.category === "v");
      const runLength = runEnd - position;

      const adverbShape = /(?:ly|ward|wards|wise)$/iu.test(lower);
      const adjectiveShape = /(?:ous|ful|less|ive|al|ic|ish|able|ible|ary|ory|ent|ant)$/iu.test(lower);
      const nounShape = /(?:tion|sion|ment|ness|ity|ship|hood|ism|ist|ance|ence|age|ery|dom|er|or)$/iu.test(lower);
      const verbShape = /(?:ed|en|ing|ify|ise|ize)$/iu.test(lower);
      const thirdPersonShape = /(?:s|es)$/iu.test(lower) && !/(?:ss|us)$/iu.test(lower);
      const followingLower = tokens[position + 1]?.toLocaleLowerCase() || "";
      const followingLookup = this.lookupEnglish(tokens, position + 1);
      const followingObjectCue = ENGLISH_DETERMINERS.has(followingLower)
        || POSSESSIVE_DETERMINERS.has(followingLower)
        || Boolean(followingLookup?.options.some((option) => ["n", "pn", "poss"].includes(option.category)));

      // Infinitives and modal/auxiliary chains outrank the nominal meaning of
      // English "to". This is especially important for unknown phrasal verbs.
      if (previousLower === "to"
        || ["will", "would", "can", "could", "may", "might", "must", "shall", "should", "do", "does", "did"].includes(previousLower)) return "v";
      if (["have", "has", "had"].includes(previousLower) && verbShape) return "v";
      if (thirdPersonShape && followingObjectCue
        && (position === clauseStart || ["and", "or", "but"].includes(previousLower))) return "v";
      if (adverbShape) return "adv";
      const previousIsSubject = SUBJECT_PRONOUNS.has(previousLower)
        || previousLookup?.options.some((option) => ["n", "pn"].includes(option.category))
        || (!ENGLISH_DETERMINERS.has(previousLower)
          && /^\p{Lu}[\p{L}\p{M}'’\-]*$/u.test(tokens[previousWordIndex] || ""));
      const unitHasSubject = clauseUnits.some((unit) => ["n", "pn"].includes(unit.category));
      const unitHasVerb = clauseUnits.some((unit) => unit.category === "v");
      if ((previousIsSubject || unitHasSubject) && !unitHasVerb) return "v";

      // A whole unknown nominal expression is treated as [ADJ ... ADJ NOUN].
      // If a known noun follows, every unknown member modifies that noun.
      let beforeRunIndex = position - 1;
      while (beforeRunIndex >= clauseStart && isUnknownWord(beforeRunIndex)) beforeRunIndex -= 1;
      while (beforeRunIndex >= clauseStart && !WORD_RE.test(tokens[beforeRunIndex])) beforeRunIndex -= 1;
      const beforeRun = beforeRunIndex >= clauseStart ? tokens[beforeRunIndex].toLocaleLowerCase() : "";
      const nominalCue = ENGLISH_DETERMINERS.has(beforeRun)
        || previousLookup?.options.some((option) => ["prep", "poss"].includes(option.category));
      if (nominalCue || nextIsNoun) {
        if (nextIsNoun || runLength > 1) return position === runEnd - 1 && !nextIsNoun ? "n" : "adj";
        return "n";
      }

      if (previousSemantic?.category === "v"
        && /^(?:yesi|yesil|yesish|niyesi|niyesil|niyesish)$/iu.test(previousSemantic.text)) {
        return adjectiveShape || !nounShape ? "adj" : "n";
      }

      const rawPrefix = tokens.slice(clauseStart, position);
      const rawHasSubject = rawPrefix.some((candidate, offset) => {
        if (!WORD_RE.test(candidate)) return false;
        const candidateLower = candidate.toLocaleLowerCase();
        if (SUBJECT_PRONOUNS.has(candidateLower) || candidateLower === "there") return true;
        const candidateLookup = this.lookupEnglish(tokens, clauseStart + offset);
        return Boolean(candidateLookup?.options.some((option) => ["n", "pn"].includes(option.category)))
          || /^\p{Lu}[\p{L}\p{M}'’\-]*$/u.test(candidate);
      });
      const rawHasVerb = rawPrefix.some((candidate, offset) => {
        const candidateLower = candidate.toLocaleLowerCase();
        if (ENGLISH_AUXILIARIES.has(candidateLower)) return true;
        return Boolean(this.lookupEnglish(tokens, clauseStart + offset)?.options.some((option) => option.category === "v"));
      });
      const hasVerb = clauseUnits.some((unit) => unit.category === "v") || rawHasVerb;
      const hasSubject = clauseUnits.some((unit) => ["n", "pn"].includes(unit.category)) || rawHasSubject;
      if (hasSubject && !hasVerb) return "v";
      if (hasVerb) {
        if (adjectiveShape && (nextIsNoun || runLength > 1)) return "adj";
        if (verbShape && previousSemantic?.category === "v") return "v";
        if (runLength > 1) return position === runEnd - 1 ? "n" : "adj";
        return nounShape || !adjectiveShape ? "n" : "adj";
      }

      if (verbShape && (previousLower === "not" || previousLower === "never")) return "v";
      if (adjectiveShape) return "adj";
      if (nounShape) return "n";
      // At clause start an unknown capitalized form is provisionally nominal;
      // this also preserves the existing proper-name behaviour.
      if (/^\p{Lu}[\p{L}\p{M}'’\-]*$/u.test(token)) return "n";
      return "basic";
    }

    tokenHasEnglishCategory(tokens, position, category) {
      const lower = tokens[position]?.toLocaleLowerCase();
      if (category === "v" && ENGLISH_AUXILIARIES.has(lower)) return true;
      const lookup = this.lookupEnglish(tokens, position);
      if (lookup) return Boolean(lookup.options.some((option) => option.category === category));
      return this.inferUnknownEnglishCategory(tokens, position) === category;
    }

    englishDemonstrativeModifiesNoun(tokens, position) {
      for (let cursor = position + 1; cursor < tokens.length; cursor += 1) {
        const token = tokens[cursor];
        if (!WORD_RE.test(token) || ENGLISH_CLAUSE_BOUNDARIES.has(token)) return false;
        const lookup = this.lookupEnglish(tokens, cursor);
        const categories = lookup
          ? new Set(lookup.options.map((option) => option.category))
          : new Set([this.inferUnknownEnglishCategory(tokens, cursor)]);
        if (categories.has("n")) return true;
        if ([...categories].some((category) => ["v", "adv", "prep", "marker", "pn"].includes(category))) return false;
        if (![...categories].some((category) => ["adj", "poss", "num", "basic"].includes(category))) return false;
        cursor += Math.max(0, (lookup?.length || 1) - 1);
      }
      return false;
    }

    findEmbeddedEnglishClause(tokens) {
      for (let index = 1; index < tokens.length - 1; index += 1) {
        const lower = tokens[index].toLocaleLowerCase();
        const subjectLookup = this.lookupEnglish(tokens, index);
        const pronounSubject = SUBJECT_PRONOUNS.has(lower) || lower === "there";
        const nominalSubject = Boolean(subjectLookup?.options.some((option) => ["n", "pn"].includes(option.category)))
          || /^\p{Lu}[\p{L}\p{M}'’\-]*$/u.test(tokens[index]);
        if (!pronounSubject && !nominalSubject) continue;
        const previousWord = [...tokens.slice(0, index)].reverse().find((token) => WORD_RE.test(token))?.toLocaleLowerCase();
        if (["to", "for", "with", "by", "of", "from", "in", "on", "at"].includes(previousWord)) continue;
        if (["and", "or", "but", "so"].includes(previousWord)) continue;
        if (RELATIVE_CONNECTORS.has(previousWord) || ["like", "because", "cause", "though", "tho", "although"].includes(previousWord)) continue;
        // A comma already closes the preceding clause.  Never infer a hidden
        // "that" by reaching backwards across it.
        const lastPunctuation = Math.max(
          tokens.slice(0, index).lastIndexOf(","),
          tokens.slice(0, index).lastIndexOf(";"),
          tokens.slice(0, index).lastIndexOf(":"),
        );
        const priorTokens = tokens.slice(lastPunctuation + 1, index);
        if (previousWord === "not" && tokens.slice(0, index)
          .some((token) => ["do", "does", "did"].includes(token.toLocaleLowerCase()))) continue;
        const previousIndex = index - 1;
        const previousLookup = previousIndex >= 0 ? this.lookupEnglish(tokens, previousIndex) : null;
        const lexicalPriorPredicate = this.hasEnglishClausePredicate(priorTokens);
        const firstPriorWord = priorTokens.findIndex((candidate) => WORD_RE.test(candidate));
        const priorStartsWithPreposition = firstPriorWord >= 0
          && this.lookupEnglish(priorTokens, firstPriorWord)?.options.some((option) => option.category === "prep");
        const omittedRelative = pronounSubject
          && previousLookup?.options.some((option) => option.category === "n")
          && (!priorStartsWithPreposition || lexicalPriorPredicate)
          && !/ing$/iu.test(tokens[previousIndex] || "");
        const priorVerb = lexicalPriorPredicate || omittedRelative;
        const tailVerb = this.hasEnglishPredicateAfterSubject(tokens, index + 1);
        if (!priorVerb || !tailVerb) continue;
        let priorLexicalVerb = "";
        for (let cursor = index - 1; cursor > lastPunctuation; cursor -= 1) {
          const candidate = tokens[cursor].toLocaleLowerCase();
          const lookup = this.lookupEnglish(tokens, cursor);
          if (!lookup?.options.some((option) => option.category === "v")) continue;
          const lemma = this.englishVerbLemmas.get(candidate)?.base || candidate;
          if (!["am", "is", "are", "was", "were", "be", "been", "being", "do", "does", "did", "have", "has", "had", "will", "would", "can", "could"].includes(lemma)) {
            priorLexicalVerb = lemma;
            break;
          }
        }
        if (!pronounSubject && !CLAUSE_COMPLEMENT_VERBS.has(priorLexicalVerb)) continue;
        const lastHow = tokens.slice(0, index).map((token) => token.toLocaleLowerCase()).lastIndexOf("how");
        const lastBoundary = Math.max(
          tokens.slice(0, index).lastIndexOf(","),
          tokens.slice(0, index).lastIndexOf(";"),
        );
        if (lastHow > lastBoundary) continue;
        return index;
      }
      return -1;
    }

    translateEnglishStructured(tokensOrText, allowImperative = true) {
      let tokens = typeof tokensOrText === "string" ? expandContractions(tokenize(tokensOrText)) : expandContractions(tokensOrText);
      tokens = this.normalizeEnglishPeriphrases(tokens);

      // "No matter" is itself an adverbial operator.  Its la therefore comes
      // immediately after cere; the following what/which phrase can have its
      // own independent la inside the embedded question-shaped clause.
      const startsNoMatter = tokens[0]?.toLocaleLowerCase() === "no"
        && tokens[1]?.toLocaleLowerCase() === "matter";
      const noMatterComma = startsNoMatter
        ? tokens.findIndex((token, index) => index > 1 && token === ",")
        : -1;
      if (startsNoMatter) {
        const terminal = [".", "!", "?"].includes(tokens.at(-1)) ? tokens.at(-1) : null;
        const contentEnd = noMatterComma > 2 ? noMatterComma : (terminal ? tokens.length - 1 : tokens.length);
        const content = this.translateEnglishWhQuestionClause(tokens.slice(2, contentEnd));
        const clause = noMatterComma > 2
          ? this.translateEnglishStructured(tokens.slice(noMatterComma + 1), false)
          : null;
        return {
          text: joinTokens([
            "cere", "la", ...tokenize(content.text),
            ...(clause ? [",", ...tokenize(clause.text)] : []),
            ...(!clause && terminal ? [terminal] : []),
          ]),
          translatedParts: content.translatedParts + (clause?.translatedParts || 0) + 2,
          unknownWords: content.unknownWords + (clause?.unknownWords || 0),
        };
      }

      const trailingNoMatter = tokens.findIndex((token, index) => index > 0
        && token.toLocaleLowerCase() === "no"
        && tokens[index + 1]?.toLocaleLowerCase() === "matter");
      if (trailingNoMatter > 0) {
        const terminal = [".", "!", "?"].includes(tokens.at(-1)) ? tokens.at(-1) : null;
        const leftTokens = tokens.slice(0, trailingNoMatter);
        const hadComma = leftTokens.at(-1) === ",";
        if (hadComma) leftTokens.pop();
        const left = this.translateEnglishStructured(leftTokens, false);
        const content = this.translateEnglishWhQuestionClause(tokens.slice(
          trailingNoMatter + 2,
          terminal ? tokens.length - 1 : tokens.length,
        ));
        return {
          text: joinTokens([
            ...tokenize(left.text), ...(hadComma ? [","] : []),
            "cere", "la", ...tokenize(content.text), ...(terminal ? [terminal] : []),
          ]),
          translatedParts: left.translatedParts + content.translatedParts + 2,
          unknownWords: left.unknownWords + content.unknownWords,
        };
      }

      // Sentence-initial coordinators already carry the relation between
      // clauses.  Parse the following clause independently instead of moving
      // the coordinator behind a leading modifier ("And as always, ...").
      const initialCoordinator = tokens[0]?.toLocaleLowerCase();
      if (["and", "or", "but"].includes(initialCoordinator) && tokens.slice(1).some((token) => WORD_RE.test(token))) {
        const commaAfterCoordinator = tokens[1] === ",";
        const clause = this.translateEnglishStructured(tokens.slice(commaAfterCoordinator ? 2 : 1), allowImperative);
        return {
          text: joinTokens([
            initialCoordinator === "and" ? "ya" : initialCoordinator === "or" ? "kay" : "te",
            ...(commaAfterCoordinator ? [","] : []),
            ...tokenize(clause.text),
          ]),
          translatedParts: clause.translatedParts + 1,
          unknownWords: clause.unknownWords,
        };
      }

      if (tokens[0]?.toLocaleLowerCase() === "instead" && tokens[1]?.toLocaleLowerCase() === "of") {
        const subjectIndex = tokens.findIndex((token, index) => index > 1
          && SUBJECT_PRONOUNS.has(token.toLocaleLowerCase())
          && this.hasEnglishPredicateAfterSubject(tokens, index + 1));
        if (subjectIndex > 2) {
          const modifier = this.translateEnglishClause(tokens.slice(2, subjectIndex), false);
          const clause = this.translateEnglishStructured(tokens.slice(subjectIndex), false);
          return {
            text: joinTokens(["li", ...tokenize(modifier.text), "la", ...tokenize(clause.text)]),
            translatedParts: modifier.translatedParts + clause.translatedParts + 2,
            unknownWords: modifier.unknownWords + clause.unknownWords,
          };
        }
      }

      const asLongAsIndex = tokens.findIndex((token, index) => token.toLocaleLowerCase() === "as"
        && tokens[index + 1]?.toLocaleLowerCase() === "long"
        && tokens[index + 2]?.toLocaleLowerCase() === "as"
        && this.hasEnglishClausePredicate(tokens.slice(index + 3)));
      if (asLongAsIndex >= 0) {
        const right = this.translateEnglishStructured(tokens.slice(asLongAsIndex + 3), false);
        if (asLongAsIndex === 0) {
          return { text: joinTokens(["lon", "tempo", "la", ...tokenize(right.text)]), translatedParts: right.translatedParts + 3, unknownWords: right.unknownWords };
        }
        const left = this.translateEnglishStructured(tokens.slice(0, asLongAsIndex), false);
        return {
          text: joinTokens([...tokenize(left.text), "lon", "tempo", "la", ...tokenize(right.text)]),
          translatedParts: left.translatedParts + right.translatedParts + 3,
          unknownWords: left.unknownWords + right.unknownWords,
        };
      }

      const firstWord = tokens.find((token) => WORD_RE.test(token))?.toLocaleLowerCase();
      const adverbialComma = ADVERBIAL_WH_MODIFIERS.has(firstWord)
        ? tokens.findIndex((token) => token === ",")
        : -1;
      if (adverbialComma > 0 && tokens.slice(adverbialComma + 1).some((token) => WORD_RE.test(token))) {
        const operator = this.translateEnglishSimple([tokens[0]], false);
        const modifier = this.translateEnglishStructured(tokens.slice(1, adverbialComma), false);
        const clause = this.translateEnglishStructured(tokens.slice(adverbialComma + 1), false);
        return {
          text: joinTokens([
            ...tokenize(operator.text),
            "la",
            ...tokenize(modifier.text),
            ",",
            ...tokenize(clause.text),
          ]),
          translatedParts: operator.translatedParts + modifier.translatedParts + clause.translatedParts + 1,
          unknownWords: operator.unknownWords + modifier.unknownWords + clause.unknownWords,
        };
      }

      // A comma between two predicates is an explicit boundary.  Keeping both
      // sides in one low-level pass used to invent a tish between unrelated
      // independent clauses and prevented modifiers on the right from moving
      // to the start of their own clause.
      const independentComma = tokens.findIndex((token, index) => {
        if (token !== "," || index <= 0 || index >= tokens.length - 1) return false;
        const left = tokens.slice(0, index);
        const right = tokens.slice(index + 1);
        if (["and", "or", "but", "so", "then"].includes(right[0]?.toLocaleLowerCase())) return false;
        const leftWords = left.filter((candidate) => WORD_RE.test(candidate)).map((candidate) => candidate.toLocaleLowerCase());
        const politeLead = leftWords.length === 1 && leftWords[0] === "please"
          && right.some((_candidate, offset) => this.tokenHasEnglishCategory(right, offset, "v"));
        return this.hasEnglishClausePredicate(left) && (this.hasEnglishClausePredicate(right) || politeLead);
      });
      if (independentComma > 0) {
        const left = this.translateEnglishStructured(tokens.slice(0, independentComma), allowImperative);
        const right = this.translateEnglishStructured(tokens.slice(independentComma + 1), allowImperative);
        const temporalLead = ["when", "whenever"].includes(tokens[0]?.toLocaleLowerCase());
        return {
          text: joinTokens([...tokenize(left.text), ...(temporalLead ? ["la"] : [","]), ...tokenize(right.text)]),
          translatedParts: left.translatedParts + right.translatedParts + Number(temporalLead),
          unknownWords: left.unknownWords + right.unknownWords,
        };
      }

      // Cause/because are clause connectors only when followed by a complete
      // clause.  In that position they use tan and do not trigger an extra
      // tish; elsewhere "cause" remains available as an ordinary noun/verb.
      const causalConnector = tokens.findIndex((token, index) => ["because", "cause"].includes(token.toLocaleLowerCase())
        && (index === 0 || tokens[index - 1] === ",")
        && this.hasEnglishClausePredicate(tokens.slice(index + 1)));
      if (causalConnector >= 0) {
        const right = this.translateEnglishStructured(tokens.slice(causalConnector + 1), false);
        if (causalConnector === 0) {
          return { text: joinTokens(["tan", ...tokenize(right.text)]), translatedParts: right.translatedParts + 1, unknownWords: right.unknownWords };
        }
        const leftEnd = tokens[causalConnector - 1] === "," ? causalConnector - 1 : causalConnector;
        const left = this.translateEnglishStructured(tokens.slice(0, leftEnd), false);
        return {
          text: joinTokens([...tokenize(left.text), ...(leftEnd < causalConnector ? [","] : []), "tan", ...tokenize(right.text)]),
          translatedParts: left.translatedParts + right.translatedParts + 1,
          unknownWords: left.unknownWords + right.unknownWords,
        };
      }

      const contrastiveWhenIndex = tokens.findIndex((token, index) => {
        if (token.toLocaleLowerCase() !== "when") return false;
        const right = tokens.slice(index + 1);
        if (right[0]?.toLocaleLowerCase() === "in" && right[1]?.toLocaleLowerCase() === "reality"
          && this.hasEnglishClausePredicate(right.slice(2))) return true;
        const rightSubject = right.findIndex((candidate, subjectIndex) => SUBJECT_PRONOUNS.has(candidate.toLocaleLowerCase())
          || Boolean(this.lookupEnglish(right, subjectIndex)?.options.some((option) => ["n", "pn"].includes(option.category))));
        if (rightSubject < 0 || !this.hasEnglishPredicateAfterSubject(right, rightSubject + 1)) return false;
        if (index === 0) return true;
        const previousWordIndex = [...tokens.slice(0, index)].map((candidate) => WORD_RE.test(candidate)).lastIndexOf(true);
        const previousLookup = previousWordIndex >= 0 ? this.lookupEnglish(tokens, previousWordIndex) : null;
        const followsNoun = previousLookup?.options.some((option) => option.category === "n")
          && tokens[index - 1] !== "," && !this.hasEnglishClausePredicate(tokens.slice(0, index));
        return !followsNoun && this.hasEnglishClausePredicate(tokens.slice(0, index));
      });
      if (contrastiveWhenIndex >= 0) {
        const right = this.translateEnglishStructured(tokens.slice(contrastiveWhenIndex + 1), false);
        const contrastive = tokens[contrastiveWhenIndex + 1]?.toLocaleLowerCase() === "in"
          && tokens[contrastiveWhenIndex + 2]?.toLocaleLowerCase() === "reality";
        const connector = contrastive ? ["te"] : ["lon", "tempo", "la"];
        if (contrastiveWhenIndex === 0) {
          return { text: joinTokens([...connector, ...tokenize(right.text)]), translatedParts: right.translatedParts + connector.length, unknownWords: right.unknownWords };
        }
        const left = this.translateEnglishStructured(tokens.slice(0, contrastiveWhenIndex), false);
        return {
          text: joinTokens([...tokenize(left.text), ...connector, ...tokenize(right.text)]),
          translatedParts: left.translatedParts + right.translatedParts + connector.length,
          unknownWords: left.unknownWords + right.unknownWords,
        };
      }

      const butIndex = tokens.findIndex((token, index) => token.toLocaleLowerCase() === "but" && index > 0
        && tokens.slice(index + 1).some((candidate) => WORD_RE.test(candidate)));
      if (butIndex > 0) {
        const isOnlySense = tokens.slice(0, butIndex).some((token) => token.toLocaleLowerCase() === "nothing");
        if (!isOnlySense) {
          const leftTokens = tokens.slice(0, butIndex);
          const hadComma = leftTokens[leftTokens.length - 1] === ",";
          if (hadComma) leftTokens.pop();
          const left = this.translateEnglishStructured(leftTokens, false);
          const right = this.translateEnglishStructured(tokens.slice(butIndex + 1), false);
          return {
            text: joinTokens([...tokenize(left.text), ...(hadComma ? [","] : []), "te", ...tokenize(right.text)]),
            translatedParts: left.translatedParts + right.translatedParts + 1,
            unknownWords: left.unknownWords + right.unknownWords,
          };
        }
      }

      const coordinatingSo = tokens.findIndex((token, index) => token.toLocaleLowerCase() === "so"
        && index > 0 && tokens[index - 1] === ","
        && SUBJECT_PRONOUNS.has(tokens[index + 1]?.toLocaleLowerCase()));
      if (coordinatingSo > 0) {
        const left = this.translateEnglishStructured(tokens.slice(0, coordinatingSo - 1), false);
        const right = this.translateEnglishStructured(tokens.slice(coordinatingSo + 1), false);
        return {
          text: joinTokens([...tokenize(left.text), ",", "tish", ...tokenize(right.text)]),
          translatedParts: left.translatedParts + right.translatedParts + 1,
          unknownWords: left.unknownWords + right.unknownWords,
        };
      }

      const coordinatingClause = tokens.findIndex((token, index) => {
        if (!["and", "or"].includes(token.toLocaleLowerCase()) || index <= 0) return false;
        let subjectIndex = index + 1;
        while (["sometimes", "often", "usually", "rarely", "always", "never", "maybe", "probably", "perhaps"].includes(
          tokens[subjectIndex]?.toLocaleLowerCase(),
        )) subjectIndex += 1;
        return SUBJECT_PRONOUNS.has(tokens[subjectIndex]?.toLocaleLowerCase())
          && tokens.slice(subjectIndex + 1).some((_candidate, offset) => this.tokenHasEnglishCategory(tokens, subjectIndex + 1 + offset, "v"));
      });
      if (coordinatingClause > 0) {
        const leftTokens = tokens.slice(0, coordinatingClause);
        let trailingAdditive = false;
        if (leftTokens.slice(-2).map((token) => token.toLocaleLowerCase()).join(" ") === "as well") {
          leftTokens.splice(-2, 2);
          trailingAdditive = true;
        } else if (leftTokens[leftTokens.length - 1]?.toLocaleLowerCase() === "too") {
          leftTokens.pop();
          trailingAdditive = true;
        }
        const left = this.translateEnglishStructured(leftTokens, false);
        if (trailingAdditive && !/^take\s+la\b/iu.test(left.text)) {
          left.text = joinTokens(["take", "la", ...tokenize(left.text)]);
          left.translatedParts += 2;
        }
        const right = this.translateEnglishStructured(tokens.slice(coordinatingClause + 1), false);
        return {
          text: joinTokens([
            ...tokenize(left.text),
            tokens[coordinatingClause].toLocaleLowerCase() === "and" ? "ya" : "kay",
            ...tokenize(right.text),
          ]),
          translatedParts: left.translatedParts + right.translatedParts + 1,
          unknownWords: left.unknownWords + right.unknownWords,
        };
      }

      const explicitThat = tokens.findIndex((token, index) => {
        if (token.toLocaleLowerCase() !== "that" || index <= 0) return false;
        const right = tokens.slice(index + 1);
        const firstLookup = this.lookupEnglish(right, 0);
        const hasSubject = SUBJECT_PRONOUNS.has(right[0]?.toLocaleLowerCase())
          || Boolean(firstLookup?.options.some((option) => ["n", "pn"].includes(option.category)))
          || (ENGLISH_DETERMINERS.has(right[0]?.toLocaleLowerCase())
            && right.some((_candidate, offset) => this.tokenHasEnglishCategory(right, offset, "n")));
        return hasSubject && this.hasEnglishClausePredicate(right);
      });
      if (explicitThat > 0) {
        const preceding = tokens[explicitThat - 1]?.toLocaleLowerCase();
        const coordinated = ["and", "or"].includes(preceding);
        const left = this.translateEnglishClause(tokens.slice(0, explicitThat - (coordinated ? 1 : 0)), false);
        const right = this.translateEnglishStructured(tokens.slice(explicitThat + 1), false);
        return {
          text: joinTokens([
            ...tokenize(left.text),
            ...(coordinated ? [preceding === "and" ? "ya" : "kay"] : ["tish"]),
            ...tokenize(right.text),
          ]),
          translatedParts: left.translatedParts + right.translatedParts + 1,
          unknownWords: left.unknownWords + right.unknownWords,
        };
      }

      // A preposition can introduce an embedded wh-clause after an already
      // complete object: "know nothing as to where he is".  The object stays
      // attached to the matrix verb with e; the preposition is rendered once
      // and the wh-clause keeps declarative (non-inverted) word order.
      const prepositionalWh = tokens.findIndex((token, index) => index > 1
        && ["where", "when", "why", "how", "what", "which"].includes(token.toLocaleLowerCase())
        && (tokens[index - 1]?.toLocaleLowerCase() === "about"
          || (tokens[index - 2]?.toLocaleLowerCase() === "as"
            && tokens[index - 1]?.toLocaleLowerCase() === "to")));
      if (prepositionalWh > 1) {
        const compoundAsTo = tokens[prepositionalWh - 2]?.toLocaleLowerCase() === "as";
        const left = this.translateEnglishStructured(
          tokens.slice(0, prepositionalWh - (compoundAsTo ? 2 : 1)),
          false,
        );
        const whClause = this.translateEnglishWhQuestionClause(tokens.slice(prepositionalWh));
        return {
          text: joinTokens([...tokenize(left.text), "pen", ...tokenize(whClause.text)]),
          translatedParts: left.translatedParts + whClause.translatedParts + 1,
          unknownWords: left.unknownWords + whClause.unknownWords,
        };
      }

      const complementVerbIndex = tokens.findIndex((token, index) => {
        if (index <= 0) return false;
        const lemma = this.englishVerbLemmas.get(token.toLocaleLowerCase())?.base || token.toLocaleLowerCase();
        if (!CLAUSE_COMPLEMENT_VERBS.has(lemma)) return false;
        const tail = tokens.slice(index + 1);
        if (!tail.length || tail[0]?.toLocaleLowerCase() === "to") return false;
        const laterVerb = tail.findIndex((_candidate, offset) => this.isDefiniteEnglishVerb(tail, offset));
        if (laterVerb <= 0 || tail[laterVerb - 1]?.toLocaleLowerCase() === "to") return false;
        const prefix = tail.slice(0, laterVerb);
        const finalSubjectIsPronoun = SUBJECT_PRONOUNS.has(prefix.at(-1)?.toLocaleLowerCase());
        const earlierNoun = prefix.slice(0, -1).some((_candidate, offset) =>
          this.lookupEnglish(prefix, offset)?.options.some((option) => option.category === "n"));
        if (finalSubjectIsPronoun && earlierNoun) return false;
        return tail.slice(0, laterVerb).some((candidate, offset) => {
          const lower = candidate.toLocaleLowerCase();
          return SUBJECT_PRONOUNS.has(lower) || lower === "there"
            || ENGLISH_DETERMINERS.has(lower)
            || this.lookupEnglish(tail, offset)?.options.some((option) => ["n", "pn"].includes(option.category));
        });
      });
      const hasTrailingAdverbialClause = tokens.some((token, index) => index > complementVerbIndex
        && ADVERBIAL_WH_MODIFIERS.has(token.toLocaleLowerCase())
        && this.hasEnglishClausePredicate(tokens.slice(index + 1)));
      if (complementVerbIndex > 0 && !hasTrailingAdverbialClause) {
        const boundary = complementVerbIndex + 1;
        const left = this.translateEnglishClause(tokens.slice(0, boundary), false);
        const right = this.translateEnglishStructured(tokens.slice(boundary), false);
        return {
          text: joinTokens([...tokenize(left.text), "tish", ...tokenize(right.text)]),
          translatedParts: left.translatedParts + right.translatedParts + 1,
          unknownWords: left.unknownWords + right.unknownWords,
        };
      }

      const likeClauseIndex = tokens.findIndex((token, index) => {
        if (!["like", "than"].includes(token.toLocaleLowerCase()) || index <= 0 || index >= tokens.length - 2) return false;
        const right = tokens.slice(index + 1);
        const subjectLookup = this.lookupEnglish(right, 0);
        const subject = SUBJECT_PRONOUNS.has(right[0]?.toLocaleLowerCase())
          || Boolean(subjectLookup?.options.some((option) => ["n", "pn"].includes(option.category)))
          || /^\p{Lu}[\p{L}\p{M}'’\-]*$/u.test(right[0] || "");
        return subject && this.hasEnglishPredicateAfterSubject(right, 1);
      });
      if (likeClauseIndex > 0) {
        const left = this.translateEnglishStructured(tokens.slice(0, likeClauseIndex), false);
        const right = this.translateEnglishStructured(tokens.slice(likeClauseIndex + 1), false);
        return {
          text: joinTokens([...tokenize(left.text), "che", ...tokenize(right.text)]),
          translatedParts: left.translatedParts + right.translatedParts + 1,
          unknownWords: left.unknownWords + right.unknownWords,
        };
      }

      // A controlled infinitive shares the preceding verb's subject and loses
      // English "to".  If a noun/adjective intervenes, or the infinitive
      // modifies a completed noun/adjective complement, it starts a new YT
      // clause: tish + overt controlled subject, otherwise tish to + verb.
      const infinitiveBoundary = tokens.findIndex((token, index) => index > 0
        && token.toLocaleLowerCase() === "to"
        && this.tokenHasEnglishCategory(tokens, index + 1, "v")
        && !tokens.slice(0, index).some((_candidate, start) => {
          const phrase = this.lookupEnglish(tokens, start);
          return phrase && start < index && start + phrase.length > index;
        }));
      if (infinitiveBoundary > 0) {
        let priorVerb = -1;
        for (let index = infinitiveBoundary - 1; index >= 0; index -= 1) {
          if (this.tokenHasEnglishCategory(tokens, index, "v")) { priorVerb = index; break; }
          if ([",", ";", ":"].includes(tokens[index])) break;
        }
        const immediateControlled = priorVerb === infinitiveBoundary - 1
          && CONTROLLED_INFINITIVE_VERBS.has(
            this.englishVerbLemmas.get(tokens[priorVerb]?.toLocaleLowerCase())?.base
              || tokens[priorVerb]?.toLocaleLowerCase(),
          );
        if (!immediateControlled) {
          let controlledSubject = -1;
          // English can state the subject of an infinitive with "for X to".
          // It is an overt subject of the embedded Yapo clause even when the
          // matrix predicate is not an object-control verb ("a pleasure for
          // me to be there").  Keep "for X" in the matrix translation too,
          // because it is also the beneficiary there.
          if (infinitiveBoundary >= 2
            && tokens[infinitiveBoundary - 2]?.toLocaleLowerCase() === "for") {
            const candidateIndex = infinitiveBoundary - 1;
            const candidate = tokens[candidateIndex]?.toLocaleLowerCase();
            if (SUBJECT_PRONOUNS.has(candidate)
              || this.lookupEnglish(tokens, candidateIndex)?.options.some((option) => ["n", "pn"].includes(option.category))) {
              controlledSubject = candidateIndex;
            }
          }
          const priorLemma = priorVerb >= 0
            ? this.englishVerbLemmas.get(tokens[priorVerb]?.toLocaleLowerCase())?.base
              || tokens[priorVerb]?.toLocaleLowerCase()
            : "";
          if (controlledSubject < 0 && priorVerb >= 0 && OBJECT_CONTROL_INFINITIVE_VERBS.has(priorLemma)) {
            controlledSubject = tokens.findIndex((token, index) => index > priorVerb && index < infinitiveBoundary
              && (SUBJECT_PRONOUNS.has(token.toLocaleLowerCase())
                || this.lookupEnglish(tokens, index)?.options.some((option) => ["n", "pn"].includes(option.category))));
          }
          const forControlledSubject = controlledSubject > priorVerb
            && tokens[controlledSubject - 1]?.toLocaleLowerCase() === "for";
          const leftEnd = controlledSubject > priorVerb && !forControlledSubject
            ? controlledSubject : infinitiveBoundary;
          const left = this.translateEnglishStructured(tokens.slice(0, leftEnd), false);
          const rightTokens = [
            ...(controlledSubject > priorVerb ? tokens.slice(controlledSubject, infinitiveBoundary) : []),
            ...tokens.slice(infinitiveBoundary + 1),
          ];
          const lexicalBePhrase = tokens[infinitiveBoundary + 1]?.toLocaleLowerCase() === "be"
            && (this.lookupEnglish(tokens, infinitiveBoundary + 1)?.length || 0) > 1;
          if (lexicalBePhrase && forControlledSubject) return this.translateEnglishClause(tokens, allowImperative);
          const right = controlledSubject > priorVerb
            ? this.translateEnglishStructured(rightTokens, false)
            : this.translateEnglishClause(rightTokens, false, true);
          const rightText = tokenize(right.text.replace(/^to\s+/iu, ""));
          return {
            text: joinTokens([
              ...tokenize(left.text), "tish",
              ...(controlledSubject > priorVerb ? [] : ["to"]),
              ...rightText,
            ]),
            translatedParts: left.translatedParts + right.translatedParts + 2,
            unknownWords: left.unknownWords + right.unknownWords,
          };
        }
      }

      //! A sentence-initial English gerund phrase can be the logical subject
      //! of a following copular clause.  Yapo renders that event first as a
      //! completed modifier, then refers to it with tish as the matrix
      //! subject: "Meeting you was amazing" ->
      //! "yuni e tu la tish yesil kula".  Progressive predicates are not
      //! captured because this rule requires the gerund at token zero.
      const openingGerund = tokens[0]?.toLocaleLowerCase();
      const openingGerundLemma = /ing$/iu.test(openingGerund || "")
        ? this.englishVerbLemmas.get(openingGerund)?.base
        : null;
      if (openingGerundLemma) {
        const copulaIndex = tokens.findIndex((token, index) => index > 1
          && ["is", "are", "was", "were"].includes(token.toLocaleLowerCase()));
        const futureCopulaIndex = tokens.findIndex((token, index) => index > 1
          && token.toLocaleLowerCase() === "will"
          && tokens[index + 1]?.toLocaleLowerCase() === "be");
        const boundary = copulaIndex >= 0 ? copulaIndex : futureCopulaIndex;
        if (boundary > 1 && tokens.slice(boundary + (boundary === futureCopulaIndex ? 2 : 1))
          .some((token) => WORD_RE.test(token))) {
          const modifier = this.translateEnglishClause([
            openingGerundLemma,
            ...tokens.slice(1, boundary),
          ], false);
          modifier.text = modifier.text.replace(/^to\s+/iu, "");
          const matrix = this.translateEnglishStructured(["that", ...tokens.slice(boundary)], false);
          return {
            text: joinTokens([...tokenize(modifier.text), "la", ...tokenize(matrix.text)]),
            translatedParts: modifier.translatedParts + matrix.translatedParts + 1,
            unknownWords: modifier.unknownWords + matrix.unknownWords,
          };
        }
      }

      // A trailing wherever/whenever/however clause modifies the whole local
      // clause and therefore moves, as one unit, to its front and closes with
      // la.  It must not be left among the verb's direct objects.
      const trailingAdverbial = tokens.findIndex((token, index) => index > 0
        && ADVERBIAL_WH_MODIFIERS.has(token.toLocaleLowerCase())
        && this.hasEnglishClausePredicate(tokens.slice(0, index))
        && this.hasEnglishClausePredicate(tokens.slice(index + 1)));
      if (trailingAdverbial > 0) {
        const terminal = [".", "!", "?"].includes(tokens.at(-1)) ? tokens.at(-1) : null;
        const modifierEnd = terminal ? tokens.length - 1 : tokens.length;
        const operator = this.translateEnglishSimple([tokens[trailingAdverbial]], false);
        const modifier = this.translateEnglishStructured(tokens.slice(trailingAdverbial + 1, modifierEnd), false);
        const clause = this.translateEnglishStructured(tokens.slice(0, trailingAdverbial), false);
        return {
          text: joinTokens([
            ...tokenize(operator.text),
            "la",
            ...tokenize(modifier.text),
            ...tokenize(clause.text),
            ...(terminal ? [terminal] : []),
          ]),
          translatedParts: operator.translatedParts + modifier.translatedParts + clause.translatedParts + 1,
          unknownWords: operator.unknownWords + modifier.unknownWords + clause.unknownWords,
        };
      }

      const implicitBoundary = this.findEmbeddedEnglishClause(tokens);
      if (implicitBoundary > 0) {
        const left = this.translateEnglishClause(tokens.slice(0, implicitBoundary), false);
        const rightTokens = tokens.slice(implicitBoundary);
        if (rightTokens[1]?.toLocaleLowerCase() === "to"
          && this.tokenHasEnglishCategory(rightTokens, 2, "v")) rightTokens.splice(1, 1);
        const right = this.translateEnglishStructured(rightTokens, false);
        return {
          text: joinTokens([...tokenize(left.text), "tish", ...tokenize(right.text)]),
          translatedParts: left.translatedParts + right.translatedParts + 1,
          unknownWords: left.unknownWords + right.unknownWords,
        };
      }

      for (let index = 2; index < tokens.length; index += 1) {
        const token = tokens[index];
        if (!/ing$/iu.test(token) || !this.tokenHasEnglishCategory(tokens, index, "v")) continue;
        const previousLookup = this.lookupEnglish(tokens, index - 1);
        const previousIsNoun = previousLookup?.options.some((option) => option.category === "n");
        const auxiliary = tokens[index - 1]?.toLocaleLowerCase();
        if (!previousIsNoun || ["am", "is", "are", "was", "were", "be", "been"].includes(auxiliary)) continue;
        const left = this.translateEnglishClause(tokens.slice(0, index), false);
        const right = this.translateEnglishClause(tokens.slice(index), false);
        return {
          text: joinTokens([...tokenize(left.text), "tish", ...tokenize(right.text)]),
          translatedParts: left.translatedParts + right.translatedParts + 1,
          unknownWords: left.unknownWords + right.unknownWords,
        };
      }
      for (let index = 2; index < tokens.length - 1; index += 1) {
        if (tokens[index].toLocaleLowerCase() !== "to" || tokens[index + 1].toLocaleLowerCase() !== "be") continue;
        const priorHasNounComplement = tokens.slice(1, index).some((_token, offset) =>
          this.lookupEnglish(tokens, offset + 1)?.options.some((option) => option.category === "n"));
        const priorHasVerb = tokens.slice(0, index).some((_token, offset) => this.tokenHasEnglishCategory(tokens, offset, "v"));
        if (!priorHasNounComplement || !priorHasVerb) continue;
        const left = this.translateEnglishClause(tokens.slice(0, index), false);
        const controlledSubject = tokens[index - 2]?.toLocaleLowerCase() === "for"
          && ["n", "pn"].some((category) => this.tokenHasEnglishCategory(tokens, index - 1, category))
          ? [tokens[index - 1]]
          : [];
        const right = this.translateEnglishClause([...controlledSubject, ...tokens.slice(index + 1)], false);
        return {
          text: joinTokens([...tokenize(left.text), "tish", ...tokenize(right.text)]),
          translatedParts: left.translatedParts + right.translatedParts + 1,
          unknownWords: left.unknownWords + right.unknownWords,
        };
      }
      return this.translateEnglishClause(tokens, allowImperative);
    }

    englishQuestionSubjectEnd(tokens, start) {
      if (start >= tokens.length) return start;
      const first = tokens[start]?.toLocaleLowerCase();
      if (SUBJECT_PRONOUNS.has(first) || /^\p{Lu}[\p{L}\p{M}'’\-]*$/u.test(tokens[start] || "")) return start + 1;
      let nounEnd = -1;
      for (let index = start; index < tokens.length; index += 1) {
        if (!WORD_RE.test(tokens[index])) break;
        const lower = tokens[index].toLocaleLowerCase();
        const lookup = this.lookupEnglish(tokens, index);
        if (index > start && (["not", "maybe", "probably", "perhaps", "always", "never", "just"].includes(lower)
          || this.isDefiniteEnglishVerb(tokens, index))) break;
        if (lookup?.options.some((option) => ["n", "pn"].includes(option.category))) {
          nounEnd = index + Math.max(1, lookup.length);
          break;
        }
      }
      return nounEnd > start ? nounEnd : start + 1;
    }

    reorderEnglishQuestionBody(tokens, auxiliaryIndex) {
      const auxiliary = tokens[auxiliaryIndex]?.toLocaleLowerCase();
      const negated = tokens[auxiliaryIndex + 1]?.toLocaleLowerCase() === "not";
      const subjectStart = auxiliaryIndex + (negated ? 2 : 1);
      const subjectEnd = this.englishQuestionSubjectEnd(tokens, subjectStart);
      const subject = tokens.slice(subjectStart, subjectEnd);
      const tail = tokens.slice(subjectEnd);
      if (!subject.length) return tokens.slice(auxiliaryIndex);
      if (["do", "does", "did"].includes(auxiliary)) {
        if (negated) return [...subject, tokens[auxiliaryIndex], "not", ...tail];
        if (auxiliary === "did") {
          const pastTail = [...tail];
          const verbIndex = pastTail.findIndex((_token, index) => this.tokenHasEnglishCategory(pastTail, index, "v"));
          if (verbIndex >= 0) {
            const lemma = this.englishVerbLemmas.get(pastTail[verbIndex].toLocaleLowerCase());
            if (lemma?.past) pastTail[verbIndex] = lemma.past;
          }
          return [...subject, ...pastTail];
        }
        return [...subject, ...tail];
      }
      const normalizedAuxiliary = auxiliary === "could" ? "can" : tokens[auxiliaryIndex];
      return [...subject, normalizedAuxiliary, ...(negated ? ["not"] : []), ...tail];
    }

    translateEnglishWhQuestionClause(tokensOrText) {
      const tokens = expandContractions(typeof tokensOrText === "string" ? tokenize(tokensOrText) : tokensOrText)
        .filter((token) => token !== "?");
      const wh = tokens[0]?.toLocaleLowerCase();
      const auxiliaries = new Set(["am", "is", "are", "was", "were", "do", "does", "did", "will", "would", "can", "could", "may", "might", "have", "has", "had"]);
      const auxiliaryIndex = tokens.findIndex((token, index) => index > 0 && auxiliaries.has(token.toLocaleLowerCase()));
      let bodyTokens = [];
      let phraseEnd = auxiliaryIndex;
      let overtSubject = false;

      if (["what", "who"].includes(wh) && auxiliaryIndex === 1
        && ["am", "is", "are", "was", "were"].includes(tokens[1]?.toLocaleLowerCase())
        && ["this", "that", "these", "those"].includes(tokens[2]?.toLocaleLowerCase())) {
        const copula = ["was", "were"].includes(tokens[1].toLocaleLowerCase()) ? "yesil" : "yesi";
        const complement = this.translateEnglishStructured(tokens.slice(2), false);
        return {
          text: joinTokens(["kiyo", copula, ...(wh === "what" ? ["e"] : []), ...tokenize(complement.text)]),
          translatedParts: complement.translatedParts + 2 + Number(wh === "what"),
          unknownWords: complement.unknownWords,
        };
      }

      if (auxiliaryIndex > 0) {
        const subjectStart = auxiliaryIndex + (tokens[auxiliaryIndex + 1]?.toLocaleLowerCase() === "not" ? 2 : 1);
        const subjectToken = tokens[subjectStart] || "";
        const subjectLookup = this.lookupEnglish(tokens, subjectStart);
        overtSubject = SUBJECT_PRONOUNS.has(subjectToken.toLocaleLowerCase())
          || ["this", "that", "these", "those"].includes(subjectToken.toLocaleLowerCase())
          || Boolean(subjectLookup?.options.some((option) => ["n", "pn"].includes(option.category)))
          || /^\p{Lu}[\p{L}\p{M}'’\-]*$/u.test(subjectToken);
        bodyTokens = overtSubject
          ? this.reorderEnglishQuestionBody(tokens, auxiliaryIndex)
          : [tokens[auxiliaryIndex], ...tokens.slice(auxiliaryIndex + 1)];
      } else {
        // Embedded English often keeps declarative order: "what difficult
        // things life throws...". Locate the first noun/pronoun that is
        // followed by a real predicate; everything before it is the fronted
        // interrogative phrase.
        const subjectIndex = tokens.findIndex((token, index) => index > 0
          && (SUBJECT_PRONOUNS.has(token.toLocaleLowerCase())
            || this.lookupEnglish(tokens, index)?.options.some((option) => ["n", "pn"].includes(option.category))
            || /^\p{Lu}[\p{L}\p{M}'’\-]*$/u.test(token))
          && this.hasEnglishPredicateAfterSubject(tokens, index + 1));
        phraseEnd = subjectIndex > 0 ? subjectIndex : 1;
        bodyTokens = subjectIndex > 0 ? tokens.slice(subjectIndex) : tokens.slice(1);
        overtSubject = subjectIndex > 0;
      }

      if (["where", "when", "why"].includes(wh)) {
        const expression = wh === "where" ? ["loko", "kiya"] : wh === "when" ? ["tempo", "kiya"] : ["pen", "kiyo"];
        // Without inversion, the complete material after an adverbial wh-word
        // is the clause. Keeping it intact also keeps unknown determiners and
        // adjectives attached to their subject ("where the meek Apache...").
        const adverbialBody = auxiliaryIndex > 0 ? bodyTokens : tokens.slice(1);
        const body = this.translateEnglishStructured(adverbialBody, false);
        return { text: joinTokens([...expression, "la", ...tokenize(body.text)]), translatedParts: body.translatedParts + 3, unknownWords: body.unknownWords };
      }

      if (wh === "how") {
        const objectIndex = bodyTokens.findIndex((token, index) => index > 0
          && this.lookupEnglish(bodyTokens, index)?.options.some((option) => ["n", "pn"].includes(option.category)));
        const withHow = objectIndex > 0
          ? [...bodyTokens.slice(0, objectIndex), "how", ...bodyTokens.slice(objectIndex)]
          : [...bodyTokens, "how"];
        return this.translateEnglishStructured(withHow, false);
      }

      if (["what", "which"].includes(wh) && phraseEnd > 1) {
        const phrase = this.translateEnglishClause(tokens.slice(1, phraseEnd), false);
        const body = this.translateEnglishStructured(bodyTokens, false);
        return {
          text: joinTokens([...tokenize(phrase.text), "kiya", "la", ...tokenize(body.text)]),
          translatedParts: phrase.translatedParts + body.translatedParts + 2,
          unknownWords: phrase.unknownWords + body.unknownWords,
        };
      }

      const body = this.translateEnglishStructured(bodyTokens, false);
      if ((["what", "whom"].includes(wh) && overtSubject) || (wh === "who" && overtSubject)) {
        return { text: joinTokens([...tokenize(body.text), "e", "kiyo"]), translatedParts: body.translatedParts + 2, unknownWords: body.unknownWords };
      }
      const subjectlessWhBody = body.text.replace(/^(?:yu|to)\s+/iu, "");
      return { text: joinTokens(["kiyo", ...tokenize(subjectlessWhBody)]), translatedParts: body.translatedParts + 1, unknownWords: body.unknownWords };
    }

    translateEnglishQuestion(tokensOrText) {
      const tokens = expandContractions(typeof tokensOrText === "string" ? tokenize(tokensOrText) : tokensOrText);
      const terminal = tokens.at(-1) === "?" ? [tokens.pop()] : [];
      const tagComma = tokens.lastIndexOf(",");
      if (tagComma > 0) {
        const tag = tokens.slice(tagComma + 1).filter((token) => WORD_RE.test(token));
        if (tag.length >= 1 && tag.length <= 3
          && ["am", "is", "are", "was", "were", "do", "does", "did", "have", "has", "had", "can", "could", "will", "would"]
            .includes(tag[0]?.toLocaleLowerCase())) {
          const statement = this.translateEnglishStructured(tokens.slice(0, tagComma), false);
          return {
            text: joinTokens(["ki", ...tokenize(statement.text), ",", "kay", ...terminal]),
            translatedParts: statement.translatedParts + 2,
            unknownWords: statement.unknownWords,
          };
        }
      }
      const first = tokens[0]?.toLocaleLowerCase();
      if (["what", "which", "who", "whom", "how", "where", "when", "why"].includes(first)) {
        const result = this.translateEnglishWhQuestionClause(tokens);
        result.text = joinTokens([...tokenize(result.text), ...terminal]);
        return result;
      }
      const auxiliaries = new Set(["am", "is", "are", "was", "were", "do", "does", "did", "will", "would", "can", "could", "may", "might", "have", "has", "had"]);
      if (!auxiliaries.has(first)) {
        const firstWord = tokens.findIndex((token) => WORD_RE.test(token));
        if (firstWord < 0) return null;
        const firstLower = tokens[firstWord].toLocaleLowerCase();
        const nextWord = tokens.findIndex((token, index) => index > firstWord && WORD_RE.test(token));
        if (["and", "or", "but"].includes(firstLower) && nextWord > firstWord) {
          const nextLower = tokens[nextWord].toLocaleLowerCase();
          const connector = firstLower === "and" ? "ya" : firstLower === "or" ? "kay" : "te";
          if (["what", "which", "who", "whom", "how", "where", "when", "why"].includes(nextLower)) {
            const clause = this.translateEnglishWhQuestionClause(tokens.slice(nextWord));
            return {
              text: joinTokens([connector, ...tokenize(clause.text), ...terminal]),
              translatedParts: clause.translatedParts + 1,
              unknownWords: clause.unknownWords,
            };
          }
          const body = this.translateEnglishStructured(tokens.slice(nextWord), false);
          return {
            text: joinTokens([connector, "ki", ...tokenize(body.text), ...terminal]),
            translatedParts: body.translatedParts + 2,
            unknownWords: body.unknownWords,
          };
        }
        const laterWh = tokens.findIndex((token, index) => index > firstWord
          && ["what", "which", "who", "whom", "how", "where", "when", "why"].includes(token.toLocaleLowerCase()));
        if (laterWh > firstWord && tokens.slice(firstWord, laterWh).some((token) => [",", ";", ":", "\""] .includes(token))) return null;
        const leading = tokens.slice(0, firstWord);
        const bodyTokens = tokens.slice(firstWord);
        const trailingToo = bodyTokens.at(-1)?.toLocaleLowerCase() === "too";
        if (trailingToo) bodyTokens.pop();
        const opening = bodyTokens[0]?.toLocaleLowerCase();
        if (/ing$/iu.test(opening || "")) {
          const lemma = this.englishVerbLemmas.get(opening);
          if (lemma?.base && this.lookupEnglish([opening], 0)?.options.some((option) => option.category === "v")) {
            bodyTokens[0] = lemma.base;
          }
        }
        const body = this.translateEnglishStructured(bodyTokens, false);
        const questionText = joinTokens([...leading, "ki", ...(trailingToo ? ["take", "la"] : []), ...tokenize(body.text), ...terminal])
          .replace(/^(["“])\s+/u, "$1");
        return {
          text: questionText,
          translatedParts: body.translatedParts + 1 + (trailingToo ? 2 : 0),
          unknownWords: body.unknownWords,
        };
      }
      const body = this.translateEnglishStructured(this.reorderEnglishQuestionBody(tokens, 0), false);
      return {
        // ki is the outermost clause operator and therefore precedes kish,
        // yene, li and every other generated clause-initial operator.
        text: joinTokens(["ki", ...tokenize(body.text), ...terminal]),
        translatedParts: body.translatedParts + 1,
        unknownWords: body.unknownWords,
      };
    }

    translateEnglishSentence(text) {
      const tokens = expandContractions(tokenize(text));
      if (tokens[0]?.toLocaleLowerCase() === "and" && tokens[1]?.toLocaleLowerCase() === "yet") {
        tokens.splice(0, 2, "but");
      }
      const wordsOnly = tokens.filter((token) => WORD_RE.test(token)).map((token) => token.toLocaleLowerCase());
      if (wordsOnly.length === 1 && wordsOnly[0] === "sorry") {
        return { text: applyInitialCase(text, joinTokens(["su", "tristi", ...tokens.filter((token) => !WORD_RE.test(token))])), translatedParts: 2, unknownWords: 0 };
      }
      if (wordsOnly.length === 1 && wordsOnly[0] === "please") {
        return { text: applyInitialCase(text, joinTokens(["su", "poni", ...tokens.filter((token) => !WORD_RE.test(token))])), translatedParts: 2, unknownWords: 0 };
      }
      if (tokens.includes("?")) {
        const question = this.translateEnglishQuestion(tokens);
        if (question) {
          question.text = applyInitialCase(text, question.text);
          return question;
        }
      }
      const ifOnlyIndex = tokens.findIndex((token, index) => token.toLocaleLowerCase() === "if"
        && tokens[index + 1]?.toLocaleLowerCase() === "only");
      if (ifOnlyIndex >= 0) {
        const reordered = [...tokens];
        reordered.splice(ifOnlyIndex, 2, "only", "if");
        const reorderedResult = this.translateEnglishSentence(joinTokens(reordered));
        reorderedResult.text = applyInitialCase(text, reorderedResult.text);
        return reorderedResult;
      }
      const ifIndex = tokens.findIndex((token) => token.toLocaleLowerCase() === "if");
      if (ifIndex >= 0) {
        let boundary = tokens.findIndex((token, index) => index > ifIndex && token.toLocaleLowerCase() === "then");
        let implicitCopularConsequence = false;
        if (boundary < 0) {
          boundary = tokens.findIndex((token, index) => {
            if (index <= ifIndex || token !== ",") return false;
            const following = tokens.slice(index + 1).find((candidate) => WORD_RE.test(candidate));
            return Boolean(following) && !["and", "or", "but"].includes(following.toLocaleLowerCase());
          });
        }
        if (boundary < 0) {
          boundary = tokens.findIndex((token, index) => index > ifIndex + 1
            && token.toLocaleLowerCase() === "it"
            && ["is", "was", "will"].includes(tokens[index + 1]?.toLocaleLowerCase())
            && this.hasEnglishClausePredicate(tokens.slice(ifIndex + 1, index)));
          implicitCopularConsequence = boundary > ifIndex;
        }
        if (boundary > ifIndex) {
          const prelude = this.translateEnglishStructured(tokens.slice(0, ifIndex), true);
          const condition = this.translateEnglishStructured(tokens.slice(ifIndex + 1, boundary), false);
          const consequence = this.translateEnglishStructured(tokens.slice(boundary + (implicitCopularConsequence ? 0 : 1)), true);
          const consequenceMarker = !implicitCopularConsequence && tokens[boundary] === "," ? [",", "la"] : ["la"];
          return {
            text: applyInitialCase(text, joinTokens([...tokenize(prelude.text), "li", ...tokenize(condition.text), ...consequenceMarker, ...tokenize(consequence.text)])),
            translatedParts: prelude.translatedParts + condition.translatedParts + consequence.translatedParts + 2,
            unknownWords: prelude.unknownWords + condition.unknownWords + consequence.unknownWords,
          };
        }
      }
      const result = this.translateEnglishStructured(tokens, true);
      const firstOriginal = tokenize(text)[0] || "";
      const contractionKey = firstOriginal.toLocaleLowerCase().replaceAll("’", "'");
      const originalWords = tokenize(text).filter((token) => WORD_RE.test(token));
      if (originalWords.length === 1 && CONTRACTIONS[contractionKey]) {
        result.text = result.text.replace(/^to\s+/iu, "");
      }
      result.text = /(?:'s|’s)$/iu.test(firstOriginal) && !CONTRACTIONS[contractionKey]
        ? result.text
        : applyInitialCase(text, result.text);
      return result;
    }

    translateEnglishSimple(tokensOrText, allowImperative = true, forceInitialVerb = false) {
      // Keep this low-level entry point safe too. Structured translation normally
      // expands contractions first, but menus and helper paths may call it
      // directly; apostrophe-s must never fall through to possessive handling.
      const tokens = expandContractions(typeof tokensOrText === "string" ? tokenize(tokensOrText) : tokensOrText);
      const units = [];
      const consumedPhrasalParticles = new Set();
      const futurePhrasalVerbs = new Set();
      let position = 0;
      let translatedParts = 0;
      let unknownWords = 0;
      const chooseCategory = (lookup, categories) => {
        if (!lookup) return null;
        return lookup.options.find((option) => categories.includes(option.category)) || null;
      };

      while (position < tokens.length) {
        if (consumedPhrasalParticles.has(position)) {
          position += 1;
          continue;
        }
        const token = tokens[position];
        if (!WORD_RE.test(token)) {
          units.push({ text: token, category: "punct", source: token });
          position += 1;
          continue;
        }

        const lower = token.toLocaleLowerCase();

        if (lower === "will") {
          let futureFrame = false;
          for (let particlePosition = position + 3;
            particlePosition < Math.min(tokens.length, position + 9); particlePosition += 1) {
            if (/[,;:.!?]/u.test(tokens[particlePosition])) break;
            const afterParticle = tokens[particlePosition + 1]?.toLocaleLowerCase();
            const particleIntroducesNominal = Boolean(afterParticle)
              && (ARTICLES.has(afterParticle) || ENGLISH_DETERMINERS.has(afterParticle)
                || this.lookupEnglish(tokens, particlePosition + 1)?.options.some((option) => ["n", "adj", "poss"].includes(option.category)));
            if (particleIntroducesNominal) continue;
            const phraseOptions = this.englishIndex.get(keyFor([tokens[position + 1], tokens[particlePosition]])) || [];
            if (phraseOptions.some((option) => option.category === "v")) {
              futureFrame = true;
              break;
            }
          }
          if (futureFrame) {
            futurePhrasalVerbs.add(position + 1);
            position += 1;
            continue;
          }
        }

        // A separable English phrasal verb may surround a complete object or
        // an adverb (put me up, carry that heavy bag on, look it carefully
        // over). Match its lexical frame first, but leave the intervening
        // words to the ordinary noun/adverb parser so their syntax, object
        // marker and highlighting remain intact.
        let separatedPhrasal = null;
        for (let particlePosition = position + 2;
          particlePosition < Math.min(tokens.length, position + 8); particlePosition += 1) {
          if (/[,;:.!?]/u.test(tokens[particlePosition])) break;
          const afterParticle = tokens[particlePosition + 1]?.toLocaleLowerCase();
          const particleIntroducesNominal = Boolean(afterParticle)
            && (ARTICLES.has(afterParticle) || ENGLISH_DETERMINERS.has(afterParticle)
              || this.lookupEnglish(tokens, particlePosition + 1)?.options.some((option) => ["n", "adj", "poss"].includes(option.category)));
          if (particleIntroducesNominal) continue;
          const phraseOptions = this.englishIndex.get(keyFor([token, tokens[particlePosition]])) || [];
          const verbs = this.preferredEnglishOption(
            joinTokens([token, tokens[particlePosition]]),
            phraseOptions,
          ).filter((option) => option.category === "v");
          if (!verbs.length) continue;
          const middleValid = tokens.slice(position + 1, particlePosition).every((middle, offset) => {
            const middleLower = middle.toLocaleLowerCase();
            if (ARTICLES.has(middleLower) || ENGLISH_DETERMINERS.has(middleLower)
              || REFLEXIVE_PRONOUNS.has(middleLower) || SUBJECT_PRONOUNS.has(middleLower)) return true;
            const middleLookup = this.lookupEnglish(tokens, position + 1 + offset);
            return Boolean(middleLookup?.options.some((option) => ["n", "pn", "adj", "poss", "adv", "num"].includes(option.category)));
          });
          if (!middleValid) continue;
          let governedByModal = false;
          for (let index = units.length - 1; index >= 0; index -= 1) {
            const unit = units[index];
            if ((unit.category === "punct" && /[,;:.!?]/u.test(unit.text))
              || (unit.category === "marker" && ["tish", "la"].includes(unit.text))
              || ["ya", "kay", "te"].includes(unit.text)) break;
            if (/^(?:ni)?(?:poti|potil|potish|reki|rekil|rekish)$/iu.test(unit.text)) {
              governedByModal = true;
              break;
            }
            if (unit.category === "v" && !/^please$/iu.test(String(unit.source || ""))) break;
          }
          separatedPhrasal = (governedByModal
            ? verbs.find((option) => this.yapoEntries.get(option.yapo.toLocaleLowerCase())?.tense === "present")
            : null) || verbs[0];
          consumedPhrasalParticles.add(particlePosition);
          break;
        }
        if (separatedPhrasal) {
          const phrasalText = futurePhrasalVerbs.has(position)
            ? tenseYapoVerbPhrase(separatedPhrasal.yapo, "ish")
            : separatedPhrasal.yapo;
          units.push({
            text: phrasalText,
            category: "v",
            source: token,
          });
          translatedParts += 1;
          position += 1;
          continue;
        }

        if (ARTICLES.has(lower)) {
          position += 1;
          continue;
        }
        if (lower === "one") {
          const previousSemantic = [...units].reverse().find((unit) => !["punct", "marker"].includes(unit.category));
          if (["adj", "pred-adj"].includes(previousSemantic?.category)
            || ["this", "that", "these", "those"].includes(String(previousSemantic?.source || "").toLocaleLowerCase())) {
            position += 1;
            continue;
          }
        }

        if (lower === "could" && tokens[position + 1]?.toLocaleLowerCase() !== "not") {
          const subject = [...units].reverse().find((unit) => ["n", "pn", "basic"].includes(unit.category));
          const impersonal = ["it", "nothing", "nobody", "no one", "something", "anything", "everything"]
            .includes(String(subject?.source || "").toLocaleLowerCase());
          units.push({ text: impersonal ? "poti" : "potil", category: "v", source: token });
          translatedParts += 1;
          position += 1;
          continue;
        }

        if (lower === "next") {
          const temporalLookup = this.lookupEnglish(tokens, position + 1);
          const temporalNoun = temporalLookup?.options.find((option) => option.category === "n"
            && ["time", "summer", "winter", "morning", "evening", "night", "day", "week", "month", "year"]
              .some((meaning) => keyFor(meaning) === keyFor(tokens.slice(position + 1, position + 1 + temporalLookup.length))));
          if (temporalNoun) {
            units.push({ text: "lon", category: "prep", source: token });
            units.push({ text: temporalNoun.yapo, category: "n", source: joinTokens(tokens.slice(position + 1, position + 1 + temporalLookup.length)) });
            units.push({ text: "koma", category: "adj", source: token });
            translatedParts += 2;
            position += 1 + temporalLookup.length;
            continue;
          }
        }

        if (lower === "what" && ["am", "is", "are", "was", "were"].includes(tokens[position + 1]?.toLocaleLowerCase())
          && ["this", "that", "these", "those"].includes(tokens[position + 2]?.toLocaleLowerCase())) {
          const copula = ["was", "were"].includes(tokens[position + 1].toLocaleLowerCase()) ? "yesil" : "yesi";
          units.push({ text: "kiyo", category: "pn", source: token });
          units.push({ text: copula, category: "v", source: tokens[position + 1] });
          units.push({ text: "e", category: "marker", source: "(question complement)" });
          units.push({ text: "tish", category: "pn", source: tokens[position + 2] });
          translatedParts += 4;
          position += 3;
          continue;
        }

        if (POSSESSIVE_DETERMINERS.has(lower) && this.englishDemonstrativeModifiesNoun(tokens, position)) {
          const lookup = this.lookupEnglish(tokens, position);
          const possessive = chooseCategory(lookup, ["poss"]);
          if (possessive) {
            units.push({ text: possessive.yapo, category: "poss", source: token });
            translatedParts += 1;
            position += Math.max(1, lookup.length);
            continue;
          }
        }

        // English "at" is locative after a nominal/copular context, but after
        // an action verb it marks the target/direction of that action.  The
        // latter uses pen: "life throws at you" -> "feco tami pen tu".
        if (lower === "at") {
          const previousSemantic = [...units].reverse().find((unit) => !["punct", "marker", "adv"].includes(unit.category));
          if (previousSemantic?.category === "v" && !/^yes(?:i|il|ish)$/iu.test(previousSemantic.text)) {
            units.push({ text: "pen", category: "prep", source: token });
            translatedParts += 1;
            position += 1;
            continue;
          }
        }

        if (lower === "by-passive") {
          units.push({ text: "tan", category: "prep", source: "by" });
          translatedParts += 1;
          position += 1;
          continue;
        }

        if (lower === "by") {
          const previousVerb = [...units].reverse().find((unit) => !["punct", "marker", "adv"].includes(unit.category));
          const sourceVerb = tokenize(String(previousVerb?.source || "")).find((candidate) => WORD_RE.test(candidate))?.toLocaleLowerCase();
          const lemma = sourceVerb ? this.englishVerbLemmas.get(sourceVerb) : null;
          if (previousVerb?.category === "v" && lemma
            && (IRREGULAR_PARTICIPLES[lemma.base] === sourceVerb || /ed$/iu.test(sourceVerb))) {
            units.push({ text: "tan", category: "prep", source: token });
            translatedParts += 1;
            position += 1;
            continue;
          }
        }

        if (["up", "off", "out", "away"].includes(lower)) {
          const previousVerb = [...units].reverse().find((unit) => !["punct", "marker", "adv"].includes(unit.category));
          const nextStartsNominal = POSSESSIVE_DETERMINERS.has(tokens[position + 1]?.toLocaleLowerCase())
            || ARTICLES.has(tokens[position + 1]?.toLocaleLowerCase())
            || Boolean(this.lookupEnglish(tokens, position + 1)?.options.some((option) => ["n", "pn", "adj", "poss"].includes(option.category)));
          if (previousVerb?.category === "v" && nextStartsNominal) {
            position += 1;
            continue;
          }
        }

        if (lower === "how" && position + 3 < tokens.length) {
          const adjectiveLookup = this.lookupEnglish(tokens, position + 1);
          const subjectLookup = this.lookupEnglish(tokens, position + 2);
          const verbLookup = this.lookupEnglish(tokens, position + 3);
          const adjective = chooseCategory(adjectiveLookup, ["adj"]);
          const subject = chooseCategory(subjectLookup, ["pn", "n"]);
          const verb = chooseCategory(verbLookup, ["v"]);
          const quantifiedSubject = ["all", "any", "each", "every", "many", "much", "no", "some"]
            .includes(tokens[position + 1]?.toLocaleLowerCase());
          if (quantifiedSubject && adjective && subject && verb && verbLookup.length === 1) {
            units.push({ text: "tish", category: "marker", source: token });
            units.push({ text: subject.yapo, category: subject.category, source: tokens[position + 2] });
            units.push({ text: adjective.yapo, category: "adj", source: tokens[position + 1] });
            units.push({ text: verb.yapo, category: "v", source: tokens[position + 3] });
            units.push({ text: "kiye", category: "adv", source: token });
            translatedParts += 5;
            position += 4;
            continue;
          }
          if (subject && verb && verbLookup.length === 1) {
            units.push({ text: "tish", category: "marker", source: token });
            units.push({ text: subject.yapo, category: subject.category, source: tokens[position + 2] });
            units.push({ text: verb.yapo, category: "v", source: tokens[position + 3] });
            const adjectiveAsAdverb = adjective?.yapo.endsWith("a")
              ? `${adjective.yapo.slice(0, -1)}e`
              : adjective?.yapo;
            units.push({
              text: adjectiveAsAdverb || tokens[position + 1],
              category: adjective ? "adv" : "unknown",
              source: tokens[position + 1],
            });
            units.push({ text: "kiye", category: "adv", source: token });
            translatedParts += adjective ? 5 : 4;
            unknownWords += adjective ? 0 : 1;
            const followingCopula = tokens[position + 4]?.toLocaleLowerCase() === "to"
              && tokens[position + 5]?.toLocaleLowerCase() === "be";
            if (followingCopula && position + 6 < tokens.length) {
              units.push({ text: "yesi", category: "v", source: joinTokens(tokens.slice(position + 4, position + 6)) });
              units.push({ text: "e", category: "marker", source: joinTokens(tokens.slice(position + 4, position + 6)) });
            }
            position += followingCopula ? 6 : 4;
            continue;
          }
        }

        if (lower === "if") {
          units.push({ text: "li", category: "marker", source: token });
          translatedParts += 1;
          position += 1;
          continue;
        }

        if (lower === "of") {
          const phraseLookup = this.lookupEnglish(tokens, position);
          if (phraseLookup?.length > 1) {
            const phraseOption = phraseLookup.options[0];
            units.push({ text: phraseOption.yapo, category: phraseOption.category, source: joinTokens(tokens.slice(position, position + phraseLookup.length)) });
            translatedParts += 1;
            position += phraseLookup.length;
            continue;
          }
          const nextLookup = this.lookupEnglish(tokens, position + 1);
          const possessiveOwner = chooseCategory(nextLookup, ["poss"]);
          const nextNominal = chooseCategory(nextLookup, ["n", "pn"]);
          const previousSource = String([...units].reverse().find((unit) => !["punct", "marker"].includes(unit.category))?.source || "")
            .toLocaleLowerCase();
          const quantityHead = /^(?:all|some|any|many|much|few|several|enough|lot|lots|plenty|one|two|three|four|five|six|seven|eight|nine|ten|hundreds?|thousands?|millions?|billions?)$/u.test(previousSource);
          const relation = quantityHead ? "__of__"
            : possessiveOwner ? "a"
              : nextNominal?.category === "pn" ? "tan"
                : nextNominal ? "a" : "__of__";
          units.push({ text: relation, category: relation === "tan" ? "prep" : "marker", source: token });
          translatedParts += 1;
          position += 1;
          continue;
        }

        if (["this", "that", "these", "those"].includes(lower)) {
          if (this.englishDemonstrativeModifiesNoun(tokens, position)) {
            units.push({ text: "tish", category: "adj", source: token });
            translatedParts += 1;
            position += 1;
            continue;
          }
          if (lower === "that") {
            const tailHasClause = tokens.slice(position + 1).some((candidate) => SUBJECT_PRONOUNS.has(candidate.toLocaleLowerCase()))
              && tokens.slice(position + 1).some((_candidate, offset) => this.tokenHasEnglishCategory(tokens, position + 1 + offset, "v"));
            if (!tailHasClause) {
              const previousVerb = [...units].reverse().find((unit) => unit.category !== "punct");
              if (previousVerb?.category === "v") units.push({ text: "e", category: "marker", source: "(object)" });
              units.push({ text: "tish", category: "pn", source: token });
              translatedParts += 1;
              position += 1;
              continue;
            }
          }
        }

        if (lower === "such") {
          const nextLookup = this.lookupEnglish(tokens, position + 1);
          if (chooseCategory(nextLookup, ["adj", "n"])) {
            units.push({ text: "tish", category: "adj", source: token });
            translatedParts += 1;
            position += 1;
            continue;
          }
        }

        if (RELATIVE_CONNECTORS.has(lower)) {
          const previousSemantic = [...units].reverse().find((unit) => !["punct", "marker"].includes(unit.category));
          if (previousSemantic) {
            units.push({ text: "tish", category: "marker", source: token });
            if (lower === "which" && chooseCategory(this.lookupEnglish(tokens, position + 1), ["n"])) {
              units.push({ text: "kiya", category: "adj", source: token });
            }
            translatedParts += 1;
            position += 1;
            continue;
          }
        }

        if (["can", "could"].includes(lower) && tokens[position + 1]?.toLocaleLowerCase() === "not") {
          units.push({ text: lower === "could" ? "nipotil" : "nipoti", category: "v", source: joinTokens(tokens.slice(position, position + 2)) });
          translatedParts += 1;
          position += 2;
          continue;
        }

        if (["am", "is", "are", "was", "were"].includes(lower)
          && tokens[position + 1]?.toLocaleLowerCase() === "not") {
          const yapoBe = ["was", "were"].includes(lower) ? "yesil" : "yesi";
          units.push({ text: `ni${yapoBe}`, category: "v", source: joinTokens(tokens.slice(position, position + 2)) });
          translatedParts += 1;
          position += 2;
          continue;
        }

        if (lower === "will" && tokens[position + 1]?.toLocaleLowerCase() === "not"
          && tokens[position + 2]?.toLocaleLowerCase() === "be") {
          units.push({ text: "niyesish", category: "v", source: joinTokens(tokens.slice(position, position + 3)) });
          translatedParts += 1;
          position += 3;
          continue;
        }

        if (["do", "does", "did", "will"].includes(lower)
          && tokens[position + 1]?.toLocaleLowerCase() === "not") {
          const possibleSubject = tokens[position + 2]?.toLocaleLowerCase();
          const imperativeSubject = ["you", "thou", "ye"].includes(possibleSubject);
          const verbPosition = position + (imperativeSubject ? 3 : 2);
          const verbLookup = this.lookupEnglish(tokens, verbPosition);
          const verb = verbLookup?.options.find((option) => option.category === "v"
            && this.yapoEntries.get(option.yapo.toLocaleLowerCase())?.tense === "present")
            || chooseCategory(verbLookup, ["v"]);
          if (verb) {
            let yapoVerb = verb.yapo.replace(/-$/u, "");
            if (lower === "did" && yapoVerb.endsWith("i")) yapoVerb = `${yapoVerb.slice(0, -1)}il`;
            if (lower === "will" && yapoVerb.endsWith("i")) yapoVerb = `${yapoVerb.slice(0, -1)}ish`;
            units.push({ text: `ni${yapoVerb}`, category: "v", source: joinTokens(tokens.slice(position, verbPosition + verbLookup.length)) });
            translatedParts += 1;
            position = verbPosition + verbLookup.length;
            continue;
          }
          if (imperativeSubject && WORD_RE.test(tokens[verbPosition] || "")) {
            units.push({ text: "to", category: "marker", source: joinTokens(tokens.slice(position, verbPosition)) });
            units.push({ text: "ni", category: "marker", source: joinTokens(tokens.slice(position, verbPosition)) });
            units.push({ text: tokens[verbPosition], category: "unknown", source: tokens[verbPosition] });
            unknownWords += 1;
            position = verbPosition + 1;
            continue;
          }
        }

        if (lower === "nothing" && tokens[position + 1]?.toLocaleLowerCase() === "but") {
          units.push({ text: "yene", category: "adv", source: joinTokens(tokens.slice(position, position + 2)) });
          translatedParts += 1;
          position += 2;
          continue;
        }

        if (lower === "no" && tokens[position + 1]?.toLocaleLowerCase() === "more") {
          units.push({ text: "nimaymulte", category: "adv", source: joinTokens(tokens.slice(position, position + 2)) });
          translatedParts += 1;
          position += 2;
          continue;
        }

        if (["so", "too"].includes(lower)
          && ["much", "many"].includes(tokens[position + 1]?.toLocaleLowerCase())) {
          const degree = tokens[position + 2]?.toLocaleLowerCase();
          const degreeLookup = ["more", "most"].includes(degree)
            ? this.lookupEnglish(tokens, position + 3)
            : null;
          const degreeModified = degreeLookup ? chooseCategory(degreeLookup, ["adj", "adv"]) : null;
          if (degreeModified) {
            units.push({
              text: `mu${degree === "most" ? "ney" : "may"}${degreeModified.yapo.replace(/-$/u, "")}`,
              category: degreeModified.category,
              source: joinTokens(tokens.slice(position, position + 3 + degreeLookup.length)),
            });
            translatedParts += 1;
            position += 3 + degreeLookup.length;
            continue;
          }
          const following = this.lookupEnglish(tokens, position + 2);
          const adjectiveUse = Boolean(chooseCategory(following, ["n"]));
          units.push({
            text: adjectiveUse ? "mumulta" : "mumulte",
            category: adjectiveUse ? "adj" : "adv",
            source: joinTokens(tokens.slice(position, position + 2)),
          });
          translatedParts += 1;
          position += 2;
          continue;
        }

        if (lower === "so") {
          const previous = units[units.length - 1];
          if (!previous || previous.category === "punct") {
            units.push({ text: "tish", category: "marker", source: token });
            translatedParts += 1;
            position += 1;
            continue;
          }
        }

        if (["not", "more", "most", "very", "so", "too"].includes(lower)) {
          let cursor = position;
          const prefixes = new Set();
          while (cursor < tokens.length) {
            const modifier = tokens[cursor].toLocaleLowerCase();
            if (modifier === "not") prefixes.add("ni");
            else if (["very", "so", "too"].includes(modifier)) prefixes.add("mu");
            else if (modifier === "more") prefixes.add("may");
            else if (modifier === "most") prefixes.add("ney");
            else break;
            cursor += 1;
          }
          const nextLookup = this.lookupEnglish(tokens, cursor);
          const categories = prefixes.has("ni") ? ["v", "adj", "adv"] : ["adj", "adv"];
          const modified = chooseCategory(nextLookup, categories);
          if (modified) {
            const degree = prefixes.has("ney") ? "ney" : prefixes.has("may") ? "may" : "";
            const orderedPrefix = `${prefixes.has("ni") ? "ni" : ""}${prefixes.has("mu") ? "mu" : ""}${degree}`;
            units.push({
              text: `${orderedPrefix}${modified.yapo.replace(/-$/u, "")}`,
              category: modified.category,
              source: joinTokens(tokens.slice(position, cursor + nextLookup.length)),
            });
            translatedParts += 1;
            position = cursor + nextLookup.length;
            continue;
          }
          if (lower === "more") {
            units.push({ text: "maymulte", category: "adv", source: token });
            translatedParts += 1;
            position += 1;
            continue;
          }
        }

        if (lower === "to") {
          const nextLookup = this.lookupEnglish(tokens, position + 1);
          let hasPreviousVerb = false;
          for (let index = units.length - 1; index >= 0; index -= 1) {
            if (units[index].category === "punct" && /[,;:.!?]/u.test(units[index].text)) break;
            if (units[index].category === "v") {
              hasPreviousVerb = true;
              break;
            }
          }
          if (hasPreviousVerb && chooseCategory(nextLookup, ["v"])) {
            position += 1;
            continue;
          }
        }

        if ((tokens[position + 1] === "'" || tokens[position + 1] === "’")
          && /s$/iu.test(token) && WORD_RE.test(tokens[position + 2] || "")) {
          const baseOptions = this.englishIndex.get(keyFor(token)) || [];
          const base = baseOptions.find((option) => option.category === "n") || baseOptions[0];
          units.push({
            text: base?.yapo || token,
            category: "poss-owner",
            ownerCategory: base?.category || "n",
            source: joinTokens(tokens.slice(position, position + 2)),
          });
          translatedParts += Number(Boolean(base));
          unknownWords += Number(!base);
          position += 2;
          continue;
        }

        const contractionKey = token.toLocaleLowerCase().replaceAll("’", "'");
        const possessiveMatch = CONTRACTIONS[contractionKey] ? null : token.match(/^(.+?)(?:'s|’s)$/iu);
        if (possessiveMatch) {
          const owner = possessiveMatch[1];
          const baseOptions = this.englishIndex.get(keyFor(owner)) || [];
          const baseOption = baseOptions.find((option) => ["n", "pn"].includes(option.category)) || baseOptions[0];
          const base = baseOption?.yapo || owner;
          units.push({ text: base, category: "poss-owner", ownerCategory: baseOption?.category || (/^\p{Lu}/u.test(owner) ? "n" : "unknown"), source: token });
          translatedParts += 1;
          position += 1;
          continue;
        }

        if (position + 2 < tokens.length) {
          const interruptedOptions = this.englishIndex.get(keyFor([tokens[position], tokens[position + 2]])) || [];
          const preferredInterrupted = this.preferredEnglishOption(
            joinTokens([tokens[position], tokens[position + 2]]),
            interruptedOptions,
          ).filter((option) => option.category === "v");
          let localModal = false;
          for (let index = units.length - 1; index >= 0; index -= 1) {
            const unit = units[index];
            if ((unit.category === "punct" && /[,;:.!?]/u.test(unit.text))
              || (unit.category === "marker" && ["tish", "la"].includes(unit.text))
              || ["ya", "kay", "te"].includes(unit.text)) break;
            if (/^(?:ni)?(?:poti|potil|potish|reki|rekil|rekish)$/iu.test(unit.text)) {
              localModal = true;
              break;
            }
            if (unit.category === "v" && !/^please$/iu.test(String(unit.source || ""))) break;
          }
          const interruptedVerb = (localModal
            ? preferredInterrupted.find((option) => this.yapoEntries.get(option.yapo.toLocaleLowerCase())?.tense === "present")
            : null) || preferredInterrupted[0];
          const middleLookup = this.lookupEnglish(tokens, position + 1);
          const middleAdverb = chooseCategory(middleLookup, ["adv"]);
          if (interruptedVerb && middleAdverb && middleLookup.length === 1) {
            units.push({
              text: interruptedVerb.yapo,
              category: "v",
              source: joinTokens(tokens.slice(position, position + 3)),
            });
            units.push({ text: middleAdverb.yapo, category: "adv", source: tokens[position + 1] });
            translatedParts += 2;
            position += 3;
            continue;
          }
          const middleObject = chooseCategory(middleLookup, ["pn", "n"]);
          if (interruptedVerb && middleObject && middleLookup.length === 1) {
            units.push({
              text: interruptedVerb.yapo,
              category: "v",
              source: joinTokens([tokens[position], tokens[position + 2]]),
            });
            units.push({ text: middleObject.yapo, category: middleObject.category, source: tokens[position + 1] });
            translatedParts += 2;
            position += 3;
            continue;
          }
        }

        const lookup = this.lookupEnglish(tokens, position);
        if (lookup) {
          let clauseStart = 0;
          for (let index = units.length - 1; index >= 0; index -= 1) {
            if ((units[index].category === "punct" && /[,;:.!?]/u.test(units[index].text))
              || (units[index].category === "marker" && ["tish", "la"].includes(units[index].text))) {
              clauseStart = index + 1;
              break;
            }
          }
          const clauseUnits = units.slice(clauseStart);
          const previousSemantic = [...clauseUnits].reverse().find((unit) => unit.category !== "punct");
          const hasVerb = clauseUnits.some((unit) => unit.category === "v");
          const hasSubject = clauseUnits.some((unit) => ["n", "pn"].includes(unit.category));
          const nextLookup = this.lookupEnglish(tokens, position + lookup.length);
          const hasCategory = (category) => lookup.options.some((option) => option.category === category);
          let nounAhead = false;
          for (let cursor = position + lookup.length; cursor < tokens.length; cursor += 1) {
            const ahead = this.lookupEnglish(tokens, cursor);
            if (!ahead) break;
            if (ahead.options.some((option) => option.category === "n")) { nounAhead = true; break; }
            const onlyModifier = ahead.options.every((option) => ["adj", "poss"].includes(option.category));
            if (!onlyModifier) break;
            cursor += Math.max(0, ahead.length - 1);
          }
          const nextHasNoun = nextLookup?.options.some((option) => option.category === "n") || nounAhead;
          let preferredCategories = [];
          if (forceInitialVerb && !hasVerb && !hasSubject && hasCategory("v")) {
            preferredCategories = ["v", "adv", "adj", "n", "pn"];
          } else if (["ya", "kay", "te"].includes(previousSemantic?.text) && hasCategory("v")) {
            preferredCategories = ["v", "adv", "adj", "n", "pn"];
          } else if (hasVerb && ["n", "pn"].includes(previousSemantic?.category) && hasCategory("adj")) {
            preferredCategories = ["adj", "adv", "n", "pn", "v"];
          } else if (nextHasNoun && hasCategory("adj")) preferredCategories = ["adj", "n", "pn", "v", "adv"];
          else if (hasSubject && !hasVerb) preferredCategories = ["v", "adv", "adj", "n", "pn"];
          else if (hasVerb) preferredCategories = ["n", "pn", "adv", "adj", "v"];
          else if (hasCategory("n") || hasCategory("pn")) preferredCategories = ["pn", "n", "adj", "v", "adv"];
          else if (["poti"].includes(previousSemantic?.text)) preferredCategories = ["v", "adv", "adj"];
          else preferredCategories = allowImperative && tokens.includes("!") ? ["v", "n", "pn", "adj", "adv"] : [];
          const lookupSource = joinTokens(tokens.slice(position, position + lookup.length));
          const legacyPreferred = this.preferences.english[this.preferenceKey(lookupSource)];
          const oneCategoryOnly = new Set(lookup.options.map((option) => option.category)).size === 1;
          // Adverbs and politeness verbs may intervene between a modal and
          // its lexical verb ("could you please put", "should always keep").
          // Inspect the whole local clause instead of only the adjacent unit;
          // the lexical verb after a modal must stay in its present/base YT
          // form because the modal already carries tense and mood.
          const lastSyntaxBoundary = clauseUnits.findLastIndex((unit) => ["ya", "kay", "te"].includes(unit.text));
          const modalSegment = clauseUnits.slice(lastSyntaxBoundary + 1);
          const lastModalIndex = modalSegment.findLastIndex((unit) => unit.category === "v"
            && /^(?:ni)?(?:poti|potil|potish|reki|rekil|rekish)$/iu.test(unit.text));
          const modalGovernor = lastModalIndex >= 0
            && !modalSegment.slice(lastModalIndex + 1).some((unit) => unit.category === "v"
              && !/^please$/iu.test(String(unit.source || "")));
          const presentVerbAfterModal = modalGovernor
            ? lookup.options.find((option) => option.category === "v"
              && this.yapoEntries.get(option.yapo.toLocaleLowerCase())?.tense === "present")
            : null;
          const chosen = presentVerbAfterModal || (legacyPreferred && oneCategoryOnly ? lookup.options[0] : preferredCategories
            .map((category) => lookup.options.find((option) => option.category === category))
            .find(Boolean) || lookup.options[0]);
          units.push({
            text: chosen.yapo,
            category: chosen.category,
            inferredCategory: chosen.temporaryUnknown ? chosen.category : undefined,
            unknown: Boolean(chosen.temporaryUnknown),
            source: joinTokens(tokens.slice(position, position + lookup.length)),
          });
          if (chosen.temporaryUnknown) unknownWords += lookup.length;
          else translatedParts += 1;
          position += lookup.length;
          continue;
        }

        const contextualCategory = this.inferUnknownEnglishCategory(tokens, position, units);
        const properName = /^\p{Lu}[\p{L}\p{M}'’\-]*$/u.test(token) && contextualCategory !== "v";
        const inferredCategory = properName ? "n" : contextualCategory;
        units.push({
          text: token,
          category: inferredCategory,
          inferredCategory,
          unknown: !properName,
          properName,
          source: token,
        });
        if (!properName) unknownWords += 1;
        position += 1;
      }

      for (let index = 0; index < units.length; index += 1) {
        if (units[index].category !== "poss-owner") continue;
        let leadingStart = index;
        while (leadingStart > 0 && MODIFIER_CATEGORIES.has(units[leadingStart - 1].category)) leadingStart -= 1;
        const leadingModifiers = units.slice(leadingStart, index);
        let cursor = index + 1;
        const modifiers = [];
        while (cursor < units.length && MODIFIER_CATEGORIES.has(units[cursor].category)) {
          modifiers.push(units[cursor]);
          cursor += 1;
        }
        const owner = units[index];
        const resolvedOwner = { ...owner, category: owner.ownerCategory || "unknown" };
        if (units[cursor]?.category !== "n") {
          units.splice(index, 1, { text: "a", category: "marker", source: owner.source }, resolvedOwner);
          index += 1;
          continue;
        }
        units.splice(leadingStart, cursor - leadingStart + 1,
          units[cursor], ...modifiers.reverse(), { text: "a", category: "marker", source: owner.source }, resolvedOwner, ...leadingModifiers);
        index = leadingStart;
      }

      let reordered = [];
      for (let index = 0; index < units.length; index += 1) {
        if (MODIFIER_CATEGORIES.has(units[index].category)) {
          const modifiers = [];
          let cursor = index;
          let coordinated = false;
          while (cursor < units.length) {
            if (MODIFIER_CATEGORIES.has(units[cursor].category)) {
              modifiers.push(units[cursor]);
              cursor += 1;
              continue;
            }
            if (units[cursor].text === "ya" && MODIFIER_CATEGORIES.has(units[cursor + 1]?.category)) {
              coordinated = true;
              modifiers.push(units[cursor]);
              cursor += 1;
              continue;
            }
            break;
          }
          if (cursor < units.length && units[cursor].category === "n") {
            reordered.push(units[cursor], ...(coordinated ? modifiers : modifiers.reverse()));
            index = cursor;
            continue;
          }
        }
        reordered.push(units[index]);
      }

      for (let index = 1; index < reordered.length; index += 1) {
        if (reordered[index].category === "prep" && reordered[index - 1].category === "prep"
          && reordered[index].text === reordered[index - 1].text) {
          reordered.splice(index, 1);
          index -= 1;
        }
      }

      for (let index = 0; index < reordered.length - 1; index += 1) {
        if (reordered[index].text === "e" && reordered[index + 1].text === "che") {
          reordered.splice(index, 1);
          index -= 1;
        }
      }

      for (let copulaIndex = 0; copulaIndex < reordered.length; copulaIndex += 1) {
        if (!/^(?:ni)?yes(?:i|il|ish)$/iu.test(reordered[copulaIndex].text)) continue;
        const adjectiveIndex = reordered.findIndex((unit, index) => index > copulaIndex && ["adj", "pred-adj"].includes(unit.category));
        if (adjectiveIndex < 0) continue;
        const adverbIndexes = [];
        for (let index = adjectiveIndex + 1; index < reordered.length; index += 1) {
          const unit = reordered[index];
          if (unit.category === "punct" || unit.category === "prep" || unit.category === "v") break;
          if (unit.category === "adv") adverbIndexes.push(index);
        }
        if (!adverbIndexes.length) continue;
        const adverbs = adverbIndexes.map((index) => reordered[index]);
        for (const index of adverbIndexes.reverse()) reordered.splice(index, 1);
        reordered.splice(adjectiveIndex, 0, ...adverbs);
      }

      // Yapo adverbs modify the verb before the object marker. English often
      // leaves them after the object ("value you highly"). Move that complete
      // adverb run next to its verb before dative/object processing.
      for (let verbIndex = 0; verbIndex < reordered.length; verbIndex += 1) {
        if (reordered[verbIndex].category !== "v") continue;
        if (/\s(?:kun|lon|pen|tan)$/iu.test(reordered[verbIndex].text)) continue;
        let objectIndex = -1;
        for (let index = verbIndex + 1; index < reordered.length; index += 1) {
          const unit = reordered[index];
          if (unit.category === "prep" || unit.category === "v" || unit.text === "tish"
            || (unit.category === "punct" && /[,;:.!?]/u.test(unit.text))) break;
          if (["n", "pn"].includes(unit.category)) {
            objectIndex = index;
            break;
          }
        }
        if (objectIndex < 0) continue;
        const trailingAdverbIndexes = [];
        for (let index = objectIndex + 1; index < reordered.length; index += 1) {
          const unit = reordered[index];
          if (unit.category === "prep" || unit.category === "v" || unit.text === "tish"
            || (unit.category === "punct" && /[,;:.!?]/u.test(unit.text))) break;
          if (unit.category === "adv") trailingAdverbIndexes.push(index);
        }
        if (!trailingAdverbIndexes.length) continue;
        const adverbs = trailingAdverbIndexes.map((index) => reordered[index]);
        for (const index of trailingAdverbIndexes.reverse()) reordered.splice(index, 1);
        reordered.splice(verbIndex + 1, 0, ...adverbs);
        verbIndex += adverbs.length;
      }

      // English double-object order is VERB + RECIPIENT + THEME. Yapo Teya
      // expresses the theme as the direct object and moves the recipient after
      // it with pen: "gave me peace" -> "tami e rafo pen su".
      for (let verbIndex = 0; verbIndex < reordered.length; verbIndex += 1) {
        const verb = reordered[verbIndex];
        if (verb.category !== "v") continue;
        const verbSource = tokenize(String(verb.source || "")).find((token) => WORD_RE.test(token)) || "";
        const verbLemma = this.englishVerbLemmas.get(verbSource.toLocaleLowerCase())?.base || verbSource.toLocaleLowerCase();
        if (!DATIVE_VERBS.has(verbLemma)) continue;
        const objectIndexes = [];
        for (let index = verbIndex + 1; index < reordered.length; index += 1) {
          const unit = reordered[index];
          if (unit.category === "prep" || unit.category === "v" || unit.text === "tish"
            || (unit.category === "marker" && unit.text !== "e")
            || (unit.category === "punct" && /[,;:.!?]/u.test(unit.text))) break;
          if (["n", "pn"].includes(unit.category)) objectIndexes.push(index);
          if (objectIndexes.length === 2) break;
        }
        if (objectIndexes.length < 2) continue;
        const [recipientIndex, themeIndex] = objectIndexes;
        const recipient = reordered[recipientIndex];
        const middle = reordered.slice(recipientIndex + 1, themeIndex);
        const theme = reordered[themeIndex];
        let themeEnd = themeIndex + 1;
        while (themeEnd < reordered.length
          && (MODIFIER_CATEGORIES.has(reordered[themeEnd].category)
            || (reordered[themeEnd].text === "ya" && MODIFIER_CATEGORIES.has(reordered[themeEnd + 1]?.category)))) {
          themeEnd += 1;
        }
        const themeModifiers = reordered.slice(themeIndex + 1, themeEnd);
        reordered.splice(recipientIndex, themeEnd - recipientIndex,
          ...middle, theme, ...themeModifiers, { text: "pen", category: "prep", source: "(recipient)" }, recipient);
      }

      for (let index = 0; index < reordered.length; index += 1) {
        const reflexive = reordered[index];
        if (!REFLEXIVE_PRONOUNS.has(String(reflexive.source || "").toLocaleLowerCase())) continue;
        const previous = reordered.slice(0, index).reverse().find((unit) => unit.category !== "punct");
        if (previous?.category === "prep") continue;
        let precedingVerb = -1;
        for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
          if (reordered[cursor].category === "v") {
            precedingVerb = cursor;
            break;
          }
          if (reordered[cursor].category === "punct") break;
        }
        const followingVerb = reordered.findIndex((unit, candidateIndex) => candidateIndex > index && unit.category === "v");
        const otherObjectBetween = precedingVerb >= 0 && reordered.slice(precedingVerb + 1, index)
          .some((unit) => ["n", "pn"].includes(unit.category)
            && !REFLEXIVE_PRONOUNS.has(String(unit.source || "").toLocaleLowerCase()));
        if (followingVerb >= 0 || otherObjectBetween) {
          reordered.splice(index, 1);
          let insertion = reordered.length;
          for (let cursor = Math.max(precedingVerb, followingVerb) + 1; cursor < reordered.length; cursor += 1) {
            if (reordered[cursor].category === "punct" && /[,;:.!?]/u.test(reordered[cursor].text)) {
              insertion = cursor;
              break;
            }
          }
          reordered.splice(insertion, 0, { text: "kun", category: "prep", source: "(emphatic reflexive)" }, reflexive);
          index = insertion + 1;
        } else if (precedingVerb >= 0) {
          reordered.splice(index, 1);
          reordered.splice(precedingVerb, 0, reflexive);
        }
      }

      // Every finite clause needs an overt subject marker. A missing subject
      // is restored as yu when third person is explicit in the verb shape or
      // inherited from a coordinated clause; otherwise the neutral imperative
      // marker to is placed immediately before the verb. Controlled verb
      // chains stay in one segment and therefore keep their overt subject.
      const wordCount = tokens.filter((token) => WORD_RE.test(token)).length;
      const implicitFirstPersonVerb = reordered.some((unit) => unit.category === "v"
        && (/^(?:thank(?:s|ed|ing)?|please)$/iu.test(String(unit.source || ""))
          || REFLEXIVE_PRONOUNS.has(String(unit.source || "").toLocaleLowerCase())));
      if (wordCount > 1 || tokens.some((token) => /[.!?]/u.test(token)) || implicitFirstPersonVerb) {
        reordered = this.completeSubjectlessEnglishClauses(reordered);
      }

      for (let verbIndex = 0; verbIndex < reordered.length; verbIndex += 1) {
        if (reordered[verbIndex].category !== "v") continue;
        if (/^(?:ni)?yes(?:i|il|ish)$/iu.test(reordered[verbIndex].text)) continue;
        const leadingAdverbs = [];
        for (let index = verbIndex - 1; index >= 0 && reordered[index].category === "adv"
          && !PREVERB_ADVERBS.has(reordered[index].text.toLocaleLowerCase()); index -= 1) {
          leadingAdverbs.unshift(reordered[index]);
        }
        if (leadingAdverbs.length) {
          reordered.splice(verbIndex - leadingAdverbs.length, leadingAdverbs.length);
          verbIndex -= leadingAdverbs.length;
          reordered.splice(verbIndex + 1, 0, ...leadingAdverbs);
        }
      }
      for (let verbIndex = 0; verbIndex < reordered.length; verbIndex += 1) {
        if (reordered[verbIndex].category !== "v") continue;
        if (/\s(?:kun|lon|pen|tan)$/iu.test(reordered[verbIndex].text)) continue;
        let clauseStart = 0;
        for (let index = verbIndex - 1; index >= 0; index -= 1) {
          if (reordered[index].category === "punct" && /[,;:.!?]/u.test(reordered[index].text)) {
            clauseStart = index + 1;
            break;
          }
        }
        let hasDirectObject = false;
        for (let index = verbIndex + 1; index < reordered.length; index += 1) {
          if (reordered[index].category === "prep"
            || reordered[index].text === "che"
            || (reordered[index].text === "tish" && reordered[index].category === "marker")
            || reordered[index].category === "v"
            || (reordered[index].category === "punct" && /[,;:.!?]/u.test(reordered[index].text))) break;
          if (["n", "pn"].includes(reordered[index].category) || reordered[index].text === "nish") {
            const reflexiveObject = REFLEXIVE_PRONOUNS.has(String(reordered[index].source || "").toLocaleLowerCase());
            if (reflexiveObject && reordered.slice(index + 1).some((candidate) => candidate.category === "v")) continue;
            hasDirectObject = true;
            break;
          }
        }
        const existentialNegative = /^(?:ni)?yes(?:i|il|ish)$/iu.test(reordered[verbIndex].text)
          && reordered.slice(clauseStart, verbIndex).some((unit) => unit.text === "akol")
          && reordered.slice(verbIndex + 1).some((unit) => unit.text === "nish");
        if (existentialNegative) hasDirectObject = false;
        if (hasDirectObject) {
          let markerIndex = verbIndex + 1;
          while (["adv", "adj", "pred-adj"].includes(reordered[markerIndex]?.category)
            || (reordered[markerIndex]?.category === "unknown"
              && reordered.slice(markerIndex + 1).some((candidate) => ["n", "pn"].includes(candidate.category)))) {
            markerIndex += 1;
          }
          if (reordered[markerIndex]?.text !== "tish" && reordered[markerIndex]?.text !== "e") {
            reordered.splice(markerIndex, 0, { text: "e", category: "marker" });
            verbIndex += 1;
          }
        }
      }

      return {
        text: joinTokens(reordered.filter((unit) => unit.text !== "__of__").map((unit) => unit.text)),
        translatedParts,
        unknownWords,
      };
    }

    yapoOptions(value) {
      const normalized = String(value || "").trim().toLocaleLowerCase();
      if (normalized === "yesi") return ["am", "is", "are", "be"].map((translation) => ({ value: translation, category: "v" }));
      if (normalized === "yesil") return ["was", "were", "been"].map((translation) => ({ value: translation, category: "v" }));
      if (normalized === "yesish") return [{ value: "will be", category: "v" }];
      if (normalized === "niyesi") return ["am not", "is not", "are not"].map((translation) => ({ value: translation, category: "v" }));
      if (normalized === "niyesil") return ["was not", "were not"].map((translation) => ({ value: translation, category: "v" }));
      if (normalized === "niyesish") return [{ value: "will not be", category: "v" }];
      if (normalized === "li") {
        const meanings = this.yapoEntries.get("li")?.meanings || [];
        return unique(["if", "would", ...meanings]).map((value) => ({ value, category: "marker" }));
      }
      if (normalized === "la") return [
        { value: "", category: "marker" },
        { value: "then", category: "marker" },
        { value: "so", category: "marker" },
        { value: "therefore", category: "marker" },
      ];
      if (normalized === "pi") return [{ value: "of", category: "marker" }];
      if (normalized === "e") return [
        { value: "", category: "marker" },
        { value: "a", category: "marker" },
        { value: "an", category: "marker" },
        { value: "the", category: "marker" },
      ];
      const phrase = this.yapoPhrases.get(keyFor(value));
      if (phrase) return phrase.meanings.map((meaning) => ({
        value: meaning,
        category: phrase.category,
        custom: this.isCustom(phrase.dictionaryCategory || phrase.category, value, meaning),
        entry: { category: phrase.dictionaryCategory || phrase.category, yapo: value, english: meaning },
      }));
      if (tokenize(value).length !== 1) return [];
      const analysis = this.analyzeYapoWord(value);
      if (!analysis) return /^\p{Lu}[\p{L}\p{M}'’\-]*$/u.test(String(value || "").trim())
        ? [{ value: String(value).trim(), category: "proper" }]
        : [];
      const options = analysis.meanings.map((meaning) => ({
        value: meaning,
        category: analysis.category,
        custom: this.isCustom(analysis.category, value, meaning),
        entry: { category: analysis.category, yapo: value, english: meaning },
      }));
      if (analysis.category === "prep") options.push({ value: "", category: "prep" });
      return options;
    }

    englishOptions(value) {
      const normalized = String(value || "").trim().toLocaleLowerCase();
      if (ARTICLES.has(normalized)) return [{ value: "", category: "marker" }];
      if (normalized === "if") return [{ value: "li", category: "marker" }];
      if (normalized === "not") return [{ value: "ni", category: "marker" }];
      if (normalized === "so") return [{ value: "mu", category: "marker" }, { value: "tish", category: "marker" }];
      if (normalized === "too") return [{ value: "mu", category: "marker" }, { value: "take", category: "adv" }];
      const contraction = CONTRACTIONS[normalized.replaceAll("’", "'")];
      if (contraction) {
        return [{ value: this.translateEnglish(value).text, category: "grammar" }];
      }
      if (RELATIVE_CONNECTORS.has(normalized)) {
        const indexed = this.preferredEnglishOption(value, this.englishIndex.get(keyFor(value)) || [])
          .map((option) => ({
            value: option.yapo,
            category: option.category,
            custom: this.isCustom(option.category, option.yapo, value),
            entry: { category: option.category, yapo: option.yapo, english: value },
          }));
        return [{ value: "tish", category: "marker" }, ...indexed.filter((option) => option.value !== "tish")];
      }
      const possessiveMatch = tokenize(value).length === 1
        ? String(value || "").trim().match(/^(.+?)(?:'s|’s)$/iu)
        : null;
      if (possessiveMatch) {
        const owner = possessiveMatch[1];
        const baseOptions = this.englishIndex.get(keyFor(owner)) || [];
        return [{ value: `a ${baseOptions[0]?.yapo || owner}`, category: "poss" }];
      }
      const directOptions = this.englishIndex.get(keyFor(value)) || [];
      const valueTokens = tokenize(value);
      const generatedOptions = !directOptions.length && valueTokens.length === 1
        ? this.negativePrefixedEnglishOptions(valueTokens[0])
        : [];
      const availableOptions = directOptions.length ? directOptions : generatedOptions;
      const indexed = this.preferredEnglishOption(value, availableOptions)
        .map((option) => ({
          value: option.yapo,
          category: option.category,
          custom: this.isCustom(option.category, option.yapo, value),
          entry: { category: option.category, yapo: option.yapo, english: value },
        }));
      if (!indexed.length && /^\p{Lu}[\p{L}\p{M}'’\-]*$/u.test(String(value || "").trim())) {
        return [{ value: String(value).trim(), category: "proper" }];
      }
      return indexed;
    }
  }

  global.YapoGrammar = {
    GrammarTranslator,
    tokenize,
    joinTokens,
    irregularForms: Object.freeze({
      past: Object.freeze({ ...IRREGULAR_PAST }),
      participles: Object.freeze({ ...IRREGULAR_PARTICIPLES }),
    }),
  };
})(typeof window !== "undefined" ? window : globalThis);
