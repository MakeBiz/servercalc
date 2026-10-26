#!/usr/bin/env python3
"""
Индекс цен VPS: сравнивает каталог тарифов на базовой ревизии git с текущим data/plans.json
и пишет data/price-index.json для страницы /indeks-cen-vps/.

Запуск из корня репо:
  python3 scripts/price_index.py <базовая-ревизия> [--min-verified 2026-10-21]

Тариф сравнивается, только если у него совпали провайдер, название, ядра, память, диск и регион,
а цена в октябре подтверждена сверкой не раньше --min-verified. Валюта не пересчитывается:
долларовые тарифы сравниваются в долларах, чтобы курс не выдавал себя за изменение цены
"""
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PLANS = ROOT / 'data' / 'plans.json'
OUT = ROOT / 'data' / 'price-index.json'
WITHDRAWN = ROOT / 'data' / 'price-index-withdrawn.json'


def key(p):
    return (p['providerSlug'], p['name'].strip().lower(), p['cpu'], p['ram'], p.get('disk'), p['geo'])


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    base = sys.argv[1]
    min_verified = '0000-00-00'
    if '--min-verified' in sys.argv:
        min_verified = sys.argv[sys.argv.index('--min-verified') + 1]

    old = json.loads(subprocess.check_output(['git', 'show', f'{base}:data/plans.json'], cwd=ROOT))
    new = json.loads(PLANS.read_text())
    old_by = {key(p): p for p in old}

    rows = []
    for p in new:
        o = old_by.get(key(p))
        if not o or o['currency'] != p['currency']:
            continue
        if (p.get('verifiedAt') or '') < min_verified:
            continue
        change = round((p['price'] / o['price'] - 1) * 100, 1) if o['price'] else 0
        rows.append({
            'providerSlug': p['providerSlug'],
            'name': p['name'],
            'cpu': p['cpu'],
            'ram': p['ram'],
            'disk': p.get('disk'),
            'diskType': p.get('diskType'),
            'geo': p['geo'],
            'currency': p['currency'],
            'was': o['price'],
            'now': p['price'],
            'wasVerified': o.get('verifiedAt'),
            'nowVerified': p.get('verifiedAt'),
            'changePct': change,
        })

    rows.sort(key=lambda r: (-abs(r['changePct']), r['providerSlug'], r['ram']))
    from_d = min((r['wasVerified'] for r in rows if r['wasVerified']), default=None)
    to_d = max((r['nowVerified'] for r in rows if r['nowVerified']), default=None)
    withdrawn = json.loads(WITHDRAWN.read_text()) if WITHDRAWN.exists() else []

    out = {
        'base': base,
        'from': from_d,
        'to': to_d,
        'compared': len(rows),
        'unchanged': sum(1 for r in rows if r['changePct'] == 0),
        'up': sum(1 for r in rows if r['changePct'] > 0),
        'down': sum(1 for r in rows if r['changePct'] < 0),
        'rows': rows,
        'withdrawn': withdrawn,
    }
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=2) + '\n')
    print(f"{OUT.name}: сравнено {out['compared']}, без изменений {out['unchanged']}, дороже {out['up']}, дешевле {out['down']}, {out['from']} -> {out['to']}")


if __name__ == '__main__':
    main()
