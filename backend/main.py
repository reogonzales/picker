from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from routers import watchlist, analysis, import_

load_dotenv()

app = FastAPI(title="Picker")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(watchlist.router)
app.include_router(analysis.router)
app.include_router(import_.router)
