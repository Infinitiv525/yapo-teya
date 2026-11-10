"use strict";

const CUSTOM_STORAGE_KEY = "yapo-teya-custom-translations-v1";
const PREFERENCE_STORAGE_KEY = "yapo-teya-preferred-translations-v1";
const EDIT_STORAGE_KEY = "yapo-teya-dictionary-edits-v1";
const DELETE_STORAGE_KEY = "yapo-teya-dictionary-deletions-v1";
const CLICK_WORD_RE = /[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu;
const CATEGORY_LABELS = {
  basic: "basic", n: "noun", adj: "adjective", v: "verb", adv: "adverb",
  ph: "phrase", pn: "pronoun", poss: "possessive", num: "numeral",
  prep: "preposition", marker: "grammar",
};

const yapoInput = document.querySelector("#yapoInput");
const englishInput = document.querySelector("#englishInput");
const yapoPanel = document.querySelector("#yapoPanel");
const englishPanel = document.querySelector("#englishPanel");
const yapoCount = document.querySelector("#yapoCount");
const englishCount = document.querySelector("#englishCount");
const statusText = document.querySelector("#statusText");
const statusDot = document.querySelector("#statusDot");
const dictionaryCount = document.querySelector("#dictionaryCount");
const directionYapo = document.querySelector("#directionYapo");
const directionEnglish = document.querySelector("#directionEnglish");
const directionNote = document.querySelector("#directionNote");
const wordPopover = document.querySelector("#wordPopover");
const popoverWord = document.querySelector("#popoverWord");
const popoverOrigin = document.querySelector("#popoverOrigin");
const optionList = document.querySelector("#optionList");
const unknownTypeControl = document.querySelector("#unknownTypeControl");
const unknownTypeSelect = document.querySelector("#unknownTypeSelect");
const unknownTypeHint = document.querySelector("#unknownTypeHint");
const addDialog = document.querySelector("#addDialog");
const addForm = document.querySelector("#addTranslationForm");
const sourceWord = document.querySelector("#sourceWord");
const translationWord = document.querySelector("#translationWord");
const wordCategory = document.querySelector("#wordCategory");
const sourceFieldLabel = document.querySelector("#sourceFieldLabel");
const translationFieldLabel = document.querySelector("#translationFieldLabel");
const saveNote = document.querySelector("#saveNote");
const translationDialogTitle = document.querySelector("#translationDialogTitle");
const saveTranslationButton = document.querySelector("#saveTranslationButton");
const yapoHighlights = document.querySelector("#yapoHighlights");
const englishHighlights = document.querySelector("#englishHighlights");
const phraseActionButton = document.querySelector("#phraseActionButton");
const dictionaryDialog = document.querySelector("#dictionaryDialog");
const dictionarySearch = document.querySelector("#dictionarySearch");
const customDictionaryList = document.querySelector("#customDictionaryList");
const customDictionaryTab = document.querySelector("#customDictionaryTab");
const allDictionaryTab = document.querySelector("#allDictionaryTab");
const rootSuggestions = document.querySelector("#rootSuggestions");
const rootSuggestionsList = document.querySelector("#rootSuggestionsList");
const dictionarySuggestions = document.querySelector("#dictionarySuggestions");
const dictionarySuggestionsList = document.querySelector("#dictionarySuggestionsList");
const dictionaryFlip = document.querySelector("#dictionaryFlip");
const dictionaryFrom = document.querySelector("#dictionaryFrom");
const dictionaryTo = document.querySelector("#dictionaryTo");
const dictionaryDetails = document.querySelector("#dictionaryDetails");
const dictionaryDetailsWord = document.querySelector("#dictionaryDetailsWord");
const dictionaryDetailsGrid = document.querySelector("#dictionaryDetailsGrid");

let direction = "yapo";
let translationTimer = null;
let currentSelection = null;
let lastAlignment = [];
let occurrenceOverrides = new Map();
let hoverTimer = null;
let hoveredAlignmentIndex = null;
let syncingScroll = false;
let dictionaryMode = "custom";
let dictionaryDirection = "yapo";
let addEntryFromYapo = true;
let editingEntry = null;
const splitPhrases = { yapo: new Set(), english: new Set() };

function loadJson(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "null");
    return value ?? fallback;
  } catch (_error) {
    return fallback;
  }
}

function loadLocalEntries() {
  const entries = loadJson(CUSTOM_STORAGE_KEY, []);
  return Array.isArray(entries) ? entries : [];
}

function storeLocalEntry(entry) {
  const entries = loadLocalEntries();
  const duplicate = entries.some((existing) =>
    existing.category === entry.category
      && String(existing.yapo).toLocaleLowerCase() === entry.yapo.toLocaleLowerCase()
      && String(existing.english).toLocaleLowerCase() === entry.english.toLocaleLowerCase()
  );
  if (!duplicate) entries.push(entry);
  localStorage.setItem(CUSTOM_STORAGE_KEY, JSON.stringify(entries));
}

function removeLocalEntry(entry) {
  const entries = loadLocalEntries().filter((existing) => !(
    existing.category === entry.category
    && String(existing.yapo).toLocaleLowerCase() === entry.yapo.toLocaleLowerCase()
    && String(existing.english).toLocaleLowerCase() === entry.english.toLocaleLowerCase()
  ));
  localStorage.setItem(CUSTOM_STORAGE_KEY, JSON.stringify(entries));
}

function entryKey(entry) {
  return [entry.category, entry.yapo, entry.english]
    .map((part) => String(part || "").trim().toLocaleLowerCase()).join("\u0001");
}

function loadLocalEdits() {
  const edits = loadJson(EDIT_STORAGE_KEY, []);
  return Array.isArray(edits) ? edits.filter((e) => e?.original && e?.replacement) : [];
}

function loadLocalDeletions() {
  const entries = loadJson(DELETE_STORAGE_KEY, []);
  return Array.isArray(entries) ? entries : [];
}

function saveLocalEdits(edits) {
  localStorage.setItem(EDIT_STORAGE_KEY, JSON.stringify(edits));
}

function saveLocalDeletions(deletions) {
  localStorage.setItem(DELETE_STORAGE_KEY, JSON.stringify(deletions));
}

function publishedEntries() {
  return Object.entries(window.YAPO_DICTIONARIES || {})
    .filter(([category]) => category !== "root")
    .flatMap(([category, dictionary]) => Object.entries(dictionary)
      .flatMap(([yapo, meanings]) => meanings.map((english) => ({ category, yapo, english }))));
}

function combinedCustomEntries() {
  // Published custom entries are already included in dictionary-data.js.
  // Only genuinely browser-local additions are passed as custom entries.
  return loadLocalEntries().filter((entry) =>
    !loadLocalDeletions().some((deleted) => entryKey(deleted) === entryKey(entry)));
}

function locallyEditedDictionaries() {
  const dictionaries = structuredClone(window.YAPO_DICTIONARIES || {});
  const remove = (entry) => {
    const dictionary = dictionaries[entry.category];
    if (!dictionary) return;
    const word = Object.keys(dictionary).find((key) => key.toLocaleLowerCase() === String(entry.yapo).toLocaleLowerCase());
    if (!word) return;
    dictionary[word] = dictionary[word].filter((meaning) =>
      meaning.toLocaleLowerCase() !== String(entry.english).toLocaleLowerCase());
    if (!dictionary[word].length) delete dictionary[word];
  };
  const add = (entry) => {
    const dictionary = dictionaries[entry.category] || (dictionaries[entry.category] = {});
    const word = Object.keys(dictionary).find((key) => key.toLocaleLowerCase() === String(entry.yapo).toLocaleLowerCase()) || entry.yapo;
    const meanings = dictionary[word] || (dictionary[word] = []);
    if (!meanings.some((meaning) => meaning.toLocaleLowerCase() === String(entry.english).toLocaleLowerCase())) meanings.push(entry.english);
  };
  const deleted = new Set(loadLocalDeletions().map(entryKey));
  for (const { original, replacement } of loadLocalEdits()) {
    remove(original);
    if (!deleted.has(entryKey(replacement))) add(replacement);
  }
  for (const entry of loadLocalDeletions()) remove(entry);
  return dictionaries;
}

function rebuildLocalTranslator() {
  activeDictionaries = locallyEditedDictionaries();
  translator = new window.YapoGrammar.GrammarTranslator(activeDictionaries, combinedCustomEntries(), loadPreferences());
  for (const side of ["yapo", "english"]) {
    for (const phrase of splitPhrases[side]) translator.setPhraseEnabled(side, phrase, false);
  }
  updateCounts();
}

function loadPreferences() {
  const value = loadJson(PREFERENCE_STORAGE_KEY, {});
  const server = window.YAPO_PREFERENCES || {};
  return {
    yapo: { ...(server.yapo || {}), ...(value && typeof value.yapo === "object" ? value.yapo : {}) },
    english: { ...(server.english || {}), ...(value && typeof value.english === "object" ? value.english : {}) },
  };
}

function preferenceStorageKey(source, category = "") {
  const key = source.trim().toLocaleLowerCase();
  return category ? `${key}\u0001${category}` : key;
}

function storePreference(side, source, target, category = "") {
  const preferences = loadPreferences();
  preferences[side][preferenceStorageKey(source, category)] = target;
  localStorage.setItem(PREFERENCE_STORAGE_KEY, JSON.stringify(preferences));
}

if (!window.YAPO_DICTIONARIES || !window.YapoGrammar) {
  throw new Error("Translator data is missing. Check dictionary-data.js and grammar.js.");
}

let activeDictionaries = locallyEditedDictionaries();
let translator = new window.YapoGrammar.GrammarTranslator(activeDictionaries, combinedCustomEntries(), loadPreferences());

