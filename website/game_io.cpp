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

EM_JS(void, setScoreData, (int playerId, int score), {
    setScore(playerId, score);
});

EM_JS(void, setRackData, (int playerId, const char* rack, const char* extended), {
    setRack(playerId, UTF8ToString(rack), UTF8ToString(extended));
});

EM_JS(void, setGameStateData, (int currentPlayer, int isFinished), {
    setGameState(currentPlayer, isFinished);
});

void GameIO::printBoard(ostream &out, const PublicGame &iGame)
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

    setGameStateData(
        iGame.getCurrentPlayer().getId(),
        iGame.isFinished() ? 1 : 0
    );
    callRedrawBoard();
}

void GameIO::printNonPlayed(ostream &out, const PublicGame &iGame)
{
    const Bag &bag = iGame.getBag();
    BOOST_FOREACH(const Tile &tile, iGame.getDic().getAllTiles())
    {
        if (bag.count(tile) > 9)
            out << " ";
        out << setw(2) << lfw(tile.getDisplayStr());
    }
    out << endl;

    BOOST_FOREACH(const Tile &tile, iGame.getDic().getAllTiles())
    {
        out << " " << bag.count(tile);
    }
    out << endl;
}

void GameIO::printAllRacks(ostream &out, const PublicGame &iGame)
{
    for (unsigned int j = 0; j < iGame.getNbPlayers(); j++)
    {
        setRackData(j,
            lfw(iGame.getPlayer(j).getCurrentRack().toString(PlayedRack::RACK_SIMPLE)).c_str(),
            lfw(iGame.getPlayer(j).getCurrentRack().toString(PlayedRack::RACK_EXTRA)).c_str()
        );
    }

    setGameStateData(
        iGame.getCurrentPlayer().getId(),
        iGame.isFinished() ? 1 : 0
    );
    callRedrawBoard();
}

static void searchResultLine(ostream &out, const Results &iResults, int num)
{
    const Round &r = iResults.get(num);
    const wstring &word = r.getWord();
    if (word.empty())
        return;
    out << lfw(word) << string(16 - word.size(), ' ')
        << (r.getBonus() ? '*' : ' ')
        << setw(4) << r.getPoints()
        << ' ' << lfw(r.getCoord().toString());
}


void GameIO::printSearchResults(ostream &out, const Results &iResults, int num)
{
    for (int i = 0; i < num && i < (int)iResults.size(); i++)
    {
        out << setw(3) << i + 1 << ": ";
        searchResultLine(out, iResults, i);
        out << endl;
    }
}

void GameIO::printAllPoints(ostream &out, const PublicGame &iGame)
{
    for (unsigned int i = 0; i < iGame.getNbPlayers(); i++)
    {
        setScoreData(i, iGame.getPlayer(i).getTotalScore());
    }

    setGameStateData(
        iGame.getCurrentPlayer().getId(),
        iGame.isFinished() ? 1 : 0
    );
    callRedrawBoard();
}


void GameIO::printGameDebug(ostream &out, const PublicGame &iGame)
{
    // out << "Game: player " << iGame.getCurrentPlayer().getId() + 1
    //     << " out of " << iGame.getNbPlayers() << endl;
    // if (iGame.getParams().getMode() == GameParams::kDUPLICATE)
    //     out << "Game: mode=Duplicate" << endl;
    // else if (iGame.getParams().getMode() == GameParams::kFREEGAME)
    //     out << "Game: mode=Free game" << endl;
    // else if (iGame.getParams().getMode() == GameParams::kTRAINING)
    //     out << "Game: mode=Training" << endl;
    // else if (iGame.getParams().getMode() == GameParams::kARBITRATION)
    //     out << "Game: mode=Arbitration" << endl;
    // else if (iGame.getParams().getMode() == GameParams::kTOPPING)
    //     out << "Game: mode=Topping" << endl;
    // if (iGame.getParams().hasVariant(GameParams::kJOKER))
    //     out << "Game: variant=joker" << endl;
    // if (iGame.getParams().hasVariant(GameParams::kEXPLOSIVE))
    //     out << "Game: variant=explosive" << endl;
    // if (iGame.getParams().hasVariant(GameParams::k7AMONG8))
    //     out << "Game: variant=7among8" << endl;
    // out << "Game: history:" << endl;
    // out << "    N |   RACK   |    SOLUTION    | REF | PTS | BONUS" << endl;
    // out << "   ===|==========|================|=====|=====|======" << endl;
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

    setGameStateData(
        iGame.getCurrentPlayer().getId(),
        iGame.isFinished() ? 1 : 0
    );
    callRedrawBoard();
}
