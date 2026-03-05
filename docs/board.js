const boardDom = document.getElementById('board');
const playerDom = document.getElementById('players');
const historyDom = document.getElementById('history');

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

let letters = {
};

let history = [];

let players = [];

let gameData = {};

function redrawBoard() {
  boardDom.replaceChildren();
  for (let row = 0; row < 15; row++) {
    for (let col = 0; col < 15; col++) {
      const cell = document.createElement('div');
      const key = `${row};${col}`;
      const type = letters[key] ? 'letter' : (specialSquares[key] || 'normal');
      cell.className = `cell ${type}`;

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

  playerDom.replaceChildren();
  for (let i = 0; i < players.length; i++) {
    const player = players[i];
    const playerElement = document.createElement('div');
    playerElement.className = 'player';
    playerElement.innerHTML = `
      <div class="name">Player ${i + 1}</div>
      <div class="score">${player.score || 0}</div>
      <div class="rack">${player.rack || ''}</div>
    `;
    playerDom.appendChild(playerElement);
  }

  historyDom.replaceChildren();
  for (let i = 0; i < history.length; i++) {
    const [playerId, rack, solution, row, col, direction, points, bonus] = history[i];
    const historyElement = document.createElement('div');
    historyElement.className = 'history-item';
    if (row >= 0) {
      historyElement.innerHTML = `
        <div class="player-id">Player ${playerId + 1}</div>
        <div class="move">${rack} → <a href="https://www.faclair.com/index.aspx?Language=gd&txtSearch=${solution.toLowerCase()}" target="_blank">${solution}</a> @ ${String.fromCharCode('A'.charCodeAt(0) + row)}${col + 1}${direction ? '↕' : '↔'}</div>
        <div class="points">${points} (${bonus})</div>
      `;
    } else {
      historyElement.innerHTML = `
        <div class="player-id">Player ${playerId + 1}</div>
        <div class="move">${rack} → ${solution}</div>
        <div class="points">${points} (${bonus})</div>
      `;
    }
    historyDom.appendChild(historyElement);
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
  players[playerId].score = score;
}

function setGameState(currentPlayer, isFinished) {
  gameData.currentPlayer = currentPlayer;
  gameData.isFinished = isFinished;
}

redrawBoard();

function play() {
  data = stringToNewUTF8("s");
  _gameAction(data);
  _free(data);

  data = stringToNewUTF8("a g");
  _gameAction(data);
  _free(data);

  data2 = stringToNewUTF8("a p");
  _gameAction(data2);
  _free(data2);

  if (!gameData.isFinished) {
    setTimeout(play, (Math.floor(Math.random() * 15) + 1) * 250);
  }
}

function init() {
  if (Module && Module.calledRun) {
    _startGame(0, 3);

    data = stringToNewUTF8("a g");
    _gameAction(data);
    _free(data);

    data2 = stringToNewUTF8("a p");
    _gameAction(data2);
    _free(data2);

    play();
  } else {
    setTimeout(init, 100);
  }
}

setTimeout(init, 100);
