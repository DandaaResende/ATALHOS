from django.http import JsonResponse
from django.shortcuts import render
from .services import buscar_coordenadas
from .gtfs import buscar_itinerario

def api_buscar_rota(request):
    # Pega os dados da URL
    origem = request.GET.get('origem', '')
    destino = request.GET.get('destino', '')
    preferencia = request.GET.get('preferencia', '') 

    if not origem or not destino:
        return JsonResponse({"erro": "Você precisa informar origem e destino."}, status=400)

    # Transforma os nomes em GPS
    coord_origem = buscar_coordenadas(origem)
    coord_destino = buscar_coordenadas(destino)


    # Filtro simples de ar condicionado
    if "ar" in preferencia.lower():
        rotas_disponiveis = [rota for rota in rotas_disponiveis if rota["ar_condicionado"]]

    # Monta a resposta final
    resposta_final = {
        "origem_info": coord_origem,
        "destino_info": coord_destino,
        "opcoes_de_rotas": rotas_disponiveis
    }

    return JsonResponse(resposta_final)

def api_itinerario(request, codigo):
    itinerario = buscar_itinerario(codigo)

    if itinerario is None:
        return JsonResponse(
            {"erro": "Linha ou itinerário não encontrado."},
            status=404
        )

    return JsonResponse(itinerario)

def pagina_mapa(request):
    return render(request, 'mapa.html')