/*******************************************************************
 * Eliot
 * Copyright (C) 2009-2012 Olivier Teulière
 * Authors: Olivier Teulière <ipkiss @@ gmail.com>
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

#include <vector>
#include <fstream>
#include <cmath>
#include <boost/foreach.hpp>
#include <boost/format.hpp>

#include "config.h"
#if ENABLE_NLS
#   include <libintl.h>
#   define _(String) gettext(String)
#else
#   define _(String) String
#endif

#include "json_writer.h"
#include "encoding.h"
#include "turn.h"
#include "turn_data.h"
#include "game_params.h"
#include "game.h"
#include "player.h"
#include "ai_percent.h"
#include "game_exception.h"
#include "turn.h"
#include "cmd/game_rack_cmd.h"
#include "cmd/game_move_cmd.h"
#include "cmd/player_rack_cmd.h"
#include "cmd/player_move_cmd.h"
#include "cmd/player_event_cmd.h"
#include "cmd/master_move_cmd.h"
#include "cmd/topping_move_cmd.h"
#include "dic.h"
#include "header.h"

// Current version of our save game format. Bump it when it becomes
// incompatible (and keep it in sync with xml_reader.cpp)
#define CURRENT_XML_VERSION 2

#define FMT1(s, a1) (boost::format(s) % (a1)).str()
#define FMT2(s, a1, a2) (boost::format(s) % (a1) % (a2)).str()


using namespace std;

INIT_LOGGER(game, JsonWriter);

static string toUtf8(const wstring &s)
{
    return writeInUTF8(s, "Saving game");
}

static void writeMove(ostream &out, const Move &iMove,
                      const string &iTag, int iPlayerId)
{
    out << "{\"type\":\"" << iTag << "\"";
    if (iPlayerId != -1)
        out << ",\"playerId\":" << iPlayerId;
    out << ",\"points\":" << iMove.getScore() << ",\"moveType\":";
    if (iMove.isValid())
    {
        const Round &round = iMove.getRound();
        out << "\"valid\",\"word\":\"" << toUtf8(round.getWord())
            << "\",\"coord\":\"" << toUtf8(round.getCoord().toString()) << "\"}";
    }
    else if (iMove.isInvalid())
    {
        out << "\"invalid\",\"word\":\"" << toUtf8(iMove.getBadWord())
            << "\",\"coord\":\"" << toUtf8(iMove.getBadCoord()) << "\"}";
    }
    else if (iMove.isChangeLetters())
        out << "\"change\",\"letters\":\"" << toUtf8(iMove.getChangedLetters()) << "\"}";
    else if (iMove.isPass())
        out << "\"pass\"}";
    else if (iMove.isNull())
        out << "\"none\"}";
    else
        throw SaveGameException(FMT1(_("Unsupported move: %1%"), lfw(iMove.toString())));
}


void JsonWriter::write(const Game &iGame, std::ostream &out)
{
    out << "{\"type\":\"EliotGame\",\"format\":" << CURRENT_XML_VERSION << ",";

    // ------------------------
    // Write the dictionary information
    out << "\"dictionary\":{";
    const Header &header = iGame.getDic().getHeader();
    out << "\"name\":\"" << toUtf8(header.getName()) << "\",";
    out << "\"type\":\"";
    if (header.getType() == Header::kDAWG)
        out << "dawg";
    else if (header.getType() == Header::kGADDAG)
        out << "gaddag";
    else
        throw SaveGameException(_("Invalid dictionary type"));
    out << "\",";
    // Retrieve the dictionary letters, ans separate them with spaces
    wstring lettersWithSpaces = header.getLetters();
    for (size_t i = lettersWithSpaces.size() - 1; i > 0; --i)
        lettersWithSpaces.insert(i, 1, L' ');
    // Convert to a display string
    const wstring &displayLetters =
        iGame.getDic().convertToDisplay(lettersWithSpaces);
    out << "\"letters\":\"" << toUtf8(displayLetters) << "\",";
    out << "\"wordNb\":" << header.getNbWords() << "";
    out << "},";
    // End of dictionary information
    // ------------------------

    // ------------------------
    // Write the game header
    out << "\"game\":{";
    // Game type
    out << "\"mode\":\"";
    if (iGame.getMode() == GameParams::kDUPLICATE)
        out << "duplicate";
    else if (iGame.getMode() == GameParams::kFREEGAME)
        out << "freegame";
    else if (iGame.getMode() == GameParams::kARBITRATION)
        out << "arbitration";
    else if (iGame.getMode() == GameParams::kTOPPING)
        out << "topping";
    else
        out << "training";
    out << "\",\"variants\":[";

    bool needsComma = false;
    // Game variant
    if (iGame.getParams().hasVariant(GameParams::kJOKER)) {
        out << "\"bingo\"";
        needsComma = true;
    }

    if (iGame.getParams().hasVariant(GameParams::kEXPLOSIVE)) {
        if (needsComma) out << ",";
        out << "\"explosive\"";
        needsComma = true;
    }

    if (iGame.getParams().hasVariant(GameParams::k7AMONG8)) {
        if (needsComma) out << ",";
        out << "\"7among8\"";
    }

    out << "],\"players\":[";

    // Players
    for (unsigned int i = 0; i < iGame.getNPlayers(); ++i)
    {
        const Player &player = iGame.getPlayer(i);
        out << "{\"id\":" << player.getId() << ",";
        out << "\"name\":\"" << toUtf8(player.getName()) << "\",";
        out << "\"type\":\"" << (player.isHuman() ? "human" : "computer") << "\",";
        if (!player.isHuman())
        {
            const AIPercent *ai = dynamic_cast<const AIPercent *>(&player);
            if (ai == NULL)
                throw SaveGameException(FMT1(_("Invalid player type for player %1%"), i));
            if (ai->getMinPercent() == ai->getMaxPercent()) {
                out << "\"level\":" << lrint(ai->getMinPercent() * 100) << ",";
            } else {
                out << "\"levelMin\":" << lrint(ai->getMinPercent() * 100) << ",";
                out << "\"levelMax\":" << lrint(ai->getMaxPercent() * 100) << ",";
            }
        }
        out << "\"tableNb\":" << player.getTableNb();
        out << "}";
        if (i != iGame.getNPlayers() - 1) {
            out << ",";
        }
    }

    out << "],";

    // Number of turns
    out << "\"turns\":"
        << iGame.getNavigation().getNbTurns();

    // isFinished?
    out << ",\"finished\":"
        << (iGame.isFinished() ? "true" : "false");

    out << "},";
    // End of the header
    // ------------------------

    // ------------------------
    // Write the game history
    out << "\"history\":[";

    needsComma = false;

    const vector<Turn *> &turnVect = iGame.getNavigation().getTurns();
    BOOST_FOREACH(const Turn *turn, turnVect)
    {
        if (needsComma) out << ",";
        out << "{\"commands\":[";
        needsComma = true;

        bool needsComma2 = false;

        BOOST_FOREACH(const Command *cmd, turn->getCommands())
        {
            if (needsComma2) out << ",";
            needsComma2 = true;

            if (dynamic_cast<const GameRackCmd*>(cmd))
            {
                const GameRackCmd *rackCmd = static_cast<const GameRackCmd*>(cmd);
                out << "{\"type\":\"gameRack\",\"rack\":\""
                    << toUtf8(rackCmd->getRack().toString())
                    << "\"}";
            }
            else if (dynamic_cast<const PlayerRackCmd*>(cmd))
            {
                const PlayerRackCmd *rackCmd = static_cast<const PlayerRackCmd*>(cmd);
                unsigned int id = rackCmd->getPlayer().getId();
                out << "{\"type\":\"playerRack\",\"playerId\":" << id << ",\"rack\":\""
                    << toUtf8(rackCmd->getRack().toString())
                    << "\"}";
            }
            else if (dynamic_cast<const PlayerMoveCmd*>(cmd))
            {
                const PlayerMoveCmd *moveCmd = static_cast<const PlayerMoveCmd*>(cmd);
                unsigned int id = moveCmd->getPlayer().getId();
                writeMove(out, moveCmd->getMove(), "playerMove", id);
            }
            else if (dynamic_cast<const GameMoveCmd*>(cmd))
            {
                const GameMoveCmd *moveCmd = static_cast<const GameMoveCmd*>(cmd);
                writeMove(out, moveCmd->getMove(), "gameMove", -1);
            }
            else if (dynamic_cast<const MasterMoveCmd*>(cmd))
            {
                const MasterMoveCmd *moveCmd = static_cast<const MasterMoveCmd*>(cmd);
                writeMove(out, moveCmd->getMove(), "masterMove", -1);
            }
            else if (dynamic_cast<const ToppingMoveCmd*>(cmd))
            {
                const ToppingMoveCmd *moveCmd = static_cast<const ToppingMoveCmd*>(cmd);
                unsigned int id = moveCmd->getPlayerId();
                // FIXME: the elapsed time is not saved
                writeMove(out, moveCmd->getMove(), "toppingMove", id);
            }
            else if (dynamic_cast<const Game::CurrentPlayerCmd*>(cmd))
            {
                const Game::CurrentPlayerCmd *currCmd = static_cast<const Game::CurrentPlayerCmd*>(cmd);
                unsigned int oldId = currCmd->getOldPlayerId();
                unsigned int newId = currCmd->getPlayerId();

                out << "{\"type\":\"playerSwap\",\"playerId\":" << newId << ",\"oldPlayerId\":" << oldId << "}";
            }
            else if (dynamic_cast<const PlayerEventCmd*>(cmd))
            {
                const PlayerEventCmd *eventCmd = static_cast<const PlayerEventCmd*>(cmd);
                unsigned int id = eventCmd->getPlayer().getId();
                int value = eventCmd->getPoints();
                // Warnings
                if (eventCmd->getEventType() == PlayerEventCmd::WARNING)
                {
                    out << "{\"type\":\"warning\",\"playerId\":" << id << "}";
                }
                // Penalties
                else if (eventCmd->getEventType() == PlayerEventCmd::PENALTY)
                {
                    out << "{\"type\":\"penalty\",\"playerId\":" << id
                        << ",\"points\":" << value << "}";
                }
                // Solos
                else if (eventCmd->getEventType() == PlayerEventCmd::SOLO)
                {
                    out << "{\"type\":\"solo\",\"playerId\":" << id
                        << ",\"points\":" << value << "}";
                }
                // End game bonuses (freegame mode)
                else if (eventCmd->getEventType() == PlayerEventCmd::END_GAME)
                {
                    out << "{\"type\":\"endGame\",\"playerId\":" << id
                        << ",\"points\":" << value << "}";
                }
                else
                {
                    LOG_ERROR("Unknown event type: " << eventCmd->getEventType());
                }
            }
            else
            {
                LOG_ERROR("Unsupported command: " << lfw(cmd->toString()));
                out << "{\"type\":\"FIXME: Unsupported command: " << lfw(cmd->toString()) << "\"}";
            }
        }
        out << "]}";
    }
    out << "]";
    out << "}" << endl;
}
