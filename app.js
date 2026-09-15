"use strict";

const CUSTOM_STORAGE_KEY = "yapo-teya-custom-translations-v1";
const PREFERENCE_STORAGE_KEY = "yapo-teya-preferred-translations-v1";
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

function combinedCustomEntries(serverEntries = window.YAPO_CUSTOM_ENTRIES || []) {
  const combined = [];
  for (const entry of [...serverEntries, ...loadLocalEntries()]) {
    if (!combined.some((existing) => existing.category === entry.category
      && String(existing.yapo).toLocaleLowerCase() === String(entry.yapo).toLocaleLowerCase()
      && String(existing.english).toLocaleLowerCase() === String(entry.english).toLocaleLowerCase())) combined.push(entry);
  }
  return combined;
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
  const optionCache = new Map();
  const cachedOptions = (value) => {
    const cacheKey = value.trim().toLocaleLowerCase();
    if (!optionCache.has(cacheKey)) optionCache.set(cacheKey, optionsFor(sourceSide, value));
    return optionCache.get(cacheKey);
  };
  const configuredMaximum = typeof translator !== "undefined"
    ? (sourceSide === "yapo" ? translator.maximumYapoPhrase : translator.maximumEnglishPhrase)
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
      if (options.length) {
        selected = { sourceText, sourceStart: start, sourceEnd: end, options, wordCount: length };
        break;
      }
    }
    if (!selected) {
      const word = words[index];
      selected = { sourceText: word.text, sourceStart: word.start, sourceEnd: word.end, options: cachedOptions(word.text), wordCount: 1 };
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
  ranges.sort((left, right) => left.start - right.start || right.end - left.end);
  const fragment = document.createDocumentFragment();
  let cursor = 0;
  for (const range of ranges) {
    if (range.start < cursor) continue;
    cursor = appendHighlightRange(fragment, text, cursor, range, range.alignmentIndex, range.isPhrase, range.isUnknown);
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
  const grammaticalMarkers = new Set(["e", "a", "tish", "li", "la", "pen", "to", "te", "ki", "of"]);
  for (const word of wordSpans(targetText)) {
    if (claimed.some((range) => overlaps(range, word)) || !grammaticalMarkers.has(word.text.toLocaleLowerCase())) continue;
    const next = alignment
      .filter((item) => Number.isInteger(item.targetStart) && item.targetStart >= word.end
        && sentenceNumberAt(targetText, item.targetStart) === sentenceNumberAt(targetText, word.start)
        && /^\s*$/u.test(targetText.slice(word.end, item.targetStart)))
      .sort((left, right) => left.targetStart - right.targetStart)[0];
    const previous = [...alignment]
      .filter((item) => Number.isInteger(item.targetEnd) && item.targetEnd <= word.start
        && sentenceNumberAt(targetText, item.targetStart) === sentenceNumberAt(targetText, word.start)
        && /^\s*$/u.test(targetText.slice(item.targetEnd, word.start)))
      .sort((left, right) => right.targetEnd - left.targetEnd)[0];
    const owner = ["la"].includes(word.text.toLocaleLowerCase()) ? previous : (next || previous);
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
      return variants;
    });
    for (const { optionRank, option } of alignmentOptions) {
      if (omittedByDefault || option.value === "") continue;
      for (const range of cachedTargetRanges(option.value).filter((candidate) =>
        lineNumberAt(targetText, candidate.start) === sourceLine
        && lineNumberAt(targetText, candidate.end - 1) === sourceLine
        && sentenceNumberAt(targetText, candidate.start) === sourceSentence
        && sentenceNumberAt(targetText, candidate.end - 1) === sourceSentence
        && clauseNumberAt(targetText, candidate.start) === sourceClause
        && clauseNumberAt(targetText, candidate.end - 1) === sourceClause)) {
        if (!usedTargets.some((used) => overlaps(used, range))) candidates.push({
          ...range,
          value: option.value,
          optionRank: option.value === occurrenceChoice ? -1 : optionRank,
        });
      }
    }
    candidates.sort((left, right) => Math.abs(left.start - expectedPosition) - Math.abs(right.start - expectedPosition)
      || left.optionRank - right.optionRank);
    target = candidates[0] || null;
    if (!target && !segment.options.length) {
      target = cachedTargetRanges(segment.sourceText)
        .find((range) => !usedTargets.some((used) => overlaps(used, range))
          && lineNumberAt(targetText, range.start) === sourceLine
          && sentenceNumberAt(targetText, range.start) === sourceSentence
          && clauseNumberAt(targetText, range.start) === sourceClause) || null;
    }
    if (target) usedTargets.push(target);
    return { ...segment, targetStart: target?.start, targetEnd: target?.end, targetText: target?.value };
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

function applyAlignmentHighlight(alignmentIndex, className) {
  clearHighlightClass(className);
  document.querySelectorAll(`.highlight-segment[data-alignment-index="${alignmentIndex}"]`)
    .forEach((span) => span.classList.add(className));
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
  const alignmentIndex = span ? Number(span.dataset.alignmentIndex) : null;
  if (alignmentIndex === hoveredAlignmentIndex) return;
  hoveredAlignmentIndex = alignmentIndex;
  clearHighlightClass("is-hovered");
  if (!Number.isInteger(alignmentIndex)) return;
  applyAlignmentHighlight(alignmentIndex, "is-hovered");
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
  const alignmentIndex = span ? Number(span.dataset.alignmentIndex) : null;
  const item = Number.isInteger(alignmentIndex) ? lastAlignment[alignmentIndex] : null;
  if (item) showAlignmentOptions(event, side, item);
  else closePopover();
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
  if (!options.length) {
    const empty = document.createElement("div");
    empty.className = "empty-options";
    empty.textContent = "No saved translations yet.";
    optionList.append(empty);
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
  saveNote.textContent = "The entry will be stored in dictionaries/custom_entries.json.";
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
  saveNote.textContent = "The entry will be stored in dictionaries/custom_entries.json.";
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
  saveNote.textContent = "Changes to generated entries are kept as a persistent override, so rebuilding from Excel will not erase them.";
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
  const entries = Object.entries(window.YAPO_DICTIONARIES || {})
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

  const fromYapo = addEntryFromYapo;

  const entry = {
    category: wordCategory.value,
    yapo: (fromYapo ? sourceWord.value : translationWord.value).trim(),
    english: (fromYapo ? translationWord.value : sourceWord.value).trim(),
  };

  if (!entry.yapo || !entry.english) return;

  saveNote.textContent = "Saving…";

  try {
    if (editingEntry) {
      removeLocalEntry(editingEntry);
      translator.removeCustom(editingEntry);
    }

    translator.addCustom(entry);
    storeLocalEntry(entry);

    addDialog.close();
    translateSelectedDirection();

    statusText.textContent = editingEntry
      ? `Updated “${entry.yapo}” → “${entry.english}” in this browser`
      : `Saved “${entry.yapo}” in this browser`;

    editingEntry = null;
    statusDot.classList.remove("warning");

    if (dictionaryDialog.open) {
      renderCustomDictionary();
    }
  } catch (error) {
    saveNote.textContent = `Could not save: ${error.message}`;
    statusDot.classList.add("warning");
  }
}

async function deleteTranslation(entry) {
  if (!window.confirm(`Delete “${entry.yapo}” → “${entry.english}”?`)) {
    return false;
  }

  try {
    removeLocalEntry(entry);
    translator.removeCustom(entry);

    currentSelection = null;
    closePopover();
    translateSelectedDirection();

    statusText.textContent =
      `Deleted “${entry.yapo}” → “${entry.english}” from this browser`;

    statusDot.classList.remove("warning");

    if (dictionaryDialog.open) {
      renderCustomDictionary();
    }

    return true;
  } catch (error) {
    statusText.textContent =
      `Could not delete translation: ${error.message}`;

    statusDot.classList.add("warning");
    return false;
  }
}

function renderCustomDictionary() {
  const query = dictionarySearch.value.trim().toLocaleLowerCase();
  const entries = dictionaryMode === "custom"
    ? combinedCustomEntries()
    : Object.entries(window.YAPO_DICTIONARIES).filter(([category]) => category !== "root").flatMap(([category, dictionary]) =>
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
    if (translator.isCustom(entry.category, entry.yapo, entry.english)) {
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
