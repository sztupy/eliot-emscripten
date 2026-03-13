const boardDom = document.getElementById('board');
const playerDom = document.getElementById('players');
const historyDom = document.getElementById('history');
const mainRackDom = document.getElementById('main_rack');

const sound_human_event = new Audio("sounds/1.ogg");
const sound_incorrect = new Audio("sounds/2.ogg");
const sound_endgame = new Audio("sounds/3.ogg");
const sound_event = new Audio("sounds/4.ogg");
const sound_start = new Audio("sounds/5.ogg");

// Letter values for standard Gaidhlig Scrabble
const letterValues = {
  'A': 1,
  'À': 4,
  'B': 2,
  'C': 2,
  'D': 1,
  'E': 1,
  'È': 6,
  'F': 4,
  'G': 2,
  'H': 1,
  'I': 1,
  'Ì': 8,
  'L': 2,
  'M': 2,
  'N': 2,
  'O': 2,
  'Ò': 8,
  'P': 8,
  'R': 1,
  'S': 1,
  'T': 4,
  'U': 3,
  'Ù': 6
};

// Standard Scrabble layout degtails
const specialSquares = {
  '0;0': 'tw', '0;7': 'tw', '0;14': 'tw',
  '7;0': 'tw', '7;14': 'tw',
  '14;0': 'tw', '14;7': 'tw', '14;14': 'tw',
  '1;1': 'dw', '2;2': 'dw', '3;3': 'dw', '4;4': 'dw',
  '1;13': 'dw', '2;12': 'dw', '3;11': 'dw', '4;10': 'dw',
  '10;4': 'dw', '11;3': 'dw', '12;2': 'dw', '13;1': 'dw',
  '10;10': 'dw', '11;11': 'dw', '12;12': 'dw', '13;13': 'dw',
  '7;7': 'star',
  '0;3': 'dl', '0;11': 'dl', '2;6': 'dl', '2;8': 'dl',
  '3;0': 'dl', '3;7': 'dl', '3;14': 'dl',
  '6;2': 'dl', '6;6': 'dl', '6;8': 'dl', '6;12': 'dl',
  '7;3': 'dl', '7;11': 'dl',
  '8;2': 'dl', '8;6': 'dl', '8;8': 'dl', '8;12': 'dl',
  '11;0': 'dl', '11;7': 'dl', '11;14': 'dl',
  '12;6': 'dl', '12;8': 'dl', '14;3': 'dl', '14;11': 'dl',
  '1;5': 'tl', '1;9': 'tl', '5;1': 'tl', '5;5': 'tl',
  '5;9': 'tl', '5;13': 'tl', '9;1': 'tl', '9;5': 'tl',
  '9;9': 'tl', '9;13': 'tl', '13;5': 'tl', '13;9': 'tl'
};

// Caches the main rack's details. Used to see if it matches the data from Eliot and if we need to reset the displayed values
let mainRackData = null;

// Main globals. Used as a holding place for the C++ code to send its data
let history = [];
let players = [];
let gameData = {
  onlyAI: false,
  oneHuman: false,
  hasStarted: false
};
let letters = {};

// adding letters to the board from the rack
let temporaryLetters = {};
let selectedKey = null;
let selectedDirection = null;
let dragSelection = false;

// Check if we're on the `en` or `gd` site
let language = document.documentElement.lang;

// Initialize a LOADING screen as built-in for the game board grid
if (language == 'en') {
  letters = {
    '7;2': 'L',
    '7;3': 'O',
    '7;4': 'A',
    '7;5': 'D',
    '7;6': 'I',
    '7;7': 'N',
    '7;8': 'G',
    '7;9': '.',
    '7;10': '.',
    '7;11': '.',
  };
} else {
  letters = {
    '7;2': 'L',
    '7;3': 'U',
    '7;4': 'C',
    '7;5': 'H',
    '7;6': 'D',
    '7;7': 'A',
    '7;8': 'D',
    '7;9': 'H',
    '7;10': '.',
    '7;11': '.',
    '7;12': '.',
  };
}

// Initialize the board with the standard Scrabble grid layout
function initBoard() {
  boardDom.innerHTML = '';
  for (let row = 0; row < 15; row++) {
    for (let col = 0; col < 15; col++) {
      const cell = document.createElement('div');
      const key = `${row};${col}`;
      const type = letters[key] ? 'letter' : (specialSquares[key] || 'normal');
      cell.className = `cell ${type}`;
      cell.id = `board_${row}_${col}`;

      if (type === 'letter') {
        cell.textContent = letters[key].toUpperCase();

        if (letterValues[letters[key]]) {
          const value = document.createElement('span');
          value.textContent = letterValues[letters[key]];
          cell.appendChild(value);
        } else {
          cell.className += " joker";
        }
      }
      else if (type === 'star') cell.textContent = '★';
      else if (type === 'tw') cell.textContent = language == 'en' ? '3W' : '3F';
      else if (type === 'dw') cell.textContent = language == 'en' ? '2W' : '2F';
      else if (type === 'tl') cell.textContent = '3L';
      else if (type === 'dl') cell.textContent = '2L';

      cell.onclick = boardClick;

      boardDom.appendChild(cell);
    }
  }


  boardDom.addEventListener("dragenter", (event) => {
    if (boardDom.classList.contains('active')) {
      boardDom.classList.add("drag");
      event.preventDefault();
    }
  });
  boardDom.addEventListener("dragover", boardDrag);
  boardDom.addEventListener("dragleave", boardLeave);
  boardDom.addEventListener("drop", boardDrop);
}

// Generates a rack from a set of letters from Eliot. Also adds Drag and drop settings for the main rack
function getRack(rack, mainRack = false, showLetter = true) {
  let text = `<div class="rack">`;
  for (let j = 0; j < rack.length; j++) {
    let key = rack[j];
    if (!showLetter) {
      text += `<div class="cell letter">&nbsp;</div>`;
    } else if (letterValues[key]) {
      text += `<div data-letter="${key}" class="cell letter" ${mainRack ? ` draggable="true" onclick="clickLetter(this)" ondragstart="dragLetter(event)" ondragend="dragLetterEnd(event)"` : ''}>${key}<span>${letterValues[key]}</span></div>`;
    } else {
      text += `<div data-letter="${key}" class="cell letter joker" ${mainRack ? ` draggable="true" onclick="clickLetter(this)" ondragstart="dragLetter(event)" ondragend="dragLetterEnd(event)"` : ''}>${key}</div>`;
    }
  }
  text += `</div>`;
  return text;
}

