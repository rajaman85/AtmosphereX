import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from app.core.database import SessionLocal
from app.services.alert_service import evaluate_all_alerts

logger = logging.getLogger(__name__)
scheduler = AsyncIOScheduler()


async def _run_alert_evaluation():
    db = SessionLocal()
    try:
        await evaluate_all_alerts(db)
    except Exception as e:
        logger.error(f"Alert evaluation job failed: {e}")
    finally:
        db.close()


def start_alert_worker():
    scheduler.add_job(
        _run_alert_evaluation,
        "interval",
        minutes=5,
        id="alert_evaluation",
        replace_existing=True,
    )
    scheduler.start()
    logger.info("Alert worker started — evaluates every 5 minutes")


def stop_alert_worker():
    if scheduler.running:
        scheduler.shutdown(wait=False)
    logger.info("Alert worker stopped")
