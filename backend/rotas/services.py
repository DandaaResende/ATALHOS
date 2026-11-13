
import requests

_CACHE_COORDENADAS = {}
_CACHE_SUGESTOES = {}

# Mapeamento de sinônimos, abreviações e pontos de interesse frequentes
# na Região Metropolitana do Recife para resolução precisa e instantânea:
LOCAIS_CONHECIDOS_RMR = {
    "centro": "Bairro do Recife, Recife, PE",
    "centro do recife": "Bairro do Recife, Recife, PE",
    "centro recife": "Bairro do Recife, Recife, PE",
    "marco zero": "Marco Zero, Bairro do Recife, Recife, PE",
    "praca do marco zero": "Marco Zero, Bairro do Recife, Recife, PE",
    "parada mais proxima do marco zero": "Marco Zero, Bairro do Recife, Recife, PE",
    "ufpe": "Universidade Federal de Pernambuco, Recife, PE",
    "campus da ufpe": "Universidade Federal de Pernambuco, Recife, PE",
    "universidade federal de pernambuco": "Universidade Federal de Pernambuco, Recife, PE",
    "ufrpe": "Universidade Federal Rural de Pernambuco, Recife, PE",
    "rural": "Universidade Federal Rural de Pernambuco, Recife, PE",
    "unicap": "Universidade Católica de Pernambuco, Recife, PE",
    "catolica": "Universidade Católica de Pernambuco, Recife, PE",
    "upe": "Universidade de Pernambuco, Santo Amaro, Recife, PE",
    "shopping recife": "Shopping Recife, Boa Viagem, Recife, PE",
    "shopping riomar": "RioMar Shopping, Pina, Recife, PE",
    "riomar": "RioMar Shopping, Pina, Recife, PE",
    "riomar recife": "RioMar Shopping, Pina, Recife, PE",
    "shopping tacaruna": "Shopping Tacaruna, Santo Amaro, Recife, PE",
    "tacaruna": "Shopping Tacaruna, Santo Amaro, Recife, PE",
    "shopping plaza": "Plaza Shopping, Casa Forte, Recife, PE",
    "plaza": "Plaza Shopping, Casa Forte, Recife, PE",
    "plaza shopping": "Plaza Shopping, Casa Forte, Recife, PE",
    "shopping boa vista": "Shopping Boa Vista, Boa Vista, Recife, PE",
    "shopping patteo": "Shopping Patteo Olinda, Bultrins, Olinda, PE",
    "patteo olinda": "Shopping Patteo Olinda, Bultrins, Olinda, PE",
    "derby": "Praça do Derby, Derby, Recife, PE",
    "praca do derby": "Praça do Derby, Derby, Recife, PE",
    "casa amarela": "Casa Amarela, Recife, PE",
    "boa vista": "Boa Vista, Recife, PE",
    "boa viagem": "Boa Viagem, Recife, PE",
    "cais de santa rita": "Terminal Integrado Cais de Santa Rita, Recife, PE",
    "terminal cais de santa rita": "Terminal Integrado Cais de Santa Rita, Recife, PE",
    "ti cais de santa rita": "Terminal Integrado Cais de Santa Rita, Recife, PE",
    "ti macaxeira": "Terminal Integrado da Macaxeira, Recife, PE",
    "terminal da macaxeira": "Terminal Integrado da Macaxeira, Recife, PE",
    "ti joana bezerra": "Terminal Integrado Joana Bezerra, Recife, PE",
    "joana bezerra": "Terminal Integrado Joana Bezerra, Recife, PE",
    "ti afogados": "Terminal Integrado de Afogados, Recife, PE",
    "ti aeroporto": "Terminal Integrado Aeroporto, Recife, PE",
    "ti tancredo neves": "Terminal Integrado Tancredo Neves, Recife, PE",
    "ti barro": "Terminal Integrado do Barro, Recife, PE",
    "ti pelopidas": "Terminal Integrado Pelópidas Silveira, Paulista, PE",
    "ti pelópidas": "Terminal Integrado Pelópidas Silveira, Paulista, PE",
    "ti pelopidas silveira": "Terminal Integrado Pelópidas Silveira, Paulista, PE",
    "ti pe-15": "Terminal Integrado PE-15, Olinda, PE",
    "ti camaragibe": "Terminal Integrado Camaragibe, Camaragibe, PE",
    "ti jaboatao": "Terminal Integrado Jaboatão, Jaboatão dos Guararapes, PE",
    "ti jaboatão": "Terminal Integrado Jaboatão, Jaboatão dos Guararapes, PE",
    "ti prazeres": "Terminal Integrado Prazeres, Jaboatão dos Guararapes, PE",
    "ti cajueiro seco": "Terminal Integrado Cajueiro Seco, Jaboatão dos Guararapes, PE",
    "ti tip": "Terminal Integrado TIP, Várzea, Recife, PE",
    "hospital da restauracao": "Hospital da Restauração, Derby, Recife, PE",
    "hospital da restauração": "Hospital da Restauração, Derby, Recife, PE",
    "hr": "Hospital da Restauração, Derby, Recife, PE",
    "imip": "IMIP, Coelhos, Recife, PE",
    "parque da jaqueira": "Parque da Jaqueira, Jaqueira, Recife, PE",
    "jaqueira": "Parque da Jaqueira, Jaqueira, Recife, PE",
    "rua da aurora": "Rua da Aurora, Boa Vista, Recife, PE",
    "conde da boa vista": "Avenida Conde da Boa Vista, Boa Vista, Recife, PE",
    "avenida conde da boa vista": "Avenida Conde da Boa Vista, Boa Vista, Recife, PE",
    "agamenon": "Avenida Governador Agamenon Magalhães, Recife, PE",
    "avenida agamenon magalhaes": "Avenida Governador Agamenon Magalhães, Recife, PE",
}


