from app.game.rules import answers_match, distance_meters, normalize_answer


def test_answer_normalization_handles_case_spaces_and_yo() -> None:
    assert normalize_answer("  ЖЁЛТЫЙ   ДОМ ") == "желтый дом"
    assert answers_match("Змея", "  змея ")


def test_distance_is_zero_for_same_point() -> None:
    assert distance_meters(59.9362, 30.3021, 59.9362, 30.3021) == 0


def test_distance_is_reasonable_for_nearby_points() -> None:
    distance = distance_meters(59.9362, 30.3021, 59.9372, 30.3021)
    assert 105 < distance < 115
