from sqlalchemy import create_engine, event
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import settings

engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {}
)

if "sqlite" in settings.DATABASE_URL:
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def init_db_schema():
    Base.metadata.create_all(bind=engine)
    # Ensure backward compatible schema migrations on SQLite
    if "sqlite" in settings.DATABASE_URL:
        with engine.connect() as conn:
            # Check verified_loans columns
            res = conn.exec_driver_sql("PRAGMA table_info(verified_loans)")
            cols = {row[1] for row in res.fetchall()}
            if cols and "validation_snapshot" not in cols:
                conn.exec_driver_sql("ALTER TABLE verified_loans ADD COLUMN validation_snapshot JSON")
            if cols and "ai_recommendation" not in cols:
                conn.exec_driver_sql("ALTER TABLE verified_loans ADD COLUMN ai_recommendation JSON")
            conn.commit()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