// Mark anything on the boad as "old". It is used to determine what are the new letters placed by the AI so we can easily highlight it
function markOld() {
  for (let row = 0; row < 15; row++) {
    for (let col = 0; col < 15; col++) {
      const key = `${row};${col}`;
      const type = letters[key] ? 'letter' : (specialSquares[key] || 'normal');
      const cell = document.getElementById(`board_${row}_${col}`);
      if (type === 'letter') {
        cell.dataset.old = true;
      }
    }
  }
}

function fillLetterCell(cell, letter) {
  cell.textContent = letter.toUpperCase();

  if (letterValues[letter]) {
    const value = document.createElement('span');
    value.textContent = letterValues[letter];
    cell.appendChild(value);
  } else {
    cell.className += " joker";
  }
}

// redraw the letter data on the board
function redrawLetters() {
  for (let row = 0; row < 15; row++) {
    for (let col = 0; col < 15; col++) {
      const key = `${row};${col}`;
      const type = (letters[key] || temporaryLetters[key]) ? 'letter' : (specialSquares[key] || 'normal');
      const cell = document.getElementById(`board_${row}_${col}`);
      if (!cell)
        continue;

      cell.className = `cell ${type} ${temporaryLetters[key] ? 'selected-cell' : ''}`;
      cell.id = `board_${row}_${col}`;
      cell.textContent = '';

      const letter = letters[key] || temporaryLetters[key];

      if (type === 'letter') {
        if (!temporaryLetters[key]) {
          if (cell.dataset.old) {
            cell.style.removeProperty('background-color');
          } else {
            cell.style.backgroundColor = 'white';
          }
        }

        fillLetterCell(cell, letter);
      }
      else if (type === 'star') cell.textContent = '★';
      else if (type === 'tw') cell.textContent = language == 'en' ? '3W' : '3F';
      else if (type === 'dw') cell.textContent = language == 'en' ? '2W' : '2F';
      else if (type === 'tl') cell.textContent = '3L';
      else if (type === 'dl') cell.textContent = '2L';

      if (key == selectedKey) {
        cell.classList.add("selected-cell");
        cell.classList.add(selectedDirection == 1 ? "vertical" : "horizontal");
        cell.classList.remove("drag-option");
      } else {
        cell.classList.remove("vertical");
        cell.classList.remove("horizontal");
        cell.classList.remove("drag-option");
      }
    }
  }

  if (selectedKey && dragSelection && Object.keys(temporaryLetters).length == 1) {
    let direction = selectedDirection;
    row = +selectedKey.split(";")[0];
    col = +selectedKey.split(";")[1];

    let newKey = `${row};${col}`;
    let start = true;
    while (row >= 0 && col >= 0 && (start || letters[newKey])) {
      start = false;
      if (direction == 1)
        row -= 1;
      else
        col -= 1;

      newKey = `${row};${col}`;
    }

    if (direction == 2) {
      row += 1;
      direction = 1;
    } else {
      col += 1;
      direction = 2;
    }

    newKey = `${row};${col}`;
    while (row < 15 && col < 15 && letters[newKey]) {
      if (direction == 1)
        row += 1;
      else
        col += 1;

      newKey = `${row};${col}`;
    }
    const cell = document.getElementById(`board_${row}_${col}`);
    if (cell) {
      cell.classList.add("selected-cell");
      cell.classList.add("drag-option");
      cell.classList.add(direction == 1 ? "vertical" : "horizontal");
    }
  }
}

