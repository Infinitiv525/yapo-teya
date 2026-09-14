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
  const PREVERB_ADVERBS = new Set(["yene"]);
  const DATIVE_VERBS = new Set([
    "give", "gift", "hand", "lend", "loan", "offer", "pay", "promise", "read", "sell",
    "send", "show", "teach", "tell", "throw", "wish", "write",
  ]);
  const NUMBER_WORDS = {
    "0": "zero", "1": "one", "2": "two", "3": "three", "4": "four", "5": "five",
    "6": "six", "7": "seven", "8": "eight", "9": "nine", "10": "ten",
    "100": "hundred", "1000": "thousand", "1000000": "million", "1000000000": "billion",
  };
  const CONTRACTIONS = {
    "ain't": ["is", "not"], "amn't": ["am", "not"],
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
  };

  const IRREGULAR_PLURALS = {
    child: "children", person: "people", human: "humans", man: "men", woman: "women",
    mouse: "mice", foot: "feet", tooth: "teeth", goose: "geese", fish: "fish",
  };
  const IRREGULAR_PAST = {
    be: "was", become: "became", begin: "began", break: "broke", bring: "brought",
    build: "built", buy: "bought", catch: "caught", choose: "chose", come: "came",
    do: "did", drink: "drank", drive: "drove", eat: "ate", fall: "fell", feel: "felt",
    find: "found", fly: "flew", forget: "forgot", get: "got", give: "gave", go: "went",
    grow: "grew", have: "had", hear: "heard", hold: "held", keep: "kept", know: "knew",
    lead: "led", leave: "left", lose: "lost", make: "made", meet: "met", pay: "paid",
    read: "read", run: "ran", say: "said", see: "saw", sell: "sold", send: "sent",
    sit: "sat", sleep: "slept", speak: "spoke", stand: "stood", swim: "swam",
    take: "took", teach: "taught", tell: "told", think: "thought", understand: "understood",
    wear: "wore", win: "won", write: "wrote",
  };
  const IRREGULAR_PARTICIPLES = {
    be: "been", become: "become", begin: "begun", break: "broken", bring: "brought",
    build: "built", buy: "bought", catch: "caught", choose: "chosen", come: "come",
    do: "done", drink: "drunk", drive: "driven", eat: "eaten", fall: "fallen", feel: "felt",
    find: "found", fly: "flown", forget: "forgotten", get: "gotten", give: "given", go: "gone",
    grow: "grown", have: "had", hear: "heard", hold: "held", keep: "kept", know: "known",
    lead: "led", leave: "left", lose: "lost", make: "made", meet: "met", pay: "paid",
    read: "read", run: "run", say: "said", see: "seen", sell: "sold", send: "sent",
    sit: "sat", sleep: "slept", speak: "spoken", stand: "stood", swim: "swum",
    take: "taken", teach: "taught", tell: "told", think: "thought", understand: "understood",
    wear: "worn", win: "won", write: "written",
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
    if (!/^\s*\p{Lu}/u.test(source) || !translation) return translation;
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
    for (const token of tokens) {
      const replacement = CONTRACTIONS[token.toLocaleLowerCase().replaceAll("’", "'")];
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
                const numberWord = NUMBER_WORDS[String(meaning).replaceAll(",", "")];
                if (numberWord) this.addEnglishOption(numberWord, word, "num", 0);
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
      this.addEnglishOption("yes", "tish", "basic", -10);
      this.addEnglishOption("this", "tish", "adj", -10);
      this.addEnglishOption("that", "tish", "basic", -10);
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
      this.addEnglishOption("also", "take", "adv", -10);
      this.addEnglishOption("as well", "take", "adv", -10);
      this.addEnglishOption("by", "kun", "prep", -10);
      this.addEnglishOption("could", "poti", "v", -10);
      this.addEnglishOption("such", "tish", "adj", -10);
      for (const options of this.englishIndex.values()) options.sort((a, b) => a.score - b.score || a.yapo.localeCompare(b.yapo));
      this.usableEntries = this.yapoEntries.size;
    }

    addEnglishOption(english, yapo, category, score) {
      const tokens = tokenize(english);
      if (!tokens.length) return;
      const key = keyFor(tokens);
      const options = this.englishIndex.get(key) || [];
      if (!options.some((option) => option.yapo.toLocaleLowerCase() === yapo.toLocaleLowerCase())) {
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
      const available = Math.min(this.maximumEnglishPhrase, tokens.length - position);
      for (let length = available; length >= 1; length -= 1) {
        const phraseKey = keyFor(tokens.slice(position, position + length));
        if (length > 1 && this.disabledPhrases.english.has(phraseKey)) continue;
        const options = this.englishIndex.get(phraseKey);
        if (options?.length) return { options: this.preferredEnglishOption(joinTokens(tokens.slice(position, position + length)), options), length };
      }
      return null;
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

    translateYapoSentence(text) {
      const tokens = tokenize(text);
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

      const reordered = [];
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

    normalizeEnglishTokens(tokensOrText) {
      const raw = typeof tokensOrText === "string" ? tokenize(tokensOrText) : tokensOrText;
      const tokens = expandContractions(raw);
      const output = [];
      for (let index = 0; index < tokens.length; index += 1) {
        const lower = tokens[index].toLocaleLowerCase();
        const next = tokens[index + 1]?.toLocaleLowerCase();
        const afterNext = tokens[index + 2]?.toLocaleLowerCase();
        const afterThird = tokens[index + 3]?.toLocaleLowerCase();

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
          if (lemma && /ing$/iu.test(progressive)) {
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
        if (inOpeningClause && (lower === "never" || lower === "always")) {
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
          if (companions.length === 1 && companions[0].toLocaleLowerCase() === "not") {
            temporalPhrases.push(["tempo", lower === "always" ? "niale" : "ninish"]);
          } else {
            const translated = companions.length
              ? this.translateEnglishSimple([...companions, tokens[index]], false)
              : { text: joinTokens(["tempo", lower === "never" ? "nish" : "ale"]), translatedParts: 1, unknownWords: 0 };
            temporalPhrases.push(tokenize(translated.text));
          }
          continue;
        }
        if (inOpeningClause && (lower === "maybe" || lower === "probably" || lower === "perhaps")) {
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
      if (["am", "is", "are", "was", "were", "be", "been", "being", "will", "would", "can", "could", "do", "does", "did", "have", "has", "had"].includes(lower)) return true;
      const lookup = this.lookupEnglish(tokens, position);
      if (!lookup?.options.some((option) => option.category === "v")) return false;
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
      for (let index = start; index < tokens.length; index += 1) {
        const token = tokens[index];
        const lower = token.toLocaleLowerCase();
        if ([",", ";", ".", "!", "?"].includes(token)) break;
        if (ARTICLES.has(lower)) {
          articleSeen = true;
          continue;
        }
        const lookup = this.lookupEnglish(tokens, index);
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
          || previousLookup?.options.some((option) => ["adj", "poss"].includes(option.category))) continue;
        if (prefix.every((token) => ["maybe", "probably", "perhaps", "only", "just"].includes(token.toLocaleLowerCase()))) continue;
        if (prefix.some((token) => ["if", "that", "which", "whose", "who", "whom", "where", "when", "how", "and", "or", "but", "so", "then"].includes(token.toLocaleLowerCase()))) continue;
        if (this.hasEnglishClausePredicate(prefix) || !this.hasEnglishPredicateAfterSubject(tokens, index + 1)) continue;
        return index;
      }
      return -1;
    }

    translateEnglishClause(tokensOrText, allowImperative = true) {
      const expanded = expandContractions(typeof tokensOrText === "string" ? tokenize(tokensOrText) : tokensOrText);
      let leadingModifier = null;
      const subjectIndex = this.leadingModifierBoundary(expanded);
      if (subjectIndex > 0) {
        const modifierTokens = expanded.slice(0, subjectIndex).filter((token) => token !== ",");
        leadingModifier = this.translateEnglishSimple(modifierTokens, false);
        tokensOrText = expanded.slice(subjectIndex);
      }
      const modifiers = this.extractEnglishClauseModifiers(tokensOrText);
      const tokens = this.normalizeEnglishTokens(modifiers.tokens);
      const result = this.translateEnglishSimple(tokens, allowImperative);
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

    tokenHasEnglishCategory(tokens, position, category) {
      const lower = tokens[position]?.toLocaleLowerCase();
      if (category === "v" && ["am", "is", "are", "was", "were", "be", "been", "being", "will", "would", "can", "could", "do", "does", "did", "have", "has", "had"].includes(lower)) return true;
      return Boolean(this.lookupEnglish(tokens, position)?.options.some((option) => option.category === category));
    }

    findEmbeddedEnglishClause(tokens) {
      for (let index = 1; index < tokens.length - 1; index += 1) {
        const lower = tokens[index].toLocaleLowerCase();
        if (!SUBJECT_PRONOUNS.has(lower)) continue;
        const previousWord = [...tokens.slice(0, index)].reverse().find((token) => WORD_RE.test(token))?.toLocaleLowerCase();
        if (["to", "for", "with", "by", "of", "from", "in", "on", "at"].includes(previousWord)) continue;
        if (["and", "or", "but", "so"].includes(previousWord)) continue;
        const beforeSubject = tokens.slice(Math.max(0, index - 3), index).map((token) => token.toLocaleLowerCase());
        if (beforeSubject.includes("not") && beforeSubject.some((token) => ["do", "does", "did"].includes(token))) continue;
        const priorVerb = this.hasEnglishClausePredicate(tokens.slice(0, index));
        const tailVerb = this.hasEnglishPredicateAfterSubject(tokens, index + 1);
        if (!priorVerb || !tailVerb) continue;
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
      const tokens = typeof tokensOrText === "string" ? expandContractions(tokenize(tokensOrText)) : expandContractions(tokensOrText);

      const contrastiveWhenIndex = tokens.findIndex((token, index) => {
        if (token.toLocaleLowerCase() !== "when") return false;
        const right = tokens.slice(index + 1);
        const rightSubject = right.findIndex((candidate) => SUBJECT_PRONOUNS.has(candidate.toLocaleLowerCase()));
        if (rightSubject < 0 || !this.hasEnglishPredicateAfterSubject(right, rightSubject + 1)) return false;
        if (index === 0) return true;
        const previousWordIndex = [...tokens.slice(0, index)].map((candidate) => WORD_RE.test(candidate)).lastIndexOf(true);
        const previousLookup = previousWordIndex >= 0 ? this.lookupEnglish(tokens, previousWordIndex) : null;
        const followsNoun = previousLookup?.options.some((option) => option.category === "n") && tokens[index - 1] !== ",";
        return !followsNoun && this.hasEnglishClausePredicate(tokens.slice(0, index));
      });
      if (contrastiveWhenIndex >= 0) {
        const right = this.translateEnglishStructured(tokens.slice(contrastiveWhenIndex + 1), false);
        if (contrastiveWhenIndex === 0) {
          return { text: joinTokens(["te", ...tokenize(right.text)]), translatedParts: right.translatedParts + 1, unknownWords: right.unknownWords };
        }
        const left = this.translateEnglishStructured(tokens.slice(0, contrastiveWhenIndex), false);
        return {
          text: joinTokens([...tokenize(left.text), "te", ...tokenize(right.text)]),
          translatedParts: left.translatedParts + right.translatedParts + 1,
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

      const coordinatingClause = tokens.findIndex((token, index) => ["and", "or"].includes(token.toLocaleLowerCase())
        && index > 0
        && SUBJECT_PRONOUNS.has(tokens[index + 1]?.toLocaleLowerCase())
        && tokens.slice(index + 2).some((_candidate, offset) => this.tokenHasEnglishCategory(tokens, index + 2 + offset, "v")));
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

      const explicitThat = tokens.findIndex((token, index) => token.toLocaleLowerCase() === "that" && index > 0
        && SUBJECT_PRONOUNS.has(tokens[index + 1]?.toLocaleLowerCase())
        && tokens.slice(index + 2).some((_candidate, offset) => this.tokenHasEnglishCategory(tokens, index + 2 + offset, "v")));
      if (explicitThat > 0) {
        const left = this.translateEnglishClause(tokens.slice(0, explicitThat), false);
        const right = this.translateEnglishStructured(tokens.slice(explicitThat + 1), false);
        return {
          text: joinTokens([...tokenize(left.text), "tish", ...tokenize(right.text)]),
          translatedParts: left.translatedParts + right.translatedParts + 1,
          unknownWords: left.unknownWords + right.unknownWords,
        };
      }

      const implicitBoundary = this.findEmbeddedEnglishClause(tokens);
      if (implicitBoundary > 0) {
        const left = this.translateEnglishClause(tokens.slice(0, implicitBoundary), false);
        const right = this.translateEnglishStructured(tokens.slice(implicitBoundary), false);
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

    translateEnglishSentence(text) {
      const tokens = expandContractions(tokenize(text));
      const wordsOnly = tokens.filter((token) => WORD_RE.test(token)).map((token) => token.toLocaleLowerCase());
      if (wordsOnly.length === 1 && wordsOnly[0] === "sorry") {
        return { text: applyInitialCase(text, joinTokens(["su", "tristi", ...tokens.filter((token) => !WORD_RE.test(token))])), translatedParts: 2, unknownWords: 0 };
      }
      if (wordsOnly.length === 1 && wordsOnly[0] === "please") {
        return { text: applyInitialCase(text, joinTokens(["su", "poni", ...tokens.filter((token) => !WORD_RE.test(token))])), translatedParts: 2, unknownWords: 0 };
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
        if (boundary < 0) {
          boundary = tokens.findIndex((token, index) => {
            if (index <= ifIndex || token !== ",") return false;
            const following = tokens.slice(index + 1).find((candidate) => WORD_RE.test(candidate));
            return Boolean(following) && !["and", "or", "but"].includes(following.toLocaleLowerCase());
          });
        }
        if (boundary > ifIndex) {
          const prelude = this.translateEnglishClause(tokens.slice(0, ifIndex), false);
          const condition = this.translateEnglishClause(tokens.slice(ifIndex + 1, boundary), false);
          const consequence = this.translateEnglishClause(tokens.slice(boundary + 1), false);
          const consequenceMarker = tokens[boundary] === "," ? [",", "la"] : ["la"];
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
      result.text = /(?:'s|’s)$/iu.test(firstOriginal) && !CONTRACTIONS[contractionKey]
        ? result.text
        : applyInitialCase(text, result.text);
      return result;
    }

    translateEnglishSimple(tokensOrText, allowImperative = true) {
      // Keep this low-level entry point safe too. Structured translation normally
      // expands contractions first, but menus and helper paths may call it
      // directly; apostrophe-s must never fall through to possessive handling.
      const tokens = expandContractions(typeof tokensOrText === "string" ? tokenize(tokensOrText) : tokensOrText);
      const units = [];
      let position = 0;
      let translatedParts = 0;
      let unknownWords = 0;
      const chooseCategory = (lookup, categories) => {
        if (!lookup) return null;
        return lookup.options.find((option) => categories.includes(option.category)) || null;
      };

      while (position < tokens.length) {
        const token = tokens[position];
        if (!WORD_RE.test(token)) {
          units.push({ text: token, category: "punct", source: token });
          position += 1;
          continue;
        }

        const lower = token.toLocaleLowerCase();
        if (ARTICLES.has(lower)) {
          position += 1;
          continue;
        }

        if (lower === "how" && position + 3 < tokens.length) {
          const adjectiveLookup = this.lookupEnglish(tokens, position + 1);
          const subjectLookup = this.lookupEnglish(tokens, position + 2);
          const verbLookup = this.lookupEnglish(tokens, position + 3);
          const adjective = chooseCategory(adjectiveLookup, ["adj"]);
          const subject = chooseCategory(subjectLookup, ["pn", "n"]);
          const verb = chooseCategory(verbLookup, ["v"]);
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
          units.push({ text: possessiveOwner ? "a" : "__of__", category: "marker", source: token });
          translatedParts += 1;
          position += 1;
          continue;
        }

        if (["this", "that"].includes(lower)) {
          const nextLookup = this.lookupEnglish(tokens, position + 1);
          if (chooseCategory(nextLookup, ["n"])) {
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
          const verb = chooseCategory(verbLookup, ["v"]);
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

        const contractionKey = token.toLocaleLowerCase().replaceAll("’", "'");
        const possessiveMatch = CONTRACTIONS[contractionKey] ? null : token.match(/^(.+?)(?:'s|’s)$/iu);
        if (possessiveMatch) {
          const owner = possessiveMatch[1];
          const baseOptions = this.englishIndex.get(keyFor(owner)) || [];
          const base = baseOptions[0]?.yapo || owner;
          units.push({ text: base, category: "poss-owner", ownerCategory: baseOptions[0]?.category || (/^\p{Lu}/u.test(owner) ? "n" : "unknown"), source: token });
          translatedParts += 1;
          position += 1;
          continue;
        }

        if (position + 2 < tokens.length) {
          const interruptedOptions = this.englishIndex.get(keyFor([tokens[position], tokens[position + 2]])) || [];
          const interruptedVerb = this.preferredEnglishOption(
            joinTokens([tokens[position], tokens[position + 2]]),
            interruptedOptions,
          ).find((option) => option.category === "v");
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
            if (units[index].category === "punct" && /[,;:.!?]/u.test(units[index].text)) {
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
          if (nextHasNoun && hasCategory("adj")) preferredCategories = ["adj", "n", "pn", "v", "adv"];
          else if (hasSubject && !hasVerb) preferredCategories = ["v", "adv", "adj", "n", "pn"];
          else if (hasVerb) preferredCategories = ["n", "pn", "adv", "adj", "v"];
          else if (hasCategory("n") || hasCategory("pn")) preferredCategories = ["pn", "n", "adj", "v", "adv"];
          else if (["poti"].includes(previousSemantic?.text)) preferredCategories = ["v", "adv", "adj"];
          else preferredCategories = allowImperative && tokens.includes("!") ? ["v", "n", "pn", "adj", "adv"] : [];
          const lookupSource = joinTokens(tokens.slice(position, position + lookup.length));
          const legacyPreferred = this.preferences.english[this.preferenceKey(lookupSource)];
          const oneCategoryOnly = new Set(lookup.options.map((option) => option.category)).size === 1;
          const chosen = legacyPreferred && oneCategoryOnly ? lookup.options[0] : preferredCategories
            .map((category) => lookup.options.find((option) => option.category === category))
            .find(Boolean) || lookup.options[0];
          units.push({ text: chosen.yapo, category: chosen.category, source: joinTokens(tokens.slice(position, position + lookup.length)) });
          translatedParts += 1;
          position += lookup.length;
          continue;
        }

        const properName = /^\p{Lu}[\p{L}\p{M}'’\-]*$/u.test(token);
        units.push({ text: token, category: properName ? "n" : "unknown", properName, source: token });
        if (!properName) unknownWords += 1;
        position += 1;
      }

      for (let index = 0; index < units.length; index += 1) {
        if (units[index].category !== "poss-owner") continue;
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
        units.splice(index, cursor - index + 1,
          units[cursor], ...modifiers.reverse(), { text: "a", category: "marker", source: owner.source }, resolvedOwner);
      }

      const reordered = [];
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

      // Yapo adverbs modify the verb before the object marker. English often
      // leaves them after the object ("value you highly"). Move that complete
      // adverb run next to its verb before dative/object processing.
      for (let verbIndex = 0; verbIndex < reordered.length; verbIndex += 1) {
        if (reordered[verbIndex].category !== "v") continue;
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
        reordered.splice(recipientIndex, themeIndex - recipientIndex + 1,
          ...middle, theme, { text: "pen", category: "prep", source: "(recipient)" }, recipient);
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

      const initialSemantic = reordered.find((unit) => unit.category !== "punct");
      const hasExplicitSubject = reordered.some((unit, index) => ["n", "pn"].includes(unit.category)
        && !REFLEXIVE_PRONOUNS.has(String(unit.source || "").toLocaleLowerCase())
        && reordered.slice(index + 1).some((candidate) => candidate.category === "v"));
      const hasDirectReflexive = reordered.some((unit) => REFLEXIVE_PRONOUNS.has(String(unit.source || "").toLocaleLowerCase()));
      if (!hasExplicitSubject && ((initialSemantic?.category === "v"
        && /^thank(?:s|ed|ing)?$/iu.test(String(initialSemantic.source || ""))) || hasDirectReflexive)) {
        reordered.unshift({ text: "su", category: "pn", source: "(implicit I)" });
      }

      const semantic = reordered.filter((unit) => !["punct"].includes(unit.category));
      const firstSemantic = semantic[0];
      const verbCount = semantic.filter((unit) => unit.category === "v").length;
      if (allowImperative && tokens.includes("!") && firstSemantic?.category === "v" && verbCount === 1) {
        reordered.unshift({ text: "to", category: "marker" });
      }
      if (allowImperative && firstSemantic?.text === "yene" && semantic[1]?.category === "v"
        && !semantic.some((unit) => ["n", "pn"].includes(unit.category)
          && semantic.indexOf(unit) < semantic.indexOf(semantic[1]))) {
        const yeneIndex = reordered.indexOf(firstSemantic);
        reordered.splice(yeneIndex + 1, 0, { text: "to", category: "marker", source: "(imperative)" });
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
            || (reordered[index].text === "tish" && reordered[index].category === "marker")
            || reordered[index].category === "v"
            || (reordered[index].category === "punct" && /[,;:.!?]/u.test(reordered[index].text))) break;
          if (["n", "pn"].includes(reordered[index].category)) {
            const reflexiveObject = REFLEXIVE_PRONOUNS.has(String(reordered[index].source || "").toLocaleLowerCase());
            if (reflexiveObject && reordered.slice(index + 1).some((candidate) => candidate.category === "v")) continue;
            hasDirectObject = true;
            break;
          }
        }
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
      if (normalized === "li") return [{ value: "if", category: "marker" }, { value: "would", category: "marker" }];
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
      const possessiveMatch = String(value || "").trim().match(/^(.+?)(?:'s|’s)$/iu);
      if (possessiveMatch) {
        const owner = possessiveMatch[1];
        const baseOptions = this.englishIndex.get(keyFor(owner)) || [];
        return [{ value: `a ${baseOptions[0]?.yapo || owner}`, category: "poss" }];
      }
      const indexed = this.preferredEnglishOption(value, this.englishIndex.get(keyFor(value)) || [])
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

  global.YapoGrammar = { GrammarTranslator, tokenize, joinTokens };
})(typeof window !== "undefined" ? window : globalThis);
