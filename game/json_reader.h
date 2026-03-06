/*****************************************************************************
 * Eliot
 * Copyright (C) 2009-2012 Olivier Teulière
 * Authors: Olivier Teulière  <ipkiss@via.ecp.fr>
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

#ifndef JSON_READER_H_
#define JSON_READER_H_

#include <map>

#include "logging.h"
#include "game_params.h"
#include "cJSON.h"

class Dictionary;
class Game;
class Player;

using std::string;
using std::map;


class JsonReader
{
    DEFINE_LOGGER();
public:
    virtual ~JsonReader() {}

    /**
     * Only entry point of the class.
     * Create a Game object, from a XML file created using the XmlWriter class.
     * The method throws an exception in case of problem.
     */
    static Game * load(const string &data, const Dictionary &iDic);

    // Return the built game
    Game * getGame();

private:
    cJSON *m_parser;

    const Dictionary &m_dic;
    Game *m_game;
    map<int, Player*> m_players;
    GameParams m_params;

    // Private constructor, because we only want the read() method
    // to be called externally
    JsonReader(const Dictionary &iDic, cJSON *parser) :
        m_parser(parser), m_dic(iDic), m_game(NULL), m_params(iDic) {}

    JsonReader(const JsonReader&);
    JsonReader& operator=(const JsonReader&);
    bool operator==(const JsonReader&);

    void parse();
};

#endif
