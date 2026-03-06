localedir = $(datadir)/locale
AM_CPPFLAGS = -DLOCALEDIR=\"$(localedir)\" -I$(top_srcdir)/dic -I$(top_srcdir)/game -I../intl -I$(top_srcdir)/intl

if PRODUCTION_BUILD
  LDF_PROD =
else
  LDF_PROD = -gsource-map
endif

noinst_PROGRAMS =
bin_PROGRAMS =

if EMSCRIPTEN_BUILD
noinst_PROGRAMS += eliotweb eliotweb.html
eliotweb_SOURCES = game_io.h game_io.cpp eliotweb.cpp
eliotweb_LDADD = $(top_builddir)/game/libgame.a $(top_builddir)/dic/libdic.a @LIBINTL@ @LIBICONV@ @LIBCONFIG_LIBS@

eliotweb_html_SOURCES = game_io.h game_io.cpp eliotweb.cpp
eliotweb_html_LDFLAGS = $(LDF_PROD) --preload-file ../dictionaries/gd.dawg@/ -sEXPORTED_FUNCTIONS=_startGame,_loadGame,_stopGame,_gameAction,_free -sEXPORTED_RUNTIME_METHODS=stringToNewUTF8
eliotweb_html_LDADD = $(top_builddir)/game/libgame.a $(top_builddir)/dic/libdic.a @LIBINTL@ @LIBICONV@ @LIBCONFIG_LIBS@
endif
