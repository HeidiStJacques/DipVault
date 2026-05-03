import os
import boto3

from dotenv import load_dotenv
from fastapi import FastAPI

from database import engine, Base
from auth import router as auth_router
from vaults import router as vaults_router

load_dotenv()

app = FastAPI()

app.include_router(auth_router)
app.include_router(vaults_router)

Base.metadata.create_all(bind=engine)

R2_ACCESS_KEY = os.getenv("R2_ACCESS_KEY")
R2_SECRET_KEY = os.getenv("R2_SECRET_KEY")
R2_ENDPOINT = os.getenv("R2_ENDPOINT")
PUBLIC_BASE_URL = os.getenv("PUBLIC_BASE_URL")
BUCKET_NAME = os.getenv("BUCKET_NAME")

s3 = boto3.client(
    "s3",
    endpoint_url=R2_ENDPOINT,
    aws_access_key_id=R2_ACCESS_KEY,
    aws_secret_access_key=R2_SECRET_KEY,
)