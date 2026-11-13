"""
Serviço de integração entre o aplicativo de Inteligência Artificial e o módulo de Rotas.

Responsável por fazer a ponte entre as intenções e parâmetros interpretados pela IA
e as funções públicas de geocodificação e consulta GTFS do módulo rotas.
"""

from datetime import date, datetime, time, timedelta
import logging
import math
from django.utils import timezone

from rotas.gtfs import (
    ErroGTFS,
    buscar_itinerario,
    buscar_linha,
    buscar_viagens,
)
from rotas.services import buscar_coordenadas


logger = logging.getLogger(__name__)

PREFERENCIAS_BOOLEANAS = {
    "evitar_baldeacoes",
    "ar_condicionado",
    "mais_rapido",
    "menor_caminhada",
    "permitir_integracao",
}
PREFERENCIAS_NAO_SUPORTADAS = (
    "ar_condicionado",
    "mais_rapido",
    "menor_caminhada",
)
PREFERENCIA_LINHA = "linha"
PREFERENCIAS_ACEITAS = PREFERENCIAS_BOOLEANAS | {PREFERENCIA_LINHA}


def normalizar_data(data_entrada=None):
    """
    Normaliza uma data para o formato 'YYYY-MM-DD' exigido pelo GTFS.
    
    Suporta:
    - None ou string vazia: retorna a data atual no fuso horário local do Django.
    - 'hoje': data atual.
    - 'amanhã' / 'amanha': dia seguinte.
    - 'YYYY-MM-DD' ou 'DD/MM/YYYY': converte para 'YYYY-MM-DD'.
    - objetos date ou datetime.
    
    Lança ValueError caso o formato seja inválido.
    """
    if data_entrada is None or (isinstance(data_entrada, str) and not data_entrada.strip()):
        return timezone.localtime().date().strftime("%Y-%m-%d")

    if isinstance(data_entrada, datetime):
        if timezone.is_aware(data_entrada):
            return timezone.localtime(data_entrada).date().strftime("%Y-%m-%d")
        return data_entrada.date().strftime("%Y-%m-%d")

    if isinstance(data_entrada, date):
        return data_entrada.strftime("%Y-%m-%d")

    if not isinstance(data_entrada, str):
        raise ValueError(f"Formato de data inválido: {type(data_entrada).__name__}.")

    texto = data_entrada.strip().lower()
    hoje = timezone.localtime().date()

    if texto == "hoje":
        return hoje.strftime("%Y-%m-%d")

    if texto in ("amanhã", "amanha"):
        amanha = hoje + timedelta(days=1)
        return amanha.strftime("%Y-%m-%d")

    # Formato ISO (YYYY-MM-DD)
    try:
        obj = datetime.strptime(texto, "%Y-%m-%d").date()
        return obj.strftime("%Y-%m-%d")
    except ValueError:
        pass

    # Formato brasileiro (DD/MM/YYYY)
    try:
        obj = datetime.strptime(texto, "%d/%m/%Y").date()
        return obj.strftime("%Y-%m-%d")
    except ValueError:
        pass

    raise ValueError(f"Data inválida: '{data_entrada}'. Use 'hoje', 'amanhã' ou o formato YYYY-MM-DD.")