// Redraws the entire game field including the board, the main rack, the player displays and the history
function redrawBoard() {
  // BOARD
  if (players[gameData.currentPlayer] && players[gameData.currentPlayer].isHuman && !gameData.isFinished) {
    boardDom.classList.add('active');
  } else {
    boardDom.classList.remove('active');
  }
  redrawLetters();

  // PLAYER data
  playerDom.innerHTML = `<span class="box_header">${language == 'en' ? 'Score' : 'Sgòr'}</span>`;
  let maxPoints = Math.max(...players.map(p => p.score || 0));
  for (let i = 0; i < players.length; i++) {
    const player = players[i];
    const playerElement = document.createElement('div');
    playerElement.className = 'player';

    let text = `<div class="name">${player.name}`;
    if (gameData.currentPlayer == i) {
      if (!gameData.isFinished) {
        playerElement.classList.add('current');
        let thinking = language == 'en' ? 'Thinking...' : 'A’ smaoineachadh';
        text += `<img draggable="false" class="loading" src="img/thinking.png" alt="${thinking}" title="${thinking}">`;
      }
    }

    if (gameData.isFinished && player.score == maxPoints) {
      text += ` <span title="${language == 'en' ? 'Winner!' : 'Buannaiche!'}">✅</span>`;
    }

    text += `</div>`;
    text += `<div class="score">${player.score || 0}</div>`;
    text += getRack(player.rack, false, gameData.isFinished || gameData.onlyAI || (gameData.oneHuman && player.isHuman));

    playerElement.innerHTML = text;
    playerDom.appendChild(playerElement);
  }

  // HISTORY data
  if (gameData.isFinished) {
    historyDom.innerHTML = `<span class="box_header">${language == 'en' ? 'History' : 'Eachdraidh'}</span><div class="history-item">
      <div class="history-id">#${history.length + 1}</div>
      <div class="player-id">----</div>
      <div class="move">${language == 'en' ? 'Game over' : 'An geam seachad'}</div>
      <div class="points">----</div>
    </div>`;
  } else {
    historyDom.innerHTML = `<span class="box_header">${language == 'en' ? 'History' : 'Eachdraidh'}</span>`;
  }
  for (let i = history.length - 1; i >= 0; i--) {
    const [playerId, rack, solution, row, col, direction, points, bonus] = history[i];
    const historyElement = document.createElement('div');
    historyElement.className = 'history-item';
    let text = `<div class="history-id">#${i + 1}</div>`;
    text += `<div class="player-id">${players[playerId] && players[playerId].shortName}</div>`;
    if (row >= 0) {
      if (gameData.isFinished || gameData.onlyAI) {
        text += `<div class="move">${rack} → <a draggable="false" href="https://www.faclair.com/index.aspx?Language=gd&txtSearch=${solution.toLowerCase()}" target="_blank">${solution}</a> @ ${String.fromCharCode('A'.charCodeAt(0) + row)}${col + 1}${direction ? '↕' : '↔'}</div>`;
      } else {
        text += `<div class="move"><a draggable="false" href="https://www.faclair.com/index.aspx?Language=gd&txtSearch=${solution.toLowerCase()}" target="_blank">${solution}</a> @ ${String.fromCharCode('A'.charCodeAt(0) + row)}${col + 1}${direction ? '↕' : '↔'}</div>`;
      }
    } else {
      if (gameData.isFinished || gameData.onlyAI || (gameData.oneHuman && players[playerId].isHuman)) {
        text += `<div class="move">${rack} → ${solution}</div>`;
      } else {
        text += `<div class="move">${solution}</div>`;
      }
    }
    text += `<div class="points">${points}${bonus > 0 ? ` (${points - bonus}+${bonus})` : ''}</div>`;
    historyElement.innerHTML = text;
    historyDom.appendChild(historyElement);
  }

  // MAIN rack
  let oldRack = mainRackDom.getElementsByClassName('rack')[0];

  mainRackDom.innerHTML = '';
  let currentPlayer = players[gameData.currentPlayer];

  let text = `<span class="box_header">${language == 'en' ? 'Player controls' : 'Smachdan cluicheadair'}</span>`;
  if (gameData.isFinished) {
    text += `<button onclick="resetGame()">${language == 'en' ? 'Play again' : 'Cluich a-rithist'}</button>`;
  } else {
    // only AI - we can watch their hand
    if (gameData.onlyAI) {
      if (currentPlayer) {
        text += getRack(currentPlayer.rack);
      }
      // single human - always show the human's hand
    } else if (gameData.oneHuman) {
      let player = players.find(p => p.isHuman);
      if (player) {
        if (player.rack == mainRackData) {
          text += oldRack.outerHTML;
        } else {
          mainRackData = player.rack;
          text += getRack(player.rack, true);
        }
      }
      // otherwise it's a hot seat, so only show if it's their turn
    } else if (currentPlayer && currentPlayer.isHuman) {
      rack = getRack(currentPlayer.rack, true);

      text += `<div><button onclick="document.getElementById('player_rack_hidden').style.display='block';event.currentTarget.parentElement.style.display='none';">${language == 'en' ? `🙈 ${players[gameData.currentPlayer].name}'s turn. Show tiles.` : `🙈 Turas ${players[gameData.currentPlayer].name}. Seall taidhlean.`}</button><br></div><div id="player_rack_hidden" style="display:none;">${rack}</div>`;
    }

    if (currentPlayer && currentPlayer.isHuman) {
      text += '<br>';
      text += "<button id='passbutton' onclick='pass()'>";
      text += language == 'en' ? "⏩ Pass" : "⏩ Pasaig";
      text += "</button>";

      text += "<button id='swapbutton' onclick='swap()'>";
      text += language == 'en' ? "🔄 Swap" : "🔄 Iomlaid";
      text += "</button>";

      text += "&nbsp;"

      text += "<button id='undobutton' onclick='undoLetters()'>";
      text += language == 'en' ? "⌫ Undo" : "⌫ Cuir às";
      text += "</button>";

      text += "&nbsp;"

      text += "<button id='playbutton' onclick='playLetters()'>";
      text += language == 'en' ? "✅ Play" : "✅ Cluich";
      text += "</button>";

      text += "&nbsp;"

      text += "<button id='resetbutton' onclick='resetUserActions()'>";
      text += language == 'en' ? "✖ Reset" : "✖ Ath-shuidhich";
      text += "</button>";

      text += "&nbsp;"

      text += "<button id='randombutton' onclick='randomizeLetters()'>";
      text += language == 'en' ? "🔀 Shuffle letters" : "🔀 Air thuaiream";
      text += "</button>";
    }
  }

  mainRackDom.innerHTML = text;
  for (let element of mainRackDom.getElementsByClassName("rack")) {
    element.addEventListener("dragenter", (event) => {
      event.preventDefault();
    });
    element.addEventListener("dragover", movePlaceholder);
    element.addEventListener("dragleave", (event) => {
      let column = event.currentTarget;

      if (column.contains(event.relatedTarget)) return;
      const placeholder = column.querySelector(".placeholder");
      if (placeholder) {
        placeholder.remove();
      }
    })
    element.addEventListener("drop", dragDrop);
  }

  calculateValidActions();
}

// Human gameplay actions - Pass
function pass() {
  resetUserActions();

  let data = stringToNewUTF8("p");
  _gameAction(data);
  _free(data);

  data = stringToNewUTF8("a g");
  _gameAction(data);
  _free(data);

  sound_human_event.play();
}

// Human gameplay actions - Swap
function swap() {
  for (let _boardLetter in temporaryLetters) {
    sendError(1, 6);
    return;
  }

  let lettersToSwap = [];
  for (let element of [...mainRackDom.getElementsByClassName('selected-letter')]) {
    lettersToSwap.push(element.dataset.letter);
    element.classList.remove("selected-letter");
  }

  resetUserActions();

  if (lettersToSwap.length > 0) {
    let data = stringToNewUTF8(`p ${lettersToSwap.join("")}`);
    _gameAction(data);
    _free(data);

    data = stringToNewUTF8("a g");
    _gameAction(data);
    _free(data);

    sound_human_event.play();
  } else {
    sendError(1, 5);
  }
}

function getWord(row, column, direction) {
  let word = '';
  let coord = null;
  let oldKey = `${row};${column}`;
  let start = true;

  while (row >= 0 && column >= 0 && (start || letters[oldKey] || temporaryLetters[oldKey])) {
    start = false;
    if (direction == 2)
      column -= 1;
    else
      row -= 1;

    oldKey = `${row};${column}`;
  }

  start = true;
  while (row < 15 && column < 15 && (start || letters[oldKey] || temporaryLetters[oldKey])) {
    start = false;
    if (direction == 2)
      column += 1;
    else
      row += 1;

    oldKey = `${row};${column}`;

    if (row >= 0 && column >= 0 && (letters[oldKey] || temporaryLetters[oldKey])) {
      word = word + ((letters[oldKey] && letters[oldKey].toUpperCase()) || temporaryLetters[oldKey]);

      if (!coord) {
        coord = (direction == 2) ? `${String.fromCharCode('A'.charCodeAt(0) + row)}${column + 1}` : `${column + 1}${String.fromCharCode('A'.charCodeAt(0) + row)}`;
      }
    }
  }

  return [word, coord];
}

