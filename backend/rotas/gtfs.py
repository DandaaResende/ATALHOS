import csv
import math
from collections import defaultdict
from datetime import date, datetime
from functools import lru_cache
from pathlib import Path


# Os arquivos GTFS continuam sendo a fonte dos dados de transporte.
PASTA_GTFS = Path(__file__).resolve().parent.parent / "dados" / "gtfs"

# Limites padrão do planejador.
RAIO_PARADA_METROS = 1000
QUANTIDADE_PARADAS_CANDIDATAS = 8
TEMPO_MINIMO_INTEGRACAO_MINUTOS = 5


class ErroGTFS(Exception):
    """Erro relacionado à leitura ou à estrutura dos arquivos GTFS."""


def _ler_csv(nome_arquivo, obrigatorio=True):
    """Lê um arquivo GTFS e devolve seus registros como dicionários."""
    caminho = PASTA_GTFS / nome_arquivo

    if not caminho.exists():
        if obrigatorio:
            raise ErroGTFS(
                f"Arquivo GTFS obrigatório não encontrado: {nome_arquivo}"
            )
        return []

    with caminho.open(encoding="utf-8-sig", newline="") as arquivo:
        return list(csv.DictReader(arquivo))


def _numero(valor, padrao=None):
    try:
        return float(valor)
    except (TypeError, ValueError):
        return padrao


def _inteiro(valor, padrao=0):
    try:
        return int(valor)
    except (TypeError, ValueError):
        return padrao


@lru_cache(maxsize=1)
def _carregar_dados():
    """
    Carrega e indexa os arquivos GTFS uma única vez.

    Para recarregar os dados após atualizar os arquivos GTFS, use
    limpar_cache_gtfs().
    """
    arquivos_obrigatorios = (
        "routes.txt",
        "trips.txt",
        "stops.txt",
        "stop_times.txt",
    )

    for nome in arquivos_obrigatorios:
        if not (PASTA_GTFS / nome).exists():
            raise ErroGTFS(
                f"Arquivo GTFS obrigatório não encontrado: "
                f"{PASTA_GTFS / nome}"
            )

    rotas = {
        registro["route_id"]: registro
        for registro in _ler_csv("routes.txt")
    }

    viagens = {
        registro["trip_id"]: registro
        for registro in _ler_csv("trips.txt")
    }

    paradas = {}
    for registro in _ler_csv("stops.txt"):
        latitude = _numero(registro.get("stop_lat"))
        longitude = _numero(registro.get("stop_lon"))

        if latitude is None or longitude is None:
            continue

        stop_id = registro["stop_id"]
        nome = registro.get("stop_name") or stop_id

        if nome == stop_id:
            nome = f"Parada {stop_id}"

        paradas[stop_id] = {
            "id": stop_id,
            "nome": nome,
            "latitude": latitude,
            "longitude": longitude,
        }

    horarios_por_viagem = defaultdict(list)
    viagens_por_parada = defaultdict(list)

    for registro in _ler_csv("stop_times.txt"):
        trip_id = registro.get("trip_id")
        stop_id = registro.get("stop_id")

        if trip_id not in viagens or stop_id not in paradas:
            continue

        registro["_sequencia"] = _inteiro(
            registro.get("stop_sequence")
        )
        registro["_chegada_minutos"] = converter_horario_minutos(
            registro.get("arrival_time", "")
        )
        registro["_saida_minutos"] = converter_horario_minutos(
            registro.get("departure_time", "")
        )

        horarios_por_viagem[trip_id].append(registro)
        viagens_por_parada[stop_id].append((trip_id, registro))

    for registros in horarios_por_viagem.values():
        registros.sort(key=lambda item: item["_sequencia"])

    shapes_por_id = defaultdict(list)
    for ponto in _ler_csv("shapes.txt", obrigatorio=False):
        latitude = _numero(ponto.get("shape_pt_lat"))
        longitude = _numero(ponto.get("shape_pt_lon"))

        if latitude is None or longitude is None:
            continue

        shapes_por_id[ponto.get("shape_id")].append({
            "ordem": _inteiro(ponto.get("shape_pt_sequence")),
            "latitude": latitude,
            "longitude": longitude,
        })

    for pontos in shapes_por_id.values():
        pontos.sort(key=lambda item: item["ordem"])

    calendario = {
        registro["service_id"]: registro
        for registro in _ler_csv("calendar.txt", obrigatorio=False)
    }

    excecoes_calendario = defaultdict(dict)
    for registro in _ler_csv(
        "calendar_dates.txt", obrigatorio=False
    ):
        excecoes_calendario[registro["service_id"]][
            registro["date"]
        ] = registro["exception_type"]

    return {
        "rotas": rotas,
        "viagens": viagens,
        "paradas": paradas,
        "horarios_por_viagem": horarios_por_viagem,
        "viagens_por_parada": viagens_por_parada,
        "shapes": shapes_por_id,
        "calendario": calendario,
        "excecoes_calendario": excecoes_calendario,
    }


