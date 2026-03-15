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

#include <fstream>
#include <algorithm>
#include <boost/format.hpp>

#if ENABLE_NLS
#   include <libintl.h>
#   define _(String) gettext(String)
#else
#   define _(String) String
#endif

#include "json_reader.h"
#include "dic.h"
#include "game_exception.h"
#include "game_params.h"
#include "game_factory.h"
#include "training.h"
#include "duplicate.h"
#include "freegame.h"
#include "player.h"
#include "ai_percent.h"
#include "encoding.h"
#include "cmd/game_rack_cmd.h"
#include "cmd/game_move_cmd.h"
#include "cmd/player_rack_cmd.h"
#include "cmd/player_move_cmd.h"
#include "cmd/player_event_cmd.h"
#include "cmd/master_move_cmd.h"
#include "navigation.h"
#include "header.h"

// Current version of our save game format. Bump it when it becomes
// incompatible (and keep it in sync with xml_writer.cpp)
#define CURRENT_XML_VERSION 2

#define FMT1(s, a1) (boost::format(s) % (a1)).str()
#define FMT2(s, a1, a2) (boost::format(s) % (a1) % (a2)).str()

using namespace std;

INIT_LOGGER(game, JsonReader);

Game * JsonReader::load(const string &data, const Dictionary &iDic)
{
    cJSON *json = cJSON_Parse(data.c_str());

    if (json == NULL)
    {
        const char *error_ptr = cJSON_GetErrorPtr();
        if (error_ptr != NULL)
        {
            throw LoadGameException(error_ptr);
        }
        throw LoadGameException("Error during parsing");
    }

    JsonReader handler(iDic, json);
    handler.parse();
    Game *game = handler.getGame();
    if (game == NULL)
        throw LoadGameException("Did not obtain a game object");

    // handle current player in duplicate mode needing to be one that hasn't played yet
    if (game->getMode() == GameParams::kDUPLICATE) {
        int player = 0;
        while (game->hasPlayed(player) && player < game->getNPlayers()) {
            player++;
        }

        if (player < game->getNPlayers()) {
            game->setCurrentPlayer(player);
        }
    }

    LOG_INFO("Savegame parsed successfully");
    return game;
}

static Player & getPlayer(map<int, Player*> &players,
                          int id, const string &iTag)
{
    if (players.find(id) == players.end())
        throw LoadGameException(FMT2(_("Invalid player ID: %1% (processing tag '%2%')"), id, iTag));
    return *players[id];
}

static string getString(cJSON* data, const char* attr) {
  cJSON *name = attr ? cJSON_GetObjectItemCaseSensitive(data, attr) : data;

  if (!cJSON_IsString(name) || (name->valuestring == NULL)) {
    return "";
  }
  return name->valuestring;
}

static int getInt(cJSON* data, const char* attr) {
  cJSON *name = attr ? cJSON_GetObjectItemCaseSensitive(data, attr) : data;

  if (!cJSON_IsNumber(name)) {
    return INT_MIN;
  }
  return name->valueint;
}

static bool getBool(cJSON* data, const char* attr) {
  cJSON *name = attr ? cJSON_GetObjectItemCaseSensitive(data, attr) : data;

  if (cJSON_IsTrue(name)) {
    return true;
  }
  return false;
}

static wstring fromUtf8(const string &str)
{
    return readFromUTF8(str, "Loading game");
}

static Move buildMove(const Game &iGame, cJSON *data,
                      bool checkRack)
{
    string type = getString(data, "moveType");

    if (type == "valid")
    {
        string wordAttr = getString(data, "word");
        wstring word = iGame.getDic().convertFromInput(fromUtf8(wordAttr));
        Move move;

        string coordAttr = getString(data, "coord");
        int res = iGame.checkPlayedWord(fromUtf8(coordAttr),
                                        word, move, checkRack);
        if (res != 0)
        {
            throw LoadGameException(FMT2(_("Invalid move marked as valid: %1% (%2%)"),
                                         wordAttr, coordAttr));
        }
        return move;
    }
    else if (type == "invalid")
    {
        return Move(fromUtf8(getString(data, "word")),
                    fromUtf8(getString(data, "coord")));
    }
    else if (type == "change")
    {
        return Move(fromUtf8(getString(data, "letters")));
    }
    else if (type == "pass")
    {
        return Move(L"");
    }
    else if (type == "none")
    {
        return Move();
    }
    else
        throw LoadGameException(FMT1(_("Invalid move type: %1%"), type));
}


Game * JsonReader::getGame()
{
    return m_game;
}


