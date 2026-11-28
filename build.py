#!/usr/bin/env python3
"""Build the single-file index.html from src/.

  src/index.template.html   page markup, with /*@CSS@*/ and /*@JS@*/ placeholders and <!--@INCLUDE name@--> lines
  src/html/*.html           the dialogs, each placed at its <!--@INCLUDE name@--> line
  src/style.css             styles
  src/js/*.js               script, concatenated in JS_ORDER inside one block scope { ... }
                            (one shared scope, exactly as before the split: files may use each other's names)
The files are small on purpose (MS-12), so one feature can be read and edited without loading the rest.

python3 build.py           writes index.html
python3 build.py --check   exits 1 if index.html is out of date with src/ (for CI or before publishing)
Uses only the standard library; no npm.
"""
import pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent
JS_ORDER = ["physics.js",
            "plots-spectrum.js", "plots-range.js",
            "ring-model.js", "ring-shaders.js", "ring-gpu.js", "ring-backends.js", "ring-bench.js", "ring-preview.js", "ring-render.js",
            "verify.js", "export.js",
            "ui-table.js", "ui-ring.js", "ui-mirror.js", "ui-copy.js", "ui-loop.js"]

def build():
    src = ROOT / "src"
    tpl = (src / "index.template.html").read_text(encoding="utf-8")
    for m in re.findall(r"<!--@INCLUDE ([\w.-]+)@-->\n", tpl):
        tpl = tpl.replace(f"<!--@INCLUDE {m}@-->\n", (src / "html" / m).read_text(encoding="utf-8"), 1)
    css = (src / "style.css").read_text(encoding="utf-8").removesuffix("\n")
    js = "".join((src / "js" / n).read_text(encoding="utf-8") for n in JS_ORDER).removesuffix("\n")
    assert tpl.count("/*@CSS@*/") == 1 and tpl.count("/*@JS@*/") == 1, "template placeholders missing"
    return tpl.replace("/*@CSS@*/", css).replace("/*@JS@*/", js)

if __name__ == "__main__":
    out, target = build(), ROOT / "index.html"
    if "--check" in sys.argv:
        ok = target.exists() and target.read_text(encoding="utf-8") == out
        print("index.html is up to date" if ok else "index.html is out of date: run python3 build.py")
        sys.exit(0 if ok else 1)
    target.write_text(out, encoding="utf-8")
    print(f"wrote {target.name} ({len(out.encode())} bytes)")