function areaFor(side) { return side === "yapo" ? yapoInput : englishInput; }
function highlightLayerFor(side) { return side === "yapo" ? yapoHighlights : englishHighlights; }
function otherSide(side) { return side === "yapo" ? "english" : "yapo"; }
function optionsFor(side, value) { return side === "yapo" ? translator.yapoOptions(value) : translator.englishOptions(value); }
function characterLabel(count) { return `${count} ${count === 1 ? "character" : "characters"}`; }

function updateCounts() {
  yapoCount.textContent = characterLabel(yapoInput.value.length);
  englishCount.textContent = characterLabel(englishInput.value.length);
  dictionaryCount.textContent = `${translator.usableEntries.toLocaleString()} grammar-aware entries`;
}

function showStatus(label, result) {
  if (!result?.text) {
    statusText.textContent = "Ready · write in the selected source panel";
    statusDot.classList.remove("warning");
    return;
  }
  const unknown = result.unknownWords ? ` · ${result.unknownWords} unchanged` : "";
  statusText.textContent = `${label} · ${result.translatedParts} translated${unknown}`;
  statusDot.classList.toggle("warning", result.unknownWords > 0);
}

function wordSpans(text) {
  const spans = [];
  CLICK_WORD_RE.lastIndex = 0;
  let match;
  while ((match = CLICK_WORD_RE.exec(text)) !== null) spans.push({ text: match[0], start: match.index, end: match.index + match[0].length });
  return spans;
}

function allTextRanges(text, needle, existingWords = null) {
  const ranges = [];
  const sourceWords = existingWords || wordSpans(text);
  const queryWords = wordSpans(String(needle || ""));
  if (!queryWords.length) return ranges;
  const query = queryWords.map((word) => word.text.toLocaleLowerCase());
  for (let index = 0; index <= sourceWords.length - query.length; index += 1) {
    const matches = query.every((word, offset) => sourceWords[index + offset].text.toLocaleLowerCase() === word);
    const start = sourceWords[index].start;
    const end = sourceWords[index + query.length - 1].end;
    const crossesClauseBoundary = query.length > 1 && /[,.!?;:\r\n]/u.test(text.slice(start, end));
    if (matches && !crossesClauseBoundary) ranges.push({ start, end });
  }
  return ranges;
}

function overlaps(left, right) { return left && right && left.start < right.end && right.start < left.end; }

function lineNumberAt(text, position) {
  return (String(text).slice(0, Math.max(0, position)).match(/\r\n|\n|\r/gu) || []).length;
}

function sentenceNumberAt(text, position) {
  return (String(text).slice(0, Math.max(0, position)).match(/[.!?]+|\r\n|\n|\r/gu) || []).length;
}

function clauseNumberAt(text, position) {
  return (String(text).slice(0, Math.max(0, position)).match(/[,;.!?]+|\r\n|\n|\r/gu) || []).length;
}

function buildSourceSegments(sourceSide, text) {
  const words = wordSpans(text);
  const segments = [];
  const hasTranslator = typeof translator !== "undefined";
  const optionCache = new Map();
  const cachedOptions = (value) => {
    const cacheKey = value.trim().toLocaleLowerCase();
    if (!optionCache.has(cacheKey)) optionCache.set(cacheKey, optionsFor(sourceSide, value));
    return optionCache.get(cacheKey);
  };
  const configuredMaximum = hasTranslator
    ? (sourceSide === "yapo" ? translator.maximumYapoPhrase
      : Math.max(translator.maximumEnglishPhrase, translator.maximumTemporaryEnglishPhrase || 1))
    : 10;
  const maximumPhraseLength = Math.max(2, Number(configuredMaximum) || 2);
  for (let index = 0; index < words.length;) {
    let selected = null;
    for (let length = Math.min(maximumPhraseLength, words.length - index); length >= 2; length -= 1) {
      const start = words[index].start;
      const end = words[index + length - 1].end;
      if (lineNumberAt(text, start) !== lineNumberAt(text, end - 1)) continue;
      if (sentenceNumberAt(text, start) !== sentenceNumberAt(text, end - 1)) continue;
      const sourceText = text.slice(start, end);
      if (/[,.!?;:\r\n]/u.test(sourceText)) continue;
      if (splitPhrases[sourceSide].has(sourceText.trim().toLocaleLowerCase())) continue;
      const options = cachedOptions(sourceText);
      const temporaryCategory = sourceSide === "english" && hasTranslator
        ? translator.temporaryEnglishCategory(sourceText) : "";
      if (options.length || temporaryCategory) {
        selected = { sourceText, sourceStart: start, sourceEnd: end, options, wordCount: length, inferredCategory: temporaryCategory || "" };
        break;
      }
    }
    if (!selected) {
      const word = words[index];
      const options = cachedOptions(word.text);
      const temporaryCategory = sourceSide === "english" && hasTranslator
        ? translator.temporaryEnglishCategory(word.text) : "";
      selected = {
        sourceText: word.text,
        sourceStart: word.start,
        sourceEnd: word.end,
        options,
        wordCount: 1,
        inferredCategory: temporaryCategory || (sourceSide === "english" && !options.length && hasTranslator
          ? translator.inferEnglishCategoryAt(text, word.start)
          : ""),
      };
    }
    segments.push(selected);
    index += selected.wordCount;
  }
  return segments;
}

function appendHighlightRange(fragment, text, cursor, range, alignmentIndex, isPhrase, isUnknown) {
  if (range.start > cursor) fragment.append(document.createTextNode(text.slice(cursor, range.start)));
  const span = document.createElement("span");
  span.className = `highlight-segment${isPhrase ? " is-phrase" : ""}${isUnknown ? " is-unknown" : ""}`;
  span.dataset.alignmentIndex = String(alignmentIndex);
  span.dataset.start = String(range.start);
  span.dataset.end = String(range.end);
  span.textContent = text.slice(range.start, range.end);
  fragment.append(span);
  return range.end;
}

function renderHighlightLayer(side) {
  const layer = highlightLayerFor(side);
  const text = areaFor(side).value;
  const ranges = [];
  lastAlignment.forEach((item, alignmentIndex) => {
    const itemRanges = side === direction
      ? [{ start: item.sourceStart, end: item.sourceEnd }]
      : (item.targetRanges || [{ start: item.targetStart, end: item.targetEnd }]);
    for (const { start, end } of itemRanges) {
      if (Number.isInteger(start) && Number.isInteger(end) && end > start) {
        ranges.push({ start, end, alignmentIndex, isPhrase: item.wordCount > 1, isUnknown: !item.options.length });
      }
    }
  });
  if (side !== direction) {
    const knownCache = new Map();
    for (const word of wordSpans(text)) {
      if (!ranges.some((range) => overlaps(range, word))) {
        const normalized = word.text.toLocaleLowerCase();
        if (!knownCache.has(normalized)) knownCache.set(normalized, optionsFor(side, word.text).length > 0);
        ranges.push({
          start: word.start,
          end: word.end,
          alignmentIndex: -1,
          isPhrase: false,
          isUnknown: !knownCache.get(normalized),
        });
      }
    }
  }
  // Several English grammar words can be fused into one Yapo surface word
  // (for example "was trying" -> rayil).  Preserve all owners of an exact
  // range so hovering that surface highlights every contributing source word.
  const groupedRanges = new Map();
  for (const range of ranges) {
    const key = `${range.start}:${range.end}`;
    const existing = groupedRanges.get(key);
    if (!existing) {
      groupedRanges.set(key, { ...range, alignmentIndexes: [range.alignmentIndex] });
    } else {
      if (!existing.alignmentIndexes.includes(range.alignmentIndex)) existing.alignmentIndexes.push(range.alignmentIndex);
      existing.isPhrase ||= range.isPhrase;
      existing.isUnknown &&= range.isUnknown;
    }
  }
  const visibleRanges = [...groupedRanges.values()];
  visibleRanges.sort((left, right) => left.start - right.start || right.end - left.end);
  const fragment = document.createDocumentFragment();
  let cursor = 0;
  for (const range of visibleRanges) {
    if (range.start < cursor) continue;
    cursor = appendHighlightRange(fragment, text, cursor, range, range.alignmentIndexes.join(","), range.isPhrase, range.isUnknown);
  }
  if (cursor < text.length) fragment.append(document.createTextNode(text.slice(cursor)));
  layer.replaceChildren(fragment);
  layer.scrollTop = areaFor(side).scrollTop;
  layer.scrollLeft = areaFor(side).scrollLeft;
}