def buscar_coordenadas(endereco):
    """
    Converte um endereço ou nome de local em coordenadas geográficas
    usando o serviço Nominatim com priorização da Região Metropolitana do Recife
    e cache em memória.
    """
    if not endereco:
        return {"erro": "Informe um endereço válido."}

    chave = endereco.strip().lower()
    if chave in _CACHE_COORDENADAS:
        return _CACHE_COORDENADAS[chave]

    # Verifica se há mapeamento direto para o local na RMR
    termo_busca = LOCAIS_CONHECIDOS_RMR.get(chave, endereco.strip())

    url = "https://nominatim.openstreetmap.org/search"
    headers = {
        "User-Agent": "AtalhosMobilidade/1.0"
    }

    parametros = {
        "q": termo_busca,
        "format": "json",
        "limit": 1,
        "countrycodes": "br",
        # Bounding box aproximado da Região Metropolitana do Recife:
        "viewbox": "-35.25,-7.75,-34.75,-8.40",
        "bounded": 0,
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

        # Se não encontrou e o termo original não menciona Pernambuco/Recife,
        # tenta uma busca secundária qualificando com Recife, PE:
        if not dados and not any(r in chave for r in ("recife", "olinda", "pe", "pernambuco")):
            parametros_recife = dict(parametros)
            parametros_recife["q"] = f"{endereco.strip()}, Recife, PE"
            resp_recife = requests.get(
                url,
                params=parametros_recife,
                headers=headers,
                timeout=10
            )
            if resp_recife.ok:
                dados = resp_recife.json()

        # Fallback para paradas e terminais cadastrados no GTFS:
        if not dados:
            try:
                from .gtfs import _carregar_dados
                dados_gtfs = _carregar_dados()
                termo_limpo = chave.replace("terminal integrado", "").replace("terminal", "").replace("parada", "").replace("ti ", "").strip()
                if len(termo_limpo) >= 3:
                    for parada in dados_gtfs["paradas"].values():
                        if termo_limpo in parada["nome"].lower():
                            res = {
                                "latitude": float(parada["latitude"]),
                                "longitude": float(parada["longitude"]),
                                "nome_completo": f"{parada['nome']}, Transporte Público RMR"
                            }
                            _CACHE_COORDENADAS[chave] = res
                            return res
            except Exception:
                pass

        if dados:
            res = {
                "latitude": float(dados[0]["lat"]),
                "longitude": float(dados[0]["lon"]),
                "nome_completo": dados[0]["display_name"]
            }
            _CACHE_COORDENADAS[chave] = res
            return res

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

    chave_termo = termo.strip().lower()
    if chave_termo in _CACHE_SUGESTOES:
        return _CACHE_SUGESTOES[chave_termo]

    # Substitui por termo qualificado se houver alias direto
    termo_busca = LOCAIS_CONHECIDOS_RMR.get(chave_termo, termo.strip())

    url = "https://nominatim.openstreetmap.org/search"

    parametros = {
        "q": termo_busca,
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
            chave_local = (nome.lower(), round(float(item["lat"]), 4), round(float(item["lon"]), 4))
            if chave_local in locais_vistos:
                continue
            locais_vistos.add(chave_local)

            sugestoes.append({
                "id": item.get("osm_id", f"{item['lat']}_{item['lon']}"),
                "nome": nome,
                "descricao": descricao,
                "latitude": float(item["lat"]),
                "longitude": float(item["lon"]),
            })

        _CACHE_SUGESTOES[chave_termo] = sugestoes
        return sugestoes

    except (requests.RequestException, ValueError, KeyError):
        return []

