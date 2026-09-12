import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.config import get_settings
from app.db.supabase import get_supabase

DEMO_USERS = [
    {"email": "applicant@demo.com", "password": "demo-pass-123", "full_name": "Demo Applicant", "role": "applicant"},
    {"email": "reviewer@demo.com", "password": "demo-pass-123", "full_name": "Demo Reviewer", "role": "reviewer"},
    {"email": "admin@demo.com", "password": "demo-pass-123", "full_name": "Demo Admin", "role": "admin"},
]


def seed() -> None:
    settings = get_settings()
    supabase = get_supabase()
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
        print("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env first.")
        sys.exit(1)

    for demo in DEMO_USERS:
        try:
            existing = (
                supabase.table("profiles")
                .select("id")
                .eq("email", demo["email"])
                .maybe_single()
                .execute()
            )
            if existing:
                user_id = existing.data["id"]
                print(f"{demo['email']} already exists (id={user_id})")
            else:
                created = supabase.auth.admin.create_user(
                    {
                        "email": demo["email"],
                        "password": demo["password"],
                        "email_confirm": True,
                        "user_metadata": {"full_name": demo["full_name"]},
                    }
                )
                user_id = created.user.id
                print(f"Created {demo['email']} (id={user_id})")

            supabase.table("profiles").update({"role": demo["role"]}).eq("id", user_id).execute()
            print(f"  -> role set to {demo['role']} | password: {demo['password']}")
        except Exception as exc:
            print(f"Failed {demo['email']}: {type(exc).__name__}: {exc}")

    print("\nDone. Log in with these credentials at POST /api/v1/auth/login")


if __name__ == "__main__":
    seed()