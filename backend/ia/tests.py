import json
import os
from unittest.mock import MagicMock, patch

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from ia.services import interpretar_mensagem


class TesteServicoInterpretarMensagem(APITestCase):
    """
    Testes unitários para o serviço de interpretação de mensagens (services.py).
    """

    @patch("ia.services.genai.Client")
    @patch.dict(os.environ, {"GEMINI_API_KEY": "chave_teste_123"})
    def test_retorno_correto_com_json_valido(self, mock_client_class):
        """
        Verifica o retorno correto quando a API do Gemini devolve um JSON válido.
        """
        dados_esperados = {
            "intencao": "buscar_rota",
            "origem": "Terminal Central",
            "destino": "Praça da Sé",
            "data": None,
            "horario": "08:00",
            "preferencias": {"evitar_baldeacoes": True},
            "informacoes_faltantes": [],
            "mensagem": "Calculando a rota solicitada."
        }

        mock_resposta = MagicMock()
        mock_resposta.text = json.dumps(dados_esperados)
        mock_instancia = mock_client_class.return_value
        mock_instancia.models.generate_content.return_value = mock_resposta

        mensagem_entrada = "Quero ir do Terminal Central até a Praça da Sé às 8h sem baldeação"
        resultado = interpretar_mensagem(mensagem_entrada)

        self.assertEqual(resultado, dados_esperados)
        mock_client_class.assert_called_once_with(api_key="chave_teste_123")
        mock_instancia.models.generate_content.assert_called_once()

    def test_verificacao_chave_api_necessaria(self):
        """
        Verifica que ValueError é lançado quando a variável GEMINI_API_KEY não está definida ou está vazia.
        """
        # Caso 1: Chave ausente do ambiente
        with patch.dict(os.environ):
            os.environ.pop("GEMINI_API_KEY", None)
            with self.assertRaises(ValueError) as contexto_ausente:
                interpretar_mensagem("Olá, preciso de um ônibus")
            self.assertIn("GEMINI_API_KEY não foi encontrada", str(contexto_ausente.exception))

        # Caso 2: Chave com valor vazio
        with patch.dict(os.environ, {"GEMINI_API_KEY": ""}):
            with self.assertRaises(ValueError) as contexto_vazio:
                interpretar_mensagem("Olá, preciso de um ônibus")
            self.assertIn("GEMINI_API_KEY não foi encontrada", str(contexto_vazio.exception))

    @patch("ia.services.genai.Client")
    @patch.dict(os.environ, {"GEMINI_API_KEY": "chave_teste_123"})
    def test_tratamento_resposta_json_invalida(self, mock_client_class):
        """
        Verifica que json.JSONDecodeError é lançado quando o Gemini retorna conteúdo não formatado em JSON.
        """
        mock_resposta = MagicMock()
        mock_resposta.text = "Conteúdo textual que não é um JSON válido"
        mock_instancia = mock_client_class.return_value
        mock_instancia.models.generate_content.return_value = mock_resposta

        with self.assertRaises(json.JSONDecodeError):
            interpretar_mensagem("Como chego no centro?")

    @patch("ia.services.genai.Client")
    @patch.dict(os.environ, {"GEMINI_API_KEY": "chave_teste_123"})
    def test_verificacao_modelo_correto_utilizado(self, mock_client_class):
        """
        Verifica se a chamada ao Gemini utiliza especificamente o modelo 'gemini-3.5-flash'.
        """
        mock_resposta = MagicMock()
        mock_resposta.text = json.dumps({"intencao": "saudacao"})
        mock_instancia = mock_client_class.return_value
        mock_instancia.models.generate_content.return_value = mock_resposta

        interpretar_mensagem("Bom dia!")

        mock_instancia.models.generate_content.assert_called_once()
        _, kwargs = mock_instancia.models.generate_content.call_args
        self.assertEqual(kwargs.get("model"), "gemini-3.5-flash")


class TesteConsultarAgenteView(APITestCase):
    """
    Testes unitários para o endpoint HTTP consultar_agente (views.py).
    """

    def setUp(self):
        self.url = reverse("consultar_agente")

    @patch("ia.views.interpretar_mensagem")
    def test_post_mensagem_valida_retorna_200(self, mock_interpretar):
        """
        Verifica se uma requisição POST com mensagem válida retorna HTTP 200 e os dados interpretados.
        """
        dados_esperados = {
            "intencao": "buscar_rota",
            "origem": "Terminal Central",
            "destino": "Praça da Sé",
            "data": None,
            "horario": None,
            "preferencias": {},
            "informacoes_faltantes": [],
            "mensagem": "Calculando opções de transporte."
        }
        mock_interpretar.return_value = dados_esperados

        resposta = self.client.post(
            self.url,
            {"mensagem": "Quero ir do Terminal Central até a Praça da Sé"},
            format="json"
        )

        self.assertEqual(resposta.status_code, status.HTTP_200_OK)
        self.assertEqual(resposta.json(), dados_esperados)
        mock_interpretar.assert_called_once_with("Quero ir do Terminal Central até a Praça da Sé")

    def test_post_sem_campo_mensagem_retorna_400(self):
        """
        Verifica se uma requisição POST sem o campo 'mensagem' retorna HTTP 400 com mensagem de erro.
        """
        resposta = self.client.post(self.url, {}, format="json")

        self.assertEqual(resposta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(resposta.json(), {"erro": "Envie uma mensagem válida."})

    def test_post_mensagem_vazia_retorna_400(self):
        """
        Verifica se uma requisição POST com mensagem vazia ou apenas espaços retorna HTTP 400.
        """
        # String vazia
        resposta_vazia = self.client.post(self.url, {"mensagem": ""}, format="json")
        self.assertEqual(resposta_vazia.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(resposta_vazia.json(), {"erro": "Envie uma mensagem válida."})

        # String com espaços em branco
        resposta_espacos = self.client.post(self.url, {"mensagem": "    "}, format="json")
        self.assertEqual(resposta_espacos.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(resposta_espacos.json(), {"erro": "Envie uma mensagem válida."})

    @patch("ia.views.interpretar_mensagem")
    def test_falha_na_interpretacao_retorna_502(self, mock_interpretar):
        """
        Verifica se exceções geradas durante a interpretação resultam em HTTP 502 com mensagem amigável.
        """
        mock_interpretar.side_effect = Exception("Falha de comunicação com a API externa")

        resposta = self.client.post(
            self.url,
            {"mensagem": "Qual ônibus passa na Avenida Paulista?"},
            format="json"
        )

        self.assertEqual(resposta.status_code, status.HTTP_502_BAD_GATEWAY)
        self.assertEqual(
            resposta.json(),
            {"erro": "Não foi possível consultar o assistente. Tente novamente."}
        )

    def test_requisicao_get_retorna_405(self):
        """
        Verifica se uma requisição GET para o endpoint retorna HTTP 405 (Method Not Allowed).
        """
        resposta = self.client.get(self.url)

        self.assertEqual(resposta.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
