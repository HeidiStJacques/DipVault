import os
from datetime import timedelta

from dotenv import load_dotenv

load_dotenv()

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
JWT_ALGORITHM = "HS256"
JWT_ACCESS_TOKEN_EXPIRE_MINUTES = 60  # 1 hour

ACCESS_TOKEN_EXPIRE_DELTA = timedelta(
    minutes=JWT_ACCESS_TOKEN_EXPIRE_MINUTES
)