def limpar_cache_gtfs():
    """Limpa os dados em memória para que os arquivos sejam relidos."""
    _carregar_dados.cache_clear()


def calcular_distancia(lat1, lon1, lat2, lon2):
    """Calcula a distância geográfica entre dois pontos, em metros."""
    raio_terra = 6_371_000

    lat1 = math.radians(float(lat1))
    lat2 = math.radians(float(lat2))
    diferenca_lat = lat2 - lat1
    diferenca_lon = math.radians(float(lon2) - float(lon1))

    a = (
        math.sin(diferenca_lat / 2) ** 2
        + math.cos(lat1)
        * math.cos(lat2)
        * math.sin(diferenca_lon / 2) ** 2
    )

    return raio_terra * 2 * math.atan2(
        math.sqrt(a),
        math.sqrt(1 - a)
    )


def converter_horario_minutos(horario):
    """
    Converte um horário GTFS para minutos.

    O padrão GTFS permite horários acima de 24:00:00, por exemplo,
    25:15:00, para viagens que continuam após a meia-noite.
    """
    if not horario:
        return None

    try:
        horas, minutos, segundos = map(int, horario.split(":"))
        return horas * 60 + minutos + segundos / 60
    except (TypeError, ValueError):
        return None


def _formatar_horario_minutos(minutos):
    """Converte minutos desde o início do dia para HH:MM:SS."""
    if minutos is None:
        return None

    total_segundos = round(float(minutos) * 60)
    horas, resto = divmod(total_segundos, 3600)
    minutos, segundos = divmod(resto, 60)

    return f"{horas:02d}:{minutos:02d}:{segundos:02d}"


def _normalizar_data(data_viagem):
    if isinstance(data_viagem, datetime):
        return data_viagem.date()

    if isinstance(data_viagem, date):
        return data_viagem

    if isinstance(data_viagem, str):
        return datetime.strptime(data_viagem, "%Y-%m-%d").date()

    raise ValueError("A data deve estar no formato YYYY-MM-DD.")


def servico_ativo(service_id, data_viagem):
    """Verifica se o serviço funciona na data, considerando exceções."""
    dados = _carregar_dados()
    data_objeto = _normalizar_data(data_viagem)
    data_formatada = data_objeto.strftime("%Y%m%d")

    excecao = dados["excecoes_calendario"].get(
        service_id, {}
    ).get(data_formatada)

    # No GTFS: 1 adiciona o serviço; 2 remove o serviço.
    if excecao == "1":
        return True
    if excecao == "2":
        return False

    calendario = dados["calendario"].get(service_id)

    if not calendario:
        return False

    inicio = datetime.strptime(
        calendario["start_date"], "%Y%m%d"
    ).date()
    fim = datetime.strptime(
        calendario["end_date"], "%Y%m%d"
    ).date()

    dia_semana = (
        "monday", "tuesday", "wednesday",
        "thursday", "friday", "saturday", "sunday"
    )[data_objeto.weekday()]

    return (
        inicio <= data_objeto <= fim
        and calendario.get(dia_semana) == "1"
    )


def buscar_linha(codigo):
    """Busca uma linha pelo route_short_name."""
    dados = _carregar_dados()

    for linha in dados["rotas"].values():
        if linha.get("route_short_name") == str(codigo):
            return linha

    return None


def buscar_todas_paradas():
    """Retorna todas as paradas válidas do GTFS."""
    return list(_carregar_dados()["paradas"].values())


def buscar_paradas_proximas(
    latitude,
    longitude,
    limite=QUANTIDADE_PARADAS_CANDIDATAS,
    raio_maximo=RAIO_PARADA_METROS,
):
    """Retorna paradas próximas, ordenadas pela distância em metros."""
    latitude = float(latitude)
    longitude = float(longitude)
    paradas = _carregar_dados()["paradas"]

    resultado = []

    for parada in paradas.values():
        distancia = calcular_distancia(
            latitude,
            longitude,
            parada["latitude"],
            parada["longitude"],
        )

        if raio_maximo is not None and distancia > raio_maximo:
            continue

        resultado.append({
            **parada,
            "distancia": round(distancia, 1),
        })

    resultado.sort(key=lambda item: item["distancia"])
    return resultado[:max(1, int(limite))]