def normalizar_horario(horario_entrada=None):
    """
    Normaliza um horário para o formato 'HH:MM:SS' exigido pelo GTFS.
    
    Suporta:
    - None ou string vazia: horário atual no fuso horário local do Django.
    - 'HH:MM:SS': valida e retorna.
    - 'HH:MM': converte para 'HH:MM:00'.
    - 'HHhMM' ou 'HHh': converte para 'HH:MM:00'.
    - objetos time ou datetime.
    
    Lança ValueError caso o formato seja inválido.
    """
    if horario_entrada is None or (isinstance(horario_entrada, str) and not horario_entrada.strip()):
        return timezone.localtime().strftime("%H:%M:%S")

    if isinstance(horario_entrada, datetime):
        if timezone.is_aware(horario_entrada):
            return timezone.localtime(horario_entrada).strftime("%H:%M:%S")
        return horario_entrada.strftime("%H:%M:%S")

    if isinstance(horario_entrada, time):
        return horario_entrada.strftime("%H:%M:%S")

    if not isinstance(horario_entrada, str):
        raise ValueError(f"Formato de horário inválido: {type(horario_entrada).__name__}.")

    texto = horario_entrada.strip().lower()

    if "h" in texto:
        partes = texto.split("h")
        hora = partes[0]
        minuto = partes[1] if len(partes) > 1 and partes[1] else "00"
        texto = f"{hora.zfill(2)}:{minuto.zfill(2)}"

    try:
        obj = datetime.strptime(texto, "%H:%M:%S").time()
        return obj.strftime("%H:%M:%S")
    except ValueError:
        pass

    try:
        obj = datetime.strptime(texto, "%H:%M").time()
        return f"{obj.strftime('%H:%M')}:00"
    except ValueError:
        pass

    raise ValueError(f"Horário inválido: '{horario_entrada}'. Use o formato HH:MM ou HH:MM:SS.")


def _validar_preferencias(preferencias):
    if preferencias is None:
        return {}, [], None

    if not isinstance(preferencias, dict):
        return None, [], "As preferências devem ser informadas como um objeto."

    desconhecidas = sorted(set(preferencias) - PREFERENCIAS_ACEITAS)
    if desconhecidas:
        nomes = ", ".join(f"'{nome}'" for nome in desconhecidas)
        return None, [], f"Preferência(s) não reconhecida(s): {nomes}."

    for nome in PREFERENCIAS_BOOLEANAS:
        if nome in preferencias and not isinstance(preferencias[nome], bool):
            return None, [], (
                f"A preferência '{nome}' deve ser verdadeira ou falsa."
            )

    if PREFERENCIA_LINHA in preferencias and (
        not isinstance(preferencias[PREFERENCIA_LINHA], str)
        or not preferencias[PREFERENCIA_LINHA].strip()
    ):
        return None, [], "A preferência 'linha' deve ser um texto não vazio."

    evitar_baldeacoes = preferencias.get("evitar_baldeacoes", False)
    permitir_integracao = preferencias.get("permitir_integracao")
    if evitar_baldeacoes and permitir_integracao is True:
        return None, [], (
            "As preferências 'evitar_baldeacoes' e "
            "'permitir_integracao' são incompatíveis."
        )

    nao_suportadas = [
        nome
        for nome in PREFERENCIAS_NAO_SUPORTADAS
        if preferencias.get(nome) is True
    ]
    if PREFERENCIA_LINHA in preferencias:
        nao_suportadas.append(PREFERENCIA_LINHA)

    return preferencias, nao_suportadas, None


