"""AI-based slot recommendation engine — ranks available slots by urgency match and wait time."""
from __future__ import annotations

from typing import Optional

from .types import SlotInfo, SlotRecommendation

URGENCY_RANK = {'red': 4, 'orange': 3, 'yellow': 2, 'green': 1}


def _specialty_match_score(slot_specialty: str, recommended_specialties: list[dict]) -> int:
    slot_lower = slot_specialty.lower()
    for spec in recommended_specialties:
        spec_name = spec.get('name', '').lower()
        if slot_lower in spec_name or spec_name in slot_lower:
            return spec.get('score', 50)
    return 0


def recommend_slots(
    available_slots: list[dict],
    urgency: str = 'green',
    recommended_specialties: Optional[list[dict]] = None,
) -> list[dict]:
    if not available_slots:
        return []

    urgency_base = URGENCY_RANK.get(urgency, 1)
    recommendations: list[dict] = []

    for raw in available_slots:
        slot = SlotInfo(
            doctor_id=raw.get('doctor_id', ''),
            doctor_name=raw.get('doctor_name', ''),
            specialization=raw.get('specialization', ''),
            date=raw.get('date', ''),
            time=raw.get('time', ''),
            consultation_fee=float(raw.get('consultation_fee', 0)),
            rating=float(raw.get('rating', 0)),
            estimated_wait_minutes=int(raw.get('estimated_wait_minutes', 0)),
        )

        score = 0
        reasons: list[str] = []

        spec_score = _specialty_match_score(slot.specialization, recommended_specialties or [])
        score += spec_score
        if spec_score > 0:
            reasons.append(f'Doctor specialization ({slot.specialization}) matches your needs')

        urgency_bonus = urgency_base * 15
        score += urgency_bonus

        if slot.rating >= 4.5:
            score += 20
            reasons.append('Highly rated doctor')
        elif slot.rating >= 4.0:
            score += 10

        if slot.estimated_wait_minutes <= 15:
            score += 15
            reasons.append('Short estimated wait time')
        elif slot.estimated_wait_minutes <= 30:
            score += 10
        else:
            score -= 5

        fee_bonus = max(0, 10 - int(slot.consultation_fee / 100))
        score += fee_bonus

        if urgency == 'red' or urgency == 'orange':
            score += 25
            reasons.append('Prioritized for urgent cases')

        rec = SlotRecommendation(
            slot=slot,
            score=score,
            reason='. '.join(reasons) if reasons else 'Available appointment',
        )

        recommendations.append({
            'doctor_id': rec.slot.doctor_id,
            'doctor_name': rec.slot.doctor_name,
            'specialization': rec.slot.specialization,
            'date': rec.slot.date,
            'time': rec.slot.time,
            'consultation_fee': rec.slot.consultation_fee,
            'rating': rec.slot.rating,
            'estimated_wait_minutes': rec.slot.estimated_wait_minutes,
            'score': rec.score,
            'reason': rec.reason,
        })

    recommendations.sort(key=lambda r: r['score'], reverse=True)
    return recommendations[:5]
