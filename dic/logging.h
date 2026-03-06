/*****************************************************************************
 * Eliot
 * Copyright (C) 2011 Olivier Teulière
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

#ifndef DIC_LOGGING_H_
#define DIC_LOGGING_H_

#include <config.h>

#ifdef USE_LOGGING
#   include <iostream>

#   define DEFINE_LOGGER()
#   define INIT_LOGGER(prefix, className)

#   define LOG_TRACE(a) std::cout << a << std::endl
#   define LOG_DEBUG(a) std::cout << a << std::endl
#   define LOG_INFO(a) std::cout << a << std::endl
#   define LOG_WARN(a) std::cout << a << std::endl
#   define LOG_ERROR(a) std::cerr << a << std::endl
#   define LOG_FATAL(a) std::cerr << a << std::endl
#   define LOG_ROOT_ERROR(a) std::cerr << a << std::endl
#   define LOG_ROOT_FATAL(a) std::cerr << a << std::endl
#else
#   define DEFINE_LOGGER()
#   define INIT_LOGGER(prefix, name)

#   define LOG_TRACE(a)
#   define LOG_DEBUG(a)
#   define LOG_INFO(a)
#   define LOG_WARN(a)
#   define LOG_ERROR(a)
#   define LOG_FATAL(a)
#   define LOG_ROOT_ERROR(a)
#   define LOG_ROOT_FATAL(a)
#endif // USE_LOGGING

#endif