def consultar_viagens(origem, destino, data=None, horario=None, preferencias=None):
    """
    Consulta viagens de transporte público entre origem e destino.

    Parâmetros:
    - origem: nome ou endereço do ponto de partida.
    - destino: nome ou endereço do ponto de chegada.
    - data: data desejada ('hoje', 'amanhã', 'YYYY-MM-DD' ou None).
    - horario: horário mínimo de partida ('HH:MM', 'HH:MM:SS' ou None).
    - preferencias: dicionário com preferências (ex: {'evitar_baldeacoes': True}).

    Retorna dicionário contendo:
    - sucesso: booleano indicando o êxito da consulta.
    - viagens / erro: lista de opções encontradas ou descrição do erro.
    """
    if not origem or not str(origem).strip():
        return {
            "sucesso": False,
            "erro": "Origem não informada.",
            "tipo_erro": "origem_obrigatoria",
        }

    if not destino or not str(destino).strip():
        return {
            "sucesso": False,
            "erro": "Destino não informado.",
            "tipo_erro": "destino_obrigatorio",
        }

    # 1. Normalização de data e horário
    try:
        data_normalizada = normalizar_data(data)
    except ValueError as e:
        return {
            "sucesso": False,
            "erro": str(e),
            "tipo_erro": "data_invalida",
        }

    try:
        horario_normalizado = normalizar_horario(horario)
    except ValueError as e:
        return {
            "sucesso": False,
            "erro": str(e),
            "tipo_erro": "horario_invalido",
        }

    preferencias_dict, nao_suportadas, erro_preferencias = (
        _validar_preferencias(preferencias)
    )
    if erro_preferencias:
        return {
            "sucesso": False,
            "erro": erro_preferencias,
            "tipo_erro": "preferencias_invalidas",
        }

    # 2. Geocodificação da Origem
    try:
        coord_origem = buscar_coordenadas(origem)
    except Exception:
        logger.exception("Falha ao geocodificar a origem.")
        return {
            "sucesso": False,
            "erro": "Não foi possível localizar a origem.",
            "tipo_erro": "falha_geocodificacao",
            "campo": "origem",
        }

    if not coord_origem or "erro" in coord_origem:
        msg_erro = coord_origem.get("erro", "Endereço não encontrado.") if isinstance(coord_origem, dict) else "Endereço não encontrado."
        tipo = "endereco_nao_encontrado" if "não encontrado" in msg_erro.lower() else "falha_geocodificacao"
        return {
            "sucesso": False,
            "erro": f"Origem: {msg_erro}",
            "tipo_erro": tipo,
            "campo": "origem",
        }

    # 3. Geocodificação do Destino
    try:
        coord_destino = buscar_coordenadas(destino)
    except Exception:
        logger.exception("Falha ao geocodificar o destino.")
        return {
            "sucesso": False,
            "erro": "Não foi possível localizar o destino.",
            "tipo_erro": "falha_geocodificacao",
            "campo": "destino",
        }

    if not coord_destino or "erro" in coord_destino:
        msg_erro = coord_destino.get("erro", "Endereço não encontrado.") if isinstance(coord_destino, dict) else "Endereço não encontrado."
        tipo = "endereco_nao_encontrado" if "não encontrado" in msg_erro.lower() else "falha_geocodificacao"
        return {
            "sucesso": False,
            "erro": f"Destino: {msg_erro}",
            "tipo_erro": tipo,
            "campo": "destino",
        }

    # 4. Tratamento de preferências
    evitar_baldeacoes = preferencias_dict.get("evitar_baldeacoes", False)
    permitir_integracao = not evitar_baldeacoes
    if "permitir_integracao" in preferencias_dict:
        permitir_integracao = preferencias_dict["permitir_integracao"]

    for nome_campo, coordenadas in (
        ("origem", coord_origem),
        ("destino", coord_destino),
    ):
        if not isinstance(coordenadas, dict):
            return {
                "sucesso": False,
                "erro": f"Coordenadas inválidas para o {nome_campo}.",
                "tipo_erro": "coordenadas_invalidas",
                "campo": nome_campo,
            }

        try:
            latitude = float(coordenadas["latitude"])
            longitude = float(coordenadas["longitude"])
        except (KeyError, TypeError, ValueError):
            return {
                "sucesso": False,
                "erro": f"Coordenadas inválidas para o {nome_campo}.",
                "tipo_erro": "coordenadas_invalidas",
                "campo": nome_campo,
            }

        if (
            not math.isfinite(latitude)
            or not math.isfinite(longitude)
            or not -90 <= latitude <= 90
            or not -180 <= longitude <= 180
        ):
            return {
                "sucesso": False,
                "erro": f"Coordenadas inválidas para o {nome_campo}.",
                "tipo_erro": "coordenadas_invalidas",
                "campo": nome_campo,
            }

    # 5. Consulta ao planejador GTFS
    try:
        viagens = buscar_viagens(
            latitude_origem=float(coord_origem["latitude"]),
            longitude_origem=float(coord_origem["longitude"]),
            latitude_destino=float(coord_destino["latitude"]),
            longitude_destino=float(coord_destino["longitude"]),
            data_viagem=data_normalizada,
            horario_minimo=horario_normalizado,
            permitir_integracao=permitir_integracao,
        )
    except ErroGTFS:
        logger.exception("Erro do GTFS ao consultar viagens.")
        return {
            "sucesso": False,
            "erro": "Erro ao consultar a base de dados do GTFS.",
            "tipo_erro": "erro_gtfs",
        }
    except (TypeError, ValueError):
        logger.exception("Dados inválidos ao consultar viagens.")
        return {
            "sucesso": False,
            "erro": "Não foi possível consultar as viagens com os dados informados.",
            "tipo_erro": "erro_planejamento",
        }
    except Exception:
        logger.exception("Falha inesperada ao consultar viagens.")
        return {
            "sucesso": False,
            "erro": "Não foi possível consultar as viagens no momento.",
            "tipo_erro": "erro_planejamento",
        }

    if not isinstance(viagens, list):
        logger.error(
            "O planejador GTFS retornou %s em vez de uma lista.",
            type(viagens).__name__,
        )
        return {
            "sucesso": False,
            "erro": "A consulta de viagens retornou um formato inválido.",
            "tipo_erro": "retorno_gtfs_invalido",
        }

    resultado_consulta = {
        "sucesso": True,
        "origem": {
            "endereco": origem,
            "latitude": coord_origem["latitude"],
            "longitude": coord_origem["longitude"],
            "nome_completo": coord_origem.get("nome_completo"),
        },
        "destino": {
            "endereco": destino,
            "latitude": coord_destino["latitude"],
            "longitude": coord_destino["longitude"],
            "nome_completo": coord_destino.get("nome_completo"),
        },
        "data": data_normalizada,
        "horario": horario_normalizado,
        "permitir_integracao": permitir_integracao,
        "viagens": viagens,
        "total_opcoes": len(viagens),
        "preferencias_nao_atendidas": nao_suportadas,
    }

    if len(viagens) == 0:
        resultado_consulta["mensagem"] = (
            "Nenhuma opção de viagem encontrada para o trajeto e horário informados."
        )

    return resultado_consulta


