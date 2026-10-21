"""Machine-readable error definitions and exceptions for measurement-service."""

from enum import Enum
from fastapi import HTTPException


class ErrorCode(str, Enum):
    NO_PERSON = "NO_PERSON"
    MULTIPLE_PEOPLE = "MULTIPLE_PEOPLE"
    BODY_NOT_FULLY_VISIBLE = "BODY_NOT_FULLY_VISIBLE"
    IMAGE_TOO_SMALL = "IMAGE_TOO_SMALL"
    SCALE_IMPLAUSIBLE = "SCALE_IMPLAUSIBLE"
    INVALID_IMAGE = "INVALID_IMAGE"
    MODEL_NOT_READY = "MODEL_NOT_READY"
    INFERENCE_TIMEOUT = "INFERENCE_TIMEOUT"


class MeasurementServiceException(HTTPException):
    def __init__(self, code: ErrorCode, detail: str, status_code: int = 422):
        super().__init__(
            status_code=status_code,
            detail={
                "code": code.value,
                "message": detail,
            },
        )
        self.code = code
