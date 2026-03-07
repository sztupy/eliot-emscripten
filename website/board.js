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
  oneHuman: false
};
let letters = {};

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
  boardDom.replaceChildren();
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
      else if (type === 'tw') cell.textContent = '3F';
      else if (type === 'dw') cell.textContent = '2F';
      else if (type === 'tl') cell.textContent = '3L';
      else if (type === 'dl') cell.textContent = '2L';

      boardDom.appendChild(cell);
    }
  }
}

// Generates a rack from a set of letters from Eliot. Also adds Drag and drop settings for the main rack
function getRack(rack, mainRack = false, showLetter = true) {
  let text = `<div class="rack">`;
  for (let j = 0; j < rack.length; j++) {
    let key = rack[j];
    if (!showLetter) {
      text += `<div class="cell letter">&nbsp;</div>`;
    } else if (letterValues[key]) {
      text += `<div data-letter="${key}" class="cell letter" ${mainRack ? ' draggable="true" onclick="clickLetter(event)" ondragstart="dragLetter(event)" ondragend="dragLetterEnd(event)"' : ''}>${key}<span>${letterValues[key]}</span></div>`;
    } else {
      text += `<div data-letter="${key}" class="cell letter joker" ${mainRack ? ' draggable="true" onclick="clickLetter(event)" ondragstart="dragLetter(event)" ondragend="dragLetterEnd(event)"' : ''}>${key}</div>`;
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

// Redraws the entire game field including the board, the main rack, the player displays and the history
function redrawBoard() {
  // BOARD
  for (let row = 0; row < 15; row++) {
    for (let col = 0; col < 15; col++) {
      const key = `${row};${col}`;
      const type = letters[key] ? 'letter' : (specialSquares[key] || 'normal');
      const cell = document.getElementById(`board_${row}_${col}`);
      if (!cell)
        continue;

      cell.className = `cell ${type}`;
      cell.id = `board_${row}_${col}`;
      cell.textContent = '';

      if (type === 'letter') {
        if (cell.dataset.old) {
          cell.style.removeProperty('background-color');
        } else {
          cell.style.backgroundColor = 'white';
        }

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
      else if (type === 'tw') cell.textContent = '3F';
      else if (type === 'dw') cell.textContent = '2F';
      else if (type === 'tl') cell.textContent = '3L';
      else if (type === 'dl') cell.textContent = '2L';
    }
  }

  // PLAYER data
  playerDom.replaceChildren();
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
        text += `<img class="loading" src="img/thinking.png" alt="${thinking}" title="${thinking}">`;
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
  historyDom.replaceChildren();
  if (gameData.isFinished) {
    historyDom.innerHTML = `<div class="history-item">
      <div class="history-id">#${history.length + 1}</div>
      <div class="player-id">----</div>
      <div class="move">${language == 'en' ? 'Game over' : 'An geam seachad'}</div>
      <div class="points">----</div>
    </div>`;
  } else {

  }
  for (let i = history.length - 1; i >= 0; i--) {
    const [playerId, rack, solution, row, col, direction, points, bonus] = history[i];
    const historyElement = document.createElement('div');
    historyElement.className = 'history-item';
    let text = `<div class="history-id">#${i + 1}</div>`;
    text += `<div class="player-id">${players[playerId] && players[playerId].shortName}</div>`;
    if (row >= 0) {
      if (gameData.isFinished || gameData.onlyAI) {
        text += `<div class="move">${rack} → <a href="https://www.faclair.com/index.aspx?Language=gd&txtSearch=${solution.toLowerCase()}" target="_blank">${solution}</a> @ ${String.fromCharCode('A'.charCodeAt(0) + row)}${col + 1}${direction ? '↕' : '↔'}</div>`;
      } else {
        text += `<div class="move"><a href="https://www.faclair.com/index.aspx?Language=gd&txtSearch=${solution.toLowerCase()}" target="_blank">${solution}</a> @ ${String.fromCharCode('A'.charCodeAt(0) + row)}${col + 1}${direction ? '↕' : '↔'}</div>`;
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

  mainRackDom.replaceChildren();
  let currentPlayer = players[gameData.currentPlayer];

  let text = '';
  if (gameData.isFinished) {
    text += `<button onclick="resetGame()">${language == 'en' ? 'Play again' : 'Cluich a-rithist'}</button>`;
  } else {
    if (gameData.onlyAI) {
      if (currentPlayer) {
        text += getRack(currentPlayer.rack);
      }
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
    } else if (currentPlayer && currentPlayer.isHuman) {
      if (currentPlayer) {
        if (currentPlayer.rack == mainRackData) {
          text += oldRack.outerHTML;
        } else {
          mainRackData = currentPlayer.rack;
          text += getRack(currentPlayer.rack, true);
        }
      }
    }

    if (currentPlayer && currentPlayer.isHuman) {
      text += '<br>';
      text += "<button id='passbutton' onclick='pass()'>";
      text += language == 'en' ? "Pass" : "Pasaig";
      text += "</button>";

      text += "&nbsp;"

      text += "<button id='swapbutton' onclick='swap()'>";
      text += language == 'en' ? "Swap" : "Iomlaid";
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
      placeholder?.remove();
    })
    element.addEventListener("drop", dragDrop);
  }
}

// Human gameplay actions - Pass
function pass() {
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
  let lettersToSwap = [];
  for (let element of [...document.getElementById('main_rack').getElementsByClassName('selected-letter')]) {
    lettersToSwap.push(element.dataset.letter);
    element.classList.remove("selected-letter");
  }

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

// Main rack drag and drop boilerplate functions
function makePlaceholder(draggedTask) {
  const placeholder = document.createElement("div");
  placeholder.classList.add("cell");
  placeholder.classList.add("letter");
  placeholder.classList.add("placeholder");
  placeholder.style.height = `${draggedTask.offsetHeight}px`;
  return placeholder;
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
      existingPlaceholder?.remove();
      if (task === draggedTask || task.previousElementSibling === draggedTask)
        return;
      tasks.insertBefore(
        existingPlaceholder ?? makePlaceholder(draggedTask),
        task,
      );
      return;
    }
  }

  existingPlaceholder?.remove();
  if (tasks.lastElementChild === draggedTask) return;
  tasks.append(existingPlaceholder ?? makePlaceholder(draggedTask));
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

// Allows to select / deselect letters for the Swap button
function clickLetter(event) {
  const letter = event.currentTarget;

  if (letter.classList.contains("selected-letter")) {
    letter.classList.remove("selected-letter");
  } else {
    letter.classList.add("selected-letter");
  }
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
    let id = (gameData.humanCount > 1 ? '#' + whichHuman : '');
    name = (language == 'en' ? 'Player ' : 'Cluicheadair ') + id;
    shortName = (language == 'en' ? 'Pl' : 'Cl') + id;
  } else {
    whichAI += 1;
    let id = (gameData.aiCount > 1 ? '#' + whichAI : '');
    name = (language == 'en' ? 'Computer ' : 'Coimpiutair ') + id;
    shortName = (language == 'en' ? 'Co' : 'Co') + id;
  }

  players[playerId] ||= {}
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
      if (players[gameData.currentPlayer]?.isHuman) {
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
  gameData.onlyAI = (aiCount > 0 && humanCount == 0);
  gameData.oneHuman = (humanCount == 1);
  gameData.humanCount = humanCount;
  gameData.aiCount = aiCount;
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
      error = language == 'en' ? 'Welcome!' : 'Fàilte a charaid!';
    } else if (errorCode == 1) {
      error = language == 'en' ? 'The computer is thinking…' : 'Tha coimpiutair a’ smaoineachadh…';
    } else if (errorCode == 2) {
      error = language == 'en' ? 'Your turn!' : 'Do chothrom!';
    } else if (errorCode == 3) {
      error = language == 'en' ? 'Game over! Winner: ' : 'An geam seachad! Buannaiche: ';

      let maxPoints = Math.max(...players.map(p => p.score || 0));
      error += players.filter(p => p.score == maxPoints).map(p => p.name).join(", ");
    }
  } else if (category == 1) {
    if (errorCode == 1) {
      error = language == 'en' ? 'Changing letters is not allowed if there are less than 7 tiles left in the bag.' : 'Chan eil cead litrichean a iomlaid ma tha nas lugha na 7 taidhlean air fhàgail sa bhaga.';
    } else if (errorCode == 5) {
      error = language == 'en' ? 'You need to select at least one letter.' : 'Feumaidh tu co-dhiù aon litir a thaghadh.';
      old = false;
    } else {
      error = language == 'en' ? 'Could not swap letters.' : 'Cha b’ urrainnear litrichean iomlaid.';
    }
  } else {
    error = language == 'en' ? 'Invalid action' : 'Chan urrainn dhut an gluasad sin a dhèanamh.';
  }

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
    } else {
      _startGame(2, 0);
    }

    data = stringToNewUTF8("a g");
    _gameAction(data);
    _free(data);

    sound_start.play();

    markOld();
    redrawBoard();

    setTimeout(play, 5000);
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

document.getElementById('reset').onclick = resetGame;

document.getElementById('privacy_policy').onclick = () => {
  console.log("click");
  window.open('privacy.html', '_blank');
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

// Set up ads
function resetAds() {
  const adsDom = document.getElementById("ad");
  if (Math.random() < 0.5) {
    adsDom.innerHTML = `<script>atOptions = {'key':'3afe4060d09290c60eb6bb255e880bb6','format':'iframe','height':90,'width':728,'params':{}};</script><script src="https://www.highperformanceformat.com/3afe4060d09290c60eb6bb255e880bb6/invoke.js"></script>`;
  } else {
    adsDom.innerHTML = `<script async="async" data-cfasync="false" src="https://pl28868378.effectivegatecpm.com/f2757235c1134d9106cdddaf8c5cd42e/invoke.js"></script><div id="container-f2757235c1134d9106cdddaf8c5cd42e"></div>`;
  }
  setTimeout(resetAds, 60000);
}

resetAds();
