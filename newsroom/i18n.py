"""Language policy and text geometry for English, Nepali and Nepali/English news.

No automated translation or number conversion: those operations change an
editor's words, numerals and sometimes the meaning of an attributed figure.
"""
from __future__ import annotations
import re
import shutil
import subprocess
from pathlib import Path
from PIL import features

SUPPORTED_LANGUAGES = {'en', 'ne', 'ne-en'}
DEVANAGARI = re.compile(r'[\u0900-\u097f]')
NEPALI_DANDA = ('।', '॥')


def language(meta: dict) -> str:
    return str(meta.get('language', 'en')).strip().lower()


def has_devanagari(text: str) -> bool:
    return bool(DEVANAGARI.search(str(text)))


def is_nepali(meta: dict) -> bool:
    return language(meta) in {'ne', 'ne-en'}


def required_locale(lang: str) -> str:
    return {'en': 'en', 'ne': 'ne-NP', 'ne-en': 'ne-NP'}[lang]


def font_path(*, nepali=False, bold=False) -> str:
    if nepali:
        name = 'NotoSansDevanagari-Bold.ttf' if bold else 'NotoSansDevanagari-Regular.ttf'
        candidates = [Path('/usr/share/fonts/truetype/noto') / name]
        fc_name = 'Noto Sans Devanagari:style=Bold' if bold else 'Noto Sans Devanagari'
    else:
        candidates = [Path('/usr/share/fonts/truetype/lato') / ('Lato-Heavy.ttf' if bold else 'Lato-Regular.ttf'),
                      Path('/usr/share/fonts/truetype/dejavu') / ('DejaVuSans-Bold.ttf' if bold else 'DejaVuSans.ttf')]
        fc_name = 'DejaVu Sans'
    for path in candidates:
        if path.is_file():
            return str(path)
    if shutil.which('fc-match'):
        result = subprocess.run(['fc-match', '-f', '%{family}|%{file}', fc_name], capture_output=True, text=True)
        try:
            family, path = result.stdout.strip().split('|', 1)
        except ValueError:
            family, path = '', ''
        # A generic fallback is dangerous: tofu or broken Devanagari syllables.
        if Path(path).is_file() and (not nepali or 'devanagari' in family.lower()):
            return path
    raise RuntimeError('Missing Noto Sans Devanagari font; install fonts-noto-core (Nepali) or fonts-lato/fonts-dejavu-core (English).')


def verify_text_engine(lang: str) -> dict:
    """Fail instead of publishing malformed vowel signs or split conjuncts."""
    info = {'language': lang, 'font': font_path(nepali=(lang != 'en')),
            'complex_text_layout_raqm': bool(features.check('raqm'))}
    if lang != 'en' and not info['complex_text_layout_raqm']:
        raise RuntimeError('Pillow was built without libraqm: Nepali conjuncts and matras may render incorrectly. Install a RAQM-enabled Pillow build.')
    return info


def subtitle_font(lang: str) -> str:
    return 'Noto Sans Devanagari' if lang in {'ne', 'ne-en'} else 'DejaVu Sans'


def sentence_ends(token: str) -> bool:
    return str(token).rstrip('”\"\'’)').endswith(('.', '?', '!', *NEPALI_DANDA))


def ass_subtitle_style(lang: str) -> str:
    """ASS libass PlayRes default (288 vertical): use *script* units, not pixels.

    FontSize=10 renders ~67 CSS px at 1920h and ~27px at 768h.
    Passing FontSize=50 would produce ~333px glyphs and cover the frame.
    """
    face=subtitle_font(lang)
    return (f'FontName={face},FontSize=10,Alignment=2,MarginV=23,'
            'Outline=0.4,Shadow=0.2,PrimaryColour=&H00F5F6F5&,'
            'OutlineColour=&H00101923&')