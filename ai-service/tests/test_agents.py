from app.agents import appointment_agent, queue_agent, report_agent


def test_appointment_slot_message():
    msg = appointment_agent.available_slots_message(
        ['09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM'],
        doctor_name='Dr. Kumar',
        date='2026-08-10',
        max_preview=5,
    )
    assert 'Dr. Kumar' in msg
    assert '11:30 AM' in msg  # shown via the "more slots" line
    assert 'Available slots' in msg


def test_appointment_no_slots_message():
    msg = appointment_agent.available_slots_message([])
    assert 'no available slots' in msg


def test_appointment_confirmation_message():
    msg = appointment_agent.confirmation_message('Dr. Kumar', '2026-08-10', '09:00 AM')
    assert 'Dr. Kumar' in msg
    assert '2026-08-10' in msg
    assert '09:00 AM' in msg


def test_queue_estimate_wait():
    est = queue_agent.estimate_wait(position=3, avg_minutes=15)
    assert est['position'] == 3
    assert est['estimated_minutes'] == 30
    assert '30' in est['message']
    assert queue_agent.estimate_wait(position=0, avg_minutes=15)['estimated_minutes'] == 0


def test_queue_status_messages():
    assert 'calling' in queue_agent.status_message('called').lower()
    assert queue_agent.status_message('completed')
    assert queue_agent.status_message('unknown_status')  # never raises


def test_report_parser_extracts_sections():
    text = (
        'Symptoms: Cough\n'
        'Clinical Observations: Mild wheezing\n'
        'Diagnosis: Asthma\n'
        'Treatment: Inhaler\n'
        'Follow-up: 2 weeks\n'
    )
    result = report_agent.summarize_report(text, diagnosis='Asthma')
    summary = result['ai_summary']
    assert summary['main_complaint'] == 'Cough'
    assert summary['findings'] == 'Mild wheezing'
    assert summary['diagnosis'] == 'Asthma'
    assert summary['treatment'] == 'Inhaler'
    assert summary['follow_up'] == '2 weeks'