from typing import Literal

from pydantic import BaseModel


class FraudReviewRequest(
    BaseModel
):
    label: Literal[
        "CONFIRMED_FRAUD",
        "LEGIT",
        "FALSE_POSITIVE",
        "UNCERTAIN",
    ]