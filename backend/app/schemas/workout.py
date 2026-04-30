from pydantic import BaseModel


class WorkoutRead(BaseModel):
    workout_type: str
    display_name: str
