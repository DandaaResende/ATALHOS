import json
import os

from google import genai
from google.genai import types

from .prompts import INSTRUCOES_AGENTE


def _montar_conteudos(mensagem, historico=None):
    """
    Prepara a estrutura de conteúdos enviada ao Gemini.
    Se não houver histórico, retorna a mensagem textual diretamente.
    Se houver histórico, valida sua estrutura e monta uma lista de objetos
    types.Content respeitando os papéis 'user' e 'model', posicionando
    a mensagem atual como o último turno da conversa.
    """
    if historico is None:
        return mensagem

    if not isinstance(historico, (list, tuple)):
        raise ValueError("O histórico deve ser uma lista ou tupla.")

    if len(historico) == 0:
        return mensagem

    mapa_papeis = {
        "usuario": "user",
        "user": "user",
        "assistente": "model",
        "assistant": "model",
        "model": "model",
    }

    conteudos = []

    for item in historico:
        if isinstance(item, types.Content):
            if item.role not in ("user", "model"):
                raise ValueError(f"Papel desconhecido no histórico: '{item.role}'.")
            conteudos.append(item)
            continue

        if not isinstance(item, dict):
            raise ValueError(
                f"Item inválido no histórico: {item}. Esperado um dicionário ou types.Content."
            )

        if "parts" in item and "role" in item:
            papel_sdk = mapa_papeis.get(str(item["role"]).lower())
            if not papel_sdk:
                raise ValueError(f"Papel desconhecido no histórico: '{item['role']}'.")
            dict_item = dict(item)
            dict_item["role"] = papel_sdk
            conteudos.append(types.Content.model_validate(dict_item))
            continue

        papel_informado = item.get("papel") or item.get("role")
        if not papel_informado:
            raise ValueError(
                "Papel não informado no item do histórico. Esperado 'papel' ou 'role'."
            )

        papel_sdk = mapa_papeis.get(str(papel_informado).lower())
        if not papel_sdk:
            raise ValueError(f"Papel desconhecido no histórico: '{papel_informado}'.")

        if not any(k in item for k in ("texto", "conteudo", "content")):
            raise ValueError(
                "Item do histórico inválido: nenhum texto ou conteúdo fornecido."
            )

        texto = (
            item.get("texto")
            if item.get("texto") is not None
            else item.get("conteudo")
            if item.get("conteudo") is not None
            else item.get("content")
            if item.get("content") is not None
            else ""
        )

        conteudos.append(
            types.Content(
                role=papel_sdk,
                parts=[types.Part.from_text(text=str(texto))],
            )
        )

    conteudos.append(
        types.Content(
            role="user",
            parts=[types.Part.from_text(text=str(mensagem))],
        )
    )

    return conteudos


def interpretar_mensagem(mensagem, historico=None):
    """
    Envia a mensagem do usuário (e o histórico de mensagens, se houver) ao Gemini
    e retorna os dados interpretados em formato Python.
    """

    api_key = os.getenv("GEMINI_API_KEY")

    if not api_key:
        raise ValueError("GEMINI_API_KEY não foi encontrada.")

    conteudos = _montar_conteudos(mensagem, historico)

    cliente = genai.Client(api_key=api_key)

    resposta = cliente.models.generate_content(
        model="gemini-3.5-flash",
        contents=conteudos,
        config=types.GenerateContentConfig(
            system_instruction=INSTRUCOES_AGENTE,
            response_mime_type="application/json",
        ),
    )

    return json.loads(resposta.text)
