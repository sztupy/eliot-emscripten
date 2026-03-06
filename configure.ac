dnl -*-m4-*-
dnl Process this file with autoconf to produce a configure script.
dnl --------------------------------------------------------------
dnl configure.ac for Eliot
dnl --------------------------------------------------------------
AC_INIT([eliot],[2.3-git])
AC_CONFIG_SRCDIR(utils/eliottxt.cpp)
dnl See http://www.flameeyes.eu/autotools-mythbuster/automake/nonrecursive.html
dnl for the subdir-objets arguments (used at the moment for game/cmd/)
AM_INIT_AUTOMAKE([subdir-objects])
AC_CONFIG_HEADERS([config.h])
AC_CANONICAL_HOST
AC_CANONICAL_BUILD

dnl --------------------------------------------------------------
dnl Checks for programs.
dnl --------------------------------------------------------------
AC_PROG_INSTALL
AC_PROG_CC
dnl Needed for gettext
AC_USE_SYSTEM_EXTENSIONS
AC_PROG_CXX
AC_PROG_MAKE_SET
AC_PROG_RANLIB
AM_PROG_AR
PKG_PROG_PKG_CONFIG

AC_CHECK_HEADERS_ONCE(execinfo.h)
AX_CXX_GCC_ABI_DEMANGLE

dnl --------------------------------------------------------------
dnl Checks for compilation flags
dnl --------------------------------------------------------------
CFLAGS_save="${CFLAGS}"
AC_CACHE_CHECK([if \$CC accepts -Wall],
       [ac_cv_c_Wall],
       [CFLAGS="-Wall ${CFLAGS_save}"
       AC_COMPILE_IFELSE([AC_LANG_PROGRAM([[]], [[]])],[ac_cv_c_Wall=yes],[ac_cv_c_Wall=no])])
CFLAGS="${CFLAGS_save}"
if test "${ac_cv_c_Wall}" != "no"; then
    CFLAGS+=" -Wall"
    CXXFLAGS+=" -Wall"
fi

CFLAGS_save="${CFLAGS}"
AC_CACHE_CHECK([if \$CC accepts -Wextra],
       [ac_cv_c_Wextra],
       [CFLAGS="-Wextra ${CFLAGS_save}"
       AC_COMPILE_IFELSE([AC_LANG_PROGRAM([[]], [[]])],[ac_cv_c_Wextra=yes],[ac_cv_c_Wextra=no])])
CFLAGS="${CFLAGS_save}"
if test "${ac_cv_c_Wextra}" != "no"; then
    CFLAGS+=" -Wextra"
    CXXFLAGS+=" -Wextra"
fi

dnl Production
AC_ARG_ENABLE([production],AS_HELP_STRING([--enable-production],[production mode (default disabled)]))
if test "${enable_production}" = "yes"; then
    want_production=1
    CFLAGS+=" -g0 -O3"
    CXXFLAGS+=" -g0 -O3"
else
    want_production=0
fi

dnl Logging
AC_ARG_ENABLE([logging],AS_HELP_STRING([--enable-logging],[logging (default disabled)]))
if test "${enable_logging}" = "yes"; then
    want_logging=1
else
    want_logging=0
fi

dnl Debug mode
AC_ARG_ENABLE([debug],AS_HELP_STRING([--enable-debug],[debug mode (default disabled)]))
if test "${enable_debug}" = "yes"; then
    CPPFLAGS+=" -DDEBUG"
    CFLAGS+=" -g"
    CXXFLAGS+=" -g"
fi

dnl Profile mode
AC_ARG_ENABLE([profile],AS_HELP_STRING([--enable-profile],[profile mode (default disabled)]))
if test "${enable_profile}" = "yes"; then
    CPPFLAGS+=" -DPROFILE"
    CFLAGS+=" -pg"
    CXXFLAGS+=" -pg"
    LDFLAGS+=" -pg"
fi

dnl Regexp / Listdic / Compdic build enable
AC_ARG_ENABLE([dictools],AS_HELP_STRING([--enable-dictools],[build independant dictionary tools (default enabled)]))
AM_CONDITIONAL([BUILD_DICTOOLS], [test "${enable_dictools}" != "no"])

dnl Define WIN32_BUILD if the compiler is i586-mingw32msvc-g++
AM_CONDITIONAL([WIN32_BUILD], [test "${CXX}" = "i586-mingw32msvc-g++"])

