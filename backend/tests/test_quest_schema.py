from uuid import uuid4

from app.schemas.quest import CheckpointRead


def test_public_checkpoint_preview_does_not_expose_route_or_answer() -> None:
    checkpoint = CheckpointRead.model_validate(
        {
            "id": uuid4(),
            "position": 0,
            "title": "Секретная следующая точка",
            "task_prompt": "Секретный вопрос",
            "correct_answer": "Секретный ответ",
            "latitude": 47.0,
            "longitude": 38.0,
        }
    )

    assert set(checkpoint.model_dump()) == {"id", "position"}
