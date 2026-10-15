from math import asin, cos, radians, sin, sqrt


def normalize_answer(value: str) -> str:
    return " ".join(value.strip().casefold().replace("ё", "е").split())


def answers_match(actual: str, expected: str) -> bool:
    return normalize_answer(actual) == normalize_answer(expected)


def distance_meters(
    latitude_a: float,
    longitude_a: float,
    latitude_b: float,
    longitude_b: float,
) -> float:
    """Return the great-circle distance between two WGS84 points."""
    earth_radius_m = 6_371_000
    lat_a = radians(latitude_a)
    lat_b = radians(latitude_b)
    delta_lat = lat_b - lat_a
    delta_lon = radians(longitude_b - longitude_a)
    haversine = sin(delta_lat / 2) ** 2 + cos(lat_a) * cos(lat_b) * sin(delta_lon / 2) ** 2
    return 2 * earth_radius_m * asin(sqrt(haversine))
