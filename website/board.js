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
  onlyAI: true
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

function getRack(rack) {
  let text = `<div class="rack">`;
  for (let j = 0; j < rack.length; j++) {
    let key = rack[j];
    if (letterValues[key]) {
      text += `<div class="cell letter">${key}<span>${letterValues[key]}</span></div>`;
    } else {
      text += `<div class="cell letter joker">${key}</div>`;
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
      playerElement.classList.add('current');
      if (!gameData.isFinished) {
        text += `<img class="loading" src="img/thinking.png" alt="${language == 'en' ? 'Thinking...' : 'A’ smaoineachadh'}" title="${language == 'en' ? 'Thinking...' : 'A’ smaoineachadh'}">`;
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
    text += `<div class="player-id">${language == 'en' ? 'Player' : 'Cl.'} ${playerId + 1}</div>`;
    if (row >= 0) {
      if (gameData.isFinished || gameData.onlyAI) {
        text += `<div class="move">${rack} → <a href="https://www.faclair.com/index.aspx?Language=gd&txtSearch=${solution.toLowerCase()}" target="_blank">${solution}</a> @ ${String.fromCharCode('A'.charCodeAt(0) + row)}${col + 1}${direction ? '↕' : '↔'}</div>`;
      } else {
        text += `<div class="move"><a href="https://www.faclair.com/index.aspx?Language=gd&txtSearch=${solution.toLowerCase()}" target="_blank">${solution}</a> @ ${String.fromCharCode('A'.charCodeAt(0) + row)}${col + 1}${direction ? '↕' : '↔'}</div>`;
      }
    } else {
      if (gameData.isFinished || gameData.onlyAI) {
        text += `<div class="move">${rack} → ${solution}</div>`;
      } else {
        text += `<div class="move">${solution}</div>`;
      }
    }
    text += `<div class="points">${points}${bonus > 0 ? ` (${points - bonus}+${bonus})` : ''}</div>`;
    historyElement.innerHTML = text;
    historyDom.appendChild(historyElement);
  }

  mainRackDom.replaceChildren();
  if (gameData.isFinished) {
    let text = language == 'en' ? 'Game over! Winner: ' : 'An geam seachad! Buannaiche: ';

    text += players.filter(p => p.score == maxPoints).map(p => p.name).join(", ");

    text += `<br><br><button onclick="resetGame()">${language == 'en' ? 'Play again' : 'Cluich a-rithist'}</button>`;
    mainRackDom.innerHTML = text;
  } else if (gameData.onlyAI) {
    let player = players[gameData.currentPlayer];
    if (player) {
      mainRackDom.innerHTML = getRack(player.rack);
    }
  }
}

function addHistory(n, playerId, rack, solution, row, col, direction, points, bonus) {
  history[n] = [playerId, rack, solution, row, col, direction, points, bonus];
}

function setRack(playerId, rack, extended) {
  players[playerId] ||= {}
  players[playerId].rack = rack;
  players[playerId].extended = extended;
}

function setScore(playerId, score) {
  players[playerId] ||= {}
  players[playerId].name = (language == 'en' ? 'Player ' : 'Cluicheadair ') + (playerId + 1);
  players[playerId].score = score;
}

function setGameState(currentPlayer, isFinished) {
  gameData.currentPlayer = currentPlayer;
  gameData.isFinished = isFinished;
}

initBoard();

function play() {
  markOld();

  data = stringToNewUTF8("s");
  _gameAction(data);
  _free(data);

  data = stringToNewUTF8("a g");
  _gameAction(data);
  _free(data);

  data2 = stringToNewUTF8("a p");
  _gameAction(data2);
  _free(data2);

  sound_event.play();

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
      _startGame(0, 3);
    }

    data = stringToNewUTF8("a g");
    _gameAction(data);
    _free(data);

    data2 = stringToNewUTF8("a p");
    _gameAction(data2);
    _free(data2);

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
