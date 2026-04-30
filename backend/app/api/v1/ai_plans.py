from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.v1.auth import get_current_user
from app.db.session import get_db
from app.models.auth_user import AuthUser
from app.repositories.ai_plan_repository import AIPlanRepository
from app.schemas.ai_plan import AIPlanGenerateRequest, AIPlanRead
from app.services.ai_plan_service import AIPlanNotFoundError, AIPlanService

router = APIRouter(tags=["ai-plans"])


def get_ai_plan_service(db: Session = Depends(get_db)) -> AIPlanService:
    return AIPlanService(AIPlanRepository(db))


@router.post("/generate", response_model=AIPlanRead, status_code=status.HTTP_201_CREATED)
def generate_plan(
    request: AIPlanGenerateRequest,
    current_user: AuthUser = Depends(get_current_user),
    service: AIPlanService = Depends(get_ai_plan_service),
) -> AIPlanRead:
    return service.generate_and_save(current_user.id, request)


@router.get("", response_model=list[AIPlanRead])
def list_plans(
    current_user: AuthUser = Depends(get_current_user),
    service: AIPlanService = Depends(get_ai_plan_service),
) -> list[AIPlanRead]:
    return service.list_for_user(current_user.id)


@router.get("/{plan_id}", response_model=AIPlanRead)
def get_plan(
    plan_id: int,
    current_user: AuthUser = Depends(get_current_user),
    service: AIPlanService = Depends(get_ai_plan_service),
) -> AIPlanRead:
    try:
        return service.get_for_user(plan_id, current_user.id)
    except AIPlanNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found")


@router.delete("/{plan_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_plan(
    plan_id: int,
    current_user: AuthUser = Depends(get_current_user),
    service: AIPlanService = Depends(get_ai_plan_service),
) -> None:
    try:
        service.delete_for_user(plan_id, current_user.id)
    except AIPlanNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found")
