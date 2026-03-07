/*****************************************************************************
 * Copyright (C) 1999-2012 Eliot
 * Authors: Antoine Fraboulet <antoine.fraboulet@free.fr>
 *          Olivier Teuliere  <ipkiss@via.ecp.fr>
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA  02110-1301  USA
 *****************************************************************************/

#include <boost/foreach.hpp>
#include <boost/format.hpp>

#include <iomanip>
#include <string>
#include <stdlib.h>
#include <sstream>

#include "game_io.h"
#include "game_params.h"
#include "dic.h"
#include "public_game.h"
#include "bag.h"
#include "board.h"
#include "board_layout.h"
#include "results.h"
#include "player.h"
#include "encoding.h"
#include "history.h"
#include "turn_data.h"
#include "move.h"
#include "round.h"
#include <emscripten.h>

using namespace std;

using boost::format;
using boost::wformat;

INIT_LOGGER(utils, GameIO);

EM_JS(void, setBoardLetter, (int row, int col, const char* text), {
    letters[`${row-1};${col-1}`] = UTF8ToString(text);
});

EM_JS(void, callRedrawBoard, (), {
    redrawBoard();
});

EM_JS(void, resetBoard, (), {
    letters = {};
});

EM_JS(void, addHistoryData, (int n, int playerId, const char* rack, const char* solution, int row, int col, int direction, int points, int bonus), {
    addHistory(n, playerId, UTF8ToString(rack), UTF8ToString(solution), row, col, direction, points, bonus);
});

EM_JS(void, setPlayerData, (int playerId, int score, const char* rack, const char* extended, int isHuman), {
    setPlayer(playerId, score, UTF8ToString(rack), UTF8ToString(extended), isHuman);
});

EM_JS(void, setGameStateData, (int currentPlayer, int isFinished, int aiCount, int humanCount), {
    setGameState(currentPlayer, isFinished, aiCount, humanCount);
});

EM_JS(void, saveGameData, (const char* data), {
    localStorage.setItem('save', UTF8ToString(data));
});

EM_JS(void, sendErrorData, (int category, int errorCode), {
    sendError(category, errorCode);
});

void printBoard(const PublicGame &iGame)
{
    resetBoard();

    int nbRows = iGame.getBoard().getLayout().getRowCount();
    int nbCols = iGame.getBoard().getLayout().getColCount();

    for (int row = 1; row <= nbRows; ++row)
    {
        for (int col = 1; col <= nbCols; ++col)
        {
            if (!iGame.getBoard().isVacant(row, col))
                setBoardLetter(row, col, lfw(iGame.getBoard().getDisplayStr(row, col)).c_str());
        }
    }
}

void printPlayerData(const PublicGame &iGame)
{
    for (unsigned int i = 0; i < iGame.getNbPlayers(); i++)
    {
        const Player& player = iGame.getPlayer(i);
        setPlayerData(i,
            player.getTotalScore(),
            lfw(player.getCurrentRack().toString(PlayedRack::RACK_SIMPLE)).c_str(),
            lfw(player.getCurrentRack().toString(PlayedRack::RACK_EXTRA)).c_str(),
            player.isHuman() ? 1 : 0
        );
    }
}

void printSaveGame(const PublicGame &iGame)
{
    std::ostringstream os;
    iGame.saveGame(os);
    saveGameData(os.str().c_str());
}

void printGameDebug(const PublicGame &iGame)
{
    for (unsigned int i = 0; i < iGame.getHistory().getSize(); ++i)
    {
        const TurnData &turn = iGame.getHistory().getTurn(i);
        const Move &move = turn.getMove();

        const int players = iGame.getNbPlayers();
        if (move.isValid())
        {
            const Round &round = move.getRound();
            addHistoryData(i,
                i%players,
                lfw(turn.getPlayedRack().toString()).c_str(),
                lfw(round.getWord()).c_str(),
                round.getCoord().getRow() - 1,
                round.getCoord().getCol() - 1,
                round.getCoord().getDir() == Coord::HORIZONTAL ? 0 : 1,
                round.getPoints(),
                round.getBonus() ? 50 : 0
            );
        }
        else
        {
            if (move.isInvalid())
            {
                addHistoryData(i,
                    i%players,
                    lfw(turn.getPlayedRack().toString()).c_str(),
                    lfw(L"#" + move.getBadWord() + L"#").c_str(),
                    -1,
                    -1,
                    -1,
                    0,
                    0
                );
            }
            else if (move.isChangeLetters())
            {
                addHistoryData(i,
                    i%players,
                    lfw(turn.getPlayedRack().toString()).c_str(),
                    lfw(L"[" + move.getChangedLetters() + L"]").c_str(),
                    -1,
                    -1,
                    -1,
                    0,
                    0
                );
            }
            else if (move.isPass())
            {
                addHistoryData(i,
                    i%players,
                    lfw(turn.getPlayedRack().toString()).c_str(),
                    "(PASS)",
                    -1,
                    -1,
                    -1,
                    0,
                    0
                );
            }
            else
            {
                addHistoryData(i,
                    i%players,
                    lfw(turn.getPlayedRack().toString()).c_str(),
                    "(NO MOVE)",
                    -1,
                    -1,
                    -1,
                    0,
                    0
                );
            }
        }
    }
}

void GameIO::sendError(int category, int errorCode) {
    sendErrorData(category, errorCode);
}

void GameIO::sendData(const PublicGame &iGame) {
    int aiCount = 0;
    int humanCount = 0;
    for (unsigned int i = 0; i < iGame.getNbPlayers(); i++)
    {
        const Player& player = iGame.getPlayer(i);
        if (player.isHuman())
            humanCount++;
        else
            aiCount++;
    }

    setGameStateData(
        iGame.getCurrentPlayer().getId(),
        iGame.isFinished() ? 1 : 0,
        aiCount,
        humanCount
    );

    printBoard(iGame);
    printGameDebug(iGame);
    printPlayerData(iGame);
    printSaveGame(iGame);

    callRedrawBoard();
}
