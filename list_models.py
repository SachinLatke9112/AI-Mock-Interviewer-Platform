import os
from groq import Groq
from app.config import GROQ_API_KEY

def list_models():
    client = Groq(api_key=GROQ_API_KEY)
    models = client.models.list()
    for m in models.data:
        print(m.id)

if __name__ == "__main__":
    list_models()
