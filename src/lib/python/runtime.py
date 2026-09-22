"""Runtime ฝั่ง Python ที่รันใน Pyodide

ใช้ทั้งใน Web Worker ของเว็บและใน content test บน Node — ฟังก์ชันที่ JS เรียกคืนค่าเป็น JSON string
"""
import os

os.environ.setdefault("MPLBACKEND", "Agg")  # worker ไม่มี DOM ต้องวาดกราฟแบบ Agg

import ast
import base64
import contextlib
import io
import json
import linecache
import math
import sys
import traceback

MAX_ROWS = 20
MAX_TEXT = 20_000


def _register_thai_font():
    """ลงทะเบียนฟอนต์ไทย (Noto Sans Thai) ให้ matplotlib กันตัวอักษรไทยในกราฟกลายเป็นกล่องว่าง"""
    font_path = os.path.join(os.path.dirname(__file__), "NotoSansThai.ttf")
    if not os.path.exists(font_path):
        return
    try:
        import matplotlib.font_manager as fm
        import matplotlib.pyplot as plt

        fm.fontManager.addfont(font_path)
        plt.rcParams["font.family"] = "sans-serif"
        plt.rcParams["font.sans-serif"] = ["Noto Sans Thai", "DejaVu Sans"]
        plt.rcParams["axes.unicode_minus"] = False
    except Exception:
        pass


_register_thai_font()
CELL = "<cell>"
CHECK = "<check>"

_session = {"__name__": "__main__"}


def _truncate(text):
    if len(text) <= MAX_TEXT:
        return text
    return text[:MAX_TEXT] + f"\n… (ตัดเหลือ {MAX_TEXT:,} ตัวอักษรแรก)"


def _cell(value):
    pd = sys.modules.get("pandas")
    if value is None:
        return None
    if pd is not None:
        if isinstance(value, pd.Timestamp):
            if value == value.normalize():
                return value.strftime("%Y-%m-%d")
            return value.strftime("%Y-%m-%d %H:%M:%S")
        try:
            if pd.isna(value):
                return None
        except (TypeError, ValueError):
            pass
    if hasattr(value, "item") and callable(value.item):
        try:
            value = value.item()
        except (TypeError, ValueError):
            pass
    if isinstance(value, float) and not math.isfinite(value):
        return None if math.isnan(value) else str(value)
    if isinstance(value, (bool, int, float, str)):
        return value
    return str(value)


def _column_name(col):
    return " / ".join(str(c) for c in col) if isinstance(col, tuple) else str(col)


def _table(value):
    pd = sys.modules.get("pandas")
    if pd is None:
        return None
    if isinstance(value, pd.Series):
        value = value.to_frame(name=value.name if value.name is not None else "value")
    if not isinstance(value, pd.DataFrame):
        return None
    df = value
    if not isinstance(df.index, pd.RangeIndex) or any(n is not None for n in df.index.names):
        try:
            df = df.reset_index()
        except ValueError:  # ชื่อ index ซ้ำกับคอลัมน์
            df = df.reset_index(drop=True)
    head = df.head(MAX_ROWS)
    return {
        "columns": [_column_name(c) for c in head.columns],
        "rows": [[_cell(v) for v in row] for row in head.itertuples(index=False, name=None)],
        "totalRows": int(len(df)),
    }


def _images():
    plt = sys.modules.get("matplotlib.pyplot")
    if plt is None:
        return []
    out = []
    for num in plt.get_fignums():
        buf = io.BytesIO()
        plt.figure(num).savefig(buf, format="png", dpi=100, bbox_inches="tight")
        out.append(base64.b64encode(buf.getvalue()).decode("ascii"))
    plt.close("all")
    return out


def _exec(code, ns):
    """รันแบบ notebook: ถ้าบรรทัดสุดท้ายเป็น expression จะคืนค่าของมัน"""
    linecache.cache[CELL] = (len(code), None, code.splitlines(True), CELL)
    tree = ast.parse(code, filename=CELL, mode="exec")
    last = None
    if tree.body and isinstance(tree.body[-1], ast.Expr):
        last = ast.Expression(tree.body.pop().value)
    exec(compile(tree, CELL, "exec"), ns)
    if last is not None:
        return eval(compile(last, CELL, "eval"), ns)
    return None


def _format_error(exc):
    lines = []
    if isinstance(exc, SyntaxError) and exc.filename == CELL:
        lines.append(f"บรรทัด {exc.lineno}: {(exc.text or '').strip()}")
    else:
        for frame in traceback.extract_tb(exc.__traceback__):
            if frame.filename == CELL:
                lines.append(f"บรรทัด {frame.lineno}: {(frame.line or '').strip()}")
    lines.append(f"{type(exc).__name__}: {exc}")
    return "\n".join(lines)


def _run(code, ns):
    out = io.StringIO()
    result = {"ok": True, "stdout": "", "error": None, "table": None, "images": [], "text": None}
    value = None
    try:
        with contextlib.redirect_stdout(out), contextlib.redirect_stderr(out):
            value = _exec(code, ns)
    except BaseException as exc:  # รวม SystemExit ด้วย ไม่ให้ worker ตาย
        result["ok"] = False
        result["error"] = _format_error(exc)
    result["stdout"] = _truncate(out.getvalue())
    result["images"] = _images()
    if value is not None:
        table = _table(value)
        if table is not None:
            result["table"] = table
        elif not result["images"]:
            result["text"] = _truncate(repr(value))
    return result


def run_user(code):
    return json.dumps(_run(code, _session), ensure_ascii=False)


def reset_session():
    _session.clear()
    _session["__name__"] = "__main__"


def _check(user_code, check_code, solution_code):
    import checkers

    sol = {"__name__": "__main__"}
    try:
        with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
            _exec(solution_code, sol)
    except BaseException as exc:
        _images()
        return {"passed": False, "message": "เฉลยของโจทย์นี้ error (ต้องแก้ที่ไฟล์บทเรียน):\n" + _format_error(exc)}
    _images()

    user = {"__name__": "__main__"}
    run = _run(user_code, user)
    if not run["ok"]:
        return {"passed": False, "message": "โค้ดของคุณ error ก่อนตรวจได้:\n" + run["error"], "run": run}

    ns = dict(user)
    ns.update({name: getattr(checkers, name) for name in checkers.__all__})
    ns["_sol"] = sol
    ns["_stdout"] = run["stdout"]
    try:
        with contextlib.redirect_stdout(io.StringIO()):
            exec(compile(check_code, CHECK, "exec"), ns)
    except checkers.CheckFailed as exc:
        return {"passed": False, "message": str(exc), "run": run}
    except NameError as exc:
        return {"passed": False, "message": f"ยังไม่มีตัวแปร {exc.name} — โจทย์ให้เก็บคำตอบไว้ในตัวแปรชื่อนี้", "run": run}
    except Exception as exc:
        return {"passed": False, "message": f"ตัวตรวจเจอปัญหา: {type(exc).__name__}: {exc}", "run": run}
    return {"passed": True, "message": "ถูกต้อง!", "run": run}


def check_exercise(user_code, check_code, solution_code):
    return json.dumps(_check(user_code, check_code, solution_code), ensure_ascii=False)