function playLetters() {
  if (selectedKey) {
    let row = +selectedKey.split(";")[0];
    let column = +selectedKey.split(";")[1];

    let [newWord, coord] = getWord(row, column, selectedDirection);

    if (newWord.length < 2) {
      let direction = selectedDirection;
      if (selectedDirection == 2) {
        column -= 1;
        row += 1;
        direction = 1;
      } else {
        row -= 1;
        column += 1;
        direction = 2;
      }

      [newWord, coord] = getWord(row, column, direction);
    }

    if (newWord.length < 2) {
      sendError(2, 13);
      return;
    }

    resetUserActions();

    console.log(`j ${newWord} ${coord}`);
    let data = stringToNewUTF8(`j ${newWord} ${coord}`);
    _gameAction(data);
    _free(data);

    data = stringToNewUTF8("a g");
    _gameAction(data);
    _free(data);

    sound_human_event.play();
  }

  calculateValidActions();
}

function resetUserActions() {
  for (let element of [...mainRackDom.getElementsByClassName('selected-letter')]) {
    element.classList.remove("selected-letter");
  }

  for (let element of [...document.getElementsByClassName("selected-cell")]) {
    element.classList.remove("selected-cell");
  }

  for (let element of [...document.getElementsByClassName("horizontal")]) {
    element.classList.remove("horizontal");
  }

  for (let element of [...document.getElementsByClassName("vertical")]) {
    element.classList.remove("vertical");
  }

  selectedKey = null;
  temporaryLetters = {};
  dragSelection = false;

  markOld();
  redrawLetters();

  calculateValidActions();
}

function randomizeLetters() {
  let rack = mainRackDom.getElementsByClassName("rack")[0];

  let children = [...rack.children];

  rack.innerHTML = '';
  for (let i = children.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [children[i], children[j]] = [children[j], children[i]];
  }

  for (let child of children) {
    rack.appendChild(child);
  }
}

function calculateValidActions() {
  Object.keys(globalKeyboardFeatures).forEach(key => delete globalKeyboardFeatures[key]);

  if (!document.getElementById('passbutton'))
    return;

  document.getElementById('passbutton').disabled = true; document.getElementById('passbutton').style.display = 'none';
  document.getElementById('swapbutton').disabled = true; document.getElementById('swapbutton').style.display = 'none';
  document.getElementById('playbutton').disabled = true;
  document.getElementById('undobutton').disabled = true;

  hasSelected = false;
  for (let element of [...mainRackDom.getElementsByClassName('letter')]) {
    if (element.classList.contains("selected-letter")) {
      hasSelected = true;
    } else {
      if (element.dataset.letter) {
        globalKeyboardFeatures[element.dataset.letter] = () => { clickLetter(element) };
      }
    }
  }

  if (!hasSelected) {
    document.getElementById('passbutton').disabled = false;
    document.getElementById('passbutton').style.removeProperty('display'); passbutton
    if (selectedKey) {
      document.getElementById('undobutton').disabled = false;
      globalKeyboardFeatures['DELETE'] = document.getElementById('undobutton').onclick;
      globalKeyboardFeatures['BACKSPACE'] = document.getElementById('undobutton').onclick;
    }
  } else {
    document.getElementById('swapbutton').style.removeProperty('display');
    if (Object.keys(temporaryLetters).length == 0) {
      document.getElementById('swapbutton').disabled = false;

      globalKeyboardFeatures['ENTER'] = document.getElementById('swapbutton').onclick;
    } else {
      document.getElementById('undobutton').disabled = false;
      document.getElementById('playbutton').disabled = false;

      globalKeyboardFeatures['DELETE'] = document.getElementById('undobutton').onclick;
      globalKeyboardFeatures['BACKSPACE'] = document.getElementById('undobutton').onclick;
      globalKeyboardFeatures['ENTER'] = document.getElementById('playbutton').onclick;
    }
  }

  globalKeyboardFeatures['ESCAPE'] = document.getElementById('resetbutton').onclick;
}

// click on board
function boardClick(event) {
  if (!boardDom.classList.contains('active'))
    return;

  const data = event.currentTarget.id.split("_");
  const row = data[1];
  const column = data[2];
  const key = `${row};${column}`;

  if (letters[key])
    return;

  if (!selectedKey || selectedKey != key || Object.keys(temporaryLetters).length > 0) {
    resetUserActions();
    selectedKey = key;
    selectedDirection = 2;
  } else if (selectedKey == key) {
    selectedDirection = (selectedDirection == 1 ? 2 : 1);
  }

  redrawLetters();

  calculateValidActions();
}

// Main rack drag and drop boilerplate functions
function makePlaceholder(draggedTask) {
  const placeholder = document.createElement("div");
  placeholder.classList.add("cell");
  placeholder.classList.add("letter");
  placeholder.classList.add("placeholder");
  placeholder.style.height = `${draggedTask.offsetHeight}px`;
  return placeholder;
}

function getSelectedCell(event) {
  let result = null;
  for (let element of [...boardDom.getElementsByClassName("cell")]) {
    const elementRect = element.getBoundingClientRect();
    if (elementRect.left <= event.clientX &&
      elementRect.right >= event.clientX &&
      elementRect.top <= event.clientY &&
      elementRect.bottom >= event.clientY) {
      element.classList.add("selected-cell");
      result = element;
    } else {
      element.classList.remove("selected-cell");
    }
  }

  return result;
}

function boardDrag(event) {
  event.preventDefault();
  getSelectedCell(event);
  redrawLetters();
}

function boardLeave(event) {
  let column = event.currentTarget;
  if (column.contains(event.relatedTarget)) return;

  boardDom.classList.remove("drag");
  redrawLetters();
}

