#!/usr/bin/env python3
"""python3 tests/compare_snapshots.py before.json after.json

Reports every difference between two snapshots from tests/snapshot.js: the largest absolute and relative difference per
scenario and output, or IDENTICAL when every value matches bit for bit. Exits 1 if anything differs."""
import json, sys, math
A = json.load(open(sys.argv[1])); B = json.load(open(sys.argv[2]))
worst = {}
def num(x): return isinstance(x, (int, float)) and not isinstance(x, bool)
def walk(a, b, path, key):
    if num(a) and num(b):
        if a == b: return
        if math.isinf(a) or math.isinf(b) or math.isnan(a) or math.isnan(b):
            d = float('inf')
        else:
            d = abs(a - b)
        rel = d / max(abs(a), abs(b), 1e-300)
        w = worst.setdefault(key, [0, 0, path])
        if d > w[0]: w[0], w[2] = d, path
        w[1] = max(w[1], rel)
        return
    if type(a) != type(b):
        worst.setdefault(key, [float('inf'), 0, path + f' type {type(a).__name__}≠{type(b).__name__}']); return
    if isinstance(a, dict):
        for k in set(a) | set(b):
            if k == 'errs':
                if a.get(k) or b.get(k): print('page errors', path, a.get(k), b.get(k))
                continue
            if k not in a or k not in b: worst.setdefault(key + '.' + k, [float('inf'), 0, path + '.' + k + ' missing']); continue
            walk(a[k], b[k], path + '.' + k, key if key.count('.') else key + '.' + k)
    elif isinstance(a, list):
        if len(a) != len(b): worst.setdefault(key, [float('inf'), 0, path + f' len {len(a)}≠{len(b)}']); return
        for i, (x, y) in enumerate(zip(a, b)): walk(x, y, f'{path}[{i}]', key)
    elif a != b:
        worst.setdefault(key, [float('inf'), 0, path + ' string differs'])
for sc in sorted(set(A) | set(B)):
    if sc not in A or sc not in B: print('missing scenario', sc); continue
    walk(A[sc], B[sc], sc, sc)
if not worst: print('IDENTICAL: every output matches bit for bit'); sys.exit(0)
for k, (d, rel, p) in sorted(worst.items()):
    print(f'{k:40s} max abs {d:.3g}  max rel {rel:.3g}  at {p}')
sys.exit(1)
