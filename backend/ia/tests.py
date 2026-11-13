import json
import os
from unittest.mock import MagicMock, patch

from django.urls import reverse
from google.genai import types
from rest_framework import serializers, status
from rest_framework.test import APITestCase

from ia.rotas_service import (
    consultar_linha,
    consultar_viagens,
    normalizar_data,
    normalizar_horario,
)
from ia.serializers import RespostaAgenteSerializer, StrictCharField
from ia.services import interpretar_mensagem
from rotas.gtfs import ErroGTFS


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

    @patch("ia.services.genai.Client")
    @patch.dict(os.environ, {"GEMINI_API_KEY": "chave_teste_123"})
    def test_funcionamento_sem_historico(self, mock_client_class):
        """
        Verifica que chamar interpretar_mensagem sem histórico (ou None/vazio)
        envia a mensagem como string direta para o parâmetro contents.
        """
        mock_resposta = MagicMock()
        mock_resposta.text = json.dumps({"intencao": "saudacao", "mensagem": "Olá!"})
        mock_instancia = mock_client_class.return_value
        mock_instancia.models.generate_content.return_value = mock_resposta

        # Chamada com historico=None explícito
        interpretar_mensagem("Olá", historico=None)
        _, kwargs_none = mock_instancia.models.generate_content.call_args
        self.assertEqual(kwargs_none.get("contents"), "Olá")

        # Chamada com historico=[] (vazio)
        interpretar_mensagem("Olá novamente", historico=[])
        _, kwargs_vazio = mock_instancia.models.generate_content.call_args
        self.assertEqual(kwargs_vazio.get("contents"), "Olá novamente")

    @patch("ia.services.genai.Client")
    @patch.dict(os.environ, {"GEMINI_API_KEY": "chave_teste_123"})
    def test_funcionamento_com_historico(self, mock_client_class):
        """
        Verifica que a chamada com histórico retorna os dados interpretados com sucesso.
        """
        dados_esperados = {
            "intencao": "buscar_rota",
            "origem": "Terminal Central",
            "destino": "Praça da Sé",
            "data": None,
            "horario": None,
            "preferencias": {},
            "informacoes_faltantes": [],
            "mensagem": "Calculando a rota."
        }
        mock_resposta = MagicMock()
        mock_resposta.text = json.dumps(dados_esperados)
        mock_instancia = mock_client_class.return_value
        mock_instancia.models.generate_content.return_value = mock_resposta

        historico = [
            {"papel": "usuario", "texto": "Quero ir para a Praça da Sé"},
            {"papel": "assistente", "texto": "De onde você vai partir?"}
        ]

        resultado = interpretar_mensagem("Terminal Central", historico=historico)

        self.assertEqual(resultado, dados_esperados)
        mock_instancia.models.generate_content.assert_called_once()

    @patch("ia.services.genai.Client")
    @patch.dict(os.environ, {"GEMINI_API_KEY": "chave_teste_123"})
    def test_ordem_e_papeis_das_mensagens_com_historico(self, mock_client_class):
        """
        Verifica que as mensagens do histórico são convertidas em types.Content
        com os papéis 'user' e 'model' e mantidas na ordem cronológica correta.
        """
        mock_resposta = MagicMock()
        mock_resposta.text = json.dumps({"intencao": "buscar_rota"})
        mock_instancia = mock_client_class.return_value
        mock_instancia.models.generate_content.return_value = mock_resposta

        historico = [
            {"papel": "usuario", "texto": "Quero ir para o Museu do Ipiranga"},
            {"papel": "assistente", "texto": "Qual será o ponto de partida?"},
        ]
        mensagem_atual = "Estação Sacomã"

        interpretar_mensagem(mensagem_atual, historico=historico)

        _, kwargs = mock_instancia.models.generate_content.call_args
        conteudos = kwargs.get("contents")

        self.assertIsInstance(conteudos, list)
        self.assertEqual(len(conteudos), 3)

        # 1ª mensagem: usuário no histórico
        self.assertEqual(conteudos[0].role, "user")
        self.assertEqual(conteudos[0].parts[0].text, "Quero ir para o Museu do Ipiranga")

        # 2ª mensagem: assistente no histórico
        self.assertEqual(conteudos[1].role, "model")
        self.assertEqual(conteudos[1].parts[0].text, "Qual será o ponto de partida?")

        # 3ª mensagem: mensagem atual (usuário)
        self.assertEqual(conteudos[2].role, "user")
        self.assertEqual(conteudos[2].parts[0].text, "Estação Sacomã")

    @patch("ia.services.genai.Client")
    @patch.dict(os.environ, {"GEMINI_API_KEY": "chave_teste_123"})
    def test_mensagem_atual_posicionada_ao_final(self, mock_client_class):
        """
        Verifica expressamente que a mensagem atual é posicionada como o último
        item da lista de contents enviada ao Gemini com papel 'user'.
        """
        mock_resposta = MagicMock()
        mock_resposta.text = json.dumps({"intencao": "consultar_linha"})
        mock_instancia = mock_client_class.return_value
        mock_instancia.models.generate_content.return_value = mock_resposta

        historico = [
            {"role": "user", "content": "Olá"},
            {"role": "model", "content": "Olá! Como posso ajudar?"},
            {"role": "user", "content": "Queria informações de ônibus"},
            {"role": "model", "content": "Qual linha você deseja consultar?"},
        ]
        mensagem_atual = "Linha 8000"

        interpretar_mensagem(mensagem_atual, historico=historico)

        _, kwargs = mock_instancia.models.generate_content.call_args
        conteudos = kwargs.get("contents")

        self.assertEqual(len(conteudos), 5)
        ultima_mensagem = conteudos[-1]
        self.assertEqual(ultima_mensagem.role, "user")
        self.assertEqual(ultima_mensagem.parts[0].text, "Linha 8000")

    @patch("ia.services.genai.Client")
    @patch.dict(os.environ, {"GEMINI_API_KEY": "chave_teste_123"})
    def test_historico_com_instancias_content_e_chaves_variadas(self, mock_client_class):
        """
        Verifica compatibilidade com instâncias diretas de types.Content e
        variantes de chaves de papel ('assistant', 'role', 'conteudo').
        """
        mock_resposta = MagicMock()
        mock_resposta.text = json.dumps({"intencao": "buscar_rota"})
        mock_instancia = mock_client_class.return_value
        mock_instancia.models.generate_content.return_value = mock_resposta

        historico = [
            types.Content(role="user", parts=[types.Part.from_text(text="Primeira mensagem")]),
            {"role": "assistant", "conteudo": "Segunda mensagem"}
        ]

        interpretar_mensagem("Terceira mensagem", historico=historico)

        _, kwargs = mock_instancia.models.generate_content.call_args
        conteudos = kwargs.get("contents")

        self.assertEqual(len(conteudos), 3)
        self.assertEqual(conteudos[0].role, "user")
        self.assertEqual(conteudos[0].parts[0].text, "Primeira mensagem")
        self.assertEqual(conteudos[1].role, "model")
        self.assertEqual(conteudos[1].parts[0].text, "Segunda mensagem")
        self.assertEqual(conteudos[2].role, "user")
        self.assertEqual(conteudos[2].parts[0].text, "Terceira mensagem")

    @patch("ia.services.genai.Client")
    @patch.dict(os.environ, {"GEMINI_API_KEY": "chave_teste_123"})
    def test_papel_desconhecido_lanca_excecao(self, mock_client_class):
        """
        Verifica que papéis desconhecidos não são aceitos e lançam ValueError.
        """
        # Papel desconhecido em formato dicionário com 'papel'
        historico_papel_invalido = [{"papel": "sistema", "texto": "Você é um assistente."}]
        with self.assertRaises(ValueError) as ctx1:
            interpretar_mensagem("Oi", historico=historico_papel_invalido)
        self.assertIn("Papel desconhecido no histórico", str(ctx1.exception))

        # Papel desconhecido em formato dicionário com 'role'
        historico_role_invalido = [{"role": "supervisor", "content": "Atenção"}]
        with self.assertRaises(ValueError) as ctx2:
            interpretar_mensagem("Oi", historico=historico_role_invalido)
        self.assertIn("Papel desconhecido no histórico", str(ctx2.exception))

        # Papel desconhecido em instância types.Content
        historico_content_invalido = [
            types.Content(role="admin", parts=[types.Part.from_text(text="Mensagem admin")])
        ]
        with self.assertRaises(ValueError) as ctx3:
            interpretar_mensagem("Oi", historico=historico_content_invalido)
        self.assertIn("Papel desconhecido no histórico", str(ctx3.exception))

    @patch("ia.services.genai.Client")
    @patch.dict(os.environ, {"GEMINI_API_KEY": "chave_teste_123"})
    def test_item_invalido_lanca_excecao(self, mock_client_class):
        """
        Verifica que itens inválidos (não dicionários/types.Content ou sem texto/papel) lançam ValueError.
        """
        # Item em formato string solta
        with self.assertRaises(ValueError) as ctx_str:
            interpretar_mensagem("Oi", historico=["mensagem solta em string"])
        self.assertIn("Item inválido no histórico", str(ctx_str.exception))

        # Item numérico
        with self.assertRaises(ValueError) as ctx_num:
            interpretar_mensagem("Oi", historico=[123])
        self.assertIn("Item inválido no histórico", str(ctx_num.exception))

        # Dicionário sem campo de papel/role
        with self.assertRaises(ValueError) as ctx_sem_papel:
            interpretar_mensagem("Oi", historico=[{"texto": "Sem papel definido"}])
        self.assertIn("Papel não informado", str(ctx_sem_papel.exception))

        # Dicionário sem campo de texto/conteúdo
        with self.assertRaises(ValueError) as ctx_sem_texto:
            interpretar_mensagem("Oi", historico=[{"papel": "usuario"}])
        self.assertIn("nenhum texto ou conteúdo fornecido", str(ctx_sem_texto.exception))

    @patch("ia.services.genai.Client")
    @patch.dict(os.environ, {"GEMINI_API_KEY": "chave_teste_123"})
    def test_historico_formato_invalido_lanca_excecao(self, mock_client_class):
        """
        Verifica que um histórico que não seja lista ou tupla lança ValueError.
        """
        # String em vez de lista/tupla
        with self.assertRaises(ValueError) as ctx_str:
            interpretar_mensagem("Oi", historico="isto não é uma lista")
        self.assertIn("O histórico deve ser uma lista ou tupla", str(ctx_str.exception))

        # Dicionário em vez de lista/tupla
        with self.assertRaises(ValueError) as ctx_dict:
            interpretar_mensagem("Oi", historico={"papel": "usuario", "texto": "oi"})
        self.assertIn("O histórico deve ser uma lista ou tupla", str(ctx_dict.exception))

        # Inteiro em vez de lista/tupla
        with self.assertRaises(ValueError) as ctx_int:
            interpretar_mensagem("Oi", historico=42)
        self.assertIn("O histórico deve ser uma lista ou tupla", str(ctx_int.exception))

    @patch("ia.services.genai.Client")
    @patch.dict(os.environ, {"GEMINI_API_KEY": "chave_teste_123"})
    def test_preservacao_formatos_validos_anteriores(self, mock_client_class):
        """
        Verifica a preservação de todos os formatos válidos suportados, incluindo tuplas.
        """
        mock_resposta = MagicMock()
        mock_resposta.text = json.dumps({"intencao": "buscar_rota"})
        mock_instancia = mock_client_class.return_value
        mock_instancia.models.generate_content.return_value = mock_resposta

        historico_valido = (
            {"papel": "usuario", "texto": "Mensagem 1"},
            {"papel": "assistente", "texto": "Mensagem 2"},
            {"role": "user", "content": "Mensagem 3"},
            {"role": "assistant", "content": "Mensagem 4"},
            {"role": "model", "content": "Mensagem 5"},
            types.Content(role="user", parts=[types.Part.from_text(text="Mensagem 6")]),
            types.Content(role="model", parts=[types.Part.from_text(text="Mensagem 7")]),
        )

        interpretar_mensagem("Mensagem final", historico=historico_valido)

        _, kwargs = mock_instancia.models.generate_content.call_args
        conteudos = kwargs.get("contents")

        self.assertEqual(len(conteudos), 8)
        self.assertEqual(conteudos[0].role, "user")
        self.assertEqual(conteudos[1].role, "model")
        self.assertEqual(conteudos[2].role, "user")
        self.assertEqual(conteudos[3].role, "model")
        self.assertEqual(conteudos[4].role, "model")
        self.assertEqual(conteudos[5].role, "user")
        self.assertEqual(conteudos[6].role, "model")
        self.assertEqual(conteudos[7].role, "user")
        self.assertEqual(conteudos[7].parts[0].text, "Mensagem final")