function boardDrop(event) {
  event.preventDefault();
  boardDom.classList.remove("drag");

  const draggedLetter = document.getElementById("dragged-letter");

  if (draggedLetter.classList.contains("selected-letter"))
    return;

  const cell = getSelectedCell(event);
  let row = +cell.id.split('_')[1];
  let col = +cell.id.split('_')[2];
  const key = `${row};${col}`;

  if (!selectedKey || Object.keys(temporaryLetters).length == 0) {
    selectedKey = key;
    selectedDirection = 2;
    dragSelection = true;
    clickLetter(draggedLetter);
  } else if (selectedKey == key) {
    clickLetter(draggedLetter);
  } else if (Object.keys(temporaryLetters).length == 1) {
    let direction = selectedDirection;
    row = +selectedKey.split(";")[0];
    col = +selectedKey.split(";")[1];

    let newKey = `${row};${col}`;
    let start = true;
    while (row >= 0 && col >= 0 && (start || letters[newKey])) {
      start = false;
      if (direction == 1)
        row -= 1;
      else
        col -= 1;

      newKey = `${row};${col}`;
    }

    if (selectedDirection == 2) {
      row += 1;
      direction = 1;
    } else {
      col += 1;
      direction = 2;
    }

    newKey = `${row};${col}`;
    while (row < 15 && col < 15 && letters[newKey]) {
      if (direction == 1)
        row += 1;
      else
        col += 1;

      newKey = `${row};${col}`;
    }

    if (key == newKey) {
      selectedKey = newKey;
      selectedDirection = direction;
      clickLetter(draggedLetter);
    }
  }

  redrawLetters();
}

// Main rack drag and drop boilerplate functions
function movePlaceholder(event) {
  event.preventDefault();
  // Must exist because the ID is added for all drag events with a "task" data entry
  const draggedTask = document.getElementById("dragged-letter");
  const column = event.currentTarget;
  const tasks = column;
  const existingPlaceholder = column.querySelector(".placeholder");
  if (existingPlaceholder) {
    const placeholderRect = existingPlaceholder.getBoundingClientRect();
    if (
      placeholderRect.left <= event.clientX &&
      placeholderRect.right >= event.clientX
    ) {
      return;
    }
  }
  for (const task of tasks.children) {
    if (task.getBoundingClientRect().right >= event.clientX) {
      if (task === existingPlaceholder) return;
      if (existingPlaceholder)
        existingPlaceholder.remove();
      if (task === draggedTask || task.previousElementSibling === draggedTask)
        return;
      tasks.insertBefore(
        existingPlaceholder ? existingPlaceholder : makePlaceholder(draggedTask),
        task,
      );
      return;
    }
  }

  if (existingPlaceholder)
    existingPlaceholder.remove();
  if (tasks.lastElementChild === draggedTask) return;
  tasks.append(existingPlaceholder ? existingPlaceholder : makePlaceholder(draggedTask));
}

// Main rack drag and drop boilerplate functions
function dragLetter(event) {
  event.currentTarget.id = 'dragged-letter';
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("task", "");
}

// Main rack drag and drop boilerplate functions
function dragLetterEnd(_event) {
  document.getElementById('dragged-letter').removeAttribute('id');
}

// Main rack drag and drop boilerplate functions
function dragDrop(event) {
  event.preventDefault();

  const column = event.currentTarget;

  const draggedTask = document.getElementById("dragged-letter");
  const placeholder = column.querySelector(".placeholder");
  if (!placeholder) return;

  draggedTask.remove();
  column.insertBefore(draggedTask, placeholder);
  placeholder.remove();
}

function fillCell(letter, letterToUse, row, column, newKey) {
  temporaryLetters[selectedKey] = letterToUse;
  letter.classList.add("selected-letter");

  redrawLetters();

  while (row < 15 && column < 15 && (letters[newKey] || temporaryLetters[newKey])) {
    if (selectedDirection == 2)
      column += 1;
    else
      row += 1;

    newKey = `${row};${column}`;
  }

  selectedKey = newKey;

  redrawLetters();
  calculateValidActions();
}

// Allows to select / deselect letters for the Swap button
function clickLetter(letter) {
  if (selectedKey) {
    let row = +selectedKey.split(";")[0];
    let column = +selectedKey.split(";")[1];
    let newKey = `${row};${column}`;

    if (letter.classList.contains("selected-letter")) {
      return;
    }

    if (row >= 15 || column >= 15)
      return;

    if (letter.dataset.letter == '?') {
      letterSelector(letter, row, column, newKey);
    } else {
      fillCell(letter, letter.dataset.letter, row, column, newKey);
    }
  } else {
    if (letter.classList.contains("selected-letter")) {
      letter.classList.remove("selected-letter");
    } else {
      letter.classList.add("selected-letter");
    }
    calculateValidActions();
  }
}

// Removes last letter from board
function undoLetters(_event) {
  if (Object.keys(temporaryLetters).length == 0) {
    resetUserActions();
    return;
  }

  if (selectedKey) {
    let row = +selectedKey.split(";")[0];
    let column = +selectedKey.split(";")[1];
    let oldKey = `${row};${column}`;

    while (row >= 0 && column >= 0 && !temporaryLetters[oldKey]) {
      if (selectedDirection == 2)
        column -= 1;
      else
        row -= 1;

      oldKey = `${row};${column}`;
    }

    for (let element of [...mainRackDom.getElementsByClassName('selected-letter')]) {
      if (element.dataset.letter == temporaryLetters[oldKey]) {
        element.classList.remove("selected-letter");
        break;
      } else if (element.dataset.letter == '?' && temporaryLetters[oldKey].toLowerCase() == temporaryLetters[oldKey]) {
        element.classList.remove("selected-letter");
        break;
      }
    }
    delete temporaryLetters[oldKey];

    selectedKey = oldKey;
    redrawLetters();
  }

  calculateValidActions();
}

// Dictionary features
let dictionary = [];
let searchTerm = '';
let searchPage = 0;
let maxLetters = 15;

let globalKeyboardFeatures = {};
let keyboardFeatures = globalKeyboardFeatures;

