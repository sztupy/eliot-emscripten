/*****************************************************************************
 * Eliot
 * Copyright (C) 2005-2012 Antoine Fraboulet & Olivier Teulière
 * Authors: Antoine Fraboulet <antoine.fraboulet @@ free.fr>
 *          Olivier Teulière <ipkiss @@ gmail.com>
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

#include "config.h"

#include <boost/foreach.hpp>
#include <boost/tokenizer.hpp>
#include <wchar.h>
#include <fstream>
#include <iostream>
#include <stdlib.h>
#include <time.h>
#include <string.h>
#include <locale.h>
#include <wctype.h>
#if HAVE_READLINE_READLINE_H
#   include <stdio.h>
#   include <readline/readline.h>
#   include <readline/history.h>
#endif

#include "dic.h"
#include "header.h"
#include "dic_exception.h"
#include "game_io.h"
#include "game_params.h"
#include "game_factory.h"
#include "public_game.h"
#include "game.h"
#include "player.h"
#include "ai_percent.h"
#include "encoding.h"
#include "game_exception.h"
#include "base_exception.h"
#include "settings.h"
#include "move.h"

class Game;


// Use a more friendly type name for the tokenizer
typedef boost::tokenizer<boost::char_separator<wchar_t>,
        std::wstring::const_iterator,
        std::wstring> Tokenizer;

// A static variable for holding the line
static wchar_t *wline_read = NULL;


class ParsingException : public BaseException
{
    public:
        ParsingException(const string &s) : BaseException(s) {}
};


wstring parseAlpha(const vector<wstring> &tokens, uint8_t index)
{
    if (tokens.size() <= index)
        throw ParsingException("Not enough tokens");
    const wstring &wstr = tokens[index];
    BOOST_FOREACH(wchar_t wch, wstr)
    {
        if (!iswalpha(wch))
            throw ParsingException("Not an alphabetical character: " + lfw(wch));
    }
    return wstr;
}


int parseNum(const vector<wstring> &tokens, uint8_t index,
             bool acceptDefault = false, int defValue = -1)
{
    if (tokens.size() <= index)
    {
        if (acceptDefault)
            return defValue;
        throw ParsingException("Not enough tokens");
    }
    const wstring &wstr = tokens[index];
    BOOST_FOREACH(wchar_t wch, wstr)
    {
        if (!iswdigit(wch))
            throw ParsingException("Not a numeric character: " + lfw(wch));
    }
    int value = wtoi(wstr.c_str());
    return value;
}


wstring parseAlphaNum(const vector<wstring> &tokens, uint8_t index)
{
    if (tokens.size() <= index)
        throw ParsingException("Not enough tokens");
    const wstring &wstr = tokens[index];
    BOOST_FOREACH(wchar_t wch, wstr)
    {
        if (!iswalnum(wch))
            throw ParsingException("Not an alphanumeric character: " + lfw(wch));
    }
    return wstr;
}


wstring parseLetters(const vector<wstring> &tokens, uint8_t index,
                     const Dictionary &iDic)
{
    if (tokens.size() <= index)
        throw ParsingException("Not enough tokens");
    return iDic.convertFromInput(tokens[index]);
}


wchar_t parseCharInList(const vector<wstring> &tokens, uint8_t index,
                        const wstring &allowed)
{
    if (tokens.size() <= index)
        throw ParsingException("Not enough tokens");
    const wstring &wstr = tokens[index];
    if (wstr.size() != 1)
        throw ParsingException("Not an allowed value: " + lfw(wstr));
    if (allowed.find(wstr[0]) == string::npos)
        throw ParsingException("Not an allowed value: " + lfw(wstr));
    return wstr[0];
}


int parsePlayerId(const vector<wstring> &tokens,
                  uint8_t index, const PublicGame &iGame)
{
    int playerId = parseNum(tokens, index);
    if (playerId < 0 || playerId >= (int)iGame.getNbPlayers())
        throw ParsingException("Invalid player ID");
    return playerId;
}


wstring parseFileName(const vector<wstring> &tokens, uint8_t index)
{
    if (tokens.size() <= index)
        throw ParsingException("Not enough tokens");
    const wstring &wstr = tokens[index];
    BOOST_FOREACH(wchar_t wch, wstr)
    {
        if (!iswalnum(wch) && wch != L'.' && wch != L'_')
            throw ParsingException("Invalid file name");
    }
    return wstr;
}


PublicGame * readGame(const Dictionary &iDic,
                      GameParams::GameMode iMode, const wstring &iToken)
{
    GameParams params(iDic, iMode);
    for (unsigned int i = 1; i < iToken.size(); ++i)
    {
        if (iToken[i] == L'j')
            params.addVariant(GameParams::kJOKER);
        else if (iToken[i] == L'e')
            params.addVariant(GameParams::kEXPLOSIVE);
        else if (iToken[i] == L'8')
            params.addVariant(GameParams::k7AMONG8);
    }
    Game *tmpGame = GameFactory::Instance()->createGame(params);
    return new PublicGame(*tmpGame);
}

void displayData(const PublicGame &iGame, const vector<wstring> &tokens)
{
    const wstring &displayType = parseAlpha(tokens, 1);
    if (displayType == L"g")
        GameIO::printBoard(cout, iGame);
    else if (displayType == L"j")
        cout << "Joueur " << iGame.getCurrentPlayer().getId() << endl;
    else if (displayType == L"l")
        GameIO::printNonPlayed(cout, iGame);
    else if (displayType == L"p")
    {
        GameIO::printGameDebug(cout, iGame);
        GameIO::printAllRacks(cout, iGame);
        GameIO::printAllPoints(cout, iGame);
        GameIO::printSaveGame(cout, iGame);
    }
    else if (displayType == L"r")
    {
        int limit = parseNum(tokens, 2, true, 10);
        GameIO::printSearchResults(cout, iGame.trainingGetResults(), limit);
    }
    else if (displayType == L"s")
        GameIO::printAllPoints(cout, iGame);
    else if (displayType == L"S")
        GameIO::printAllPoints(cout, iGame);
    else if (displayType == L"t")
        GameIO::printAllRacks(cout, iGame);
    else if (displayType == L"T")
        GameIO::printAllRacks(cout, iGame);
    else
        throw ParsingException("Invalid command");
}


void commonCommands(PublicGame &iGame, const vector<wstring> &tokens)
{
    wchar_t command = parseCharInList(tokens, 0, L"#adhjs");
    if (command == L'#')
        // Ignore comments
        return;
    else if (command == L'a')
        displayData(iGame, tokens);
    else if (command == L'd')
    {
        const wstring &word = parseLetters(tokens, 1, iGame.getDic());
        if (iGame.getDic().searchWord(word))
            printf("le mot -%s- existe\n", lfw(word).c_str());
        else
            printf("le mot -%s- n'existe pas\n", lfw(word).c_str());
    }
    else if (command == L'h')
    {
        wchar_t action = parseCharInList(tokens, 1, L"pnflr");
        int count = parseNum(tokens, 2, true, 1);
        if (action == L'p')
        {
            for (int i = 0; i < count; ++i)
                iGame.prevTurn();
        }
        else if (action == L'n')
        {
            for (int i = 0; i < count; ++i)
                iGame.nextTurn();
        }
        else if (action == L'f')
            iGame.firstTurn();
        else if (action == L'l')
            iGame.lastTurn();
        else if (action == L'r')
            iGame.clearFuture();
    }
    else if (command == L'j')
    {
        const wstring &word = parseLetters(tokens, 1, iGame.getDic());
        const wstring &coord = parseAlphaNum(tokens, 2);
        int res = iGame.play(word, coord);
        if (res != 0)
            printf("Mot incorrect ou mal placé (%i)\n", res);
    }
}


void handleRegexp(const Dictionary& iDic, const vector<wstring> &tokens)
{
    const wstring &regexp = tokens[1];
    int nres = parseNum(tokens, 2, true, 50);
    int lmin = parseNum(tokens, 3, true, 1);
    int lmax = parseNum(tokens, 4, true, DIC_WORD_MAX - 1);

    if (regexp == L"")
        return;

    if (lmax > (DIC_WORD_MAX - 1) || lmin < 1 || lmin > lmax)
    {
        printf("bad length -%d,%d-\n", lmin, lmax);
        return;
    }

    printf("search for %ls (%d,%d,%d)\n", regexp.c_str(),
           nres, lmin, lmax);

    vector<wdstring> wordList;
    try
    {
        iDic.searchRegExp(regexp, wordList, lmin, lmax, nres);
    }
    catch (InvalidRegexpException &e)
    {
        printf("Invalid regular expression: %s\n", e.what());
        return;
    }

    BOOST_FOREACH(const wdstring &wstr, wordList)
    {
        printf("%s\n", lfw(wstr).c_str());
    }
    printf("%u printed results\n", (unsigned)wordList.size());
}


void setSetting(const vector<wstring> &tokens)
{
    wchar_t type = parseCharInList(tokens, 1, L"bi");
    const wstring &settingWide = tokens[2];
    int value = parseNum(tokens, 3);

    try
    {
        string setting = lfw(settingWide);
        if (type == L'i')
            Settings::Instance().setInt(setting, value);
        else if (type == L'b')
            Settings::Instance().setBool(setting, value);
    }
    catch (GameException &e)
    {
        printf("Error while changing a setting: %s\n", e.what());
        return;
    }
}

vector<wstring> readTokens(char* command) {
    wstring wcommand = wfl(command);
    // Split the command
    vector<wstring> tokens;
    boost::char_separator<wchar_t> sep(L" ");
    Tokenizer tok(wcommand, sep);
    BOOST_FOREACH(const wstring &wstr, tok)
    {
        if (wstr != L"")
            tokens.push_back(wstr);
    }
    return tokens;
}

void loopTraining(PublicGame &iGame, char* command)
{
    const vector<wstring> &tokens = readTokens(command);
    if (tokens.empty())
        return;
    try
    {
        wchar_t command = parseCharInList(tokens, 0, L"#?adhjsbnrt*+q");
        if (command == L'b')
        {
            wchar_t type = parseCharInList(tokens, 1, L"bpr");
            const wstring &word = parseLetters(tokens, 2, iGame.getDic());
            if (type == L'b')
            {
                vector<wdstring> wordList;
                iGame.getDic().searchBenj(word, wordList);
                BOOST_FOREACH(const wdstring &wstr, wordList)
                {
                    cout << lfw(wstr) << endl;
                }
            }
            else if (type == L'p')
            {
                map<unsigned int, vector<wdstring> > wordMap;
                iGame.getDic().search7pl1(word, wordMap, false);
                map<unsigned int, vector<wdstring> >::const_iterator it;
                for (it = wordMap.begin(); it != wordMap.end(); ++it)
                {
                    if (it->first != 0)
                        cout << "+" << lfw(iGame.getDic().getHeader().getDisplayStr(it->first)) << endl;
                    BOOST_FOREACH(const wdstring &wstr, it->second)
                    {
                        cout << "  " << lfw(wstr) << endl;
                    }
                }
            }
            else if (type == L'r')
            {
                vector<wdstring> wordList;
                iGame.getDic().searchRacc(word, wordList);
                BOOST_FOREACH(const wdstring &wstr, wordList)
                {
                    cout << lfw(wstr) << endl;
                }
            }
        }
        else if (command == L'n')
        {
            int num = parseNum(tokens, 1);
            if (num <= 0)
                printf("mauvais argument\n");
            iGame.trainingPlayResult(num - 1);
        }
        else if (command == L'r')
            iGame.trainingSearch();
        else if (command == L't')
        {
            const wstring &letters =
                parseLetters(tokens, 1, iGame.getDic());
            iGame.trainingSetRackManual(false, letters);
        }
        else if (command == L'*')
            iGame.trainingSetRackRandom(false, PublicGame::kRACK_ALL);
        else if (command == L'+')
            iGame.trainingSetRackRandom(false, PublicGame::kRACK_NEW);
        else
            commonCommands(iGame, tokens);
    }
    catch (std::exception &e)
    {
        printf("%s\n", e.what());
    }
}


void loopFreegame(PublicGame &iGame, char* command)
{
    const vector<wstring> &tokens = readTokens(command);
    if (tokens.empty())
        return;
    try
    {
        wchar_t command = parseCharInList(tokens, 0, L"#?adhjspq");
        if (command == L'p')
        {
            wstring letters = L"";
            // You can pass your turn without changing any letter
            if (tokens.size() > 1)
            {
                letters = parseLetters(tokens, 1, iGame.getDic());
            }
            int res = iGame.freeGamePass(letters);
            if (res != 0)
                printf("Cannot pass (%d)\n", res);
        }
        else if (command == L's') {
            if (!iGame.isFinished()) {
                iGame.makeAIMove();
            }
        }
        else
            commonCommands(iGame, tokens);
    }
    catch (std::exception &e)
    {
        printf("%s\n", e.what());
    }
}


void loopDuplicate(PublicGame &iGame, char* command)
{
    const vector<wstring> &tokens = readTokens(command);
    if (tokens.empty())
        return;
    try
    {
        wchar_t command = parseCharInList(tokens, 0, L"#?adhjsnq");
        if (command == L'n')
        {
            unsigned id = parsePlayerId(tokens, 1, iGame);
            iGame.duplicateSetPlayer(id);
        }
        else
            commonCommands(iGame, tokens);
    }
    catch (std::exception &e)
    {
        printf("%s\n", e.what());
    }
}


void loopArbitration(PublicGame &iGame, char* command)
{
    const vector<wstring> &tokens = readTokens(command);
    if (tokens.empty())
        return;
    try
    {
        wchar_t command = parseCharInList(tokens, 0, L"#?adhjsfjmet*q");
        if (command == L'f')
            iGame.arbitrationFinalizeTurn();
        else if (command == L'j')
        {
            unsigned id = parsePlayerId(tokens, 1, iGame);
            const wstring &word = parseLetters(tokens, 2, iGame.getDic());
            const wstring &coord = parseAlphaNum(tokens, 3);
            const Move &move = iGame.arbitrationCheckWord(word, coord);
            iGame.arbitrationAssign(id, move);
        }
        else if (command == L'm')
        {
            const wstring &word = parseLetters(tokens, 1, iGame.getDic());
            const wstring &coord = parseAlphaNum(tokens, 2);
            const Move &move = iGame.arbitrationCheckWord(word, coord);
            if (!move.isValid())
                throw GameException("Incorrect master move: " + lfw(move.toString()));
            iGame.duplicateSetMasterMove(move);
        }
        else if (command == L'e')
        {
            unsigned id = parsePlayerId(tokens, 1, iGame);
            wchar_t type = parseCharInList(tokens, 2, L"wp");
            if (type == L'w')
                iGame.arbitrationToggleWarning(id);
            else if (type == 'p')
                iGame.arbitrationTogglePenalty(id);
//                 else if (type == 's')
//                     iGame.arbitrationSetSolo(id, value);
        }
        else if (command == L't')
        {
            const wstring &letters =
                parseLetters(tokens, 1, iGame.getDic());
            iGame.arbitrationSetRackManual(letters);
        }
        else if (command == L'*')
            iGame.arbitrationSetRackRandom();
        else
            commonCommands(iGame, tokens);
    }
    catch (std::exception &e)
    {
        printf("%s\n", e.what());
    }
}


void loopTopping(PublicGame &iGame, char* command)
{
    const vector<wstring> &tokens = readTokens(command);
    if (tokens.empty())
        return;
    try
    {
        wchar_t command = parseCharInList(tokens, 0, L"#?adhjstq");
        if (command == L't')
        {
            int timeout = parseNum(tokens, 1);
            iGame.toppingTimeOut(timeout);
        }
        else if (command == L'j')
        {
            const wstring &word = parseLetters(tokens, 1, iGame.getDic());
            const wstring &coord = parseAlphaNum(tokens, 2);
            int elapsed = parseNum(tokens, 3);
            iGame.toppingPlay(word, coord, elapsed);
        }
        else
            commonCommands(iGame, tokens);
    }
    catch (std::exception &e)
    {
        printf("%s\n", e.what());
    }
}


// void mainLoop(const Dictionary &iDic, char* command)
// {
//     const vector<wstring> &tokens = readTokens(command);

//     if (tokens.empty())
//         continue;
//     if (tokens[0].size() > 3)
//     {
//         printf("%s\n", "Invalid command");
//         continue;
//     }

//     try
//     {
//         switch (tokens[0][0])
//         {
//             case L'#':
//                 // Ignore comments
//                 break;
//             case L'e':
//                 {
//                     // New training game
//                     PublicGame *game = readGame(iDic, GameParams::kTRAINING, tokens[0]);
//                     game->addPlayer(new HumanPlayer);
//                     game->start();
//                     loopTraining(*game);
//                     delete game;
//                 }
//                 break;
//             case L'd':
//                 {
//                     int nbHuman = parseNum(tokens, 1);
//                     int nbAI = parseNum(tokens, 2);
//                     // New duplicate game
//                     PublicGame *game = readGame(iDic, GameParams::kDUPLICATE, tokens[0]);
//                     for (int i = 0; i < nbHuman; i++)
//                         game->addPlayer(new HumanPlayer);
//                     for (int i = 0; i < nbAI; i++)
//                         game->addPlayer(new AIPercent(1));
//                     game->start();
//                     loopDuplicate(*game);
//                     delete game;
//                 }
//                 break;
//             case L'l':
//                 {
//                     int nbHuman = parseNum(tokens, 1);
//                     int nbAI = parseNum(tokens, 2);
//                     // New free game
//                     PublicGame *game = readGame(iDic, GameParams::kFREEGAME, tokens[0]);
//                     for (int i = 0; i < nbHuman; i++)
//                         game->addPlayer(new HumanPlayer);
//                     for (int i = 0; i < nbAI; i++)
//                         game->addPlayer(new AIPercent(1));
//                     game->start();
//                     loopFreegame(*game);
//                     delete game;
//                 }
//                 break;
//             case L'a':
//                 {
//                     int nbHuman = parseNum(tokens, 1);
//                     int nbAI = parseNum(tokens, 2);
//                     // New free game
//                     PublicGame *game = readGame(iDic, GameParams::kARBITRATION, tokens[0]);
//                     for (int i = 0; i < nbHuman; i++)
//                         game->addPlayer(new HumanPlayer);
//                     for (int i = 0; i < nbAI; i++)
//                         game->addPlayer(new AIPercent(1));
//                     game->start();
//                     loopArbitration(*game);
//                     delete game;
//                 }
//                 break;
//             case L't':
//                 {
//                     // New topping game
//                     PublicGame *game = readGame(iDic, GameParams::kTOPPING, tokens[0]);
//                     game->addPlayer(new HumanPlayer);
//                     game->start();
//                     loopTopping(*game);
//                     delete game;
//                 }
//                 break;
//             case L'x':
//                 // Regular expression tests
//                 handleRegexp(iDic, tokens);
//                 break;
//             case L's':
//                 setSetting(tokens);
//                 break;
//             case L'q':
//                 quit = true;
//                 break;
//             default:
//                 printf("commande inconnue\n");
//                 break;
//         }
//     }
//     catch (std::exception &e)
//     {
//         printf("%s\n", e.what());
//     }
// }

Dictionary *g_dic;
PublicGame *g_game;

extern "C" void stopGame() {
    if (g_game) {
        delete g_game;
        g_game = NULL;
    }
}


extern "C" void startGame(int nbHuman, int nbAI) {
    try {
        stopGame();

        if (!g_dic) {
            setlocale(LC_ALL, "");
            std::locale::global(std::locale(""));
            g_dic = new Dictionary("gd.dawg");
            srand(time(NULL));
        }

        g_game = readGame(*g_dic, GameParams::kFREEGAME, L"");
        for (int i = 0; i < nbHuman; i++)
            g_game->addPlayer(new HumanPlayer);
        for (int i = 0; i < nbAI; i++)
            g_game->addPlayer(new AIPercent(1));
        g_game->start();
    } catch (std::exception &e)
    {
        cerr << e.what() << endl;
    }
}

extern "C" void loadGame(char* saveData) {
    try {
       stopGame();

        if (!g_dic) {
            setlocale(LC_ALL, "");
            std::locale::global(std::locale(""));
            g_dic = new Dictionary("gd.dawg");
            srand(time(NULL));
        }

        Game *tmpGame = GameFactory::Instance()->load(saveData, *g_dic);
        g_game = new PublicGame(*tmpGame);
    } catch (std::exception &e)
    {
        cerr << e.what() << endl;
    }
}

extern "C" void gameAction(char* command) {
    try {
        loopFreegame(*g_game, command);
    } catch (std::exception &e)
    {
        cerr << e.what() << endl;
    }
}
