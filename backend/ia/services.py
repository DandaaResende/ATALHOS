
import json
import os

from google import genai
from google.genai import types

from .prompts import INSTRUCOES_AGENTE


def interpretar_mensagem(mensagem):
    """
    Envia a mensagem do usuário ao Gemini
    e retorna os dados interpretados em formato Python.
    """

    api_key = os.getenv("GEMINI_API_KEY")

    if not api_key:
        raise ValueError("GEMINI_API_KEY não foi encontrada.")

    cliente = genai.Client(api_key=api_key)

    resposta = cliente.models.generate_content(
        model="gemini-3.5-flash",
        contents=mensagem,
        config=types.GenerateContentConfig(
            system_instruction=INSTRUCOES_AGENTE,
            response_mime_type="application/json",
        ),
    )

    return json.loads(resposta.text)
