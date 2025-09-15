"""
Line-level matching service

Per-employee matching of receipt and CAR lines primarily by amount, with a simple
scoring function to break ties:
  - s_desc (Jaccard 2-gram similarity) weight 0.5
  - s_vendor (exact match of top vendor token) weight 0.2
  - s_category (exact match) weight 0.2
  - s_date (string equality) weight 0.1

Confidence mapping:
  - score >= 0.70 => high
  - score >= 0.50 => medium
  - else => low

This implementation uses a greedy best-match selection within each amount bucket
to enforce one-to-one pairing without the complexity of Hungarian for now.
"""

from typing import Dict, Any, List, Tuple


def _bigrams(text: str) -> List[str]:
    s = (text or "").upper()
    s = "".join(ch for ch in s if ch.isalnum() or ch.isspace())
    tokens = s.split()
    grams: List[str] = []
    for tok in tokens:
        if len(tok) >= 2:
            grams.extend([tok[i : i + 2] for i in range(len(tok) - 1)])
        else:
            grams.append(tok)
    return grams


def _jaccard(a: List[str], b: List[str]) -> float:
    set_a = set(a)
    set_b = set(b)
    if not set_a and not set_b:
        return 1.0
    if not set_a or not set_b:
        return 0.0
    inter = len(set_a & set_b)
    union = len(set_a | set_b)
    return inter / union if union else 0.0


def _score_pair(r: Dict[str, Any], c: Dict[str, Any]) -> float:
    # Description similarity from vendor/descriptor/category fields
    desc_r = " ".join([
        str(r.get("vendor_candidate") or ""),
        str(r.get("category") or ""),
    ])
    desc_c = " ".join([
        str(c.get("category") or ""),
        str(c.get("descriptor") or ""),
    ])
    s_desc = _jaccard(_bigrams(desc_r), _bigrams(desc_c))

    # Vendor similarity (receipt has vendor, car usually not)
    vr = (r.get("vendor_candidate") or "").upper()
    vc = (c.get("vendor_candidate") or "").upper()
    s_vendor = 1.0 if vr and vc and vr == vc else 0.0

    # Category exact match
    cr = (r.get("category") or "").upper()
    cc = (c.get("category") or "").upper()
    s_category = 1.0 if cr and cc and cr == cc else 0.0

    # Date equality (if present)
    dr = (r.get("date_candidate") or "").upper()
    dc = (c.get("date_candidate") or "").upper()
    s_date = 1.0 if dr and dc and dr == dc else 0.0

    score = 0.5 * s_desc + 0.2 * s_vendor + 0.2 * s_category + 0.1 * s_date
    return max(0.0, min(1.0, score))


def _confidence(score: float) -> str:
    if score >= 0.70:
        return "high"
    if score >= 0.50:
        return "medium"
    return "low"


def match_employee_lines(receipt_lines: List[Dict[str, Any]], car_lines: List[Dict[str, Any]]) -> Dict[str, Any]:
    # Index by amount_cents
    def amt(line: Dict[str, Any]) -> int:
        try:
            return int(line.get("amount_cents") or round(float(line.get("amount") or 0) * 100))
        except Exception:
            return 0

    receipts_by_amt: Dict[int, List[Dict[str, Any]]] = {}
    for r in receipt_lines:
        receipts_by_amt.setdefault(amt(r), []).append(r)

    cars_by_amt: Dict[int, List[Dict[str, Any]]] = {}
    for c in car_lines:
        cars_by_amt.setdefault(amt(c), []).append(c)

    matches: List[Dict[str, Any]] = []
    unmatched_receipts: List[Dict[str, Any]] = []
    unmatched_car: List[Dict[str, Any]] = []

    # Process only amounts present on either side
    all_amounts = set(receipts_by_amt.keys()) | set(cars_by_amt.keys())
    for a in sorted(all_amounts, reverse=True):
        r_group = receipts_by_amt.get(a, [])[:]
        c_group = cars_by_amt.get(a, [])[:]

        # If either group is empty, mark the other as unmatched
        if not r_group and c_group:
            unmatched_car.extend(c_group)
            continue
        if not c_group and r_group:
            unmatched_receipts.extend(r_group)
            continue

        # Greedy best-match selection: for each receipt, pick the best car not used yet
        used_cars: List[int] = []
        for r in r_group:
            best_idx = -1
            best_score = -1.0
            for idx, c in enumerate(c_group):
                if idx in used_cars:
                    continue
                s = _score_pair(r, c)
                if s > best_score:
                    best_score = s
                    best_idx = idx
            if best_idx >= 0:
                c = c_group[best_idx]
                used_cars.append(best_idx)
                matches.append({
                    "amount": a / 100.0,
                    "receipt": r,
                    "car": c,
                    "score": round(best_score, 3),
                    "confidence": _confidence(best_score)
                })
            else:
                unmatched_receipts.append(r)

        # Any unused cars are unmatched
        for idx, c in enumerate(c_group):
            if idx not in used_cars:
                unmatched_car.append(c)

    return {
        "matches": matches,
        "unmatched_receipts": unmatched_receipts,
        "unmatched_car": unmatched_car,
    }


def build_matches_payload(session_id: str, receipts_doc: Dict[str, Any], car_doc: Dict[str, Any]) -> Dict[str, Any]:
    employees: List[Dict[str, Any]] = []
    rec_map = {e.get("employee_key"): e for e in (receipts_doc.get("employees", []) or [])}
    car_map = {e.get("employee_key"): e for e in (car_doc.get("employees", []) or [])}

    all_keys = set(rec_map.keys()) | set(car_map.keys())
    for key in sorted(all_keys):
        rec_lines = (rec_map.get(key, {}).get("lines") or [])
        car_lines = (car_map.get(key, {}).get("lines") or [])
        result = match_employee_lines(rec_lines, car_lines)
        employees.append({
            "employee_key": key,
            "matches": result["matches"],
            "unmatched_receipts": result["unmatched_receipts"],
            "unmatched_car": result["unmatched_car"],
        })

    return {
        "version": "1.0",
        "session_id": session_id,
        "employees": employees
    }



