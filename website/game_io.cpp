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


void GameIO::printPlayedRack(ostream &out, const PublicGame &iGame)
{
    out << lfw(iGame.getCurrentRack().toString(PlayedRack::RACK_SIMPLE)) << endl;
}


void GameIO::printAllRacks(ostream &out, const PublicGame &iGame)
{
    for (unsigned int j = 0; j < iGame.getNbPlayers(); j++)
    {
        out << "Rack " << j << ": ";
        out << lfw(iGame.getPlayer(j).getCurrentRack().toString(PlayedRack::RACK_EXTRA)) << endl;
    }
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


void GameIO::printPoints(ostream &out, const PublicGame &iGame)
{
    out << iGame.getPlayer(0).getTotalScore() << endl;
}


void GameIO::printAllPoints(ostream &out, const PublicGame &iGame)
{
    for (unsigned int i = 0; i < iGame.getNbPlayers(); i++)
    {
        out << "Score " << i << ": "
            << setw(4) << iGame.getPlayer(i).getTotalScore() << endl;
    }
}


void GameIO::printGameDebug(ostream &out, const PublicGame &iGame)
{
    out << "Game: player " << iGame.getCurrentPlayer().getId() + 1
        << " out of " << iGame.getNbPlayers() << endl;
    if (iGame.getParams().getMode() == GameParams::kDUPLICATE)
        out << "Game: mode=Duplicate" << endl;
    else if (iGame.getParams().getMode() == GameParams::kFREEGAME)
        out << "Game: mode=Free game" << endl;
    else if (iGame.getParams().getMode() == GameParams::kTRAINING)
        out << "Game: mode=Training" << endl;
    else if (iGame.getParams().getMode() == GameParams::kARBITRATION)
        out << "Game: mode=Arbitration" << endl;
    else if (iGame.getParams().getMode() == GameParams::kTOPPING)
        out << "Game: mode=Topping" << endl;
    if (iGame.getParams().hasVariant(GameParams::kJOKER))
        out << "Game: variant=joker" << endl;
    if (iGame.getParams().hasVariant(GameParams::kEXPLOSIVE))
        out << "Game: variant=explosive" << endl;
    if (iGame.getParams().hasVariant(GameParams::k7AMONG8))
        out << "Game: variant=7among8" << endl;
    out << "Game: history:" << endl;
    out << "    N |   RACK   |    SOLUTION    | REF | PTS | BONUS" << endl;
    out << "   ===|==========|================|=====|=====|======" << endl;
    for (unsigned int i = 0; i < iGame.getHistory().getSize(); ++i)
    {
        const TurnData &turn = iGame.getHistory().getTurn(i);
        const Move &move = turn.getMove();
        format fmter("%1% | %2% | %3% | %4% | %5% | %6%");
        fmter % padAndConvert(str(wformat(L"%1%") % (i + 1)), 5);
        fmter % padAndConvert(turn.getPlayedRack().toString(), 8);
        if (move.isValid())
        {
            const Round &round = move.getRound();
            fmter % padAndConvert(round.getWord(), 14, false);
            fmter % padAndConvert(round.getCoord().toString(), 3);
            fmter % padAndConvert(str(wformat(L"%1%") % round.getPoints()), 3);
            fmter % padAndConvert(round.getBonus() ? L"*": L"", 1, false);
        }
        else
        {
            if (move.isInvalid())
            {
                fmter % padAndConvert(L"#" + move.getBadWord() + L"#", 14, false);
                fmter % padAndConvert(move.getBadCoord(), 3);
            }
            else if (move.isChangeLetters())
            {
                fmter % padAndConvert(L"[" + move.getChangedLetters() + L"]", 14, false) % " - ";
            }
            else if (move.isPass())
            {
                fmter % padAndConvert(L"(PASS)", 14, false) % " - ";
            }
            else
            {
                fmter % padAndConvert(L"(NO MOVE)", 14, false) % " - ";
            }
            fmter % "  0" % " ";
        }
        out << fmter.str() << endl;
    }
    out << endl << endl;
}
