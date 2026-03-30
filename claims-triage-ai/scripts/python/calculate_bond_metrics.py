import json
import math
import sys


RATING_PD = {
    "AAA": 0.0002,
    "AA+": 0.0003,
    "AA": 0.0005,
    "AA-": 0.0008,
    "A+": 0.0012,
    "A": 0.0018,
    "A-": 0.0025,
    "BBB+": 0.004,
    "BBB": 0.007,
    "BBB-": 0.012,
    "BB+": 0.02,
    "BB": 0.035,
    "B+": 0.06,
}

SECTOR_LGD = {
    "Government": 0.05,
    "Banking": 0.45,
    "Technology": 0.40,
    "Healthcare": 0.35,
    "Energy": 0.50,
    "Utilities": 0.35,
    "Telecom": 0.45,
    "Industrials": 0.40,
    "Consumer": 0.35,
    "Financial Services": 0.40,
}


def calculate_metrics(bond):
    face_value = float(bond["faceValue"])
    coupon_rate = float(bond["couponRate"])
    ytm = float(bond["yieldToMaturity"]) / 100.0
    maturity = int(bond["maturityYears"])
    bond_type = bond["type"]
    rating = bond["rating"]
    sector = bond["sector"]

    annual_coupon = face_value * (coupon_rate / 100.0)
    cashflows = []
    market_price = 0.0

    for year in range(1, maturity + 1):
        principal = face_value if year == maturity else 0.0
        coupon = annual_coupon
        total = coupon + principal
        discounted = total / math.pow(1 + ytm, year)
        market_price += discounted
        cashflows.append(
            {
                "year": year,
                "coupon": coupon,
                "principal": principal,
                "total": total,
                "discounted": discounted,
            }
        )

    if market_price <= 0:
        macaulay_duration = 0.0
        duration = 0.0
        convexity = 0.0
    else:
        macaulay_duration = (
            sum(cf["year"] * cf["discounted"] for cf in cashflows) / market_price
        )
        duration = macaulay_duration / (1 + ytm)
        convexity = (
            sum(cf["year"] * (cf["year"] + 1) * cf["discounted"] for cf in cashflows)
            / (market_price * (1 + ytm) * (1 + ytm))
        )

    pv01 = duration * market_price * 0.0001
    dv01 = pv01
    cr01 = duration * market_price * 0.0001 if bond_type == "Corporate" else 0.0

    pd = (RATING_PD.get(rating, 0.001)) * 100.0
    lgd = (SECTOR_LGD.get(sector, 0.40)) * 100.0
    expected_loss = (pd / 100.0) * (lgd / 100.0) * market_price

    out = dict(bond)
    out["marketPrice"] = market_price
    out["macaulayDuration"] = macaulay_duration
    out["duration"] = duration
    out["convexity"] = convexity
    out["pv01"] = pv01
    out["dv01"] = dv01
    out["cr01"] = cr01
    out["pd"] = pd
    out["lgd"] = lgd
    out["expectedLoss"] = expected_loss
    out["cashflows"] = cashflows
    return out


def main():
    raw = sys.stdin.read()
    payload = json.loads(raw if raw else "{}")
    bonds = payload.get("bonds", [])
    result = {"bonds": [calculate_metrics(b) for b in bonds]}
    sys.stdout.write(json.dumps(result))


if __name__ == "__main__":
    main()
