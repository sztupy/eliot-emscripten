const boardDom = document.getElementById('board');
const playerDom = document.getElementById('players');
const historyDom = document.getElementById('history');
const mainRackDom = document.getElementById('main_rack');

const sound_human_event = new Audio("sounds/1.ogg");
const sound_incorrect = new Audio("sounds/2.ogg");
const sound_endgame = new Audio("sounds/3.ogg");
const sound_event = new Audio("sounds/4.ogg");
const sound_start = new Audio("sounds/5.ogg");

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

let mainRackData = null;

let letters = {};

let language = document.documentElement.lang;

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

let history = [];
let players = [];
let gameData = {
  onlyAI: false,
  oneHuman: false
};

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

function getRack(rack, mainRack = false) {
  let text = `<div class="rack">`;
  for (let j = 0; j < rack.length; j++) {
    let key = rack[j];
    if (letterValues[key]) {
      text += `<div class="cell letter" ${mainRack ? ' draggable="true" ondragstart="drag(event)" ondragend="dragEnd(event)"' : ''}>${key}<span>${letterValues[key]}</span></div>`;
    } else {
      text += `<div class="cell letter joker" ${mainRack ? ' draggable="true" ondragstart="drag(event)" ondragend="dragEnd(event)"' : ''}>${key}</div>`;
    }
  }
  text += `</div>`;
  return text;
}

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

function redrawBoard() {
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
    if (gameData.isFinished || gameData.onlyAI) {
      text += getRack(player.rack);
    }

    playerElement.innerHTML = text;
    playerDom.appendChild(playerElement);
  }

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

  let oldRack = mainRackDom.getElementsByClassName('rack')[0];

  mainRackDom.replaceChildren();
  let currentPlayer = players[gameData.currentPlayer];

  let text = '';
  if (gameData.isFinished) {
    text += language == 'en' ? 'Game over! Winner: ' : 'An geam seachad! Buannaiche: ';

    text += players.filter(p => p.score == maxPoints).map(p => p.name).join(", ");

    text += `<br><br><button onclick="resetGame()">${language == 'en' ? 'Play again' : 'Cluich a-rithist'}</button>`;
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
      text += "<button onclick='pass()'>";
      text += language == 'en' ? "Pass" : "Pasaig";
      text += "</button>";
    }
  }

  mainRackDom.innerHTML = text;
  for (let element of mainRackDom.getElementsByClassName("rack")) {
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

function pass() {
  let data = stringToNewUTF8("p");
  _gameAction(data);
  _free(data);

  data = stringToNewUTF8("a g");
  _gameAction(data);
  _free(data);

  sound_human_event.play();
}

function makePlaceholder(draggedTask) {
  const placeholder = document.createElement("div");
  placeholder.classList.add("cell");
  placeholder.classList.add("letter");
  placeholder.classList.add("placeholder");
  placeholder.style.height = `${draggedTask.offsetHeight}px`;
  return placeholder;
}

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

function drag(event) {
  event.currentTarget.id = 'dragged-letter';
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("task", "");
}

function dragEnd(_event) {
  document.getElementById('dragged-letter').removeAttribute('id');
}

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

function addHistory(n, playerId, rack, solution, row, col, direction, points, bonus) {
  history[n] = [playerId, rack, solution, row, col, direction, points, bonus];
}

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
}

function setGameState(currentPlayer, isFinished, aiCount, humanCount) {
  gameData.currentPlayer = currentPlayer;
  gameData.isFinished = isFinished;
  gameData.onlyAI = (aiCount > 0 && humanCount == 0);
  gameData.oneHuman = (humanCount == 1);
  gameData.humanCount = humanCount;
  gameData.aiCount = aiCount;
}

initBoard();

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
    sound_endgame.play();
  }
}

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
      _startGame(1, 3);
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

setTimeout(init, 1000);

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
