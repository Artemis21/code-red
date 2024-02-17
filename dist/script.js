const MODE_TEXT = "text";
const MODE_FILE = "file";

// Event for setting mode to text.
const C_SET_MODE_TEXT = "set_mode_text";

// Event for setting mode to file.
const C_SET_MODE_FILE = "set_mode_file";

// Event for setting the text contents in text mode.
const C_SET_TEXT_CONTENT = "set_text_content";

// Event for adding a file in file mode (new file ID is param).
const C_ADD_FILE = "add_file";

// Event for removing a file in file mode (old file ID is param).
const C_REMOVE_FILE = "remove_file";

// Event for removing all files in file mode.
const C_CLEAR_FILES = "clear_files";

// Event for the input being empty (no files or empty text content);
const C_EMPTY_SOURCE = "empty_source";

// Event for line numbers being enabled.
const C_ENABLE_LINE_NUMBERS = "enable_line_numbers";

// Event for line numbers being disabled.
const C_DISABLE_LINE_NUMBERS = "disable_line_numbers";

// Event for changing the number line numbers start from.
const C_SET_FIRST_LINE_NUMBER = "set_first_line_number";

// Event for the error message being shown.
const C_SHOW_ERROR = "show_error";

// Event for the error message being hidden.
const C_HIDE_ERROR = "hide_error";

// Event for the error message changing.
const C_SET_ERROR_MESSAGE = "set_error_message";

// Event for showing the "about" modal.
const C_SHOW_ABOUT = "show_about";

// Event for hiding the "about" modal.
const C_HIDE_ABOUT = "hide_about";

class SourceData {
  #includeLineNumbers = true;
  #firstLineNumber = 1;
  #mode = MODE_TEXT;
  #text = "";
  #files = new Map();
  #nextFileId = 0;
  #error = "";
  #showAbout = false;
  #callbacks = new Map();

  on(event, cb) {
    const cbs = this.#callbacks.get(event) || [];
    cbs.push(cb);
    this.#callbacks.set(event, cbs);
  }

  #trigger(event, params) {
    (this.#callbacks.get(event) || []).forEach((cb) => cb(...params));
  }

  isModeText() {
    return this.#mode === MODE_TEXT;
  }

  isModeFile() {
    return this.#mode === MODE_FILE;
  }

  getTextContent() {
    return this.#text;
  }

