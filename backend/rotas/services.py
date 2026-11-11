import requests

def buscar_coordenadas(endereco):
    url = "https://nominatim.openstreetmap.org/search"
    parametros = {
        'q': endereco,
        'format': 'json',
        'limit': 1
    }
    headers = {
        'User-Agent': 'AppMobilidade/1.0'
    }
    
    resposta = requests.get(url, params=parametros, headers=headers)
    
    if resposta.status_code == 200:
        dados = resposta.json()
        if len(dados) > 0:
            return {
                "latitude": dados[0]['lat'],
                "longitude": dados[0]['lon'],
                "nome_completo": dados[0]['display_name']
            }
    return {"erro": "Endereço não encontrado"}