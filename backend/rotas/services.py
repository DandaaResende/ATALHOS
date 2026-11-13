
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


def buscar_sugestoes_locais(termo, limite=6):
    """
    Busca sugestões de locais a partir de um termo digitado pelo usuário
    utilizando a API Nominatim (OpenStreetMap).
    Prioriza a Região Metropolitana do Recife através de viewbox,
    retornando nome, descrição (bairro/endereço) e coordenadas.
    """
    if not termo or len(termo.strip()) < 2:
        return []

    url = "https://nominatim.openstreetmap.org/search"

    parametros = {
        "q": termo.strip(),
        "format": "json",
        "limit": limite,
        "countrycodes": "br",
        "addressdetails": 1,
        # Bounding box aproximado da Região Metropolitana do Recife para priorizar resultados locais:
        "viewbox": "-35.25,-7.75,-34.75,-8.40",
        "bounded": 0,
    }

    headers = {
        "User-Agent": "AtalhosMobilidade/1.0"
    }

    try:
        resposta = requests.get(
            url,
            params=parametros,
            headers=headers,
            timeout=8
        )
        resposta.raise_for_status()
        dados = resposta.json()

        sugestoes = []
        locais_vistos = set()

        for item in dados:
            nome = item.get("name")
            display_name = item.get("display_name", "")

            if not nome:
                nome = display_name.split(",")[0].strip()

            endereco_info = item.get("address", {})
            partes = []
            rua = endereco_info.get("road")
            bairro = (
                endereco_info.get("suburb")
                or endereco_info.get("neighbourhood")
                or endereco_info.get("city_district")
            )
            cidade = (
                endereco_info.get("city")
                or endereco_info.get("town")
                or endereco_info.get("municipality")
            )

            if rua and rua.lower() != nome.lower():
                partes.append(rua)
            if bairro:
                partes.append(bairro)
            if cidade:
                partes.append(cidade)

            descricao = ", ".join(partes) if partes else display_name

            # Evita duplicidades exatas de nome e coordenadas próximas
            chave = (nome.lower(), round(float(item["lat"]), 4), round(float(item["lon"]), 4))
            if chave in locais_vistos:
                continue
            locais_vistos.add(chave)

            sugestoes.append({
                "id": item.get("osm_id", f"{item['lat']}_{item['lon']}"),
                "nome": nome,
                "descricao": descricao,
                "latitude": float(item["lat"]),
                "longitude": float(item["lon"]),
            })

        return sugestoes

    except (requests.RequestException, ValueError, KeyError):
        return []

