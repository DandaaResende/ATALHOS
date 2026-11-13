import json
import os
from unittest.mock import MagicMock, patch

from django.urls import reverse
from google.genai import types
from rest_framework import serializers, status
from rest_framework.test import APITestCase

from ia.serializers import RespostaAgenteSerializer, StrictCharField
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

    @patch("ia.views.interpretar_mensagem")
    def test_post_mensagem_valida_com_historico_retorna_200(self, mock_interpretar):
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
        self.assertEqual(resposta.json(), dados_esperados)
        mock_interpretar.assert_called_once_with(
            "Qual ônibus passa perto do Terminal da Macaxeira?",
            historico=[
                {"papel": "usuario", "texto": "Quero chegar à UFPE."},
                {"papel": "assistente", "texto": "De onde você vai sair?"}
            ]
        )

    @patch("ia.views.interpretar_mensagem")
    def test_post_historico_omitido_nulo_e_vazio(self, mock_interpretar):
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

    @patch("ia.views.interpretar_mensagem")
    def test_post_historico_encaminha_mensagem_e_historico_corretos(self, mock_interpretar):
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



