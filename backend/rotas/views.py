from datetime import datetime

import requests
from django.http import JsonResponse
from django.shortcuts import render
from django.utils import timezone
from django.views.decorators.http import require_GET

from .services import buscar_coordenadas
from .gtfs import (
    ErroGTFS,
    buscar_itinerario,
    buscar_todas_paradas,
    buscar_viagens,
)


def _obter_coordenadas(request, prefixo):
    """
    Obtém as coordenadas de um ponto.

    Aceita latitude/longitude diretamente ou um endereço para geocodificar.
    Exemplos:
      origem=Marco Zero
      origem_latitude=-8.063&origem_longitude=-34.871
    """
    latitude = request.GET.get(f"{prefixo}_latitude")
    longitude = request.GET.get(f"{prefixo}_longitude")
    endereco = request.GET.get(prefixo, "").strip()

    if latitude not in (None, "") or longitude not in (None, ""):
        if latitude in (None, "") or longitude in (None, ""):
            raise ValueError(
                f"Informe latitude e longitude de {prefixo}."
            )

        try:
            latitude = float(latitude)
            longitude = float(longitude)
        except (TypeError, ValueError):
            raise ValueError(
                f"As coordenadas de {prefixo} precisam ser numéricas."
            )

        if not -90 <= latitude <= 90 or not -180 <= longitude <= 180:
            raise ValueError(
                f"As coordenadas de {prefixo} estão fora do intervalo válido."
            )

        return {
            "latitude": latitude,
            "longitude": longitude,
            "nome_completo": endereco or prefixo.capitalize(),
        }

    if not endereco:
        raise ValueError(
            f"Informe o endereço ou as coordenadas de {prefixo}."
        )

    resultado = buscar_coordenadas(endereco)

    if "erro" in resultado:
        raise ValueError(
            f"Não foi possível localizar {prefixo}: {resultado['erro']}."
        )

    return {
        **resultado,
        "latitude": float(resultado["latitude"]),
        "longitude": float(resultado["longitude"]),
    }


def _normalizar_horario(horario):
    """Aceita HH:MM ou HH:MM:SS."""
    if not horario:
        return timezone.localtime().strftime("%H:%M:%S")

    try:
        if len(horario.split(":")) == 2:
            horario = f"{horario}:00"

        datetime.strptime(horario, "%H:%M:%S")
        return horario
    except ValueError:
        raise ValueError(
            "Horário inválido. Informe no formato HH:MM ou HH:MM:SS."
        )


@require_GET
def api_buscar_rota(request):
    """
    Busca opções de transporte público entre origem e destino.

    Pode receber nomes de lugares ou coordenadas.
    Parâmetros opcionais:
      data=AAAA-MM-DD
      horario=HH:MM ou HH:MM:SS
      limite=5
      raio_paradas=1000
    """
    try:
        origem_info = _obter_coordenadas(request, "origem")
        destino_info = _obter_coordenadas(request, "destino")

        data_viagem = request.GET.get("data")
        if data_viagem:
            datetime.strptime(data_viagem, "%Y-%m-%d")
        else:
            data_viagem = timezone.localdate().isoformat()

        horario_minimo = _normalizar_horario(
            request.GET.get("horario", "")
        )

        limite = int(request.GET.get("limite", 5))
        if not 1 <= limite <= 10:
            raise ValueError("O limite deve estar entre 1 e 10.")

        raio_paradas = int(request.GET.get("raio_paradas", 1000))
        if not 100 <= raio_paradas <= 5000:
            raise ValueError(
                "O raio das paradas deve estar entre 100 e 5000 metros."
            )

        opcoes = buscar_viagens(
            latitude_origem=origem_info["latitude"],
            longitude_origem=origem_info["longitude"],
            latitude_destino=destino_info["latitude"],
            longitude_destino=destino_info["longitude"],
            data_viagem=data_viagem,
            horario_minimo=horario_minimo,
            limite=limite,
            raio_paradas=raio_paradas,
            permitir_integracao=True,
        )

        return JsonResponse({
            "origem_info": origem_info,
            "destino_info": destino_info,
            "data_viagem": data_viagem,
            "horario_consulta": horario_minimo,
            "quantidade_opcoes": len(opcoes),
            "opcoes_de_rotas": opcoes,
        })

    except ValueError as erro:
        return JsonResponse({"erro": str(erro)}, status=400)

    except requests.RequestException:
        return JsonResponse(
            {"erro": "Não foi possível consultar o serviço de localização."},
            status=502,
        )

    except ErroGTFS as erro:
        return JsonResponse(
            {"erro": str(erro)},
            status=503,
        )


@require_GET
def api_itinerario(request, codigo):
    itinerario = buscar_itinerario(codigo)

    if itinerario is None:
        return JsonResponse(
            {"erro": "Linha ou itinerário não encontrado."},
            status=404,
        )

    return JsonResponse(itinerario)


def pagina_mapa(request):
    return render(request, "mapa.html")


@require_GET
def api_todas_paradas(request):
    try:
        paradas = buscar_todas_paradas()
        return JsonResponse({"paradas": paradas})
    except ErroGTFS as erro:
        return JsonResponse({"erro": str(erro)}, status=503)
