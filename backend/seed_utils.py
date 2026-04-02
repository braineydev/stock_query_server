import datetime
import random
from datetime import timedelta


def generate_seed_data(seed=None):
    """
    Generates initial seed data for 3 stocks (AAPL, MSFT, TSLA) across 2025.
    Returns a list of records suitable for insertion into Supabase.

    If seed is provided, generation is deterministic across cold starts.
    """
    rng = random.Random(seed) if seed not in {None, ""} else random.Random()

    stocks = ["AAPL", "MSFT", "TSLA"]
    starting_prices = {
        "AAPL": 185.0,
        "MSFT": 380.0,
        "TSLA": 245.0,
    }

    start_date = datetime.datetime(2025, 1, 1)
    end_date = datetime.datetime(2025, 12, 31)
    days_to_simulate = (end_date - start_date).days + 1

    seed_records = []

    for stock_id in stocks:
        current_price = starting_prices[stock_id]

        for day_offset in range(days_to_simulate):
            current_date = start_date + timedelta(days=day_offset)

            if current_date.weekday() >= 5:
                continue

            date_str = current_date.strftime("%Y-%m-%d")
            volatility = rng.uniform(-0.025, 0.025)

            open_price = current_price
            close_price = current_price * (1 + volatility)
            high_price = max(open_price, close_price) * (1 + rng.uniform(0, 0.015))
            low_price = min(open_price, close_price) * (1 - rng.uniform(0, 0.015))
            volume = int(rng.uniform(50000000, 150000000))

            record = {
                "stock_id": stock_id,
                "date": date_str,
                "open_price": round(open_price, 2),
                "close_price": round(close_price, 2),
                "high_price": round(high_price, 2),
                "low_price": round(low_price, 2),
                "volume": volume,
            }

            seed_records.append(record)
            current_price = close_price

    return seed_records