class TesteConsultarAgenteView(APITestCase):
    """
    Testes unitários para o endpoint HTTP consultar_agente (views.py).
    """

    def setUp(self):
        self.url = reverse("consultar_agente")

    @patch("ia.views.consultar_viagens")
    @patch("ia.views.interpretar_mensagem")
    def test_post_mensagem_valida_retorna_200(
        self,
        mock_interpretar,
        mock_consultar_viagens,
    ):
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
        mock_consultar_viagens.return_value = {
            "sucesso": True,
            "viagens": [{"linha": "202"}],
        }

        resposta = self.client.post(
            self.url,
            {"mensagem": "Quero ir do Terminal Central até a Praça da Sé"},
            format="json"
        )

        self.assertEqual(resposta.status_code, status.HTTP_200_OK)
        self.assertEqual(
            resposta.json(),
            {
                **dados_esperados,
                "resultado": mock_consultar_viagens.return_value,
            },
        )
        mock_interpretar.assert_called_once_with("Quero ir do Terminal Central até a Praça da Sé")
        mock_consultar_viagens.assert_called_once_with(
            origem="Terminal Central",
            destino="Praça da Sé",
            data=None,
            horario=None,
            preferencias={},
        )

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

    @patch("ia.views.consultar_viagens")
    @patch("ia.views.interpretar_mensagem")
    def test_post_mensagem_valida_com_historico_retorna_200(
        self,
        mock_interpretar,
        mock_consultar_viagens,
    ):
        """
        Verifica se requisição com mensagem e histórico válidos retorna HTTP 200 e encaminha ao serviço.
        """
        dados_esperados = {
            "intencao": "buscar_rota",
            "origem": "Terminal da Macaxeira",
            "destino": "UFPE",
            "data": None,
            "horario": None,
            "preferencias": {},
            "informacoes_faltantes": [],
            "mensagem": "Calculando rotas para a UFPE."
        }
        mock_interpretar.return_value = dados_esperados
        mock_consultar_viagens.return_value = {"sucesso": True, "viagens": []}

        historico_requisicao = [
            {"papel": "usuario", "texto": "Quero chegar à UFPE."},
            {"papel": "assistente", "texto": "De onde você vai sair?"}
        ]

        payload = {
            "mensagem": "Qual ônibus passa perto do Terminal da Macaxeira?",
            "historico": historico_requisicao
        }

        resposta = self.client.post(self.url, payload, format="json")

        self.assertEqual(resposta.status_code, status.HTTP_200_OK)
        self.assertEqual(
            resposta.json(),
            {
                **dados_esperados,
                "resultado": mock_consultar_viagens.return_value,
            },
        )
        mock_interpretar.assert_called_once_with(
            "Qual ônibus passa perto do Terminal da Macaxeira?",
            historico=[
                {"papel": "usuario", "texto": "Quero chegar à UFPE."},
                {"papel": "assistente", "texto": "De onde você vai sair?"}
            ]
        )
        mock_consultar_viagens.assert_called_once_with(
            origem="Terminal da Macaxeira",
            destino="UFPE",
            data=None,
            horario=None,
            preferencias={},
        )

    @patch("ia.views.consultar_linha_rota")
    @patch("ia.views.consultar_viagens")
    @patch("ia.views.interpretar_mensagem")
    def test_post_historico_omitido_nulo_e_vazio(
        self,
        mock_interpretar,
        mock_consultar_viagens,
        mock_consultar_linha,
    ):
        """
        Verifica que histórico omitido, nulo (None) ou lista vazia são aceitos sem erro.
        """
        mock_interpretar.return_value = {
            "intencao": "saudacao",
            "origem": None,
            "destino": None,
            "data": None,
            "horario": None,
            "preferencias": {},
            "informacoes_faltantes": [],
            "mensagem": "Olá! Como posso ajudar?"
        }

        # Caso 1: historico omitido
        res1 = self.client.post(self.url, {"mensagem": "Olá"}, format="json")
        self.assertEqual(res1.status_code, status.HTTP_200_OK)
        mock_interpretar.assert_called_with("Olá")

        # Caso 2: historico nulo (None)
        res2 = self.client.post(self.url, {"mensagem": "Olá", "historico": None}, format="json")
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        mock_interpretar.assert_called_with("Olá")

        # Caso 3: historico lista vazia
        res3 = self.client.post(self.url, {"mensagem": "Olá", "historico": []}, format="json")
        self.assertEqual(res3.status_code, status.HTTP_200_OK)
        mock_interpretar.assert_called_with("Olá")
        mock_consultar_viagens.assert_not_called()
        mock_consultar_linha.assert_not_called()

    @patch("ia.views.consultar_viagens")
    @patch("ia.views.interpretar_mensagem")
    def test_buscar_rota_com_origem_destino_consulta_servico(
        self,
        mock_interpretar,
        mock_consultar_viagens,
    ):
        mock_interpretar.return_value = {
            "intencao": "buscar_rota",
            "origem": "Origem",
            "destino": "Destino",
            "data": "2026-11-20",
            "horario": "08:00",
            "preferencias": {"evitar_baldeacoes": True},
            "informacoes_faltantes": [],
            "mensagem": "Consultando.",
        }
        resultado = {"sucesso": True, "viagens": [{"linha": "202"}]}
        mock_consultar_viagens.return_value = resultado

        resposta = self.client.post(
            self.url,
            {"mensagem": "Quero viajar"},
            format="json",
        )

        self.assertEqual(resposta.status_code, status.HTTP_200_OK)
        self.assertEqual(resposta.json()["resultado"], resultado)
        mock_consultar_viagens.assert_called_once_with(
            origem="Origem",
            destino="Destino",
            data="2026-11-20",
            horario="08:00",
            preferencias={"evitar_baldeacoes": True},
        )

    @patch("ia.views.consultar_viagens")
    @patch("ia.views.interpretar_mensagem")
    def test_buscar_rota_com_informacoes_faltantes_nao_consulta(
        self,
        mock_interpretar,
        mock_consultar_viagens,
    ):
        mock_interpretar.return_value = {
            "intencao": "buscar_rota",
            "origem": None,
            "destino": "Destino",
            "data": None,
            "horario": None,
            "preferencias": {},
            "informacoes_faltantes": ["origem"],
            "mensagem": "Informe a origem.",
        }

        resposta = self.client.post(
            self.url,
            {"mensagem": "Quero viajar"},
            format="json",
        )

        self.assertEqual(resposta.status_code, status.HTTP_200_OK)
        self.assertIsNone(resposta.json()["resultado"])
        mock_consultar_viagens.assert_not_called()

    @patch("ia.views.consultar_linha_rota")
    @patch("ia.views.interpretar_mensagem")
    def test_consultar_linha_com_codigo_consulta_servico(
        self,
        mock_interpretar,
        mock_consultar_linha,
    ):
        mock_interpretar.return_value = {
            "intencao": "consultar_linha",
            "origem": None,
            "destino": None,
            "data": None,
            "horario": None,
            "preferencias": {"linha": "202"},
            "informacoes_faltantes": [],
            "mensagem": "Buscando a linha.",
        }
        resultado = {"sucesso": True, "linha": {"route_short_name": "202"}}
        mock_consultar_linha.return_value = resultado

        resposta = self.client.post(
            self.url,
            {"mensagem": "Consulte a linha 202"},
            format="json",
        )

        self.assertEqual(resposta.status_code, status.HTTP_200_OK)
        self.assertEqual(resposta.json()["resultado"], resultado)
        mock_consultar_linha.assert_called_once_with("202")

    @patch("ia.views.consultar_linha_rota")
    @patch("ia.views.interpretar_mensagem")
    def test_consultar_linha_sem_codigo_nao_consulta(
        self,
        mock_interpretar,
        mock_consultar_linha,
    ):
        mock_interpretar.return_value = {
            "intencao": "consultar_linha",
            "origem": None,
            "destino": None,
            "data": None,
            "horario": None,
            "preferencias": {},
            "informacoes_faltantes": ["linha"],
            "mensagem": "Informe a linha.",
        }

        resposta = self.client.post(
            self.url,
            {"mensagem": "Consulte uma linha"},
            format="json",
        )

        self.assertEqual(resposta.status_code, status.HTTP_200_OK)
        self.assertIsNone(resposta.json()["resultado"])
        mock_consultar_linha.assert_not_called()

    @patch("ia.views.consultar_viagens")
    @patch("ia.views.consultar_linha_rota")
    @patch("ia.views.interpretar_mensagem")
    def test_intencao_outro_nao_consulta_servicos(
        self,
        mock_interpretar,
        mock_consultar_linha,
        mock_consultar_viagens,
    ):
        mock_interpretar.return_value = {
            "intencao": "outro",
            "origem": None,
            "destino": None,
            "data": None,
            "horario": None,
            "preferencias": {},
            "informacoes_faltantes": [],
            "mensagem": "Posso ajudar com transporte público.",
        }

        resposta = self.client.post(
            self.url,
            {"mensagem": "Qual é a capital do Brasil?"},
            format="json",
        )

        self.assertEqual(resposta.status_code, status.HTTP_200_OK)
        self.assertIsNone(resposta.json()["resultado"])
        mock_consultar_linha.assert_not_called()
        mock_consultar_viagens.assert_not_called()

    @patch("ia.views.consultar_viagens")
    @patch("ia.views.interpretar_mensagem")
    def test_falha_do_servico_e_preservada_em_resultado(
        self,
        mock_interpretar,
        mock_consultar_viagens,
    ):
        mock_interpretar.return_value = {
            "intencao": "buscar_rota",
            "origem": "Origem",
            "destino": "Destino",
            "data": None,
            "horario": None,
            "preferencias": {},
            "informacoes_faltantes": [],
            "mensagem": "Consultando.",
        }
        resultado = {
            "sucesso": False,
            "tipo_erro": "endereco_nao_encontrado",
            "erro": "Origem não encontrada.",
        }
        mock_consultar_viagens.return_value = resultado

        resposta = self.client.post(
            self.url,
            {"mensagem": "Quero viajar"},
            format="json",
        )

        self.assertEqual(resposta.status_code, status.HTTP_200_OK)
        self.assertEqual(resposta.json()["resultado"], resultado)

    def test_post_historico_nao_lista_retorna_400(self):
        """
        Verifica que se o histórico fornecido não for uma lista, retorna HTTP 400.
        """
        # String
        res_str = self.client.post(
            self.url,
            {"mensagem": "Oi", "historico": "historico_invalido"},
            format="json"
        )
        self.assertEqual(res_str.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("O histórico deve ser uma lista", res_str.json().get("erro", ""))

        # Inteiro
        res_int = self.client.post(
            self.url,
            {"mensagem": "Oi", "historico": 123},
            format="json"
        )
        self.assertEqual(res_int.status_code, status.HTTP_400_BAD_REQUEST)

        # Dicionário
        res_dict = self.client.post(
            self.url,
            {"mensagem": "Oi", "historico": {"papel": "usuario", "texto": "oi"}},
            format="json"
        )
        self.assertEqual(res_dict.status_code, status.HTTP_400_BAD_REQUEST)

    def test_post_historico_item_nao_dicionario_retorna_400(self):
        """
        Verifica que itens do histórico que não sejam dicionários retornam HTTP 400.
        """
        payload = {
            "mensagem": "Oi",
            "historico": ["item em string"]
        }
        resposta = self.client.post(self.url, payload, format="json")
        self.assertEqual(resposta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Cada item do histórico deve ser um objeto", resposta.json().get("erro", ""))

    def test_post_historico_item_sem_papel_retorna_400(self):
        """
        Verifica que itens do histórico sem papel ou com papel vazio retornam HTTP 400.
        """
        # Sem campo papel
        res1 = self.client.post(
            self.url,
            {"mensagem": "Oi", "historico": [{"texto": "Olá"}]},
            format="json"
        )
        self.assertEqual(res1.status_code, status.HTTP_400_BAD_REQUEST)

        # Papel vazio
        res2 = self.client.post(
            self.url,
            {"mensagem": "Oi", "historico": [{"papel": "   ", "texto": "Olá"}]},
            format="json"
        )
        self.assertEqual(res2.status_code, status.HTTP_400_BAD_REQUEST)

    def test_post_historico_item_sem_texto_retorna_400(self):
        """
        Verifica que itens do histórico sem conteúdo textual ou com texto vazio retornam HTTP 400.
        """
        # Sem campo texto
        res1 = self.client.post(
            self.url,
            {"mensagem": "Oi", "historico": [{"papel": "usuario"}]},
            format="json"
        )
        self.assertEqual(res1.status_code, status.HTTP_400_BAD_REQUEST)

        # Texto vazio
        res2 = self.client.post(
            self.url,
            {"mensagem": "Oi", "historico": [{"papel": "usuario", "texto": "   "}]},
            format="json"
        )
        self.assertEqual(res2.status_code, status.HTTP_400_BAD_REQUEST)

        # Texto não string
        res3 = self.client.post(
            self.url,
            {"mensagem": "Oi", "historico": [{"papel": "usuario", "texto": 123}]},
            format="json"
        )
        self.assertEqual(res3.status_code, status.HTTP_400_BAD_REQUEST)

    def test_post_historico_papel_desconhecido_retorna_400(self):
        """
        Verifica que papéis não permitidos (sistema, dev, admin, etc.) retornam HTTP 400.
        """
        papeis_invalidos = ["sistema", "system", "desenvolvedor", "developer", "admin", "administrador", "outro"]

        for papel in papeis_invalidos:
            resposta = self.client.post(
                self.url,
                {
                    "mensagem": "Oi",
                    "historico": [{"papel": papel, "texto": "Teste"}]
                },
                format="json"
            )
            self.assertEqual(
                resposta.status_code,
                status.HTTP_400_BAD_REQUEST,
                f"Esperado HTTP 400 para papel '{papel}'"
            )
            self.assertIn("não é permitido no histórico", resposta.json().get("erro", ""))

    @patch("ia.views.consultar_viagens")
    @patch("ia.views.interpretar_mensagem")
    def test_post_historico_encaminha_mensagem_e_historico_corretos(
        self,
        mock_interpretar,
        mock_consultar_viagens,
    ):
        """
        Verifica que mensagens com variantes 'role' e 'content' são normalizadas e encaminhadas corretamente.
        """
        mock_interpretar.return_value = {
            "intencao": "buscar_rota",
            "origem": "Terminal Central",
            "destino": "Praça da Sé",
            "data": None,
            "horario": None,
            "preferencias": {},
            "informacoes_faltantes": [],
            "mensagem": "Calculando a rota."
        }
        mock_consultar_viagens.return_value = {"sucesso": True, "viagens": []}

        payload = {
            "mensagem": "Como chego lá?",
            "historico": [
                {"role": "USER", "content": "Primeira mensagem"},
                {"role": "ASSISTANT", "content": "Segunda mensagem"}
            ]
        }

        resposta = self.client.post(self.url, payload, format="json")

        self.assertEqual(resposta.status_code, status.HTTP_200_OK)
        mock_interpretar.assert_called_once_with(
            "Como chego lá?",
            historico=[
                {"papel": "user", "texto": "Primeira mensagem"},
                {"papel": "assistant", "texto": "Segunda mensagem"}
            ]
        )

    @patch("ia.views.interpretar_mensagem")
    def test_resposta_invalida_do_servico_retorna_502(self, mock_interpretar):
        """
        Verifica se resposta com estrutura inválida (rejeitada pelo serializer) retorna HTTP 502.
        """
        # Resposta inválida: faltando todos os campos obrigatórios
        mock_interpretar.return_value = {"intencao": "desconhecida"}

        resposta = self.client.post(
            self.url,
            {"mensagem": "Qual ônibus passa no centro?"},
            format="json"
        )

        self.assertEqual(resposta.status_code, status.HTTP_502_BAD_GATEWAY)
        self.assertEqual(
            resposta.json(),
            {"erro": "Não foi possível consultar o assistente. Tente novamente."}
        )


class TesteRespostaAgenteSerializer(APITestCase):
    """
    Testes unitários dedicados à validação de esquema e regras do RespostaAgenteSerializer.
    """

    def setUp(self):
        self.payload_valido = {
            "intencao": "buscar_rota",
            "origem": "Terminal Central",
            "destino": "Praça da Sé",
            "data": "2026-11-15",
            "horario": "14:30",
            "preferencias": {"evitar_baldeacoes": True},
            "informacoes_faltantes": [],
            "mensagem": "Calculando o melhor itinerário."
        }

    def test_resposta_completa_valida(self):
        """
        Verifica que um dicionário com todos os campos e tipos corretos é válido.
        """
        serializer = RespostaAgenteSerializer(data=self.payload_valido)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(serializer.validated_data["intencao"], "buscar_rota")

    def test_cada_intencao_permitida(self):
        """
        Verifica que cada uma das quatro intenções permitidas é validada com sucesso.
        """
        intencoes = [
            ("buscar_rota", "Terminal Central", "Praça da Sé", []),
            ("consultar_linha", None, None, ["linha"]),
            ("saudacao", None, None, []),
            ("outro", None, None, []),
        ]

        for intencao, origem, destino, faltantes in intencoes:
            payload = dict(self.payload_valido)
            payload["intencao"] = intencao
            payload["origem"] = origem
            payload["destino"] = destino
            payload["informacoes_faltantes"] = faltantes

            serializer = RespostaAgenteSerializer(data=payload)
            self.assertTrue(serializer.is_valid(), f"Falha na intenção '{intencao}': {serializer.errors}")

    def test_intencao_desconhecida(self):
        """
        Verifica que intenções não previstas são rejeitadas.
        """
        payload = dict(self.payload_valido)
        payload["intencao"] = "intencao_invalida"

        serializer = RespostaAgenteSerializer(data=payload)
        self.assertFalse(serializer.is_valid())
        self.assertIn("intencao", serializer.errors)

    def test_campo_obrigatorio_ausente(self):
        """
        Verifica que a ausência de qualquer um dos 8 campos obrigatórios invalida o serializer.
        """
        campos_obrigatorios = [
            "intencao",
            "origem",
            "destino",
            "data",
            "horario",
            "preferencias",
            "informacoes_faltantes",
            "mensagem",
        ]

        for campo in campos_obrigatorios:
            payload = dict(self.payload_valido)
            del payload[campo]

            serializer = RespostaAgenteSerializer(data=payload)
            self.assertFalse(serializer.is_valid(), f"Esperava erro para campo ausente '{campo}'")
            self.assertIn(campo, serializer.errors)

    def test_tipo_incorreto_em_cada_campo(self):
        """
        Verifica que tipos incorretos em cada campo não são convertidos e geram erro de validação.
        """
        casos_invalidos = [
            ("intencao", 123),
            ("intencao", ["buscar_rota"]),
            ("origem", 123),
            ("origem", ["Terminal Central"]),
            ("destino", 123),
            ("destino", {"nome": "Praça da Sé"}),
            ("data", 123),
            ("data", ["2026-11-15"]),
            ("horario", 123),
            ("horario", True),
            ("preferencias", "preferencias_como_string"),
            ("preferencias", [1, 2, 3]),
            ("informacoes_faltantes", "deveria_ser_lista"),
            ("informacoes_faltantes", [123]),
            ("mensagem", 123),
            ("mensagem", ["texto"]),
            ("mensagem", None),
        ]

        for campo, valor_invalido in casos_invalidos:
            payload = dict(self.payload_valido)
            payload[campo] = valor_invalido

            serializer = RespostaAgenteSerializer(data=payload)
            self.assertFalse(
                serializer.is_valid(),
                f"Esperava erro para campo '{campo}' com valor {valor_invalido}"
            )
            self.assertIn(campo, serializer.errors)

    def test_preferencias_nao_dicionario(self):
        """
        Verifica que o campo 'preferencias' rejeita listas, strings e inteiros.
        """
        for valor in [[], "ar_condicionado", 999, None]:
            payload = dict(self.payload_valido)
            payload["preferencias"] = valor

            serializer = RespostaAgenteSerializer(data=payload)
            self.assertFalse(serializer.is_valid())
            self.assertIn("preferencias", serializer.errors)

    def test_informacoes_faltantes_nao_lista_de_strings(self):
        """
        Verifica que o campo 'informacoes_faltantes' rejeita não-listas e listas com tipos não-string.
        """
        casos = [
            "origem",
            123,
            {"campo": "origem"},
            None,
            [123],
            [None],
            [True],
            [{"campo": "origem"}]
        ]

        for valor in casos:
            payload = dict(self.payload_valido)
            payload["informacoes_faltantes"] = valor

            serializer = RespostaAgenteSerializer(data=payload)
            self.assertFalse(serializer.is_valid(), f"Esperava erro para informacoes_faltantes={valor}")
            self.assertIn("informacoes_faltantes", serializer.errors)

    def test_regra_buscar_rota_validacao_origem_destino_faltantes(self):
        """
        Para buscar_rota, verifica que campos de origem e destino vazios/nulos
        devem ter sua ausência representada em informacoes_faltantes.
        """
        # Caso 1: Origem nula e NÃO está em informacoes_faltantes -> Inválido
        payload1 = dict(self.payload_valido)
        payload1["origem"] = None
        payload1["informacoes_faltantes"] = []
        s1 = RespostaAgenteSerializer(data=payload1)
        self.assertFalse(s1.is_valid())

        # Caso 2: Destino nulo e NÃO está em informacoes_faltantes -> Inválido
        payload2 = dict(self.payload_valido)
        payload2["destino"] = None
        payload2["informacoes_faltantes"] = []
        s2 = RespostaAgenteSerializer(data=payload2)
        self.assertFalse(s2.is_valid())

        # Caso 3: Ambos nulos, mas ambos informados em informacoes_faltantes -> Válido
        payload3 = dict(self.payload_valido)
        payload3["origem"] = None
        payload3["destino"] = None
        payload3["informacoes_faltantes"] = ["origem", "destino"]
        s3 = RespostaAgenteSerializer(data=payload3)
        self.assertTrue(s3.is_valid(), s3.errors)

        # Caso 4: Origem nula representada em faltantes, destino preenchido -> Válido
        payload4 = dict(self.payload_valido)
        payload4["origem"] = None
        payload4["destino"] = "Praça da Sé"
        payload4["informacoes_faltantes"] = ["origem"]
        s4 = RespostaAgenteSerializer(data=payload4)
        self.assertTrue(s4.is_valid(), s4.errors)

    def test_regra_consultar_linha_preserva_solicitacao_em_faltantes(self):
        """
        Verifica que para consultar_linha, a ausência da linha pode ser representada
        em informacoes_faltantes sem violar as regras de validação.
        """
        payload = dict(self.payload_valido)
        payload["intencao"] = "consultar_linha"
        payload["origem"] = None
        payload["destino"] = None
        payload["informacoes_faltantes"] = ["linha"]
        payload["preferencias"] = {}

        serializer = RespostaAgenteSerializer(data=payload)
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_preservacao_de_espacos_originais(self):
        """
        Verifica que espaços nas extremidades de strings válidas são rigorosamente
        preservados pelo serializer, sem aplicação de strip ou trim silencioso.
        """
        payload = dict(self.payload_valido)
        payload["origem"] = "  Terminal Central  "
        payload["destino"] = "  Praça da Sé  "
        payload["data"] = "  2026-11-15  "
        payload["horario"] = "  14:30  "
        payload["informacoes_faltantes"] = ["  origem  "]
        payload["mensagem"] = "  Mensagem com espaços nas pontas.  "

        serializer = RespostaAgenteSerializer(data=payload)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(serializer.validated_data["origem"], "  Terminal Central  ")
        self.assertEqual(serializer.validated_data["destino"], "  Praça da Sé  ")
        self.assertEqual(serializer.validated_data["data"], "  2026-11-15  ")
        self.assertEqual(serializer.validated_data["horario"], "  14:30  ")
        self.assertEqual(serializer.validated_data["informacoes_faltantes"], ["  origem  "])
        self.assertEqual(serializer.validated_data["mensagem"], "  Mensagem com espaços nas pontas.  ")

    def test_rejeicao_strings_apenas_espacos_em_campos_obrigatorios(self):
        """
        Verifica que strings compostas apenas por espaços em branco são rejeitadas
        quando allow_blank=False.
        """
        campos_sem_blank = ["origem", "destino", "data", "horario"]

        for campo in campos_sem_blank:
            payload = dict(self.payload_valido)
            payload[campo] = "   "

            serializer = RespostaAgenteSerializer(data=payload)
            self.assertFalse(
                serializer.is_valid(),
                f"Esperava rejeição para campo '{campo}' contendo apenas espaços."
            )
            self.assertIn(campo, serializer.errors)
            self.assertEqual(serializer.errors[campo][0].code, "blank")

        # Teste para item apenas de espaços em informacoes_faltantes
        payload_faltantes = dict(self.payload_valido)
        payload_faltantes["informacoes_faltantes"] = ["   "]
        s_faltantes = RespostaAgenteSerializer(data=payload_faltantes)
        self.assertFalse(s_faltantes.is_valid())
        self.assertIn("informacoes_faltantes", s_faltantes.errors)

    def test_strict_char_field_comportamento_isolado(self):
        """
        Testes unitários isolados para StrictCharField cobrindo:
        - Rejeição de tipos não-string.
        - Preservação de espaços.
        - Rejeição de vazio/apenas espaços quando allow_blank=False.
        - Aceitação e preservação de vazio/espaços quando allow_blank=True.
        - Aceitação de None quando allow_null=True.
        """
        # allow_blank=False (padrão)
        campo_padrao = StrictCharField()
        self.assertEqual(campo_padrao.run_validation("  texto  "), "  texto  ")

        with self.assertRaises(serializers.ValidationError) as ctx_vazio:
            campo_padrao.run_validation("")
        self.assertEqual(ctx_vazio.exception.detail[0].code, "blank")

        with self.assertRaises(serializers.ValidationError) as ctx_espacos:
            campo_padrao.run_validation("     ")
        self.assertEqual(ctx_espacos.exception.detail[0].code, "blank")

        # allow_blank=True
        campo_blank = StrictCharField(allow_blank=True)
        self.assertEqual(campo_blank.run_validation(""), "")
        self.assertEqual(campo_blank.run_validation("   "), "   ")
        self.assertEqual(campo_blank.run_validation("  texto com espaços  "), "  texto com espaços  ")

        # allow_null=True
        campo_null = StrictCharField(allow_null=True)
        self.assertIsNone(campo_null.run_validation(None))

        # Tipos não-string
        for valor_invalido in [123, True, False, 45.6, ["a"], {"a": 1}]:
            with self.assertRaises(serializers.ValidationError) as ctx_tipo:
                campo_padrao.run_validation(valor_invalido)
            self.assertEqual(ctx_tipo.exception.detail[0].code, "invalid")


class TesteRotasService(APITestCase):
    """
    Testes unitários para a camada de integração entre a IA e o módulo rotas (rotas_service.py).
    """

    def setUp(self):
        self.coordenadas_origem = {
            "latitude": -8.0522,
            "longitude": -34.8872,
            "nome_completo": "Avenida Conde da Boa Vista, Recife - PE",
        }
        self.coordenadas_destino = {
            "latitude": -8.0556,
            "longitude": -34.9515,
            "nome_completo": "Universidade Federal de Pernambuco, Recife - PE",
        }
        self.viagem_exemplo = {
            "tipo": "direta",
            "duracao_minutos": 35,
            "linha": "202",
            "nome_linha": "TI Barro / TI Macaxeira",
            "origem": "Parada 1",
            "destino": "Parada 2",
        }

    # 1. Testes de normalização de data
    def test_normalizar_data_hoje_amanha_e_padroes(self):
        """
        Verifica a correta normalização de 'hoje', 'amanhã', strings vazias e datas ISO/BR.
        """
        hoje_str = normalizar_data("hoje")
        self.assertRegex(hoje_str, r"^\d{4}-\d{2}-\d{2}$")

        amanha_str = normalizar_data("amanhã")
        self.assertRegex(amanha_str, r"^\d{4}-\d{2}-\d{2}$")
        self.assertNotEqual(hoje_str, amanha_str)

        # Sem acento
        self.assertEqual(normalizar_data("amanha"), amanha_str)

        # None ou vazio assume hoje
        self.assertEqual(normalizar_data(None), hoje_str)
        self.assertEqual(normalizar_data("   "), hoje_str)

        # Formato ISO
        self.assertEqual(normalizar_data("2026-12-25"), "2026-12-25")

        # Formato brasileiro
        self.assertEqual(normalizar_data("25/12/2026"), "2026-12-25")

    def test_normalizar_data_invalida_lanca_erro(self):
        """
        Verifica que datas inválidas ou em formatos desconhecidos disparam ValueError.
        """
        for data_invalida in ["ontem", "32/13/2026", "2026-99-99", "semana_passada"]:
            with self.assertRaises(ValueError):
                normalizar_data(data_invalida)

    # 2. Testes de normalização de horário
    def test_normalizar_horario_padroes_e_h(self):
        """
        Verifica a correta normalização para o padrão HH:MM:SS exigido pelo GTFS.
        """
        self.assertEqual(normalizar_horario("14:30"), "14:30:00")
        self.assertEqual(normalizar_horario("08:15:30"), "08:15:30")
        self.assertEqual(normalizar_horario("14h30"), "14:30:00")
        self.assertEqual(normalizar_horario("9h"), "09:00:00")

        # None ou vazio assume horário atual
        horario_atual = normalizar_horario(None)
        self.assertRegex(horario_atual, r"^\d{2}:\d{2}:\d{2}$")

    def test_normalizar_horario_invalido_lanca_erro(self):
        """
        Verifica que horários inválidos disparam ValueError.
        """
        for h_invalido in ["25:00", "14:65", "meio-dia", "abc"]:
            with self.assertRaises(ValueError):
                normalizar_horario(h_invalido)

    # 3. Testes de consultar_viagens
    @patch("ia.rotas_service.buscar_viagens")
    @patch("ia.rotas_service.buscar_coordenadas")
    def test_consultar_viagens_sucesso_com_opcoes(self, mock_coords, mock_viagens):
        """
        Verifica fluxo com êxito na geocodificação e no retorno de opções de viagem.
        """
        mock_coords.side_effect = [
            self.coordenadas_origem,
            self.coordenadas_destino,
        ]
        mock_viagens.return_value = [self.viagem_exemplo]

        resultado = consultar_viagens(
            origem="Boa Vista",
            destino="UFPE",
            data="2026-11-20",
            horario="14:30",
        )

        self.assertTrue(resultado["sucesso"])
        self.assertEqual(resultado["total_opcoes"], 1)
        self.assertEqual(resultado["viagens"], [self.viagem_exemplo])
        self.assertEqual(resultado["data"], "2026-11-20")
        self.assertEqual(resultado["horario"], "14:30:00")
        self.assertTrue(resultado["permitir_integracao"])

        mock_viagens.assert_called_once_with(
            latitude_origem=-8.0522,
            longitude_origem=-34.8872,
            latitude_destino=-8.0556,
            longitude_destino=-34.9515,
            data_viagem="2026-11-20",
            horario_minimo="14:30:00",
            permitir_integracao=True,
        )

    @patch("ia.rotas_service.buscar_viagens")
    @patch("ia.rotas_service.buscar_coordenadas")
    def test_consultar_viagens_respeita_evitar_baldeacoes(self, mock_coords, mock_viagens):
        """
        Verifica que a preferência 'evitar_baldeacoes' desabilita permitir_integracao.
        """
        mock_coords.side_effect = [
            self.coordenadas_origem,
            self.coordenadas_destino,
        ]
        mock_viagens.return_value = [self.viagem_exemplo]

        resultado = consultar_viagens(
            origem="Boa Vista",
            destino="UFPE",
            preferencias={"evitar_baldeacoes": True},
        )

        self.assertTrue(resultado["sucesso"])
        self.assertFalse(resultado["permitir_integracao"])
        _, kwargs = mock_viagens.call_args
        self.assertFalse(kwargs["permitir_integracao"])

    @patch("ia.rotas_service.buscar_viagens")
    @patch("ia.rotas_service.buscar_coordenadas")
    def test_consultar_viagens_preserva_preferencias_nao_suportadas(
        self,
        mock_coords,
        mock_viagens,
    ):
        mock_coords.side_effect = [
            self.coordenadas_origem,
            self.coordenadas_destino,
        ]
        mock_viagens.return_value = [self.viagem_exemplo]

        resultado = consultar_viagens(
            origem="Boa Vista",
            destino="UFPE",
            preferencias={
                "ar_condicionado": True,
                "mais_rapido": True,
                "menor_caminhada": True,
            },
        )

        self.assertTrue(resultado["sucesso"])
        self.assertEqual(
            resultado["preferencias_nao_atendidas"],
            ["ar_condicionado", "mais_rapido", "menor_caminhada"],
        )
        _, kwargs = mock_viagens.call_args
        self.assertTrue(kwargs["permitir_integracao"])

    @patch("ia.rotas_service.buscar_coordenadas")
    def test_consultar_viagens_rejeita_preferencia_desconhecida(
        self,
        mock_coords,
    ):
        resultado = consultar_viagens(
            origem="Boa Vista",
            destino="UFPE",
            preferencias={"veiculo_eletrico": True},
        )

        self.assertFalse(resultado["sucesso"])
        self.assertEqual(resultado["tipo_erro"], "preferencias_invalidas")
        self.assertIn("veiculo_eletrico", resultado["erro"])
        mock_coords.assert_not_called()

    @patch("ia.rotas_service.buscar_viagens")
    @patch("ia.rotas_service.buscar_coordenadas")
    def test_consultar_viagens_linha_nao_e_filtro_aplicado(
        self,
        mock_coords,
        mock_viagens,
    ):
        mock_coords.side_effect = [
            self.coordenadas_origem,
            self.coordenadas_destino,
        ]
        mock_viagens.return_value = [self.viagem_exemplo]

        resultado = consultar_viagens(
            origem="Boa Vista",
            destino="UFPE",
            preferencias={"linha": "202"},
        )

        self.assertTrue(resultado["sucesso"])
        self.assertEqual(resultado["preferencias_nao_atendidas"], ["linha"])
        _, kwargs = mock_viagens.call_args
        self.assertNotIn("linha", kwargs)

    @patch("ia.rotas_service.buscar_coordenadas")
    def test_consultar_viagens_linha_deve_ser_texto_nao_vazio(self, mock_coords):
        resultado = consultar_viagens(
            origem="Boa Vista",
            destino="UFPE",
            preferencias={"linha": True},
        )

        self.assertFalse(resultado["sucesso"])
        self.assertEqual(resultado["tipo_erro"], "preferencias_invalidas")
        self.assertIn("linha", resultado["erro"])
        mock_coords.assert_not_called()

    @patch("ia.rotas_service.buscar_viagens")
    @patch("ia.rotas_service.buscar_coordenadas")
    def test_consultar_viagens_sem_opcoes(self, mock_coords, mock_viagens):
        """
        Verifica o retorno amigável quando o GTFS não encontra opções para o horário.
        """
        mock_coords.side_effect = [
            self.coordenadas_origem,
            self.coordenadas_destino,
        ]
        mock_viagens.return_value = []

        resultado = consultar_viagens(
            origem="Boa Vista",
            destino="UFPE",
        )

        self.assertTrue(resultado["sucesso"])
        self.assertEqual(resultado["total_opcoes"], 0)
        self.assertEqual(resultado["viagens"], [])
        self.assertIn("Nenhuma opção de viagem encontrada", resultado.get("mensagem", ""))

    @patch("ia.rotas_service.buscar_coordenadas")
    def test_consultar_viagens_origem_nao_encontrada(self, mock_coords):
        """
        Verifica o tratamento quando o endereço de origem não é localizado pelo Nominatim.
        """
        mock_coords.return_value = {"erro": "Endereço não encontrado."}

        resultado = consultar_viagens(origem="Local Inexistente 123", destino="UFPE")

        self.assertFalse(resultado["sucesso"])
        self.assertEqual(resultado["tipo_erro"], "endereco_nao_encontrado")
        self.assertEqual(resultado["campo"], "origem")
        self.assertIn("Origem", resultado["erro"])

    @patch("ia.rotas_service.buscar_coordenadas")
    def test_consultar_viagens_destino_nao_encontrado(self, mock_coords):
        """
        Verifica o tratamento quando a origem é encontrada mas o destino não é localizado.
        """
        mock_coords.side_effect = [
            self.coordenadas_origem,
            {"erro": "Endereço não encontrado."},
        ]

        resultado = consultar_viagens(origem="Boa Vista", destino="Destino Desconhecido")

        self.assertFalse(resultado["sucesso"])
        self.assertEqual(resultado["tipo_erro"], "endereco_nao_encontrado")
        self.assertEqual(resultado["campo"], "destino")
        self.assertIn("Destino", resultado["erro"])

    @patch("ia.rotas_service.buscar_coordenadas")
    def test_consultar_viagens_falha_geocodificacao(self, mock_coords):
        """
        Verifica o tratamento quando a chamada ao Nominatim falha por erro de rede/serviço.
        """
        mock_coords.side_effect = Exception("Timeout no serviço de geocodificação")

        resultado = consultar_viagens(origem="Boa Vista", destino="UFPE")

        self.assertFalse(resultado["sucesso"])
        self.assertEqual(resultado["tipo_erro"], "falha_geocodificacao")
        self.assertEqual(resultado["erro"], "Não foi possível localizar a origem.")
        self.assertNotIn("Timeout no serviço", resultado["erro"])

    @patch("ia.rotas_service.buscar_coordenadas")
    def test_consultar_viagens_coordenadas_invalidas(self, mock_coords):
        mock_coords.side_effect = [
            {"latitude": "invalida", "longitude": -34.8872},
            self.coordenadas_destino,
        ]

        resultado = consultar_viagens(origem="Boa Vista", destino="UFPE")

        self.assertFalse(resultado["sucesso"])
        self.assertEqual(resultado["tipo_erro"], "coordenadas_invalidas")
        self.assertEqual(resultado["campo"], "origem")

    def test_consultar_viagens_data_ou_horario_invalido(self):
        """
        Verifica que dados incorretos de data e horário retornam erro tratado sem exceções não capturadas.
        """
        res_data = consultar_viagens(origem="A", destino="B", data="data_invalida")
        self.assertFalse(res_data["sucesso"])
        self.assertEqual(res_data["tipo_erro"], "data_invalida")

        res_horario = consultar_viagens(origem="A", destino="B", horario="horario_invalido")
        self.assertFalse(res_horario["sucesso"])
        self.assertEqual(res_horario["tipo_erro"], "horario_invalido")

    def test_consultar_viagens_origem_destino_vazios(self):
        """
        Verifica a rejeição quando origem ou destino não são informados.
        """
        res_origem = consultar_viagens(origem="", destino="UFPE")
        self.assertFalse(res_origem["sucesso"])
        self.assertEqual(res_origem["tipo_erro"], "origem_obrigatoria")

        res_destino = consultar_viagens(origem="Boa Vista", destino="   ")
        self.assertFalse(res_destino["sucesso"])
        self.assertEqual(res_destino["tipo_erro"], "destino_obrigatorio")

    @patch("ia.rotas_service.buscar_coordenadas")
    def test_consultar_viagens_preferencias_invalidas_nao_geocodifica(
        self,
        mock_coords,
    ):
        resultado = consultar_viagens(
            origem="Boa Vista",
            destino="UFPE",
            preferencias=["evitar_baldeacoes"],
        )

        self.assertFalse(resultado["sucesso"])
        self.assertEqual(resultado["tipo_erro"], "preferencias_invalidas")
        mock_coords.assert_not_called()

    @patch("ia.rotas_service.buscar_coordenadas")
    def test_consultar_viagens_preferencias_booleanas_invalidas(self, mock_coords):
        for nome_preferencia in (
            "evitar_baldeacoes",
            "ar_condicionado",
            "mais_rapido",
            "menor_caminhada",
            "permitir_integracao",
        ):
            with self.subTest(preferencia=nome_preferencia):
                resultado = consultar_viagens(
                    origem="Boa Vista",
                    destino="UFPE",
                    preferencias={nome_preferencia: "false"},
                )

                self.assertFalse(resultado["sucesso"])
                self.assertEqual(
                    resultado["tipo_erro"],
                    "preferencias_invalidas",
                )

        mock_coords.assert_not_called()

    @patch("ia.rotas_service.buscar_coordenadas")
    def test_consultar_viagens_rejeita_conflito_de_integracao(self, mock_coords):
        resultado = consultar_viagens(
            origem="Boa Vista",
            destino="UFPE",
            preferencias={
                "evitar_baldeacoes": True,
                "permitir_integracao": True,
            },
        )

        self.assertFalse(resultado["sucesso"])
        self.assertEqual(resultado["tipo_erro"], "preferencias_invalidas")
        self.assertIn("incompatíveis", resultado["erro"])
        mock_coords.assert_not_called()

    @patch("ia.rotas_service.buscar_viagens")
    @patch("ia.rotas_service.buscar_coordenadas")
    def test_consultar_viagens_rejeita_retorno_gtfs_invalido(
        self,
        mock_coords,
        mock_viagens,
    ):
        mock_coords.side_effect = [
            self.coordenadas_origem,
            self.coordenadas_destino,
        ]
        mock_viagens.return_value = {"viagens": []}

        resultado = consultar_viagens(origem="Boa Vista", destino="UFPE")

        self.assertFalse(resultado["sucesso"])
        self.assertEqual(resultado["tipo_erro"], "retorno_gtfs_invalido")
        self.assertNotIn("viagens", resultado)

    @patch("ia.rotas_service.buscar_viagens")
    @patch("ia.rotas_service.buscar_coordenadas")
    def test_consultar_viagens_erro_gtfs(self, mock_coords, mock_viagens):
        """
        Verifica o tratamento quando o leitor GTFS dispara ErroGTFS.
        """
        mock_coords.side_effect = [
            self.coordenadas_origem,
            self.coordenadas_destino,
        ]
        mock_viagens.side_effect = ErroGTFS("Arquivo stop_times.txt corrompido.")

        resultado = consultar_viagens(origem="Boa Vista", destino="UFPE")

        self.assertFalse(resultado["sucesso"])
        self.assertEqual(resultado["tipo_erro"], "erro_gtfs")
        self.assertIn("GTFS", resultado["erro"])

    # 4. Testes de consultar_linha
    @patch("ia.rotas_service.buscar_itinerario")
    @patch("ia.rotas_service.buscar_linha")
    def test_consultar_linha_sucesso_com_itinerario(self, mock_linha, mock_itinerario):
        """
        Verifica a consulta bem-sucedida de linha e seu respectivo itinerário.
        """
        linha_mock = {
            "route_id": "1",
            "route_short_name": "202",
            "route_long_name": "TI Barro / TI Macaxeira",
        }
        itinerario_mock = {
            "linha": "202",
            "nome": "TI Barro / TI Macaxeira",
            "sentido": "0",
            "paradas": [{"nome": "Terminal do Barro"}],
        }

        mock_linha.return_value = linha_mock
        mock_itinerario.return_value = itinerario_mock

        resultado = consultar_linha("202", sentido="0")

        self.assertTrue(resultado["sucesso"])
        self.assertEqual(resultado["linha"], linha_mock)
        self.assertEqual(resultado["itinerario"], itinerario_mock)
        mock_linha.assert_called_once_with("202")
        mock_itinerario.assert_called_once_with("202", sentido="0")

    @patch("ia.rotas_service.buscar_linha")
    def test_consultar_linha_inexistente(self, mock_linha):
        """
        Verifica o tratamento quando a linha não existe no GTFS.
        """
        mock_linha.return_value = None

        resultado = consultar_linha("99999")

        self.assertFalse(resultado["sucesso"])
        self.assertEqual(resultado["tipo_erro"], "linha_nao_encontrada")
        self.assertIsNone(resultado["linha"])
        self.assertIsNone(resultado["itinerario"])
        self.assertIn("não encontrada", resultado["erro"])

    @patch("ia.rotas_service.buscar_itinerario")
    @patch("ia.rotas_service.buscar_linha")
    def test_consultar_linha_itinerario_indisponivel(self, mock_linha, mock_itinerario):
        """
        Verifica o comportamento quando a linha existe mas o itinerário não está disponível.
        """
        linha_mock = {
            "route_id": "1",
            "route_short_name": "202",
            "route_long_name": "TI Barro / TI Macaxeira",
        }
        mock_linha.return_value = linha_mock
        mock_itinerario.return_value = None

        resultado = consultar_linha("202", sentido="1")

        self.assertTrue(resultado["sucesso"])
        self.assertEqual(resultado["linha"], linha_mock)
        self.assertIsNone(resultado["itinerario"])
        self.assertIn("Itinerário não disponível", resultado.get("aviso", ""))

    @patch("ia.rotas_service.buscar_linha")
    def test_consultar_linha_erro_gtfs(self, mock_linha):
        """
        Verifica o tratamento de ErroGTFS durante a consulta de linha.
        """
        mock_linha.side_effect = ErroGTFS("Falha ao abrir routes.txt")

        resultado = consultar_linha("202")

        self.assertFalse(resultado["sucesso"])
        self.assertEqual(resultado["tipo_erro"], "erro_gtfs")

    def test_consultar_linha_codigo_vazio(self):
        """
        Verifica a validação de código vazio ou nulo na consulta de linha.
        """
        self.assertFalse(consultar_linha("")["sucesso"])
        self.assertFalse(consultar_linha(None)["sucesso"])