  getFileIds() {
    return Array.from(this.#files.keys());
  }

  getFile(id) {
    return this.#files.get(id);
  }

  getFileName(id) {
    return this.#files.get(id).name;
  }

  getFileContent(id) {
    return this.#files.get(id).content;
  }

  isLineNumbersEnabled() {
    return this.#includeLineNumbers;
  }

  getFirstLineNumber() {
    return this.#firstLineNumber;
  }

  errorIsShown() {
    return this.#error === null;
  }

  getErrorMessage() {
    return `Error: ${this.#error}` || "";
  }

  aboutIsShown() {
    return this.#showAbout;
  }

  isEmpty() {
    if (this.isModeText()) {
      return this.#text === "";
    } else if (this.isModeFile()) {
      return this.#files.size === 0;
    } else {
      throw "Invalid source mode";
    }
  }

  setModeText() {
    if (this.isModeText()) return;
    this.#mode = MODE_TEXT;
    this.#trigger(C_SET_MODE_TEXT, []);
    this.setTextContent("");
  }

  setModeFile() {
    if (this.isModeFile()) return;
    this.#mode = MODE_FILE;
    this.#trigger(C_SET_MODE_FILE, []);
    this.clearFiles();
  }

  setTextContent(text) {
    this.#text = text;
    this.#trigger(C_SET_TEXT_CONTENT, []);
    if (text === "") {
      this.#trigger(C_EMPTY_SOURCE, []);
    }
  }

  addFile(name, content) {
    let id = this.#nextFileId++;
    this.#files.set(id, { name, content });
    this.#trigger(C_ADD_FILE, [id]);
    return id;
  }

  removeFile(id) {
    this.#files.delete(id);
    this.#trigger(C_REMOVE_FILE, [id]);
    if (this.#files.size === 0) {
      this.#trigger(C_EMPTY_SOURCE, []);
    }
  }

  clearFiles() {
    this.#files.clear();
    this.#trigger(C_CLEAR_FILES, []);
    this.#trigger(C_EMPTY_SOURCE, []);
  }

  enableLineNumbers() {
    this.#includeLineNumbers = true;
    this.#trigger(C_ENABLE_LINE_NUMBERS, []);
  }

  disableLineNumbers() {
    this.#includeLineNumbers = false;
    this.#trigger(C_DISABLE_LINE_NUMBERS, []);
  }

  setLineNumbersEnabled(enabled) {
    if (enabled) {
      this.enableLineNumbers();
    } else {
      this.disableLineNumbers();
    }
  }

  setFirstLineNumber(number) {
    this.#firstLineNumber = number;
    if (this.#includeLineNumbers) {
      this.#trigger(C_SET_FIRST_LINE_NUMBER, []);
    }
  }

  error(message) {
    this.#error = message;
    this.#trigger(C_SHOW_ERROR, []);
    this.#trigger(C_SET_ERROR_MESSAGE, []);
  }

  clearErrors() {
    this.#error = null;
    this.#trigger(C_HIDE_ERROR, []);
  }

  showAbout() {
    this.#showAbout = true;
    this.#trigger(C_SHOW_ABOUT, []);
  }

  hideAbout() {
    this.#showAbout = false;
    this.#trigger(C_HIDE_ABOUT, []);
  }
}

let source = new SourceData();

const E = document.getElementById.bind(document);

const codeInp = E("code");
const filesInp = E("files");
const filesTab = E("files_outer");
const clearFilesBtn = E("clear_files");
const pasteBtn = E("paste");
const uploadBtn = E("upload");
const uploadLabel = E("upload_label");
const folderBtn = E("folder");
const copyBtn = E("copy");
const outputEl = E("output");
const placeholderEl = E("placeholder");
const lineNumbersInp = E("line_numbers");
const firstLineNumberInp = E("first_line_number");
const firstLineNumberLabel = E("first_line_number_label");
const errorOut = E("error");
const aboutModal = E("about");
const modalCloseBtn = E("modal_close");
const headerHelpBtn = E("header_help");
const footerHelpBtn = E("footer_help");

source.on(C_SET_MODE_TEXT, () => {
  pasteBtn.classList.add("action--tab");
  uploadLabel.classList.remove("action--tab");
  filesTab.classList.add("hidden");
  codeInp.classList.remove("hidden");
  if (source.isLineNumbersEnabled()) enableFirstLineNumber();
});

source.on(C_SET_MODE_FILE, () => {
  uploadLabel.classList.add("action--tab");
  pasteBtn.classList.remove("action--tab");
  codeInp.classList.add("hidden");
  filesTab.classList.remove("hidden");
  disableFirstLineNumber();
});

source.on(C_SET_TEXT_CONTENT, () => {
  const text = source.getTextContent();
  codeInp.value = text;
  if (text === "") return;
  outputEl.innerHTML = "";
  renderCode(text, outputEl);
  placeholderEl.classList.add("hidden");
  outputEl.classList.remove("hidden");
  copyBtn.disabled = false;
});

source.on(C_ADD_FILE, (id) => {
  const { name, content } = source.getFile(id);
  const nameIn = document.createElement("div");
  nameIn.classList.add("files__file");
  nameIn.innerText = "❌ " + name;
  nameIn.onclick = () => source.removeFile(id);
  nameIn.dataset.fileId = id;
  filesInp.appendChild(nameIn);
  const nameOut = document.createElement("h3");
  nameOut.classList.add("output__filename");
  nameOut.innerText = name;
  nameOut.dataset.fileId = id;
  outputEl.appendChild(nameOut);
  hardCodeRendering(nameOut);
  renderCode(content, outputEl).dataset.fileId = id;
  placeholderEl.classList.add("hidden");
  outputEl.classList.remove("hidden");
  copyBtn.disabled = false;
});

source.on(C_REMOVE_FILE, (id) => {
  document.querySelectorAll(`[data-file-id="${id}"]`).forEach((el) => {
    el.remove();
  });
});

source.on(C_CLEAR_FILES, () => {
  filesInp.innerHTML = outputEl.innerHTML = "";
});

source.on(C_EMPTY_SOURCE, () => {
  placeholderEl.classList.remove("hidden");
  outputEl.classList.add("hidden");
  copyBtn.disabled = true;
});

function addAllLineNumbers() {
  removeAllLineNumbers();
  document.querySelectorAll(".output__code code").forEach(addLineNumbers);
}

function removeAllLineNumbers() {
  document
    .querySelectorAll(".output__code__linenumber")
    .forEach((el) => el.remove());
}

source.on(C_ENABLE_LINE_NUMBERS, () => {
  addAllLineNumbers();
  if (source.isModeText()) enableFirstLineNumber();
});

source.on(C_DISABLE_LINE_NUMBERS, () => {
  removeAllLineNumbers();
  disableFirstLineNumber();
});

source.on(C_SET_FIRST_LINE_NUMBER, addAllLineNumbers);

source.on(C_SHOW_ERROR, () => errorOut.classList.remove("hidden"));

source.on(C_HIDE_ERROR, () => errorOut.classList.add("hidden"));

source.on(
  C_SET_ERROR_MESSAGE,
  () => (errorOut.textContent = source.getErrorMessage())
);

source.on(C_SHOW_ABOUT, () => aboutModal.classList.remove("hidden"));

source.on(C_HIDE_ABOUT, () => aboutModal.classList.add("hidden"));

hljs.configure({ useBr: true });

function renderCode(codeText, parentEl) {
  const render = document.createElement("code");
  render.textContent = codeText;
  hljs.highlightElement(render);
  if (source.isLineNumbersEnabled()) addLineNumbers(render);
  const pre = document.createElement("pre");
  pre.appendChild(render);
  pre.classList.add("output__code");
  parentEl.appendChild(pre);
  hardCodeRendering(pre);
  return pre;
}

function addLineNumbers(el) {
  let nextLine = source.isModeText() ? source.getFirstLineNumber() : 1;
  const rows = el.innerHTML
    .split("\n")
    .map((line, n) => {
      const num = `<td style="padding:0 0.5em 0 0;text-align:right">${nextLine++}</td>`;
      const code = `<td style="padding:0">${line}</td>`;
      return `<tr style="height:0">${num}${code}</tr>`;
    })
    .join("");
  const numWidth = 16 * nextLine.toString().length;
  const cols = `<colgroup><col width="${numWidth}" /><col /></colgroup>`;
  el.innerHTML = `<table>${cols}<tbody>${rows}</tbody></table>`;
}

function enableFirstLineNumber() {
  firstLineNumberLabel.classList.remove("options__option--disabled");
  firstLineNumberInp.disabled = false;
}

function disableFirstLineNumber() {
  firstLineNumberLabel.classList.add("options__option--disabled");
  firstLineNumberInp.disabled = true;
}

async function copyRendered(source) {
  if (source.isEmpty()) return;
  await copyRich(outputEl.outerHTML, plainRender(source));
  actionFeedback(copyBtn);
}

/** Very basic plain text fallback rendering of the code. */
function plainRender(source) {
  if (source.isModeText()) {
    return source.getTextContent();
  }
  let plain = "";
  for (const id of source.getFileIds()) {
    const fileName = source.getFileName(id);
    plain += fileName + "\n\n";
    plain += source.getFileContent(id) + "\n\n";
  }
  return plain;
}

async function handleDataTransfer(source, data) {
  if (data.types.includes("text/plain")) {
    source.setModeText();
    const text = await data.getData("text/plain");
    source.setTextContent(text);
  } else if (data.types.includes("Files")) {
    source.setModeFile();
    let anyWorked = false;
    if (data.items) {
      for (const item of data.items) {
        const getAsEntry = item.getAsEntry || item.webkitGetAsEntry;
        if (getAsEntry) {
          await handleEntry(source, getAsEntry.call(item));
          anyWorked = true;
        } else {
          break;
        }
      }
    }
    if (!anyWorked) {
      await handleFiles(source, data.files);
    }
  }
}

async function handleEntry(source, entry) {
  if (entry.isDirectory) {
    const reader = entry.createReader();
    let entries;
    while (
      (entries = await new Promise(reader.readEntries.bind(reader))).length > 0
    ) {
      for (const subentry of entries) {
        await handleEntry(source, subentry);
      }
    }
  } else {
    let file = await new Promise(entry.file.bind(entry));
    await handleFile(source, file, entry.fullPath.slice(1)); // Slice off leading slash
  }
}

/** Handle the upload, drop or paste of some files.
 *
 * @param {FileList} files
 */
async function handleFiles(source, files) {
  for (const file of files) {
    await handleFile(source, file, null);
  }
}

async function handleFile(source, file, nameOverride) {
  const name =
    nameOverride || file.relativePath || file.webkitRelativePath || file.name;
  if (
    file.type === "" ||
    file.type.startsWith("text/") ||
    file.type.startsWith("application/")
  ) {
    const text = await file.text();
    let invalidCount = 0;
    for (let i = 0; i < text.length; i++) {
      if (text.charCodeAt(i) === 0xfffd) {
        invalidCount += 1;
      }
    }
    // Allow 1% of text to be invalid/replacement chars.
    if (invalidCount * 100 > text.length) {
      source.error(`file '${name}' is not a text file`);
      return;
    }
    source.addFile(name, await file.text());
  }
}

async function readClipboard(source) {
  source.clearErrors();
  source.setModeText();
  let text = "";
  try {
    text = await navigator.clipboard.readText();
  } catch (err) {
    source.error("no clipboard access - try Ctrl+V");
  }
  source.setTextContent(text);
}

firstLineNumberInp.oninput = () => {
  source.clearErrors();
  firstLineNumberInp.reportValidity();
  if (!firstLineNumberInp.checkValidity()) return;
  source.setFirstLineNumber(firstLineNumberInp.value);
};

lineNumbersInp.onclick = () => {
  source.clearErrors();
  source.setLineNumbersEnabled(lineNumbersInp.checked);
};

pasteBtn.onclick = () => firePromise(readClipboard(source));

clearFilesBtn.onclick = () => {
  source.clearErrors();
  source.clearFiles();
};

codeInp.oninput = () => {
  source.clearErrors();
  source.setTextContent(codeInp.value);
};

uploadBtn.oninput = folderBtn.oninput = (e) => {
  source.clearErrors();
  source.setModeFile();
  firePromise(handleFiles(source, e.target.files));
};

document.oncopy = copyBtn.onclick = (e) => {
  source.clearErrors();
  // Don't interfere with copying specifically selected text.
  if (!copyBtn.contains(e.target)) {
    const selection = window.getSelection();
    if (selection && selection.type === "Range") return;
  }
  firePromise(copyRendered(source));
  e.preventDefault();
};

document.ondragenter = document.ondragover = (e) => {
  e.stopPropagation();
  e.preventDefault();
};

document.onpaste = document.ondrop = (e) => {
  source.clearErrors();
  const data = e.clipboardData || e.dataTransfer;
  // Don't interfere with pasting text into the text box.
  if (data.types.includes("text/plain") && e.target === codeInp) return;
  firePromise(handleDataTransfer(source, data));
  e.stopPropagation();
  e.preventDefault();
};

headerHelpBtn.onclick = footerHelpBtn.onclick = () => {
  source.showAbout();
};

aboutModal.onclick = (e) => {
  // `aboutModal` is actually the modal wrapper, which covers the
  // background. A click on the background, but not the modal within
  // it, should close the modal.
  if (e.target === aboutModal) {
    source.hideAbout();
  }
};

modalCloseBtn.onclick = () => source.hideAbout();

/**
 * Set the `style` attribute on a given element and all its descendants so that
 * even when the HTML source is taken in isolation, the text is rendered as it
 * currently is.
 *
 * @param {Element} el
 */
function hardCodeRendering(el) {
  let style = window.getComputedStyle(el, null);
  if (el.innerHTML === "") return;
  for (const prop of [
    "color",
    "font-weight",
    "font-family",
    "font-style",
    "font-size"
  ]) {
    el.style[prop] = style.getPropertyValue(prop);
  }
  el.spellcheck = false;
  for (const child of el.children) {
    hardCodeRendering(child);
  }
}

/** Add the `action--active` class to an element for 1s.
 *
 * @param {Element} el
 */
async function actionFeedback(el) {
  const deactivateId = +el.dataset.deactivateTimeout;
  if (!Number.isNaN(deactivateId)) {
    window.clearTimeout(deactivateId);
  }
  el.classList.remove("action--active");
  void el.offsetWidth; // Trigger a reflow.
  el.classList.add("action--active");
  el.dataset.deactivateTimeout = window.setTimeout(
    () => el.classList.remove("action--active"),
    1000
  );
  const d = +el.dataset.deactivateTimeout;
}

/** Copy richly formatted text.
 *
 * @param {string} rich - the text formatted as HTML
 * @param {string} plain - a plain text fallback
 */
async function copyRich(rich, plain) {
  if (typeof ClipboardItem !== "undefined") {
    // Shiny new Clipboard API, not fully supported in Firefox.
    // https://developer.mozilla.org/en-US/docs/Web/API/Clipboard_API#browser_compatibility
    const html = new Blob([rich], {
      type: "text/html"
    });
    const text = new Blob([plain], {
      type: "text/plain"
    });
    const data = new ClipboardItem({
      "text/html": html,
      "text/plain": text
    });
    await navigator.clipboard.write([data]);
  } else {
    // Fallback using the deprecated `document.execCommand`.
    // https://developer.mozilla.org/en-US/docs/Web/API/Document/execCommand#browser_compatibility
    const cb = (e) => {
      e.clipboardData.setData("text/html", rich);
      e.clipboardData.setData("text/plain", plain);
      e.preventDefault();
    };
    document.addEventListener("copy", cb);
    document.execCommand("copy");
    document.removeEventListener("copy", cb);
  }
}

function firePromise(promise) {
  promise.then(() => {}, console.error);
}