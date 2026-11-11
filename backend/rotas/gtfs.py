
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

    return {
        "linha": linha["route_short_name"],
        "nome": linha["route_long_name"],
        "sentido": sentido,
        "destino": viagem["trip_headsign"],
        "coordenadas": coordenadas
    }