def buscar_paradas(trip_id):
    """Mantém a função antiga, retornando as paradas de uma viagem."""
    dados = _carregar_dados()
    registros = dados["horarios_por_viagem"].get(trip_id, [])
    resultado = []

    for registro in registros:
        parada = dados["paradas"].get(registro["stop_id"])

        if not parada:
            continue

        resultado.append({
            **parada,
            "ordem": registro["_sequencia"],
            "horario_chegada": registro.get("arrival_time"),
            "horario_saida": registro.get("departure_time"),
        })

    return resultado


def buscar_itinerario(codigo, sentido="0"):
    """
    Retorna o itinerário de uma linha e sentido.

    Mantém a interface utilizada pelo endpoint existente.
    Seleciona uma viagem cadastrada para a linha e o sentido.
    """
    dados = _carregar_dados()
    linha = buscar_linha(codigo)

    if linha is None:
        return None

    for viagem in dados["viagens"].values():
        if (
            viagem.get("route_id") == linha["route_id"]
            and viagem.get("direction_id", "0") == str(sentido)
        ):
            trip_id = viagem["trip_id"]
            shape_id = viagem.get("shape_id")

            return {
                "linha": linha.get("route_short_name", ""),
                "nome": linha.get("route_long_name", ""),
                "sentido": str(sentido),
                "destino": viagem.get("trip_headsign", ""),
                "coordenadas": [
                    {
                        "latitude": ponto["latitude"],
                        "longitude": ponto["longitude"],
                    }
                    for ponto in dados["shapes"].get(shape_id, [])
                ],
                "paradas": buscar_paradas(trip_id),
            }

    return None


def _pode_embarcar(registro):
    # pickup_type 1 significa que não é permitido embarcar nesta parada.
    return registro.get("pickup_type", "0") != "1"


def _pode_desembarcar(registro):
    # drop_off_type 1 significa que não é permitido desembarcar nesta parada.
    return registro.get("drop_off_type", "0") != "1"


def _montar_trecho(
    trip_id,
    indice_embarque,
    indice_desembarque,
    distancia_origem,
    distancia_destino,
):
    """Monta os dados de um trecho de uma viagem de ônibus."""
    dados = _carregar_dados()
    viagem = dados["viagens"][trip_id]
    linha = dados["rotas"].get(viagem["route_id"], {})
    registros = dados["horarios_por_viagem"][trip_id]

    embarque = registros[indice_embarque]
    desembarque = registros[indice_desembarque]

    paradas_trecho = []

    for registro in registros[indice_embarque:indice_desembarque + 1]:
        parada = dados["paradas"].get(registro["stop_id"])

        if not parada:
            continue

        paradas_trecho.append({
            **parada,
            "ordem": registro["_sequencia"],
            "horario_chegada": registro.get("arrival_time"),
            "horario_saida": registro.get("departure_time"),
        })

    shape_id = viagem.get("shape_id")
    coordenadas = [
        {
            "latitude": ponto["latitude"],
            "longitude": ponto["longitude"],
        }
        for ponto in dados["shapes"].get(shape_id, [])
    ]

    return {
        "linha": linha.get("route_short_name", ""),
        "nome_linha": linha.get("route_long_name", ""),
        "sentido": viagem.get("trip_headsign", ""),
        "trip_id": trip_id,
        "horario_saida": embarque.get("departure_time"),
        "horario_chegada": desembarque.get("arrival_time"),
        "embarque": {
            **dados["paradas"][embarque["stop_id"]],
            "distancia_origem": round(distancia_origem, 1),
        },
        "desembarque": {
            **dados["paradas"][desembarque["stop_id"]],
            "distancia_destino": round(distancia_destino, 1),
        },
        "paradas": paradas_trecho,
        "coordenadas": coordenadas,
    }


def _mapa_distancias(paradas):
    # Paradas usadas como pontos internos de integração não possuem
    # distância de caminhada associada; nesse caso, a distância é zero.
    return {
        parada["id"]: parada.get("distancia", 0)
        for parada in paradas
    }


