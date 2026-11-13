from unittest.mock import patch, MagicMock
import requests
from django.test import TestCase, Client
from django.urls import reverse

from rotas.services import buscar_sugestoes_locais


class TestesSugestoesLocais(TestCase):
    def setUp(self):
        self.cliente = Client()

    def test_consulta_curta_retorna_vazio(self):
        resposta = self.cliente.get(reverse('api_sugestoes_locais'), {'q': 'a'})
        self.assertEqual(resposta.status_code, 200)
        self.assertEqual(resposta.json(), {'sugestoes': []})

    def test_consulta_sem_termo_retorna_vazio(self):
        resposta = self.cliente.get(reverse('api_sugestoes_locais'))
        self.assertEqual(resposta.status_code, 200)
        self.assertEqual(resposta.json(), {'sugestoes': []})

    @patch('rotas.services.requests.get')
    def test_consulta_com_sucesso_retorna_locais_formatados(self, mock_get):
        mock_resposta = MagicMock()
        mock_resposta.json.return_value = [
            {
                'osm_id': 12345,
                'name': 'Shopping Recife',
                'display_name': 'Shopping Recife, Rua Padre Carapuceiro, Boa Viagem, Recife, PE',
                'lat': '-8.1190',
                'lon': '-34.9048',
                'address': {
                    'road': 'Rua Padre Carapuceiro',
                    'suburb': 'Boa Viagem',
                    'city': 'Recife',
                },
            }
        ]
        mock_resposta.raise_for_status.return_value = None
        mock_get.return_value = mock_resposta

        resposta = self.cliente.get(reverse('api_sugestoes_locais'), {'q': 'Shopping Recife'})
        self.assertEqual(resposta.status_code, 200)
        dados = resposta.json()

        self.assertIn('sugestoes', dados)
        self.assertEqual(len(dados['sugestoes']), 1)
        primeiro = dados['sugestoes'][0]
        self.assertEqual(primeiro['nome'], 'Shopping Recife')
        self.assertIn('Boa Viagem', primeiro['descricao'])
        self.assertEqual(primeiro['latitude'], -8.1190)
        self.assertEqual(primeiro['longitude'], -34.9048)

    @patch('rotas.services.requests.get')
    def test_falha_de_rede_retorna_lista_vazia(self, mock_get):
        mock_get.side_effect = requests.RequestException('Erro de conexão')

        resultado = buscar_sugestoes_locais('Marco Zero')
        self.assertEqual(resultado, [])

        resposta = self.cliente.get(reverse('api_sugestoes_locais'), {'q': 'Marco Zero'})
        self.assertEqual(resposta.status_code, 200)
        self.assertEqual(resposta.json(), {'sugestoes': []})