function assignTargetRanges(targetText, alignment) {
  for (const item of alignment) {
    item.targetRanges = Number.isInteger(item.targetStart) && item.targetEnd > item.targetStart
      ? [{ start: item.targetStart, end: item.targetEnd }]
      : [];
  }
  const claimed = alignment.flatMap((item) => item.targetRanges);
  const morphologyBase = (value) => {
    let word = String(value || "").toLocaleLowerCase();
    let changed = true;
    while (changed) {
      changed = false;
      for (const prefix of ["ney", "may", "mu", "ni"]) {
        if (word.startsWith(prefix) && word.length > prefix.length + 1) {
          word = word.slice(prefix.length);
          changed = true;
          break;
        }
      }
    }
    if (word.endsWith("ish") && word.length > 3) word = `${word.slice(0, -3)}i`;
    else if (word.endsWith("il") && word.length > 2) word = `${word.slice(0, -2)}i`;
    // Yapo part-of-speech forms share a root and differ only in their final
    // vowel (kula/kule/kuli/kulo).  Generated category shifts must therefore
    // remain connected to the English lexeme that supplied that root.
    if (/^[\p{L}\p{M}]{3,}[oaie]$/u.test(word)) word = word.slice(0, -1);
    return word;
  };

  // Attach individual words of a translated phrase and regular grammatical
  // derivatives before using proximity fallbacks.  This covers reordered
  // multiword nouns and stacked forms such as mumayluta without relying on
  // the source and target having identical clause numbers.
  for (const word of wordSpans(targetText)) {
    if (claimed.some((range) => overlaps(range, word))) continue;
    const normalized = word.text.toLocaleLowerCase();
    const targetBase = morphologyBase(normalized);
    const matchesComponent = (item) => {
      if (!item.options.length) return item.sourceText.trim().toLocaleLowerCase() === normalized;
      return item.options.some((option) => wordSpans(option.value).some((optionWord) => {
        const optionNormalized = optionWord.text.toLocaleLowerCase();
        return optionNormalized === normalized || morphologyBase(optionNormalized) === targetBase;
      }));
    };
    let candidates = alignment.filter((item) => {
      if (lineNumberAt(targetText, word.start) !== item.sourceLine
        || sentenceNumberAt(targetText, word.start) !== item.sourceSentence) return false;
      return matchesComponent(item);
    });
    // Sentence counters can differ when one side contains punctuation inside
    // a contraction or an imported phrase.  Relax only to a unique match on
    // the same physical line; this cannot recreate the old stop/top bug.
    if (!candidates.length) {
      const sameLine = alignment.filter((item) => item.sourceLine === lineNumberAt(targetText, word.start)
        && matchesComponent(item));
      const notYetRepresented = sameLine.filter((item) => !item.targetRanges.length);
      if (notYetRepresented.length === 1) candidates = notYetRepresented;
      else if (sameLine.length === 1) candidates = sameLine;
      else if (notYetRepresented.length > 1) {
        const sourceLength = Math.max(1, ...alignment.map((item) => item.sourceEnd));
        candidates = [notYetRepresented.sort((left, right) =>
          Math.abs((left.sourceStart / sourceLength) * targetText.length - word.start)
          - Math.abs((right.sourceStart / sourceLength) * targetText.length - word.start))[0]];
      } else if (!sameLine.length) {
        const sourceLength = Math.max(1, ...alignment.map((item) => item.sourceEnd));
        const globalMatches = alignment.filter((item) => !item.targetRanges.length && matchesComponent(item));
        if (globalMatches.length) candidates = [globalMatches.sort((left, right) =>
          Math.abs((left.sourceStart / sourceLength) * targetText.length - word.start)
          - Math.abs((right.sourceStart / sourceLength) * targetText.length - word.start))[0]];
      }
    }
    candidates.sort((left, right) => {
      // Prefer a range already anchored in the generated text.  Falling back
      // to sourceStart is deterministic, but must not read the live textarea:
      // this pure pass is also used by tests and during a direction switch.
      const leftAnchor = Number.isInteger(left.targetStart) ? left.targetStart : left.sourceStart;
      const rightAnchor = Number.isInteger(right.targetStart) ? right.targetStart : right.sourceStart;
      return Math.abs(leftAnchor - word.start) - Math.abs(rightAnchor - word.start);
    });
    if (!candidates.length) continue;
    const owner = candidates[0];
    owner.targetRanges.push({ start: word.start, end: word.end });
    if (!Number.isInteger(owner.targetStart)) {
      owner.targetStart = word.start;
      owner.targetEnd = word.end;
    }
    claimed.push({ start: word.start, end: word.end });
  }
  const refreshBounds = () => {
    for (const item of alignment) {
      if (!item.targetRanges.length) continue;
      item.targetStart = Math.min(...item.targetRanges.map((range) => range.start));
      item.targetEnd = Math.max(...item.targetRanges.map((range) => range.end));
    }
  };
  refreshBounds();
  // Some English grammar words are realized as an affix on the following
  // Yapo word. They deliberately share its range: hovering "not" or "will"
  // should explain the same derived form as hovering the lexical verb.
  if (direction === "english") {
    const fusedGrammar = new Set([
      "not", "will", "did", "does", "do",
      "have", "has", "had", "am", "is", "are", "was", "were", "been",
    ]);
    for (let index = 0; index < alignment.length; index += 1) {
      const item = alignment[index];
      const normalized = item.sourceText.trim().toLocaleLowerCase().replaceAll("’", "'");
      const contractionOrGrammar = item.options.some((option) => option.category === "grammar")
        || /^(?:don't|doesn't|didn't|won't|can't|couldn't|shouldn't|wouldn't|i'm|you're|he's|she's|it's|we're|they're|i've|you've|we've|they've|i'll|you'll|he'll|she'll|we'll|they'll)$/u.test(normalized);
      if (item.targetRanges.length || (!fusedGrammar.has(normalized) && !contractionOrGrammar)) continue;
      const sameClause = (candidate) => candidate.sourceSentence === item.sourceSentence
        && candidate.sourceClause === item.sourceClause && candidate.targetRanges.length;
      const verbHost = (candidate) => sameClause(candidate)
        && candidate.options.some((option) => option.category === "v");
      const neighbor = alignment.slice(index + 1).find(verbHost)
        || [...alignment.slice(0, index)].reverse().find(verbHost)
        || alignment.slice(index + 1).find(sameClause)
        || [...alignment.slice(0, index)].reverse().find(sameClause);
      if (!neighbor) continue;
      item.targetStart = neighbor.targetStart;
      item.targetEnd = neighbor.targetEnd;
      item.targetRanges = neighbor.targetRanges.map((range) => ({ ...range }));
    }

    // The overt English subject in a negative second-person imperative is
    // absorbed by Yapo's imperative construction.  Link it to the same verb
    // instead of leaving it detached or attaching it to an unrelated `tu`.
    for (let index = 1; index < alignment.length - 1; index += 1) {
      const item = alignment[index];
      if (item.targetRanges.length || item.sourceText.trim().toLocaleLowerCase() !== "you") continue;
      const previous = alignment[index - 1];
      const nextVerb = alignment.slice(index + 1).find((candidate) => candidate.sourceSentence === item.sourceSentence
        && candidate.sourceClause === item.sourceClause && candidate.targetRanges.length
        && candidate.options.some((option) => option.category === "v"));
      if (!/^(?:don't|do not)$/iu.test(previous?.sourceText.trim() || "") || !nextVerb) continue;
      item.targetStart = nextVerb.targetStart;
      item.targetEnd = nextVerb.targetEnd;
      item.targetRanges = nextVerb.targetRanges.map((range) => ({ ...range }));
    }
  }
  for (const word of wordSpans(targetText)) {
    if (claimed.some((range) => overlaps(range, word))) continue;
    const isArticle = /^(?:a|an|the)$/iu.test(word.text);
    if (!isArticle) continue;
    const preposition = alignment
      .filter((item) => Number.isInteger(item.targetEnd)
        && item.options.some((option) => option.category === "prep")
        && item.targetEnd <= word.start
        && /^\s*$/u.test(targetText.slice(item.targetEnd, word.start))
        && sentenceNumberAt(targetText, item.targetStart) === sentenceNumberAt(targetText, word.start))
      .sort((left, right) => right.targetEnd - left.targetEnd)[0];
    if (preposition) {
      preposition.targetRanges.push({ start: word.start, end: word.end });
      claimed.push({ start: word.start, end: word.end });
    }
  }
  refreshBounds();
  const grammaticalMarkers = new Set(["e", "a", "tish", "li", "la", "pen", "to", "te", "che", "ki", "kiya", "kiye", "of"]);
  for (const word of wordSpans(targetText)) {
    if (claimed.some((range) => overlaps(range, word)) || !grammaticalMarkers.has(word.text.toLocaleLowerCase())) continue;
    const anchors = alignment.flatMap((item) => item.targetRanges.map((range) => ({ item, range })))
      .filter(({ range }) => sentenceNumberAt(targetText, range.start) === sentenceNumberAt(targetText, word.start));
    const next = anchors
      .filter(({ range }) => range.start >= word.end && /^\s*$/u.test(targetText.slice(word.end, range.start)))
      .sort((left, right) => left.range.start - right.range.start)[0]?.item;
    const previous = anchors
      .filter(({ range }) => range.end <= word.start && /^\s*$/u.test(targetText.slice(range.end, word.start)))
      .sort((left, right) => right.range.end - left.range.end)[0]?.item;
    let owner = ["la"].includes(word.text.toLocaleLowerCase()) ? previous : (next || previous);
    if (word.text.toLocaleLowerCase() === "la" && /,\s*$/u.test(targetText.slice(0, word.start))) {
      owner = [...alignment].reverse().find((item) => item.sourceSentence === sentenceNumberAt(targetText, word.start)
        && item.sourceText.trim().toLocaleLowerCase() === "if") || owner;
    }
    if (owner) {
      owner.targetRanges.push({ start: word.start, end: word.end });
      claimed.push({ start: word.start, end: word.end });
    }
  }
  // One source expression can legitimately be realized more than once. For
  // example, the controller in "for me to be" supplies `su` both before `pen`
  // and as the subject of the infinitive clause. Attach an otherwise unclaimed
  // target word only when exactly one source item in that sentence can own it;
  // ambiguity is intentionally left red instead of creating a false link.
  for (const word of wordSpans(targetText)) {
    if (claimed.some((range) => overlaps(range, word))) continue;
    const normalized = word.text.toLocaleLowerCase();
    const owners = alignment.filter((item) => {
      if (!Number.isInteger(item.targetStart)) return false;
      if (sentenceNumberAt(targetText, item.targetStart) !== sentenceNumberAt(targetText, word.start)) return false;
      return item.options.some((option) => {
        const optionWords = wordSpans(option.value);
        return optionWords.length === 1 && optionWords[0].text.toLocaleLowerCase() === normalized;
      });
    }).sort((left, right) => Math.abs(left.targetStart - word.start) - Math.abs(right.targetStart - word.start));
    const nearestDistance = owners.length ? Math.abs(owners[0].targetStart - word.start) : Infinity;
    const secondDistance = owners.length > 1 ? Math.abs(owners[1].targetStart - word.start) : Infinity;
    if (owners.length && nearestDistance < secondDistance) {
      owners[0].targetRanges.push({ start: word.start, end: word.end });
      claimed.push({ start: word.start, end: word.end });
    }
  }
  refreshBounds();

  // A few surface words are created by a construction rather than copied
  // from one dictionary option.  Give them an explicit origin so they remain
  // selectable and never appear as unexplained red output.
  for (const word of wordSpans(targetText)) {
    if (claimed.some((range) => overlaps(range, word))) continue;
    const normalized = word.text.toLocaleLowerCase();
    let owners = [];
    if (direction === "english" && normalized === "su") {
      owners = alignment.filter((item) => item.sourceSentence === sentenceNumberAt(targetText, word.start)
        && item.sourceText.trim().toLocaleLowerCase() === "please");
    } else if (direction === "english" && normalized === "yene") {
      owners = alignment.filter((item, index) => item.sourceSentence === sentenceNumberAt(targetText, word.start)
        && ["nothing", "but"].includes(item.sourceText.trim().toLocaleLowerCase())
        && alignment.some((candidate, candidateIndex) => Math.abs(candidateIndex - index) === 1
          && ["nothing", "but"].includes(candidate.sourceText.trim().toLocaleLowerCase())));
    } else if (direction === "yapo") {
      const sourceForms = ({
        what: ["kiyo", "kiya"], who: ["kiyo"], how: ["kiye"],
        where: ["loko", "kiya"], when: ["tempo", "kiya"], why: ["pen", "kiyo"],
      })[normalized] || [];
      owners = alignment.filter((item) => item.sourceSentence === sentenceNumberAt(targetText, word.start)
        && sourceForms.includes(item.sourceText.trim().toLocaleLowerCase()));
      if (!owners.length && ["do", "does", "did", "will", "can", "am", "is", "are", "was", "were"].includes(normalized)) {
        owners = alignment.filter((item) => item.sourceSentence === sentenceNumberAt(targetText, word.start)
          && item.options.some((option) => option.category === "v"));
      }
    }
    if (!owners.length) continue;
    if (owners.length > 1) {
      const sourceLength = Math.max(1, ...alignment.map((item) => item.sourceEnd));
      owners = [owners.sort((left, right) =>
        Math.abs((left.sourceStart / sourceLength) * targetText.length - word.start)
        - Math.abs((right.sourceStart / sourceLength) * targetText.length - word.start))[0]];
    }
    const range = { start: word.start, end: word.end };
    for (const owner of owners) owner.targetRanges.push({ ...range });
    claimed.push(range);
  }
  refreshBounds();

  // Final semantic reverse lookup for a generated part-of-speech surface.
  // It is deliberately based on an exact dictionary meaning, never on a
  // substring or mere proximity.
  for (const word of wordSpans(targetText)) {
    if (alignment.some((item) => item.targetRanges.some((range) => overlaps(range, word)))) continue;
    const targetSide = direction === "english" ? "yapo" : "english";
    const targetBase = morphologyBase(word.text);
    const reverseOptions = [...optionsFor(targetSide, word.text)];
    if (targetSide === "yapo" && targetBase) {
      for (const ending of ["o", "a", "i", "e"]) reverseOptions.push(...optionsFor("yapo", `${targetBase}${ending}`));
    }
    const reverseValues = new Set(reverseOptions.map((option) => option.value.trim().toLocaleLowerCase()));
    const candidates = alignment.filter((item) => reverseValues.has(item.sourceText.trim().toLocaleLowerCase())
      || (!item.targetRanges.length && item.options.some((option) => wordSpans(option.value)
        .some((optionWord) => morphologyBase(optionWord.text) === targetBase))));
    if (!candidates.length) continue;
    const sourceLength = Math.max(1, ...alignment.map((item) => item.sourceEnd));
    const owner = candidates.sort((left, right) =>
      Math.abs((left.sourceStart / sourceLength) * targetText.length - word.start)
      - Math.abs((right.sourceStart / sourceLength) * targetText.length - word.start))[0];
    const range = { start: word.start, end: word.end };
    owner.targetRanges.push(range);
    claimed.push(range);
  }
  refreshBounds();
}

function renderHighlights() {
  renderHighlightLayer("yapo");
  renderHighlightLayer("english");
}

function buildAlignment(sourceSide, sourceText, targetText, respectOverrides = true) {
  const segments = buildSourceSegments(sourceSide, sourceText);
  const targetWords = wordSpans(targetText);
  const rangeCache = new Map();
  const cachedTargetRanges = (value) => {
    const cacheKey = String(value || "").toLocaleLowerCase();
    if (!rangeCache.has(cacheKey)) rangeCache.set(cacheKey, allTextRanges(targetText, value, targetWords));
    return rangeCache.get(cacheKey);
  };
  const usedTargets = [];
  const aligned = segments.map((segment, segmentIndex) => {
    let target = null;
    const expectedPosition = sourceText.length ? (segment.sourceStart / sourceText.length) * targetText.length : 0;
    const candidates = [];
    const normalizedSource = segment.sourceText.trim().toLocaleLowerCase();
    const sourceSentenceStart = Math.max(
      sourceText.lastIndexOf(".", segment.sourceStart - 1),
      sourceText.lastIndexOf("!", segment.sourceStart - 1),
      sourceText.lastIndexOf("?", segment.sourceStart - 1),
      sourceText.lastIndexOf("\n", segment.sourceStart - 1),
    ) + 1;
    const sourcePrefix = sourceText.slice(sourceSentenceStart, segment.sourceStart);
    const conditionalLa = sourceSide === "yapo" && normalizedSource === "la"
      && /[,;]\s*$/u.test(sourcePrefix) && /(?:^|\s)li(?:\s|$)/iu.test(sourcePrefix);
    const sourceLine = lineNumberAt(sourceText, segment.sourceStart);
    const sourceSentence = sentenceNumberAt(sourceText, segment.sourceStart);
    const sourceClause = clauseNumberAt(sourceText, segment.sourceStart);
    const sourceOrdinal = segments.slice(0, segmentIndex)
      .filter((candidate) => candidate.sourceText.trim().toLocaleLowerCase() === normalizedSource).length;
    const occurrenceChoice = respectOverrides
      ? occurrenceOverrides.get(`${sourceSide}:${normalizedSource}:${sourceOrdinal}`)
      : undefined;
    let selectedOptions = occurrenceChoice
      ? segment.options.filter((option) => option.value === occurrenceChoice)
      : segment.options;
    if (!selectedOptions.length && segment.options.length) selectedOptions = segment.options.slice(0, 1);
    if (conditionalLa && !occurrenceChoice) {
      selectedOptions = segment.options.filter((option) => option.value.toLocaleLowerCase() === "then");
    }
    const omittedByDefault = segment.options[0]?.value === "" && !occurrenceChoice && !conditionalLa;
    const alignmentOptions = selectedOptions.flatMap((option, optionRank) => {
      const variants = [{ option, optionRank }];
      if (sourceSide === "english" && option.category === "v" && /^[\p{L}\p{M}]+i$/u.test(option.value)) {
        const stem = option.value.slice(0, -1);
        for (const value of [`${stem}il`, `${stem}ish`, `ni${option.value}`, `ni${stem}il`, `ni${stem}ish`]) {
          variants.push({ option: { ...option, value }, optionRank: optionRank + 0.25 });
        }
      }
      if (sourceSide === "english" && ["v", "adj", "adv"].includes(option.category)) {
        const prefixes = new Set();
        for (let cursor = segmentIndex - 1; cursor >= 0; cursor -= 1) {
          const previous = segments[cursor];
          if (previous.sourceSentence !== undefined && previous.sourceSentence !== sourceSentence) break;
          if (/[^\s]/u.test(sourceText.slice(previous.sourceEnd, segments[cursor + 1]?.sourceStart ?? segment.sourceStart))) break;
          const modifier = previous.sourceText.trim().toLocaleLowerCase();
          if (modifier === "not") prefixes.add("ni");
          else if (["very", "so", "too"].includes(modifier)) prefixes.add("mu");
          else if (modifier === "more") prefixes.add("may");
          else if (modifier === "most") prefixes.add("ney");
          else break;
        }
        if (prefixes.size) {
          const degree = prefixes.has("ney") ? "ney" : prefixes.has("may") ? "may" : "";
          const prefix = `${prefixes.has("ni") ? "ni" : ""}${prefixes.has("mu") ? "mu" : ""}${degree}`;
          const value = option.value.replace(/^[\p{L}\p{M}]+/u, (word) => `${prefix}${word}`);
          variants.push({ option: { ...option, value }, optionRank: optionRank + 0.1 });
        }
      }
      return variants;
    });
    for (const { optionRank, option } of alignmentOptions) {
      if (omittedByDefault || option.value === "") continue;
      for (const range of cachedTargetRanges(option.value).filter((candidate) =>
        lineNumberAt(targetText, candidate.start) === sourceLine
        && lineNumberAt(targetText, candidate.end - 1) === sourceLine
        && sentenceNumberAt(targetText, candidate.start) === sourceSentence
        && sentenceNumberAt(targetText, candidate.end - 1) === sourceSentence)) {
        if (!usedTargets.some((used) => overlaps(used, range))) candidates.push({
          ...range,
          value: option.value,
          optionRank: option.value === occurrenceChoice ? -1 : optionRank,
          clauseDistance: Math.abs(clauseNumberAt(targetText, range.start) - sourceClause),
        });
      }
    }
    candidates.sort((left, right) => Math.abs(left.start - expectedPosition) - Math.abs(right.start - expectedPosition)
      || left.optionRank - right.optionRank || left.clauseDistance - right.clauseDistance);
    target = candidates[0] || null;
    if (!target && !segment.options.length) {
      target = cachedTargetRanges(segment.sourceText)
        .find((range) => !usedTargets.some((used) => overlaps(used, range))
          && lineNumberAt(targetText, range.start) === sourceLine
          && sentenceNumberAt(targetText, range.start) === sourceSentence) || null;
    }
    if (target) usedTargets.push(target);
    return {
      ...segment,
      sourceLine,
      sourceSentence,
      sourceClause,
      targetStart: target?.start,
      targetEnd: target?.end,
      targetText: target?.value,
    };
  });
  aligned.forEach((item, index) => {
    if (Number.isInteger(item.targetStart)) return;
    if (item.options[0]?.value === "") {
      const previous = [...aligned.slice(0, index)].reverse().find((candidate) => Number.isInteger(candidate.targetEnd));
      const next = aligned.slice(index + 1).find((candidate) => Number.isInteger(candidate.targetStart));
      const insertion = previous?.targetEnd ?? next?.targetStart ?? Math.round((item.sourceStart / Math.max(1, sourceText.length)) * targetText.length);
      item.targetStart = insertion;
      item.targetEnd = insertion;
      item.targetText = "";
      return;
    }
    // Do not guess a target merely because it is nearby. A missing link is safer
    // than connecting unrelated words after reordering or an edited occurrence.
  });
  return aligned;
}

function occurrenceKey(item, alignment = lastAlignment) {
  const normalized = item.sourceText.trim().toLocaleLowerCase();
  const ordinal = alignment.filter((candidate) => candidate.sourceStart < item.sourceStart
    && candidate.sourceText.trim().toLocaleLowerCase() === normalized).length;
  return `${direction}:${normalized}:${ordinal}`;
}

function applyOccurrenceOverrides(text, alignment) {
  const changes = alignment
    .map((item) => ({ item, key: occurrenceKey(item, alignment) }))
    .filter((change) => occurrenceOverrides.has(change.key) && Number.isInteger(change.item.targetStart))
    .map((change) => ({ ...change, value: occurrenceOverrides.get(change.key) }))
    .sort((a, b) => b.item.targetStart - a.item.targetStart);
  let output = text;
  for (const { item, value } of changes) {
    let replaceStart = item.targetStart;
    let replaceEnd = item.targetEnd;
    let replacement = value;
    if (!value && replaceEnd > replaceStart) {
      if (/\s/u.test(output[replaceEnd] || "")) replaceEnd += 1;
      else if (/\s/u.test(output[replaceStart - 1] || "")) replaceStart -= 1;
    }
    if (replaceStart === replaceEnd && value) {
      const before = output[replaceStart - 1] || "";
      const after = output[replaceStart] || "";
      if (before && !/\s|[(\[{]/u.test(before)) replacement = ` ${replacement}`;
      if (after && !/\s|[,.!?;:)\]}]/u.test(after)) replacement = `${replacement} `;
    }
    output = output.slice(0, replaceStart) + replacement + output.slice(replaceEnd);
    const delta = replacement.length - (replaceEnd - replaceStart);
    const leadingSpace = replacement.length - replacement.trimStart().length;
    item.targetStart = replaceStart + leadingSpace;
    item.targetEnd = item.targetStart + value.length;
    item.targetText = value;
    for (const candidate of alignment) {
      if (candidate !== item && Number.isInteger(candidate.targetStart) && candidate.targetStart >= replaceEnd) {
        candidate.targetStart += delta;
        candidate.targetEnd += delta;
      }
    }
  }
  return output;
}

function translateSelectedDirection() {
  window.clearTimeout(translationTimer);
  translationTimer = null;
  closePopover();
  const sourceArea = areaFor(direction);
  const targetArea = areaFor(otherSide(direction));
  const result = direction === "yapo" ? translator.translateYapo(sourceArea.value) : translator.translateEnglish(sourceArea.value);
  // Locate the default output first. The chosen replacement is not present in
  // that text yet, so respecting the override during this pass loses its range.
  const provisionalAlignment = buildAlignment(direction, sourceArea.value, result.text, false);
  targetArea.value = applyOccurrenceOverrides(result.text, provisionalAlignment);
  lastAlignment = buildAlignment(direction, sourceArea.value, targetArea.value);
  assignTargetRanges(targetArea.value, lastAlignment);
  renderHighlights();
  showStatus(direction === "yapo" ? "Yapo Teya → English" : "English → Yapo Teya", result);
  updateCounts();
}

function scheduleTranslation(side) {
  if (side !== direction) return;
  updateCounts();
  window.clearTimeout(translationTimer);
  translationTimer = window.setTimeout(translateSelectedDirection, 260);
}

function setDirection(side) {
  direction = side;
  occurrenceOverrides = new Map();
  lastAlignment = [];
  currentSelection = null;
  closePopover();
  renderHighlights();
  const yapoIsSource = side === "yapo";
  yapoInput.readOnly = !yapoIsSource;
  englishInput.readOnly = yapoIsSource;
  yapoPanel.classList.toggle("source-panel", yapoIsSource);
  englishPanel.classList.toggle("source-panel", !yapoIsSource);
  yapoPanel.classList.toggle("output-panel", !yapoIsSource);
  englishPanel.classList.toggle("output-panel", yapoIsSource);
  directionYapo.classList.toggle("active", yapoIsSource);
  directionEnglish.classList.toggle("active", !yapoIsSource);
  directionYapo.setAttribute("aria-pressed", String(yapoIsSource));
  directionEnglish.setAttribute("aria-pressed", String(!yapoIsSource));
  directionNote.textContent = yapoIsSource ? "Write only in the Yapo Teya panel. English is the output." : "Write only in the English panel. Yapo Teya is the output.";
  areaFor(side).focus({ preventScroll: true });
  translateSelectedDirection();
}

function clearTranslator() {
  yapoInput.value = "";
  englishInput.value = "";
  occurrenceOverrides = new Map();
  lastAlignment = [];
  translator.clearTemporaryEnglishCategories();
  closePopover();
  renderHighlights();
  updateCounts();
  showStatus("", { text: "" });
  areaFor(direction).focus();
}

async function copyText(button) {
  const target = document.querySelector(`#${button.dataset.copy}`);
  try { await navigator.clipboard.writeText(target.value); }
  catch (_error) { target.select(); document.execCommand("copy"); }
  const original = button.textContent;
  button.textContent = "Copied";
  window.setTimeout(() => { button.textContent = original; }, 1200);
}

function selectionAt(textarea, allowCaret = false) {
  if (textarea.selectionStart !== textarea.selectionEnd) {
    let start = textarea.selectionStart;
    let end = textarea.selectionEnd;
    while (start < end && /\s/u.test(textarea.value[start])) start += 1;
    while (end > start && /\s/u.test(textarea.value[end - 1])) end -= 1;
    if (start < end) return { text: textarea.value.slice(start, end), start, end };
  }
  if (!allowCaret) return null;
  return wordSpans(textarea.value).find((word) =>
    (textarea.selectionStart >= word.start && textarea.selectionStart <= word.end)
      || (textarea.selectionStart > 0 && textarea.selectionStart - 1 >= word.start && textarea.selectionStart - 1 < word.end)
  ) || null;
}

function highlight(side, start, end) {
  if (!Number.isInteger(start) || !Number.isInteger(end)) return;
  const itemIndex = lastAlignment.findIndex((item) => {
    if (side === direction) return item.sourceStart === start && item.sourceEnd === end;
    return (item.targetRanges || []).some((range) => range.start === start && range.end === end)
      || (item.targetStart === start && item.targetEnd === end);
  });
  if (itemIndex < 0) return;
  applyAlignmentHighlight(itemIndex, "is-linked");
  window.setTimeout(() => clearHighlightClass("is-linked"), 1200);
}

function clearHighlightClass(className) {
  document.querySelectorAll(`.highlight-segment.${className}`).forEach((span) => span.classList.remove(className));
}

function alignmentIndexesForSpan(span) {
  return String(span?.dataset.alignmentIndex || "")
    .split(",")
    .map(Number)
    .filter(Number.isInteger);
}

function applyAlignmentHighlight(alignmentIndex, className) {
  clearHighlightClass(className);
  const requested = new Set(Array.isArray(alignmentIndex) ? alignmentIndex : [alignmentIndex]);
  document.querySelectorAll(".highlight-segment[data-alignment-index]").forEach((span) => {
    if (alignmentIndexesForSpan(span).some((index) => requested.has(index))) span.classList.add(className);
  });
}

function spanAtPoint(layer, clientX, clientY) {
  for (const span of layer.querySelectorAll(".highlight-segment")) {
    for (const rect of span.getClientRects()) {
      if (clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom) return span;
    }
  }
  return null;
}

function handleHover(event, side) {
  const span = spanAtPoint(highlightLayerFor(side), event.clientX, event.clientY);
  const alignmentIndexes = alignmentIndexesForSpan(span);
  const hoverKey = alignmentIndexes.join(",");
  if (hoverKey === hoveredAlignmentIndex) return;
  hoveredAlignmentIndex = hoverKey;
  clearHighlightClass("is-hovered");
  if (!alignmentIndexes.length) return;
  applyAlignmentHighlight(alignmentIndexes, "is-hovered");
}

function stopHover() {
  hoveredAlignmentIndex = null;
  clearHighlightClass("is-hovered");
}

function showContextMenu(event, side) {
  event.preventDefault();
  const selection = selectionAt(areaFor(side), false);
  if (selection) {
    populateTranslationOptions(event, side, selection);
    return;
  }
  const span = spanAtPoint(highlightLayerFor(side), event.clientX, event.clientY);
  const alignmentIndexes = alignmentIndexesForSpan(span);
  const candidates = alignmentIndexes.map((index) => lastAlignment[index]).filter(Boolean);
  const item = side === direction
    ? candidates[0]
    : (candidates.find((candidate) => candidate.options.some((option) => !["grammar", "marker"].includes(option.category))) || candidates[0]);
  if (item) showAlignmentOptions(event, side, item);
  else if (span) {
    const start = Number(span.dataset.start);
    const end = Number(span.dataset.end);
    populateTranslationOptions(event, side, {
      text: areaFor(side).value.slice(start, end), start, end,
    });
  } else closePopover();
}

function alignedItemFor(side, selection) {
  if (side === direction) return lastAlignment.find((item) => overlaps({ start: item.sourceStart, end: item.sourceEnd }, selection));
  return lastAlignment.find((item) => (item.targetRanges || []).some((range) => overlaps(range, selection))
    || overlaps(Number.isInteger(item.targetStart) ? { start: item.targetStart, end: item.targetEnd } : null, selection));
}

function populateTranslationOptions(event, side, selection, forcedItem = null) {
  const textarea = areaFor(side);
  if (!selection) { closePopover(); return; }
  const phraseSelection = /\s/u.test(selection.text);
  let item = forcedItem || alignedItemFor(side, selection);
  if (phraseSelection && item) {
    const exactRange = side === direction
      ? item.sourceStart === selection.start && item.sourceEnd === selection.end
      : item.targetStart === selection.start && item.targetEnd === selection.end;
    if (!exactRange) item = null;
  }
  const sourceSide = item ? direction : side;
  const sourceText = item?.sourceText || selection.text;
  const options = item?.options || optionsFor(side, selection.text);
  currentSelection = {
    clickedSide: side, clickedText: selection.text, sourceSide, sourceText,
    sourceStart: item?.sourceStart ?? selection.start, sourceEnd: item?.sourceEnd ?? selection.end,
    targetSide: otherSide(sourceSide), targetStart: item?.targetStart, targetEnd: item?.targetEnd,
    alignmentItem: item || null,
  };
  if (item && side === direction) highlight(otherSide(direction), item.targetStart, item.targetEnd);
  if (item && side !== direction) highlight(direction, item.sourceStart, item.sourceEnd);

  popoverWord.textContent = selection.text;
  if (item) {
    const targetArea = areaFor(otherSide(direction));
    const translated = (item.targetRanges || [])
      .map((range) => targetArea.value.slice(range.start, range.end))
      .filter(Boolean)
      .join(" ") || "∅";
    const yapo = direction === "yapo" ? item.sourceText : translated;
    const english = direction === "english" ? item.sourceText : translated;
    popoverOrigin.textContent = `Yapo Teya: ${yapo}  ·  English: ${english}`;
  } else {
    popoverOrigin.textContent = "No dictionary origin found";
  }
  const phraseKey = selection.text.trim().toLocaleLowerCase();
  const savedPhraseOptions = optionsFor(side, selection.text).filter((option) => option.category === "ph");
  phraseActionButton.hidden = true;
  if (item?.wordCount > 1 && side === direction) {
    phraseActionButton.hidden = false;
    phraseActionButton.textContent = "Split this phrase into words";
    phraseActionButton.onclick = splitCurrentPhrase;
  } else if (phraseSelection) {
    phraseActionButton.hidden = false;
    if (splitPhrases[side].has(phraseKey) && savedPhraseOptions.length) {
      phraseActionButton.textContent = "Use the saved phrase again";
      phraseActionButton.onclick = restoreCurrentPhrase;
    } else {
      phraseActionButton.textContent = "Join selected words as a phrase";
      phraseActionButton.onclick = () => openAddDialog(true);
    }
  }
  optionList.replaceChildren();
  unknownTypeControl.hidden = true;
  if (!options.length) {
    const empty = document.createElement("div");
    empty.className = "empty-options";
    empty.textContent = "No saved translations yet.";
    optionList.append(empty);
    if (sourceSide === "english" && direction === "english") {
      const temporaryCategory = translator.temporaryEnglishCategory(sourceText);
      const inferredCategory = item?.inferredCategory
        || translator.inferEnglishCategoryAt(areaFor(sourceSide).value, item?.sourceStart ?? selection.start);
      unknownTypeSelect.value = temporaryCategory;
      unknownTypeHint.textContent = temporaryCategory
        ? `Using ${CATEGORY_LABELS[temporaryCategory] || temporaryCategory} for this text. The expression stays unknown and is not saved.`
        : `Detected as ${CATEGORY_LABELS[inferredCategory] || inferredCategory}. Change it here without adding a translation.`;
      unknownTypeControl.hidden = false;
    }
  } else {
    const occurrenceKeyValue = item ? occurrenceKey(item) : null;
    const hasOccurrenceChoice = occurrenceKeyValue ? occurrenceOverrides.has(occurrenceKeyValue) : false;
    const occurrenceValue = hasOccurrenceChoice ? occurrenceOverrides.get(occurrenceKeyValue) : undefined;
    for (const option of options) {
      const row = document.createElement("div");
      row.className = "translation-option-row";
      const savedDefault = translator.preferenceFor(sourceSide, sourceText, option.category);
      const sameCategoryOptions = options.filter((candidate) => candidate.category === option.category);
      const defaultValue = savedDefault === undefined ? sameCategoryOptions[0]?.value : savedDefault;
      const isDefault = option.value === defaultValue;
      const isSelectedHere = hasOccurrenceChoice && option.value === occurrenceValue;
      row.classList.toggle("is-default", isDefault);
      row.classList.toggle("is-selected-here", isSelectedHere);
      const once = document.createElement("button");
      once.type = "button";
      once.className = "translation-option";
      const value = document.createElement("span");
      value.textContent = option.value || "∅ nothing";
      const category = document.createElement("span");
      category.className = "option-category";
      category.textContent = CATEGORY_LABELS[option.category] || option.category;
      once.append(value);
      if (isDefault) {
        const badge = document.createElement("span");
        badge.className = "default-badge";
        badge.textContent = "Default";
        once.append(badge);
      } else if (isSelectedHere) {
        const badge = document.createElement("span");
        badge.className = "occurrence-badge";
        badge.textContent = "This occurrence";
        once.append(badge);
      }
      once.append(category);
      once.title = "Use only for this occurrence";
      once.addEventListener("click", () => useForOccurrence(option.value));
      const defaultButton = document.createElement("button");
      defaultButton.type = "button";
      defaultButton.className = "default-option";
      defaultButton.textContent = isDefault ? "Default" : "Set default";
      defaultButton.disabled = isDefault;
      defaultButton.title = "Use this translation by default in future text";
      defaultButton.addEventListener("click", () => setDefaultTranslation(option.value, option.category));
      if (option.value === "") {
        defaultButton.hidden = true;
        once.title = "Remove this word from this occurrence";
      }
      row.append(once, defaultButton);
      if (option.custom && option.entry) {
        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "delete-option";
        deleteButton.textContent = "Delete";
        deleteButton.title = "Delete this user-created translation";
        deleteButton.addEventListener("click", () => deleteTranslation(option.entry));
        row.append(deleteButton);
      }
      optionList.append(row);
    }
  }
  wordPopover.hidden = false;
  const rect = textarea.getBoundingClientRect();
  const width = 390;
  const anchorX = event.clientX || rect.left + 24;
  const anchorY = event.clientY || rect.top + 24;
  wordPopover.style.left = `${Math.max(12, Math.min(anchorX + 12, window.innerWidth - width - 12))}px`;
  wordPopover.style.top = `${Math.max(12, Math.min(anchorY + 12, window.innerHeight - wordPopover.offsetHeight - 12))}px`;
}

function showTranslationOptions(event, side) {
  populateTranslationOptions(event, side, selectionAt(areaFor(side), false));
}

function showAlignmentOptions(event, side, item) {
  const textarea = areaFor(side);
  const start = side === direction ? item.sourceStart : item.targetStart;
  const end = side === direction ? item.sourceEnd : item.targetEnd;
  if (!Number.isInteger(start) || !Number.isInteger(end)) return;
  populateTranslationOptions(event, side, { text: textarea.value.slice(start, end), start, end }, item);
}

function splitCurrentPhrase() {
  const item = currentSelection?.alignmentItem;
  if (!item || currentSelection.sourceSide !== direction) return;
  const phrase = item.sourceText.trim();
  splitPhrases[direction].add(phrase.toLocaleLowerCase());
  translator.setPhraseEnabled(direction, phrase, false);
  translateSelectedDirection();
  statusText.textContent = `Phrase split for this text: “${phrase}”`;
}

function restoreCurrentPhrase() {
  if (!currentSelection) return;
  const phrase = currentSelection.clickedText.trim();
  splitPhrases[currentSelection.clickedSide].delete(phrase.toLocaleLowerCase());
  translator.setPhraseEnabled(currentSelection.clickedSide, phrase, true);
  translateSelectedDirection();
  statusText.textContent = `Saved phrase restored: “${phrase}”`;
}

function closePopover() { wordPopover.hidden = true; }

function setTemporaryUnknownType() {
  if (!currentSelection || currentSelection.sourceSide !== "english") return;
  const expression = currentSelection.sourceText.trim();
  if (!expression) return;
  translator.setTemporaryEnglishCategory(expression, unknownTypeSelect.value);
  const selectedCategory = unknownTypeSelect.value;
  translateSelectedDirection();
  statusText.textContent = selectedCategory
    ? `Temporary type for “${expression}”: ${CATEGORY_LABELS[selectedCategory] || selectedCategory}`
    : `“${expression}” returned to automatic word-type detection`;
  statusDot.classList.add("warning");
}

function useForOccurrence(value) {
  const item = currentSelection?.alignmentItem;
  if (!item || currentSelection.sourceSide !== direction) return;
  const key = occurrenceKey(item);
  occurrenceOverrides.set(key, value);
  translateSelectedDirection();
  const updated = lastAlignment.find((candidate) => occurrenceKey(candidate) === key);
  if (updated) highlight(otherSide(direction), updated.targetStart, updated.targetEnd);
  statusText.textContent = `Used once: “${currentSelection.sourceText}” → “${value}”`;
  statusDot.classList.remove("warning");
}

function setDefaultTranslation(value, category = "") {
  if (!currentSelection) return;
  translator.setPreference(currentSelection.sourceSide, currentSelection.sourceText, value, category);
  storePreference(currentSelection.sourceSide, currentSelection.sourceText, value, category);
  translateSelectedDirection();
  statusText.textContent = `Default ${CATEGORY_LABELS[category] || category} translation saved: “${currentSelection.sourceText}” → “${value}”`;
  statusDot.classList.remove("warning");
}

function openAddDialog(forcePhrase = false) {
  if (!currentSelection) return;
  const fromYapo = currentSelection.clickedSide === "yapo";
  addEntryFromYapo = fromYapo;
  editingEntry = null;
  translationDialogTitle.textContent = "Add translation";
  saveTranslationButton.textContent = "Save translation";
  sourceFieldLabel.textContent = fromYapo ? "Yapo Teya word or phrase" : "English word or phrase";
  translationFieldLabel.textContent = fromYapo ? "English translation" : "Yapo Teya translation";
  sourceWord.value = currentSelection.clickedText;
  translationWord.value = "";
  wordCategory.value = forcePhrase || /\s/u.test(currentSelection.clickedText) ? "ph" : "basic";
  saveNote.textContent = "The entry will be stored only in this browser.";
  updateAddSuggestions();
  closePopover();
  addDialog.showModal();
  translationWord.focus();
}

function openDictionaryAddDialog() {
  addEntryFromYapo = true;
  editingEntry = null;
  translationDialogTitle.textContent = "Add translation";
  saveTranslationButton.textContent = "Save translation";
  currentSelection = null;
  sourceFieldLabel.textContent = "Yapo Teya word or phrase";
  translationFieldLabel.textContent = "English translation";
  sourceWord.value = "";
  translationWord.value = "";
  wordCategory.value = "basic";
  saveNote.textContent = "The entry will be stored only in this browser.";
  updateAddSuggestions();
  dictionaryDialog.close();
  addDialog.showModal();
  sourceWord.focus();
}

function openDictionaryEditDialog(entry) {
  addEntryFromYapo = dictionaryDirection === "yapo";
  editingEntry = { ...entry };
  translationDialogTitle.textContent = "Edit dictionary entry";
  saveTranslationButton.textContent = "Save changes";
  sourceFieldLabel.textContent = addEntryFromYapo ? "Yapo Teya word or phrase" : "English word or phrase";
  translationFieldLabel.textContent = addEntryFromYapo ? "English translation" : "Yapo Teya translation";
  sourceWord.value = addEntryFromYapo ? entry.yapo : entry.english;
  translationWord.value = addEntryFromYapo ? entry.english : entry.yapo;
  wordCategory.value = entry.category;
  saveNote.textContent = "This edit is saved only in this browser. The published dictionary stays unchanged.";
  updateAddSuggestions();
  dictionaryDialog.close();
  addDialog.showModal();
  sourceWord.focus();
}

function yapoEntryField() {
  return addEntryFromYapo ? sourceWord : translationWord;
}

function updateRootSuggestions() {
  const field = yapoEntryField();
  const query = field?.value.trim().toLocaleLowerCase() || "";
  const isSingleWord = query && !/\s/u.test(query);
  const roots = Object.entries(window.YAPO_DICTIONARY_METADATA?.roots || {})
    .flatMap(([root, metadata]) => Object.entries(metadata.forms || {}).map(([category, form]) => ({
      root,
      category,
      word: form.word,
      meanings: form.meanings?.length ? form.meanings : (metadata.canonical || []),
      canonical: metadata.canonical || [],
      lower: root.toLocaleLowerCase(),
    })))
    .filter((entry) => isSingleWord && (query.startsWith(entry.lower)
      || entry.lower.startsWith(query)
      || entry.word.toLocaleLowerCase().startsWith(query)
      || entry.meanings.some((meaning) => meaning.toLocaleLowerCase().includes(query))))
    .sort((left, right) => {
      const leftExactPrefix = query.startsWith(left.lower) ? 0 : 1;
      const rightExactPrefix = query.startsWith(right.lower) ? 0 : 1;
      return leftExactPrefix - rightExactPrefix
        || Number(right.word.toLocaleLowerCase() === query) - Number(left.word.toLocaleLowerCase() === query)
        || Math.abs(left.root.length - query.length) - Math.abs(right.root.length - query.length);
    })
    .slice(0, 8);
  rootSuggestionsList.replaceChildren();
  rootSuggestions.hidden = !roots.length;
  for (const entry of roots) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "root-suggestion";
    const rootName = document.createElement("strong");
    rootName.textContent = entry.word;
    const meaning = document.createElement("span");
    meaning.textContent = `${entry.meanings.join(", ")} · ${CATEGORY_LABELS[entry.category] || entry.category} · root ${entry.root}`;
    button.append(rootName, meaning);
    button.title = "Use this form, its translation, and its word type";
    button.addEventListener("click", () => {
      const yapoField = addEntryFromYapo ? sourceWord : translationWord;
      const englishField = addEntryFromYapo ? translationWord : sourceWord;
      yapoField.value = entry.word;
      englishField.value = entry.meanings[0] || entry.canonical[0] || "";
      wordCategory.value = entry.category;
      englishField.focus();
      updateAddSuggestions();
    });
    rootSuggestionsList.append(button);
  }
}

function updateDictionarySuggestions() {
  const yapoField = addEntryFromYapo ? sourceWord : translationWord;
  const englishField = addEntryFromYapo ? translationWord : sourceWord;
  const yapoQuery = yapoField.value.trim().toLocaleLowerCase();
  const englishQuery = englishField.value.trim().toLocaleLowerCase();
  const queries = [...new Set([yapoQuery, englishQuery].filter(Boolean))];
  const entries = Object.entries(activeDictionaries || {})
    .filter(([category]) => category !== "root")
    .flatMap(([category, dictionary]) => Object.entries(dictionary)
      .flatMap(([yapo, meanings]) => meanings.map((english) => ({ category, yapo, english }))));
  const matches = entries.filter((entry) => {
    return queries.some((query) => entry.yapo.toLocaleLowerCase().includes(query)
      || entry.english.toLocaleLowerCase().includes(query));
  }).sort((left, right) => {
    const leftExact = Number(queries.some((query) => left.yapo.toLocaleLowerCase() === query || left.english.toLocaleLowerCase() === query));
    const rightExact = Number(queries.some((query) => right.yapo.toLocaleLowerCase() === query || right.english.toLocaleLowerCase() === query));
    return rightExact - leftExact || left.yapo.localeCompare(right.yapo);
  }).slice(0, 8);
  dictionarySuggestionsList.replaceChildren();
  dictionarySuggestions.hidden = !matches.length;
  for (const entry of matches) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "root-suggestion dictionary-suggestion";
    const source = document.createElement("strong");
    source.textContent = entry.yapo;
    const translation = document.createElement("span");
    translation.textContent = `${entry.english} · ${CATEGORY_LABELS[entry.category] || entry.category}`;
    button.append(source, translation);
    button.addEventListener("click", () => {
      yapoField.value = entry.yapo;
      englishField.value = entry.english;
      wordCategory.value = entry.category;
      updateAddSuggestions();
    });
    dictionarySuggestionsList.append(button);
  }
}

function updateAddSuggestions() {
  updateRootSuggestions();
  updateDictionarySuggestions();
}

async function saveTranslation(event) {
  event.preventDefault();
  const entry = {
    category: wordCategory.value,
    yapo: (addEntryFromYapo ? sourceWord.value : translationWord.value).trim(),
    english: (addEntryFromYapo ? translationWord.value : sourceWord.value).trim(),
  };
  if (!entry.yapo || !entry.english) return;
  try {
    if (editingEntry) {
      const oldKey = entryKey(editingEntry);
      const local = loadLocalEntries().some((item) => entryKey(item) === oldKey);
      if (local) {
        removeLocalEntry(editingEntry);
        storeLocalEntry(entry);
      } else {
        const edits = loadLocalEdits();
        const index = edits.findIndex((item) => entryKey(item.original) === oldKey || entryKey(item.replacement) === oldKey);
        if (index >= 0) edits[index].replacement = entry;
        else edits.push({ original: editingEntry, replacement: entry });
        saveLocalEdits(edits);
      }
    } else {
      storeLocalEntry(entry);
    }
    saveLocalDeletions(loadLocalDeletions().filter((item) => entryKey(item) !== entryKey(entry)));
    rebuildLocalTranslator();
    addDialog.close();
    translateSelectedDirection();
    statusText.textContent = `${editingEntry ? "Updated" : "Saved"} “${entry.yapo}” in this browser`;
    editingEntry = null;
    statusDot.classList.remove("warning");
    if (dictionaryDialog.open) renderCustomDictionary();
  } catch (error) {
    saveNote.textContent = `Could not save: ${error.message}`;
    statusDot.classList.add("warning");
  }
}

async function deleteTranslation(entry) {
  if (!window.confirm(`Hide “${entry.yapo}” → “${entry.english}” in this browser?`)) return false;
  try {
    const key = entryKey(entry);
    const local = loadLocalEntries().some((item) => entryKey(item) === key);
    if (local) removeLocalEntry(entry);
    const edits = loadLocalEdits();
    const edited = edits.find((item) => entryKey(item.replacement) === key);
    if (edited) {
      saveLocalEdits(edits.filter((item) => item !== edited));
      const deletions = loadLocalDeletions();
      if (!deletions.some((item) => entryKey(item) === entryKey(edited.original))) deletions.push(edited.original);
      saveLocalDeletions(deletions);
    } else if (!local) {
      const deletions = loadLocalDeletions();
      if (!deletions.some((item) => entryKey(item) === key)) deletions.push(entry);
      saveLocalDeletions(deletions);
    }
    rebuildLocalTranslator();
    currentSelection = null;
    closePopover();
    translateSelectedDirection();
    statusText.textContent = `Hidden “${entry.yapo}” → “${entry.english}” in this browser`;
    statusDot.classList.remove("warning");
    if (dictionaryDialog.open) renderCustomDictionary();
    return true;
  } catch (error) {
    statusText.textContent = `Could not remove translation: ${error.message}`;
    statusDot.classList.add("warning");
    return false;
  }
}

function renderCustomDictionary() {
  const query = dictionarySearch.value.trim().toLocaleLowerCase();
  const entries = dictionaryMode === "custom"
    ? [...combinedCustomEntries(), ...loadLocalEdits().map((item) => item.replacement)]
    : Object.entries(activeDictionaries).filter(([category]) => category !== "root").flatMap(([category, dictionary]) =>
      Object.entries(dictionary).flatMap(([yapo, meanings]) => meanings.map((english) => ({ category, yapo, english }))));
  const filteredEntries = entries.filter((entry) => !query
    || entry[dictionaryDirection].toLocaleLowerCase().includes(query));
  customDictionaryList.replaceChildren();
  if (!filteredEntries.length) {
    const empty = document.createElement("div");
    empty.className = "empty-options";
    empty.textContent = query
      ? "No dictionary terms match this search."
      : (dictionaryMode === "custom" ? "No terms have been added yet." : "The dictionary is empty.");
    customDictionaryList.append(empty);
    return;
  }
  const targetDirection = dictionaryDirection === "yapo" ? "english" : "yapo";
  filteredEntries.sort((left, right) => left[dictionaryDirection].localeCompare(right[dictionaryDirection])
    || left[targetDirection].localeCompare(right[targetDirection]));
  for (const entry of filteredEntries) {
    const row = document.createElement("div");
    row.className = "dictionary-entry";
    const source = document.createElement("button");
    source.type = "button";
    source.className = "dictionary-word-button";
    source.textContent = entry[dictionaryDirection];
    const arrow = document.createElement("span");
    arrow.className = "dictionary-arrow";
    arrow.textContent = "→";
    const target = document.createElement("button");
    target.type = "button";
    target.className = "dictionary-word-button dictionary-word-target";
    target.textContent = entry[targetDirection];
    source.addEventListener("click", () => showDictionaryDetails(entry));
    target.addEventListener("click", () => showDictionaryDetails(entry));
    const action = document.createElement("div");
    action.className = "dictionary-entry-actions";
    const category = document.createElement("span");
    category.className = "dictionary-category";
    category.textContent = CATEGORY_LABELS[entry.category] || entry.category;
    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "edit-option";
    editButton.textContent = "Edit";
    editButton.title = "Edit this dictionary entry";
    editButton.addEventListener("click", () => openDictionaryEditDialog(entry));
    action.append(category, editButton);
    if (true) {
      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "delete-option";
      deleteButton.textContent = "Delete";
      deleteButton.addEventListener("click", () => deleteTranslation(entry));
      action.append(deleteButton);
    }
    row.append(source, arrow, target, action);
    customDictionaryList.append(row);
  }
}

function detailField(label, value) {
  const wrapper = document.createElement("div");
  wrapper.className = "dictionary-detail-field";
  const name = document.createElement("span");
  name.textContent = label;
  const content = document.createElement("strong");
  content.textContent = value || "Not specified";
  wrapper.append(name, content);
  return wrapper;
}

function showDictionaryDetails(entry) {
  const metadata = window.YAPO_DICTIONARY_METADATA || {};
  const rootName = metadata.word_to_root?.[entry.yapo.toLocaleLowerCase()];
  const root = rootName ? metadata.roots?.[rootName] : null;
  dictionaryDetailsWord.textContent = `${entry.yapo} · ${entry.english}`;
  dictionaryDetailsGrid.replaceChildren();
  dictionaryDetailsGrid.append(
    detailField("Word type", CATEGORY_LABELS[entry.category] || entry.category),
    detailField("Root", rootName || "No composite root"),
  );
  if (root) {
    dictionaryDetailsGrid.append(
      detailField("Canonical meaning", (root.canonical || []).join(", ")),
      detailField("Etymology", root.etymology),
    );
    if (root.note) dictionaryDetailsGrid.append(detailField("Note", root.note));
    const variants = document.createElement("div");
    variants.className = "dictionary-variants";
    const title = document.createElement("span");
    title.textContent = "Variants";
    const list = document.createElement("div");
    list.className = "dictionary-variant-list";
    for (const [category, form] of Object.entries(root.forms || {})) {
      const variant = document.createElement("div");
      const word = document.createElement("strong");
      word.textContent = form.word;
      const description = document.createElement("span");
      description.textContent = `${CATEGORY_LABELS[category] || category}: ${(form.meanings || []).join(", ")}`;
      variant.append(word, description);
      list.append(variant);
    }
    variants.append(title, list);
    dictionaryDetailsGrid.append(variants);
  }
  dictionaryDetails.hidden = false;
  dictionaryDetails.scrollIntoView({ block: "nearest" });
}

function openDictionary() {
  dictionaryMode = "custom";
  dictionarySearch.value = "";
  dictionaryDetails.hidden = true;
  updateDictionaryTabs();
  dictionaryDialog.showModal();
  dictionarySearch.focus();
}

function updateDictionaryTabs() {
  const custom = dictionaryMode === "custom";
  customDictionaryTab.classList.toggle("active", custom);
  allDictionaryTab.classList.toggle("active", !custom);
  customDictionaryTab.setAttribute("aria-selected", String(custom));
  allDictionaryTab.setAttribute("aria-selected", String(!custom));
  updateDictionaryDirection();
  renderCustomDictionary();
}

function updateDictionaryDirection() {
  const fromYapo = dictionaryDirection === "yapo";
  dictionaryFrom.textContent = fromYapo ? "Yapo Teya" : "English";
  dictionaryTo.textContent = fromYapo ? "English" : "Yapo Teya";
  const scope = dictionaryMode === "custom" ? "added terms" : "dictionary";
  dictionarySearch.placeholder = `Search ${fromYapo ? "Yapo Teya" : "English"} in ${scope}…`;
  dictionarySearch.setAttribute("aria-label", dictionarySearch.placeholder);
}

yapoInput.addEventListener("input", () => scheduleTranslation("yapo"));
englishInput.addEventListener("input", () => scheduleTranslation("english"));
yapoInput.addEventListener("mousemove", (event) => handleHover(event, "yapo"));
englishInput.addEventListener("mousemove", (event) => handleHover(event, "english"));
yapoInput.addEventListener("mouseleave", stopHover);
englishInput.addEventListener("mouseleave", stopHover);
for (const side of ["yapo", "english"]) {
  areaFor(side).addEventListener("scroll", () => {
    const layer = highlightLayerFor(side);
    layer.scrollTop = areaFor(side).scrollTop;
    layer.scrollLeft = areaFor(side).scrollLeft;
    if (syncingScroll) return;
    syncingScroll = true;
    const sourceArea = areaFor(side);
    const otherArea = areaFor(otherSide(side));
    const maximum = Math.max(1, sourceArea.scrollHeight - sourceArea.clientHeight);
    const otherMaximum = Math.max(0, otherArea.scrollHeight - otherArea.clientHeight);
    otherArea.scrollTop = (sourceArea.scrollTop / maximum) * otherMaximum;
    highlightLayerFor(otherSide(side)).scrollTop = otherArea.scrollTop;
    window.requestAnimationFrame(() => { syncingScroll = false; });
  });
}
yapoInput.addEventListener("contextmenu", (event) => showContextMenu(event, "yapo"));
englishInput.addEventListener("contextmenu", (event) => showContextMenu(event, "english"));
directionYapo.addEventListener("click", () => setDirection("yapo"));
directionEnglish.addEventListener("click", () => setDirection("english"));
document.querySelector("#translateButton").addEventListener("click", translateSelectedDirection);
document.querySelector("#clearButton").addEventListener("click", clearTranslator);
document.querySelector("#closePopover").addEventListener("click", closePopover);
document.querySelector("#addTranslationButton").addEventListener("click", () => openAddDialog(false));
unknownTypeSelect.addEventListener("change", setTemporaryUnknownType);
document.querySelector("#dictionaryButton").addEventListener("click", openDictionary);
document.querySelector("#dictionaryAddButton").addEventListener("click", openDictionaryAddDialog);
document.querySelector("#closeDictionary").addEventListener("click", () => dictionaryDialog.close());
dictionarySearch.addEventListener("input", renderCustomDictionary);
customDictionaryTab.addEventListener("click", () => { dictionaryMode = "custom"; updateDictionaryTabs(); });
allDictionaryTab.addEventListener("click", () => { dictionaryMode = "all"; updateDictionaryTabs(); });
dictionaryFlip.addEventListener("click", () => {
  dictionaryDirection = dictionaryDirection === "yapo" ? "english" : "yapo";
  updateDictionaryDirection();
  renderCustomDictionary();
  dictionarySearch.focus();
});
document.querySelector("#closeDictionaryDetails").addEventListener("click", () => { dictionaryDetails.hidden = true; });
sourceWord.addEventListener("input", updateAddSuggestions);
translationWord.addEventListener("input", updateAddSuggestions);
wordCategory.addEventListener("change", updateAddSuggestions);
document.querySelector("#closeDialog").addEventListener("click", () => addDialog.close());
document.querySelector("#cancelAdd").addEventListener("click", () => addDialog.close());
addForm.addEventListener("submit", saveTranslation);
document.querySelectorAll("[data-copy]").forEach((button) => button.addEventListener("click", () => copyText(button)));
document.addEventListener("pointerdown", (event) => {
  if (!wordPopover.hidden && !wordPopover.contains(event.target) && ![yapoInput, englishInput].includes(event.target)) closePopover();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !addDialog.open) closePopover();
  if (event.ctrlKey && event.key === "Enter") { event.preventDefault(); translateSelectedDirection(); }
  if (event.ctrlKey && event.key.toLocaleLowerCase() === "l") { event.preventDefault(); clearTranslator(); }
});

updateCounts();
setDirection("yapo");
