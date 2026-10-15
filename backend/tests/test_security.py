from uuid import uuid4

import pytest

from app.core.security import (
    InvalidTokenError,
    create_token,
    decode_token,
    hash_password,
    verify_password,
)


def test_password_hash_round_trip() -> None:
    encoded = hash_password("correct horse battery staple")
    assert encoded != "correct horse battery staple"
    assert verify_password("correct horse battery staple", encoded)
    assert not verify_password("wrong password", encoded)


def test_access_token_round_trip() -> None:
    user_id = uuid4()
    token = create_token(user_id, "access")
    payload = decode_token(token, "access")
    assert payload["sub"] == str(user_id)


def test_token_type_is_enforced() -> None:
    token = create_token(uuid4(), "refresh")
    with pytest.raises(InvalidTokenError):
        decode_token(token, "access")