def _buscar_segmentos(
    paradas_embarque,
    paradas_desembarque,
    data_objeto,
    horario_minimo,
):
    """
    Encontra segmentos de viagens entre conjuntos de paradas.

    Cada segmento é uma viagem de ônibus entre uma parada de embarque
    e outra parada posterior da mesma viagem.
    """
    dados = _carregar_dados()
    distancias_embarque = _mapa_distancias(paradas_embarque)
    distancias_desembarque = _mapa_distancias(paradas_desembarque)

    ids_embarque = set(distancias_embarque)
    ids_desembarque = set(distancias_desembarque)

    segmentos = []
    data_objeto = _normalizar_data(data_objeto)

    # Em vez de percorrer todas as viagens do sistema, consulta o índice
    # GTFS para encontrar somente viagens que passam pelas paradas de embarque.
    viagens_candidatas = set()

    for stop_id in ids_embarque:
        for trip_id, _ in dados["viagens_por_parada"].get(stop_id, []):
            viagens_candidatas.add(trip_id)

    # Calcula os serviços ativos uma vez por busca, não uma vez por viagem.
    servicos_ativos = {
        viagem["service_id"]
        for trip_id, viagem in dados["viagens"].items()
        if trip_id in viagens_candidatas
        and servico_ativo(viagem["service_id"], data_objeto)
    }

    for trip_id in viagens_candidatas:
        viagem = dados["viagens"].get(trip_id)

        if not viagem or viagem.get("service_id") not in servicos_ativos:
            continue

        registros = dados["horarios_por_viagem"].get(trip_id, [])
        if len(registros) < 2:
            continue

        for indice_inicio, registro_inicio in enumerate(registros[:-1]):
            stop_inicio = registro_inicio["stop_id"]

            if stop_inicio not in ids_embarque:
                continue
            if not _pode_embarcar(registro_inicio):
                continue

            saida = registro_inicio["_saida_minutos"]
            if saida is None or saida < horario_minimo:
                continue

            for indice_fim in range(indice_inicio + 1, len(registros)):
                registro_fim = registros[indice_fim]
                stop_fim = registro_fim["stop_id"]

                if stop_fim not in ids_desembarque:
                    continue
                if not _pode_desembarcar(registro_fim):
                    continue

                chegada = registro_fim["_chegada_minutos"]
                if chegada is None or chegada < saida:
                    continue

                segmentos.append({
                    "trip_id": trip_id,
                    "indice_embarque": indice_inicio,
                    "indice_desembarque": indice_fim,
                    "saida_minutos": saida,
                    "chegada_minutos": chegada,
                    "distancia_origem": distancias_embarque[stop_inicio],
                    "distancia_destino": distancias_desembarque[stop_fim],
                    "stop_embarque": stop_inicio,
                    "stop_desembarque": stop_fim,
                })

    return segmentos


def _montar_opcao_direta(segmento):
    trecho = _montar_trecho(
        segmento["trip_id"],
        segmento["indice_embarque"],
        segmento["indice_desembarque"],
        segmento["distancia_origem"],
        segmento["distancia_destino"],
    )

    return {
        "tipo": "direta",
        "quantidade_integracoes": 0,
        "horario_saida": trecho["horario_saida"],
        "horario_chegada": trecho["horario_chegada"],
        "tempo_total_minutos": round(
            segmento["chegada_minutos"] - segmento["saida_minutos"], 1
        ),
        "distancia_caminhada_total": round(
            segmento["distancia_origem"]
            + segmento["distancia_destino"], 1
        ),
        "trechos": [trecho],
        "integracoes": [],
    }


def _montar_opcao_integracao(primeiro, segundo):
    primeiro_trecho = _montar_trecho(
        primeiro["trip_id"],
        primeiro["indice_embarque"],
        primeiro["indice_desembarque"],
        primeiro["distancia_origem"],
        0,
    )

    segundo_trecho = _montar_trecho(
        segundo["trip_id"],
        segundo["indice_embarque"],
        segundo["indice_desembarque"],
        0,
        segundo["distancia_destino"],
    )

    parada_integracao = primeiro_trecho["desembarque"]

    return {
        "tipo": "com_integracao",
        "quantidade_integracoes": 1,
        "horario_saida": primeiro_trecho["horario_saida"],
        "horario_chegada": segundo_trecho["horario_chegada"],
        "tempo_total_minutos": round(
            segundo["chegada_minutos"] - primeiro["saida_minutos"], 1
        ),
        "distancia_caminhada_total": round(
            primeiro["distancia_origem"]
            + segundo["distancia_destino"], 1
        ),
        "trechos": [primeiro_trecho, segundo_trecho],
        "integracoes": [{
            "parada": parada_integracao,
            "horario_chegada": primeiro_trecho["horario_chegada"],
            "horario_proxima_saida": segundo_trecho["horario_saida"],
            "tempo_espera_minutos": round(
                segundo["saida_minutos"] - primeiro["chegada_minutos"], 1
            ),
        }],
    }