void JsonReader::parse() {
    if (m_game != NULL)
      throw LoadGameException(_("Game should be empty"));

    if (!m_parser)
      throw LoadGameException(_("No parser"));

    // version check
    {
      if (getString(m_parser, "type") != "EliotGame") {
        throw LoadGameException(_("This saved game is not an Eliot save game."));
      }

      if (getInt(m_parser, "format") != CURRENT_XML_VERSION) {
        throw LoadGameException(_("This saved game is not compatible with the current version of Eliot."));
      }
    }

    LOG_INFO("Dictionary compatiblity check");
    // dictionary compatibility check
    {
      cJSON* dictionary = cJSON_GetObjectItemCaseSensitive(m_parser, "dictionary");

      string letterData = getString(dictionary, "letters");
      const wdstring & displayLetters = m_dic.convertToDisplay(m_dic.getHeader().getLetters());
      // Remove spaces
      string::iterator it;
      it = remove(letterData.begin(), letterData.end(), L' ');
      letterData.erase(it, letterData.end());
      // Compare
      if (displayLetters != fromUtf8(letterData))
          throw LoadGameException(_("The current dictionary is different from the one used in the saved game"));

      int wordNb = getInt(dictionary, "wordNb");
      if (m_dic.getHeader().getNbWords() != wordNb)
          throw LoadGameException(_("The current dictionary is different from the one used in the saved game"));
    }

    LOG_INFO("Game setup");
    {
        cJSON* game = cJSON_GetObjectItemCaseSensitive(m_parser, "game");

        string m_data = getString(game, "mode");
        // Differ game creation until after we have read the variant
        if (m_data == "duplicate")
            m_params.setMode(GameParams::kDUPLICATE);
        else if (m_data == "freegame")
            m_params.setMode(GameParams::kFREEGAME);
        else if (m_data == "training")
            m_params.setMode(GameParams::kTRAINING);
        else if (m_data == "arbitration")
            m_params.setMode(GameParams::kARBITRATION);
        else if (m_data == "topping")
            m_params.setMode(GameParams::kTOPPING);
        else
            throw GameException("Invalid game mode: " + m_data);

        cJSON* variants = cJSON_GetObjectItemCaseSensitive(game, "variants");
        if (cJSON_IsArray(variants)) {
          for (int i = 0; i < cJSON_GetArraySize(variants); i++) {
            m_data = getString(cJSON_GetArrayItem(variants, i), NULL);
            if (m_data == "bingo")
                m_params.addVariant(GameParams::kJOKER);
            else if (m_data == "explosive")
                m_params.addVariant(GameParams::kEXPLOSIVE);
            else if (m_data == "7among8")
                m_params.addVariant(GameParams::k7AMONG8);
            else if (m_data != "")
                throw LoadGameException(FMT1(_("Invalid game variant: %1%"), m_data));
          }
        }

        m_game = GameFactory::Instance()->createGame(m_params);

        LOG_INFO("Player data");
        // player data
        {
            cJSON* players = cJSON_GetObjectItemCaseSensitive(game, "players");

            if (cJSON_IsArray(players)) {
              for (int i = 0; i < cJSON_GetArraySize(players); i++) {
                cJSON *player = cJSON_GetArrayItem(players, i);

                if (m_players.find(getInt(player, "id")) != m_players.end())
                throw LoadGameException(FMT1(_("A player ID must be unique: %1%"), getInt(player, "id")));
                // Create the player
                Player *p;
                if (getString(player, "type") == "human")
                    p = new HumanPlayer();
                else if (getString(player, "type") == "computer")
                {
                    int level = getInt(player, "level");
                    if (level == INT_MIN) {
                        int levelMin = getInt(player, "levelMin");
                        int levelMax = getInt(player, "levelMin");
                        p = new AIPercent(0.01 * levelMin, 0.01 * levelMax);
                    } else {
                        p = new AIPercent(0.01 * level, 0.01 * level);
                    }
                }
                else
                    throw LoadGameException(FMT1(_("Invalid player type: %1%"), getString(player, "type")));

                m_players[getInt(player, "id")] = p;

                // Set the name
                p->setName(fromUtf8(getString(player, "name")));
                // Ste the table number
                if (getInt(player, "tableNb") != INT_MIN)
                    p->setTableNb(getInt(player, "tableNb"));

                m_game->addPlayer(p);
              }
            } else {
              throw LoadGameException(_("Players should be an array"));
            }
        }

        if (getBool(game, "finished")) {
            if (dynamic_cast<FreeGame*>(m_game)) {
                FreeGame *convGame = static_cast<FreeGame*>(m_game);
                convGame->m_finished = true;
            }
        }
    }

    // history
    {
        cJSON* history = cJSON_GetObjectItemCaseSensitive(m_parser, "history");

        if (cJSON_IsArray(history)) {
          for (int i = 0; i < cJSON_GetArraySize(history); i++) {
            cJSON* turn = cJSON_GetArrayItem(history, i);
            if (i!=0)
              m_game->accessNavigation().newTurn();

            cJSON* commands = cJSON_GetObjectItemCaseSensitive(turn, "commands");
            if (cJSON_IsArray(commands)) {
              for (int i2 = 0; i2 < cJSON_GetArraySize(commands); i2++) {
                cJSON* command = cJSON_GetArrayItem(commands, i2);

                string tag = getString(command, "type");

                if (tag == "gameRack")
                {
                    // Build a rack for the correct player
                    const wstring &rackStr = m_dic.convertFromInput(fromUtf8(getString(command, "rack")));
                    PlayedRack pldrack;
                    if (!m_dic.validateLetters(rackStr, L"-+"))
                    {
                        throw LoadGameException(FMT1(_("Rack invalid for the current dictionary: %1%"), getString(command, "rack")));
                    }
                    pldrack.setManual(rackStr);
                    LOG_DEBUG("loaded rack: " << lfw(pldrack.toString()));

                    GameRackCmd *cmd = new GameRackCmd(*m_game, pldrack);
                    m_game->accessNavigation().addAndExecute(cmd);
                    LOG_DEBUG("rack: " << lfw(pldrack.toString()));
                }
                else if (tag == "playerRack")
                {
                    // Build a rack for the correct player
                    const wstring &rackStr = m_dic.convertFromInput(fromUtf8(getString(command, "rack")));
                    PlayedRack pldrack;
                    if (!m_dic.validateLetters(rackStr, L"-+"))
                    {
                        throw LoadGameException(FMT1(_("Rack invalid for the current dictionary: %1%"), getString(command, "rack")));
                    }
                    pldrack.setManual(rackStr);
                    LOG_DEBUG("loaded rack: " << lfw(pldrack.toString()));

                    Player &p = getPlayer(m_players, getInt(command, "playerId"), tag);
                    PlayerRackCmd *cmd = new PlayerRackCmd(p, pldrack);
                    m_game->accessNavigation().addAndExecute(cmd);
                    LOG_DEBUG("rack: " << lfw(pldrack.toString()));
                }

                else if (tag == "masterMove")
                {
                    const Move &move = buildMove(*m_game, command, false);
                    Duplicate *duplicateGame = dynamic_cast<Duplicate*>(m_game);
                    if (duplicateGame == NULL)
                    {
                        throw LoadGameException(_("The 'MasterMove' tag should only be present for duplicate games"));
                    }
                    MasterMoveCmd *cmd = new MasterMoveCmd(*duplicateGame, move);
                    m_game->accessNavigation().addAndExecute(cmd);
                }

                else if (tag == "playerMove")
                {
                    // FIXME: this is game-related logic. It should not be done here.
                    bool isArbitrationGame = m_game->getParams().getMode() == GameParams::kARBITRATION;

                    const Move &move = buildMove(*m_game, command, /*XXX:true*/false);
                    Player &p = getPlayer(m_players, getInt(command, "playerId"), tag);
                    PlayerMoveCmd *cmd = new PlayerMoveCmd(p, move, isArbitrationGame);
                    m_game->accessNavigation().addAndExecute(cmd);
                }

                else if (tag == "gameMove")
                {
                    const Move &move = buildMove(*m_game, command, false);
                    GameMoveCmd *cmd = new GameMoveCmd(*m_game, move);
                    m_game->accessNavigation().addAndExecute(cmd);
                }

                else if (tag == "warning")
                {
                    Player &p = getPlayer(m_players, getInt(command, "playerId"), tag);
                    PlayerEventCmd *cmd = new PlayerEventCmd(p, PlayerEventCmd::WARNING);
                    m_game->accessNavigation().addAndExecute(cmd);
                }

                else if (tag == "penalty")
                {
                    Player &p = getPlayer(m_players, getInt(command, "playerId"), tag);
                    int points = getInt(command, "points");
                    LOG_DEBUG("points=" << points);
                    PlayerEventCmd *cmd = new PlayerEventCmd(p, PlayerEventCmd::PENALTY, points);
                    m_game->accessNavigation().addAndExecute(cmd);
                }

                else if (tag == "solo")
                {
                    Player &p = getPlayer(m_players, getInt(command, "playerId"), tag);
                    int points = getInt(command, "points");
                    LOG_DEBUG("points=" << points);
                    PlayerEventCmd *cmd = new PlayerEventCmd(p, PlayerEventCmd::SOLO, points);
                    m_game->accessNavigation().addAndExecute(cmd);
                }

                else if (tag == "endGame")
                {
                    Player &p = getPlayer(m_players, getInt(command, "playerId"), tag);
                    int points = getInt(command, "points");
                    LOG_DEBUG("points=" << points);
                    PlayerEventCmd *cmd = new PlayerEventCmd(p, PlayerEventCmd::END_GAME, points);
                    m_game->accessNavigation().addAndExecute(cmd);
                }

                else if (tag == "playerSwap")
                {
                    int playerId = getInt(command, "playerId");
                    Game::CurrentPlayerCmd *cmd = new Game::CurrentPlayerCmd(*m_game, playerId);
                    m_game->accessNavigation().addAndExecute(cmd);
                }
              }
            }
          }
        }
    }

    cJSON_Delete(m_parser);
    m_parser = NULL;
}
