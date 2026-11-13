
import requests


def buscar_coordenadas(endereco):
    """
    Converte um endereço ou nome de local em coordenadas geográficas
    usando o serviço Nominatim.
    """

    url = "https://nominatim.openstreetmap.org/search"

    parametros = {
        "q": endereco,
        "format": "json",
        "limit": 1,
        "countrycodes": "br"
    }

    headers = {
        "User-Agent": "AtalhosMobilidade/1.0"
    }

    try:
        resposta = requests.get(
            url,
            params=parametros,
            headers=headers,
            timeout=10
        )

        resposta.raise_for_status()
        dados = resposta.json()

        if dados:
            return {
                "latitude": float(dados[0]["lat"]),
                "longitude": float(dados[0]["lon"]),
                "nome_completo": dados[0]["display_name"]
            }

        return {"erro": "Endereço não encontrado."}

    except requests.RequestException:
        return {"erro": "Não foi possível consultar o serviço de localização."}

    except (ValueError, KeyError, IndexError):
        return {"erro": "Não foi possível interpretar a localização encontrada."}