def consultar_linha(codigo, sentido="0"):
    """
    Consulta os dados e itinerário de uma linha de transporte público pelo código (route_short_name).

    Parâmetros:
    - codigo: código ou número da linha (ex: '8000', '105').
    - sentido: sentido da linha ('0' para ida, '1' para volta).

    Retorna dicionário contendo:
    - sucesso: booleano indicando o êxito da consulta.
    - linha: dados cadastrais da linha (ou None).
    - itinerario: paradas e coordenadas do trajeto (ou None).
    """
    if not codigo or not str(codigo).strip():
        return {
            "sucesso": False,
            "erro": "Código da linha não informado.",
            "tipo_erro": "codigo_invalido",
        }

    codigo_str = str(codigo).strip()

    try:
        dados_linha = buscar_linha(codigo_str)
    except ErroGTFS:
        logger.exception("Erro do GTFS ao consultar a linha.")
        return {
            "sucesso": False,
            "erro": "Erro ao consultar dados da linha no GTFS.",
            "tipo_erro": "erro_gtfs",
        }
    except Exception:
        logger.exception("Falha inesperada ao consultar a linha.")
        return {
            "sucesso": False,
            "erro": "Não foi possível consultar os dados da linha.",
            "tipo_erro": "erro_linha",
        }

    if dados_linha is None:
        return {
            "sucesso": False,
            "erro": f"Linha '{codigo_str}' não encontrada.",
            "tipo_erro": "linha_nao_encontrada",
            "linha": None,
            "itinerario": None,
        }

    try:
        itinerario = buscar_itinerario(codigo_str, sentido=str(sentido))
    except ErroGTFS:
        logger.exception("Erro do GTFS ao consultar o itinerário.")
        return {
            "sucesso": False,
            "linha": dados_linha,
            "itinerario": None,
            "erro": "Erro ao consultar o itinerário no GTFS.",
            "tipo_erro": "erro_gtfs_itinerario",
        }
    except Exception:
        logger.exception("Falha inesperada ao consultar o itinerário.")
        return {
            "sucesso": False,
            "linha": dados_linha,
            "itinerario": None,
            "erro": "Não foi possível consultar o itinerário.",
            "tipo_erro": "erro_itinerario",
        }

    if itinerario is None:
        return {
            "sucesso": True,
            "linha": dados_linha,
            "itinerario": None,
            "aviso": f"Itinerário não disponível para a linha '{codigo_str}' no sentido '{sentido}'.",
        }

    return {
        "sucesso": True,
        "linha": dados_linha,
        "itinerario": itinerario,
    }