function letterList(parent, forDictionary = true, clickHandler = null) {
  keyboardFeatures = {};

  let cell;
  for (let letter in letterValues) {
    cell = document.createElement('div');
    cell.className = 'cell letter';
    fillLetterCell(cell, letter);
    parent.appendChild(cell);
    cell.onclick = () => {
      if (forDictionary && searchTerm.length <= maxLetters) {
        searchTerm += letter;
        searchPage = 0;
        loadDictionary();
      } else if (clickHandler) {
        clickHandler(letter);
      }
    }

    keyboardFeatures[letter.toUpperCase()] = cell.onclick;
  }

  cell = document.createElement('div');
  cell.style.flexBasis = '100%';
  cell.style.height = 0;

  parent.appendChild(cell);

  if (!forDictionary) {
    keyboardFeatures['ESCAPE'] = closeModal;
    return;
  }

  for (let i = 2; i <= 15; i++) {
    cell = document.createElement('div');
    cell.className = 'cell letter';
    fillLetterCell(cell, '' + i);
    parent.appendChild(cell);

    cell.onclick = () => {
      maxLetters = i;
      searchPage = 0;
      loadDictionary();
    }

    keyboardFeatures[('' + i)] = cell.onclick;
  }

  cell = document.createElement('div');
  cell.style.flexBasis = '100%';
  cell.style.height = 0;

  parent.appendChild(cell);

  cell = document.createElement('div');
  cell.className = 'cell letter';
  fillLetterCell(cell, '?');
  parent.appendChild(cell);

  cell.onclick = () => {
    searchTerm += '?';
    searchPage = 0;
    loadDictionary();
  }

  keyboardFeatures['?'] = cell.onclick;

  cell = document.createElement('div');
  cell.className = 'cell letter';
  fillLetterCell(cell, '*');
  parent.appendChild(cell);

  cell.onclick = () => {
    searchTerm += '*';
    searchPage = 0;
    loadDictionary();
  }

  keyboardFeatures['*'] = cell.onclick;

  cell = document.createElement('div');
  cell.className = 'cell letter';
  fillLetterCell(cell, '⌫');
  parent.appendChild(cell);

  cell.onclick = () => {
    searchTerm = searchTerm.slice(0, -1);
    searchPage = 0;
    loadDictionary();
  }

  keyboardFeatures['BACKSPACE'] = cell.onclick;
  keyboardFeatures['DELETE'] = cell.onclick;

  cell = document.createElement('div');
  cell.className = 'cell letter';
  fillLetterCell(cell, '✖');
  parent.appendChild(cell);

  cell.onclick = () => {
    searchTerm = '';
    searchPage = 0;
    maxLetters = 15;
    loadDictionary();
  }

  keyboardFeatures['ESCAPE'] = () => {
    if (searchTerm == '') {
      closeModal();
    } else {
      cell.onclick();
    }
  }
}

function loadDictionary() {
  if (dictionary.length == 0) {
    let data = stringToNewUTF8("x");
    _gameAction(data);
    _free(data);
  };

  const contents = dictionaryBox.getElementsByClassName("text")[0];
  contents.innerHTML = language == 'en' ? '<h2>Dictionary</h2>' : '<h2>Faclair</h2>'

  const alphabet = document.createElement('div');
  alphabet.className = 'alphabet';
  contents.appendChild(alphabet);

  letterList(alphabet);

  const searchResult = document.createElement('div');
  let text = searchTerm == '' ? (language == 'en' ? `Showing all words under ${maxLetters} letters` : `A’ sealltainn a h-uile facal fo ${maxLetters} litrichean`) : (language == 'en' ? `Search: '${searchTerm}' (Max ${maxLetters})` : `Dèan lorg airson '${searchTerm}' (${maxLetters} as àirde)`);

  results = 0;
  found = 0;
  text += `<ol start="${searchPage * 50 + 1}">`;

  let searchRegex = RegExp('^' + searchTerm.replace(/\*/g, '.*').replace(/\?/g, '.'), 'i')

  let moreButton = false;
  for (let word of dictionary) {
    if (word.length <= maxLetters && word.search(searchRegex) != -1) {
      if (found >= searchPage * 50) {
        text += `<li><a href="https://www.faclair.com/index.aspx?Language=gd&txtSearch=${word.toLowerCase()}" target="_blank" draggable="false">${word}</a></li>`;
        results += 1;
      }
      found += 1;
    }
    if (results >= 50) {
      moreButton = true;
      break;
    }
  }
  text += '</ol>';

  if (moreButton) {
    text += `<button onclick='searchPage+=1;loadDictionary();'>${language == 'en' ? 'Next Page…' : 'An ath dhuilleag…'}</button>`;
  }

  searchResult.innerHTML = text;

  contents.appendChild(searchResult);
}

// Joker letter selector
function letterSelector(letter, row, column, newKey) {
  const contents = letterBox.getElementsByClassName("text")[0];
  contents.innerHTML = language == 'en' ? '<h2>Letters</h2>' : '<h2>Litrichean</h2>'

  const alphabet = document.createElement('div');
  alphabet.className = 'alphabet';
  contents.appendChild(alphabet);

  letterList(alphabet, false, (newLetter) => {
    fillCell(letter, newLetter.toLowerCase(), row, column, newKey);
    closeModal();
  });

  window.history.pushState("", "", "");
  letterBox.style.display = "block";
}

// Used by Eliot to send history data to JS
function addHistory(n, playerId, rack, solution, row, col, direction, points, bonus) {
  history[n] = [playerId, rack, solution, row, col, direction, points, bonus];
}

// Used by Eliot to send player data to JS
let whichAI = 0;
let whichHuman = 0;
function setPlayer(playerId, score, rack, extended, isHuman) {
  if (playerId == 0) {
    whichAI = 0;
    whichHuman = 0;
  }

  let name;
  if (isHuman) {
    whichHuman += 1;
    let id = (gameData.humanCount > 1 ? ' #' + whichHuman : '');
    name = (language == 'en' ? 'Player' : 'Cluicheadair') + id;
    shortName = (language == 'en' ? 'Pl.' : 'Cl.') + id;
  } else {
    whichAI += 1;
    let id = (gameData.aiCount > 1 ? ' #' + whichAI : '');
    name = (language == 'en' ? 'Computer' : 'Coimpiutair') + id;
    shortName = (language == 'en' ? 'Co.' : 'Co.') + id;
  }

  if (!players[playerId]) {
    players[playerId] = {}
  }
  players[playerId].name = name;
  players[playerId].shortName = shortName;
  players[playerId].score = score;
  players[playerId].rack = rack;
  players[playerId].extended = extended;
  players[playerId].isHuman = isHuman;

  // All player information has been sent over so we can set up the info screen
  if (playerId + 1 == gameData.humanCount + gameData.aiCount) {
    if (gameData.isFinished) {
      sendError(0, 3);
    } else {
      if (players[gameData.currentPlayer] && players[gameData.currentPlayer].isHuman) {
        sendError(0, 2);
      } else {
        sendError(0, 1);
      }
    }
  }
}

