
import csv
from pathlib import Path

# Localização dos arquivos GTFS
PASTA_GTFS = Path(__file__).resolve().parent.parent / "dados" / "gtfs"


def buscar_linha(codigo):
    arquivo = PASTA_GTFS / "routes.txt"

    with open(arquivo, encoding="utf-8-sig", newline="") as f:
        linhas = csv.DictReader(f)

        for linha in linhas:
            if linha["route_short_name"] == codigo:
                return linha

    return None


def buscar_paradas(trip_id):
    arquivo_horarios = PASTA_GTFS / "stop_times.txt"
    horarios = []

    with open(arquivo_horarios, encoding="utf-8-sig", newline="") as f:
        registros = csv.DictReader(f)

        for registro in registros:
            if registro["trip_id"] == trip_id:
                horarios.append(registro)

    horarios.sort(key=lambda item: int(item["stop_sequence"]))

    ids_paradas = {item["stop_id"] for item in horarios}
    paradas_encontradas = {}

    arquivo_paradas = PASTA_GTFS / "stops.txt"

    with open(arquivo_paradas, encoding="utf-8-sig", newline="") as f:
        registros = csv.DictReader(f)

        for parada in registros:
            if parada["stop_id"] in ids_paradas:
                paradas_encontradas[parada["stop_id"]] = parada

    paradas = []

    for horario in horarios:
        parada = paradas_encontradas.get(horario["stop_id"])

        if parada:
            nome = parada["stop_name"]

            if nome == parada["stop_id"]:
                nome = f"Parada {parada['stop_id']}"

            paradas.append({
                "id": parada["stop_id"],
                "nome": nome,
                "latitude": float(parada["stop_lat"]),
                "longitude": float(parada["stop_lon"]),
                "ordem": int(horario["stop_sequence"])
            })

    return paradas


def buscar_itinerario(codigo, sentido="0"):
    linha = buscar_linha(codigo)

    if linha is None:
        return None

    arquivo_trips = PASTA_GTFS / "trips.txt"
    viagem = None

    with open(arquivo_trips, encoding="utf-8-sig", newline="") as f:
        viagens = csv.DictReader(f)

        for registro in viagens:
            if (
                registro["route_id"] == linha["route_id"]
                and registro["direction_id"] == sentido
            ):
                viagem = registro
                break

    if viagem is None:
        return None

    arquivo_shapes = PASTA_GTFS / "shapes.txt"
    coordenadas = []

    with open(arquivo_shapes, encoding="utf-8-sig", newline="") as f:
        pontos = csv.DictReader(f)

        for ponto in pontos:
            if ponto["shape_id"] == viagem["shape_id"]:
                coordenadas.append({
                    "latitude": float(ponto["shape_pt_lat"]),
                    "longitude": float(ponto["shape_pt_lon"])
                })

    paradas = buscar_paradas(viagem["trip_id"])

    return {
        "linha": linha["route_short_name"],
        "nome": linha["route_long_name"],
        "sentido": sentido,
        "destino": viagem["trip_headsign"],
        "coordenadas": coordenadas,
        "paradas": paradas
    }

def buscar_todas_paradas():
    arquivo = PASTA_GTFS / "stops.txt"
    paradas = []

    with open(arquivo, encoding="utf-8-sig", newline="") as f:
        registros = csv.DictReader(f)

        for parada in registros:
            paradas.append({
                "id": parada["stop_id"],
                "nome": (
                    parada["stop_name"]
                    if parada["stop_name"] != parada["stop_id"]
                    else f"Parada {parada['stop_id']}"
                ),
                "latitude": float(parada["stop_lat"]),
                "longitude": float(parada["stop_lon"])
            })

    return paradas