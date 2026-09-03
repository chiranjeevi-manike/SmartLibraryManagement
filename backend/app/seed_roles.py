from app.database import SessionLocal
from app.models.role import Role


db = SessionLocal()

roles = [
    "ADMIN",
    "LIBRARIAN",
    "MEMBER"
]

for role_name in roles:
    existing_role = db.query(Role).filter(
        Role.name == role_name
    ).first()

    if not existing_role:
        db.add(Role(name=role_name))

db.commit()

print("Roles created successfully!")

db.close()