// Used by Eliot to send game state data to JS
function setGameState(currentPlayer, isFinished, aiCount, humanCount) {
  gameData.currentPlayer = currentPlayer;
  gameData.isFinished = isFinished;
  gameData.hasStarted = true;
  gameData.onlyAI = (aiCount > 0 && humanCount == 0);
  gameData.oneHuman = (humanCount == 1);
  gameData.humanCount = humanCount;
  gameData.aiCount = aiCount;
}

// Used by Eliot to send over the entire dictionary
function sendDictionaryWord(word) {
  dictionary.push(word);
}

// Used by Eliot to send error information to JS
function sendError(category, errorCode) {
  let error = '';
  let real = true;
  let old = true;

  const errorContent = document.getElementById('errorcontent');

  if (category == 0) {
    real = false;
    old = false;
    if (errorCode == 0) {
      error = language == 'en' ? 'Welcome friend! Please wait for the game to load!' : 'Fàilte, a charaid! Feuch an feith thu gus an luchdaich an geama!';
    } else if (errorCode == 1) {
      error = language == 'en' ? 'The computer is thinking…' : 'Tha coimpiutair a’ smaoineachadh…';
    } else if (errorCode == 2) {
      error = language == 'en' ? `Your turn ${players[gameData.currentPlayer].name}!` : `Do chothrom ${players[gameData.currentPlayer].name}!`;
    } else if (errorCode == 3) {
      error = language == 'en' ? 'Game over! Winner: ' : 'An geam seachad! Buannaiche: ';

      let maxPoints = Math.max(...players.map(p => p.score || 0));
      error += players.filter(p => p.score == maxPoints).map(p => p.name).join(", ");
    } else if (errorCode == 4) {
      error = language == 'en' ? 'Welcome friend! <button onclick="resetGame()">New game!</button>' : 'Fàilte, a charaid! <button onclick="resetGame()">Geama ùr!</button>';
    }
  } else if (category == 1) {
    if (errorCode == 1) {
      error = language == 'en' ? 'Changing letters is not allowed if there are less than 7 tiles left in the bag.' : 'Chan eil cead litrichean a iomlaid ma tha nas lugha na 7 taidhlean air fhàgail sa bhaga.';
    } else if (errorCode == 5) {
      error = language == 'en' ? 'You need to select at least one letter.' : 'Feumaidh tu co-dhiù aon litir a thaghadh.';
      old = false;
    } else if (errorCode == 6) {
      error = language == 'en' ? 'Remove all of your letters from the board first.' : 'Thoir air falbh na litrichean uile bhon bhòrd an toiseach.';
      old = false;
    } else {
      error = language == 'en' ? 'Could not swap letters.' : 'Cha b’ urrainnear litrichean iomlaid.';
    }
  } else if (category == 2) {
    if (errorCode == 3) {
      error = language == 'en' ? 'Word is not valid.' : 'Chan eil am facal ceart.';
    } else if (errorCode == 7) {
      error = language == 'en' ? 'Conecting word is not valid.' : 'Chan eil am facal ceangail dligheach ceart.';
    } else if (errorCode == 9) {
      error = language == 'en' ? 'You must place your word next to an existing word.' : 'Feumaidh tu do fhacal a chur ri faclan a tha ann mar-thà.';
    } else if (errorCode == 11) {
      error = language == 'en' ? 'First word must cover centre tile.' : 'Feumaidh a’ chiad fhacal a bhith sa mheadhan.';
    } else if (errorCode == 13) {
      error = language == 'en' ? 'Word needs to contain at least two letters.' : 'Feumaidh co-dhiù dà litir a bhith anns an fhacal.';
      old = false;
    } else if (errorCode == 14) {
      error = language == 'en' ? 'Invalid letter.' : 'Chan eil an litir ceart.';
      old = false;
    } else {
      error = language == 'en' ? `Could not play word. (${errorCode})` : `Cha b’ urrainnear am facal a chluich. (${errorCode})`;
    }
  } else {
    error = language == 'en' ? 'Invalid action' : 'Chan urrainn dhut an gluasad sin a dhèanamh.';
  }

  error = `<span class="box_header">${language == 'en' ? 'Messages' : 'Teachdaireachdan'}</span>` + error;

  if (real) {
    errorContent.innerHTML = error;
    if (old) {
      errorContent.classList.add('old-error');
    }

    errorContent.classList.remove('real-error');
    void errorContent.offsetWidth;
    errorContent.classList.add('real-error');

    sound_incorrect.play();
  } else {
    if (errorContent.classList.contains('old-error')) {
      errorContent.classList.remove('old-error');
    } else {
      errorContent.classList.remove('real-error');
      errorContent.innerHTML = error;
    }
  }
}

// Set up the Scrabble board
initBoard();

// Runs the AI. AI run is actually mostly instant, so we add a timer to make them look like they're thinking
function play() {
  if (players[gameData.currentPlayer] && !players[gameData.currentPlayer].isHuman) {
    markOld();

    data = stringToNewUTF8("s");
    _gameAction(data);
    _free(data);

    data = stringToNewUTF8("a g");
    _gameAction(data);
    _free(data);

    sound_event.play();
  }

  if (!gameData.isFinished) {
    setTimeout(play, 3000 + (Math.floor(Math.random() * 10) + 1) * 250);
  } else {
    sendError(0, 3);
    sound_endgame.play();
  }
}