dnl --------------------------------------------------------------
dnl Checks for header files.
dnl --------------------------------------------------------------
AC_CHECK_HEADERS(fcntl.h unistd.h sys/stats.h sys/types.h)
AC_CHECK_HEADERS(arpa/inet.h netinet/in.h)
AC_CHECK_HEADERS([readline/readline.h], [has_readline=1], [has_readline=0])
AM_CONDITIONAL(HAS_READLINE, test "$has_readline" = "1")

dnl --------------------------------------------------------------
dnl Checks for typedefs, structures, and compiler characteristics.
dnl --------------------------------------------------------------
AC_C_CONST
AC_TYPE_SIZE_T
AC_C_BIGENDIAN
AC_C_INLINE
dnl AC_CHECK_SIZEOF(char, 1)
dnl AC_CHECK_SIZEOF(short, 2)
dnl AC_CHECK_SIZEOF(wchar_t, 4)
dnl AC_CHECK_SIZEOF(int *, 4)
dnl AC_CHECK_SIZEOF(int, 4)
dnl AC_CHECK_SIZEOF(long, 4)
dnl AC_CHECK_SIZEOF(long long, 0)

dnl --------------------------------------------------------------
dnl Checks for library functions.
dnl --------------------------------------------------------------
AC_FUNC_MEMCMP
AC_CHECK_FUNCS([wcwidth])

dnl --------------------------------------------------------------
dnl Checks for libraries.
dnl --------------------------------------------------------------

dnl Check for the Boost libraries (in fact we only need the headers)
dnl We need at least version 1.36, for Boost.Unordered
AX_BOOST_BASE([1.36.0])

PKG_CHECK_MODULES(LIBCONFIG, [libconfig++],
                  [has_libconfig=1
                   AC_DEFINE(HAVE_LIBCONFIG, 1, [Define to 1 if you have the libconfig library])],
                  [has_libconfig=0])

AS_IF([test "${want_production}" = "1"],
      [production_build=1
      AC_DEFINE(USE_PRODUCTION, 1, [Define to 1 if you want to build without debug headers])])
AM_CONDITIONAL([PRODUCTION_BUILD], [test "${production_build}" = "1"])

AS_IF([test "${want_logging}" = "1"],
      [with_logging=1
      AC_DEFINE(USE_LOGGING, 1, [Define to 1 if you want to enable logging])])
AM_CONDITIONAL([WITH_LOGGING], [test "${with_logging}" = "1"])

dnl Enable/disable text version
AC_ARG_ENABLE([text],AS_HELP_STRING([--enable-text],[text interface support (default enabled)]))
AM_CONDITIONAL([BUILD_TEXT], [test "${enable_text}" != "no"])

dnl Internationalization macros
AM_GNU_GETTEXT_VERSION(0.20)
AM_GNU_GETTEXT([external])

dnl Iconv
AM_ICONV
AS_IF([test "$am_cv_func_iconv" != "yes"],
      [AC_MSG_ERROR([libiconv is needed for Eliot to work properly])])

dnl Information about who built eliot (useful for the dictionary)
AC_DEFINE_UNQUOTED(ELIOT_COMPILE_BY, "`whoami`", [user who ran configure])
AC_DEFINE_UNQUOTED(ELIOT_COMPILE_HOST, "`hostname`", [host which ran configure])

dnl Check the operating system
case "${host_os}" in
    *mingw32* | *cygwin*)
        SYS=mingw32
        ;;
    *)
        dnl nothing to do
        ;;
esac

if test "$SYS" = "mingw32"; then
    # For ntohl, in particular
    LIBS="${LIBS} -lws2_32"
fi

dnl Check for emscripten
AC_CHECK_DECL(__EMSCRIPTEN__,
    has_emscripten=1; AM_CONDITIONAL([EMSCRIPTEN_BUILD], [true]),
    AM_CONDITIONAL([EMSCRIPTEN_BUILD], [false])
)

if test "$has_emscripten" = "1"; then
    CPPFLAGS="${CPPFLAGS} -fexceptions"
    LIBS="${LIBS} -lnodefs.js -fexceptions"
fi

dnl --------------------------------------------------------------
dnl Output
dnl --------------------------------------------------------------
AC_CONFIG_FILES(po/Makefile.in
dic/Makefile
game/Makefile
utils/Makefile
extras/Makefile
website/Makefile
extras/innosetup/eliot-setup.iss
Makefile)
AC_OUTPUT