def buscar_viagens(
    latitude_origem,
    longitude_origem,
    latitude_destino,
    longitude_destino,
    data_viagem,
    horario_minimo,
    limite=5,
    raio_paradas=RAIO_PARADA_METROS,
    tempo_minimo_integracao=TEMPO_MINIMO_INTEGRACAO_MINUTOS,
    permitir_integracao=True,
):
    """
    Planeja viagens diretas e, opcionalmente, com uma integração.

    A busca considera:
    - paradas dentro do raio configurado da origem e do destino;
    - serviços ativos na data informada;
    - horário mínimo de partida;
    - sequência das paradas;
    - restrições de embarque e desembarque;
    - tempo mínimo de integração.

    A integração é feita na mesma parada GTFS. Esta versão não calcula
    caminhadas entre paradas diferentes durante uma integração.
    """
    dados = _carregar_dados()

    data_objeto = _normalizar_data(data_viagem)
    horario_minutos = converter_horario_minutos(horario_minimo)

    if horario_minutos is None:
        raise ValueError("Horário inválido. Use HH:MM:SS.")

    origem = buscar_paradas_proximas(
        latitude_origem,
        longitude_origem,
        limite=QUANTIDADE_PARADAS_CANDIDATAS,
        raio_maximo=raio_paradas,
    )

    destino = buscar_paradas_proximas(
        latitude_destino,
        longitude_destino,
        limite=QUANTIDADE_PARADAS_CANDIDATAS,
        raio_maximo=raio_paradas,
    )

    if not origem or not destino:
        return []

    segmentos_diretos = _buscar_segmentos(
        origem, destino, data_objeto, horario_minutos
    )

    opcoes = [
        _montar_opcao_direta(segmento)
        for segmento in segmentos_diretos
    ]

    if permitir_integracao:
        # Para a primeira perna, aceitamos qualquer parada como possível
        # ponto de integração. A segunda perna deve sair dessa mesma parada.
        todas_paradas = list(dados["paradas"].values())

        primeira_perna = _buscar_segmentos(
            origem, todas_paradas, data_objeto, horario_minutos
        )

        # Mantém apenas algumas chegadas promissoras por parada de integração.
        primeiras_por_parada = defaultdict(list)

        for segmento in primeira_perna:
            primeiras_por_parada[
                segmento["stop_desembarque"]
            ].append(segmento)

        for segmentos in primeiras_por_parada.values():
            segmentos.sort(key=lambda item: item["chegada_minutos"])
            del segmentos[3:]

        # Procura a segunda perna a partir das paradas alcançadas.
        for parada_integracao, primeiras in primeiras_por_parada.items():
            horario_mais_cedo = min(
                item["chegada_minutos"] + tempo_minimo_integracao
                for item in primeiras
            )

            segunda_perna = _buscar_segmentos(
                [dados["paradas"][parada_integracao]],
                destino,
                data_objeto,
                horario_mais_cedo,
            )

            segundas_por_trip = defaultdict(list)
            for segmento in segunda_perna:
                segundas_por_trip[segmento["trip_id"]].append(segmento)

            for primeira in primeiras:
                horario_disponivel = (
                    primeira["chegada_minutos"]
                    + tempo_minimo_integracao
                )

                for segmentos in segundas_por_trip.values():
                    for segunda in segmentos:
                        if segunda["trip_id"] == primeira["trip_id"]:
                            continue

                        if segunda["stop_embarque"] != parada_integracao:
                            continue

                        if segunda["saida_minutos"] < horario_disponivel:
                            continue

                        opcoes.append(
                            _montar_opcao_integracao(primeira, segunda)
                        )

    # Remove duplicações e prioriza chegada mais cedo, caminhada menor
    # e menos integrações.
    opcoes_unicas = {}
    for opcao in opcoes:
        chave = tuple(
            trecho["trip_id"] + ":" + str(trecho["embarque"]["id"])
            + ":" + str(trecho["desembarque"]["id"])
            for trecho in opcao["trechos"]
        )
        opcoes_unicas[chave] = opcao

    resultado = list(opcoes_unicas.values())

    resultado.sort(
        key=lambda opcao: (
            converter_horario_minutos(opcao["horario_chegada"])
            if opcao["horario_chegada"] else float("inf"),
            opcao["distancia_caminhada_total"],
            opcao["quantidade_integracoes"],
        )
    )

    return resultado[:max(1, int(limite))]


def buscar_viagens_diretas(
    latitude_origem,
    longitude_origem,
    latitude_destino,
    longitude_destino,
    data_viagem,
    horario_minimo,
    limite=5,
):
    """Compatibilidade: busca somente viagens sem integração."""
    return buscar_viagens(
        latitude_origem,
        longitude_origem,
        latitude_destino,
        longitude_destino,
        data_viagem,
        horario_minimo,
        limite=limite,
        permitir_integracao=False,
    )