// Initialize the game. Either load the saved data or start a new game if no saved game present
function init() {
  if (Module && Module.calledRun) {
    letters = {};
    redrawBoard();

    const saveData = localStorage.getItem("save");
    if (saveData) {
      saveDataPtr = stringToNewUTF8(saveData);
      _loadGame(saveDataPtr);
      _free(saveDataPtr);

      data = stringToNewUTF8("a g");
      _gameAction(data);
      _free(data);

      sound_start.play();

      markOld();
      redrawBoard();

      setTimeout(play, 5000);
    } else {
      window.history.pushState("", "", "");
      keyboardFeatures = {};
      keyboardFeatures['ESCAPE'] = closeModal;

      newGameBox.style.display = "block";

      sendError(0, 4);
    }
  } else {
    setTimeout(init, 1000);
  }
}

// Setup
setTimeout(init, 1000);
sendError(0, 0);

// Set up core buttons
document.getElementById('cookie_settings').onclick = () => {
  document.getElementById('silktide-cookie-icon').click();
}

function resetGame() {
  localStorage.removeItem('save');
  window.location.reload();
}

document.getElementById('reset_button').onclick = resetGame;

document.getElementById('privacy_policy').onclick = () => {
  window.open('privacy.html', '_blank');
}

document.getElementById('coffee_button').onclick = () => {
  window.open('https://ko-fi.com/sztupy', '_blank');
}

document.getElementById('report_button').onclick = () => {
  window.open('https://github.com/sztupy/eliot-emscripten/issues', '_blank');
}

// Support for drag&drop on mobiles
(function () {
  MobileDragDrop.polyfill({
    dragImageTranslateOverride: true
  });
  var supportsPassive = false;
  try {
    var opts = Object.defineProperty({}, 'passive', {
      get: function () {
        supportsPassive = true;
      }
    });
    window.addEventListener("testPassive", null, opts);
    window.removeEventListener("testPassive", null, opts);
  } catch (e) { }
  setTimeout(() => {
    if (supportsPassive) {
      window.addEventListener('touchmove', function () { }, { passive: false });
    }
    else {
      window.addEventListener('touchmove', function () { });
    }
  }, 100);
})();

// modal boxes
const aboutBox = document.getElementById("about_box");
const dictionaryBox = document.getElementById("dictionary_box");
const letterBox = document.getElementById("letter_box");
const newGameBox = document.getElementById("newgame_box");

window.addEventListener("popstate", () => {
  if (window.location.hash == "" || window.location.hash == "#") {
    closeModal(false);
  }
});

function closeModal(goBack = true) {
  keyboardFeatures = globalKeyboardFeatures;
  aboutBox.style.display = "none";
  dictionaryBox.style.display = "none";
  letterBox.style.display = "none";
  if (gameData.hasStarted) {
    newGameBox.style.display = "none";
    if (goBack)
      window.history.back();
  } else {
    newGameBox.style.display = "block";
  }
}

for (let closeButton of [...document.getElementsByClassName("close")]) {
  closeButton.onclick = closeModal;
}

window.onclick = function (event) {
  if (event.target == aboutBox || event.target == dictionaryBox || event.target == newGameBox) {
    closeModal();
  }
}

document.getElementById("about_button").onclick = () => {
  window.history.pushState("", "", "");
  keyboardFeatures = {};
  keyboardFeatures['ESCAPE'] = closeModal;

  aboutBox.style.display = "block";
}

document.getElementById("newgame_about_link").onclick = () => {
  window.history.pushState("", "", "");
  newGameBox.style.display = "none";
  aboutBox.style.display = "block";
}

document.getElementById("help_button").onclick = () => {
  window.history.pushState("", "", "");
  keyboardFeatures = {};
  keyboardFeatures['ESCAPE'] = closeModal;

  aboutBox.style.display = "block";
}

document.getElementById("dictionary_button").onclick = () => {
  window.history.pushState("", "", "");
  loadDictionary();
  dictionaryBox.style.display = "block";
}

function postGameInit() {
  setTimeout(() => {
    data = stringToNewUTF8("a g");
    _gameAction(data);
    _free(data);

    sound_start.play();

    markOld();
    redrawBoard();

    setTimeout(play, 5000);

    closeModal();
  }, 100);
}

document.getElementById("quick_game_button").onclick = () => {
  _startGame(1, 2, 25);
  postGameInit();
}

document.getElementById("solo_game_button").onclick = () => {
  _startGame(1, 0, 0);
  postGameInit();
}

document.getElementById("duo_game_button").onclick = () => {
  _startGame(2, 0, 0);
  postGameInit();
}

document.getElementById("ai_only_button").onclick = () => {
  _startGame(0, 4, 100);
  postGameInit();
}

document.getElementById("expert_game_button").onclick = () => {
  _startGame(1, 3, 100);
  postGameInit();
}

document.getElementById("custom_game_button").onclick = () => {
  _startGame(parseInt(document.getElementById("human_players").value, 10), parseInt(document.getElementById("computer_players").value, 10), parseInt(document.getElementById("computer_level").value, 10));
  postGameInit();
}

// key handler for dictionary and joker
document.body.addEventListener('keydown', (event) => {
  let letter = event.key.toUpperCase();

  if (keyboardFeatures[letter]) {
    keyboardFeatures[letter]();
  }
});

// PWA
let installPrompt = null;
const installButton = document.getElementById("install_button");

document.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  installPrompt = event;
  installButton.removeAttribute("hidden");
})

installButton.addEventListener("click", async () => {
  if (!installPrompt) {
    return;
  }
  const result = await installPrompt.prompt();
  console.log(`Install prompt was: ${result.outcome}`);
  installPrompt = null;
  installButton.setAttribute("hidden", "");
});

// Set up ads
function resetAds() {
  const adsDom = document.getElementById("ad");
  adsDom.innerHTML = `<span class="box_header">Advertisement</span><a draggable="false" href="https://www.gaelicbooks.org/explore-the-shop/gifts/scrabble-gaidhlig?lang=${language}" target="_blank"><img draggable="false" src="img/ad_scrabble.png"></a>`;

  Array.from(adsDom.querySelectorAll("script"))
    .forEach(oldScriptEl => {
      const newScriptEl = document.createElement("script");

      Array.from(oldScriptEl.attributes).forEach(attr => {
        newScriptEl.setAttribute(attr.name, attr.value)
      });

      const scriptText = document.createTextNode(oldScriptEl.innerHTML);
      newScriptEl.appendChild(scriptText);

      oldScriptEl.parentNode.replaceChild(newScriptEl, oldScriptEl);
    });

  setTimeout(resetAds, 60000);
}

resetAds();
