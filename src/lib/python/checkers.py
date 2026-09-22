"""ตัวช่วยตรวจแบบฝึก Python

check code ใน YAML เรียกฟังก์ชันพวกนี้ได้เลย และอ่านตัวแปรของเฉลยได้จาก _sol["ชื่อตัวแปร"]
ข้อความ error เขียนเป็นภาษาไทยให้ผู้เรียนรู้ว่าต้องแก้ตรงไหน
"""
import math

__all__ = ["CheckFailed", "check_true", "check_value", "check_df", "check_series"]


class CheckFailed(Exception):
    """ตรวจแล้วไม่ผ่าน — ข้อความคือสิ่งที่ผู้เรียนจะเห็น"""


def check_true(condition, message):
    if not condition:
        raise CheckFailed(message)


def _plain(x):
    if hasattr(x, "item") and callable(x.item):
        try:
            return x.item()
        except (TypeError, ValueError):
            return x
    return x


def _is_number(x):
    return isinstance(x, (int, float)) and not isinstance(x, bool)


def check_value(actual, expected, name="คำตอบ", tol=1e-6):
    """เทียบค่าเดี่ยว — ไม่บอกค่าที่ถูก เพื่อไม่ให้ลอกคำตอบ"""
    actual, expected = _plain(actual), _plain(expected)
    if _is_number(actual) and _is_number(expected):
        ok = math.isclose(actual, expected, rel_tol=tol, abs_tol=tol)
    else:
        ok = type(actual) is type(expected) and actual == expected
    if not ok:
        raise CheckFailed(f"{name} ยังไม่ถูก: ตอนนี้ได้ {actual!r}")


def _flatten(df):
    import pandas as pd

    if not isinstance(df.index, pd.RangeIndex) or any(n is not None for n in df.index.names):
        try:
            df = df.reset_index()
        except ValueError:
            df = df.reset_index(drop=True)
    else:
        df = df.reset_index(drop=True)
    df = df.copy()
    df.columns = [" / ".join(map(str, c)) if isinstance(c, tuple) else str(c) for c in df.columns]
    return df


def _sort_rows(df):
    try:
        return df.sort_values(list(df.columns), na_position="last", kind="mergesort").reset_index(drop=True)
    except TypeError:  # คอลัมน์มีหลายชนิดปนกัน
        order = df.astype(str).apply(tuple, axis=1).sort_values(kind="mergesort").index
        return df.loc[order].reset_index(drop=True)


def _same(a, e, tol):
    import pandas as pd

    numeric = pd.api.types.is_numeric_dtype
    if numeric(a) and numeric(e) and not pd.api.types.is_bool_dtype(a):
        af, ef = a.astype(float), e.astype(float)
        scale = pd.concat([af.abs(), ef.abs()], axis=1).max(axis=1).clip(lower=1)
        close = ((af - ef).abs() <= tol * scale).fillna(False)
        return (close | (af.isna() & ef.isna())).tolist()
    return ((a.astype(object) == e.astype(object)) | (a.isna() & e.isna())).tolist()


def _first_diff(a, e, tol):
    for col in e.columns:
        same = _same(a[col], e[col], tol)
        if not all(same):
            return col, same.index(False)
    return None


def check_df(actual, expected, name="result", ordered=False, tol=1e-6):
    import pandas as pd

    if not isinstance(actual, pd.DataFrame):
        raise CheckFailed(f"{name} ต้องเป็น DataFrame แต่ตอนนี้เป็น {type(actual).__name__}")
    a, e = _flatten(actual), _flatten(expected)
    missing = [c for c in e.columns if c not in a.columns]
    extra = [c for c in a.columns if c not in e.columns]
    if missing or extra:
        parts = []
        if missing:
            parts.append("ขาดคอลัมน์ " + ", ".join(missing))
        if extra:
            parts.append("มีคอลัมน์เกิน " + ", ".join(extra))
        raise CheckFailed(f"{name}: " + " และ ".join(parts))
    a = a[list(e.columns)]
    if len(a) != len(e):
        raise CheckFailed(f"{name}: ได้ {len(a)} แถว แต่ควรได้ {len(e)} แถว")
    if ordered:
        diff = _first_diff(a, e, tol)
        if diff is None:
            return
        if _first_diff(_sort_rows(a), _sort_rows(e), tol) is None:
            raise CheckFailed(f"{name}: ข้อมูลถูกแล้ว แต่ลำดับแถวไม่ตรงกับที่โจทย์ต้องการ")
        col, i = diff
        raise CheckFailed(f"{name}: แถวที่ {i + 1} คอลัมน์ '{col}' ได้ {a[col].iloc[i]!r} แต่ควรเป็น {e[col].iloc[i]!r}")
    a, e = _sort_rows(a), _sort_rows(e)
    diff = _first_diff(a, e, tol)
    if diff is not None:
        col, i = diff
        raise CheckFailed(f"{name}: ค่าในคอลัมน์ '{col}' ไม่ตรง เช่น ได้ {a[col].iloc[i]!r} แต่ควรเป็น {e[col].iloc[i]!r}")


def check_series(actual, expected, name="result", ordered=False, tol=1e-6):
    import pandas as pd

    if not isinstance(actual, pd.Series):
        raise CheckFailed(f"{name} ต้องเป็น Series แต่ตอนนี้เป็น {type(actual).__name__}")
    check_df(actual.rename("value").to_frame(), expected.rename("value").to_frame(), name=name, ordered=ordered, tol=tol)
