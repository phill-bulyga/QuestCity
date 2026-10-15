from app.models.quest import TaskType
from scripts.seed_taganrog import DEMO_QUESTIONS


def test_all_demo_questions_use_answer_choices() -> None:
    assert len(DEMO_QUESTIONS) == 4
    for question in DEMO_QUESTIONS.values():
        assert question["task_type"] == TaskType.SINGLE_CHOICE
        assert len(question["answer_options"]) >= 2
        assert question["correct_answer"] in question["answer_options"]
