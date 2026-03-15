/*****************************************************************************
 * Eliot
 * Copyright (C) 2005-2012 Olivier Teulière
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

#include "tile.h"
#include "rack.h"
#include "pldrack.h"
#include "round.h"
#include "move.h"
#include "results.h"
#include "board.h"
#include "ai_percent.h"


INIT_LOGGER(game, AIPercent);


AIPercent::AIPercent(float iMinPercent, float iMaxPercent)
{
    if (iMinPercent > iMaxPercent)
        iMinPercent = iMaxPercent;

    if (iMinPercent < 0)
        iMinPercent = 0;
    if (iMinPercent > 1)
        iMinPercent = 1;

    if (iMaxPercent < 0)
        iMaxPercent = 0;
    if (iMaxPercent > 1)
        iMaxPercent = 1;

    m_min_percent = iMinPercent;
    m_max_percent = iMaxPercent;

    // Use BestResults to be slightly faster when the percentage is 100%
    if (iMinPercent == iMaxPercent && iMaxPercent == 1)
        m_results = new BestResults;
    else
        m_results = new PercentResults(iMinPercent, iMaxPercent);
}


AIPercent::~AIPercent()
{
    delete m_results;
}


void AIPercent::compute(const Dictionary &iDic, const Board &iBoard, bool iFirstWord)
{
    m_results->clear();
    if (dynamic_cast<PercentResults*>(m_results)) {
        PercentResults *convResults = static_cast<PercentResults*>(m_results);
        convResults->updatePercentage();
    };

    const Rack &rack = getCurrentRack().getRack();
    m_results->search(iDic, iBoard, rack, iFirstWord);
}


Move AIPercent::getMove() const
{
    if (m_results->isEmpty())
    {
        // If there is no result, pass the turn.
        // FIXME: in duplicate mode, we should return a move of type NO_MOVE
        // instead of one of type PASS
        return Move(L"");
    }
    else
    {
        // TODO: use MoveSelector to select a correct move
        return Move(m_results->get(0));
    }
}
