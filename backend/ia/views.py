# Create your views here.

from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from .services import interpretar_mensagem


@api_view(["POST"])
def consultar_agente(request):
    mensagem = request.data.get("mensagem")

    if not isinstance(mensagem, str) or not mensagem.strip():
        return Response(
            {"erro": "Envie uma mensagem válida."},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        resultado = interpretar_mensagem(mensagem.strip())

        return Response(resultado, status=status.HTTP_200_OK)

    except Exception:
        return Response(
            {"erro": "Não foi possível consultar o assistente. Tente novamente."},
            status=status.HTTP_502_BAD_GATEWAY
        )
