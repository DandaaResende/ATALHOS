# Create your views here.

from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from .rotas_service import (
    consultar_linha as consultar_linha_rota,
    consultar_viagens,
)
from .serializers import RespostaAgenteSerializer
from .services import interpretar_mensagem


PAPEIS_PERMITIDOS = {"usuario", "user", "assistente", "assistant"}


def _validar_historico(historico):
    """
    Valida a lista de histórico de mensagens.
    Retorna (historico_validado, erro).
    Se válido, erro é None.
    Se inválido, retorna (None, mensagem_de_erro).
    """
    if historico is None:
        return None, None

    if not isinstance(historico, list):
        return None, "O histórico deve ser uma lista."

    if len(historico) == 0:
        return None, None

    historico_validado = []

    for item in historico:
        if not isinstance(item, dict):
            return None, "Cada item do histórico deve ser um objeto."

        papel = item.get("papel") or item.get("role")
        if not isinstance(papel, str) or not papel.strip():
            return None, "Cada item do histórico deve conter o campo 'papel' ou 'role'."

        papel_normalizado = papel.strip().lower()
        if papel_normalizado not in PAPEIS_PERMITIDOS:
            return None, f"Papel '{papel}' não é permitido no histórico."

        texto = (
            item.get("texto")
            if item.get("texto") is not None
            else item.get("content")
            if item.get("content") is not None
            else item.get("conteudo")
        )

        if not isinstance(texto, str) or not texto.strip():
            return None, "Cada item do histórico deve conter um texto válido e não vazio."

        historico_validado.append({
            "papel": papel_normalizado,
            "texto": texto.strip()
        })

    return historico_validado, None


@api_view(["POST"])
def consultar_agente(request):
    mensagem = request.data.get("mensagem")

    if not isinstance(mensagem, str) or not mensagem.strip():
        return Response(
            {"erro": "Envie uma mensagem válida."},
            status=status.HTTP_400_BAD_REQUEST
        )

    historico = request.data.get("historico")
    historico_validado, erro_historico = _validar_historico(historico)

    if erro_historico:
        return Response(
            {"erro": erro_historico},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        if historico_validado is not None:
            resultado = interpretar_mensagem(mensagem.strip(), historico=historico_validado)
        else:
            resultado = interpretar_mensagem(mensagem.strip())

        serializer = RespostaAgenteSerializer(data=resultado)
        if not serializer.is_valid():
            return Response(
                {"erro": "Não foi possível consultar o assistente. Tente novamente."},
                status=status.HTTP_502_BAD_GATEWAY
            )

        dados_agente = dict(serializer.validated_data)
        resultado_consulta = None
        intencao = dados_agente["intencao"]

        if intencao == "buscar_rota":
            origem = dados_agente.get("origem")
            destino = dados_agente.get("destino")
            informacoes_faltantes = dados_agente.get(
                "informacoes_faltantes",
                [],
            )

            if (
                origem
                and destino
                and "origem" not in informacoes_faltantes
                and "destino" not in informacoes_faltantes
            ):
                resultado_consulta = consultar_viagens(
                    origem=origem,
                    destino=destino,
                    data=dados_agente.get("data"),
                    horario=dados_agente.get("horario"),
                    preferencias=dados_agente.get("preferencias"),
                )

        elif intencao == "consultar_linha":
            codigo_linha = dados_agente.get("preferencias", {}).get("linha")
            if codigo_linha:
                resultado_consulta = consultar_linha_rota(codigo_linha)

        dados_agente["resultado"] = resultado_consulta
        return Response(dados_agente, status=status.HTTP_200_OK)

    except Exception:
        return Response(
            {"erro": "Não foi possível consultar o assistente. Tente novamente."},
            status=status.HTTP_502_BAD_GATEWAY
        )
