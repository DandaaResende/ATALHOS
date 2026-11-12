# AGENTS.md — ATALHOS

## 1. Sobre o projeto

ATALHOS é um projeto de mobilidade urbana que busca ajudar usuários a encontrar e compreender opções de transporte público por meio de uma interface inteligente.

O sistema utiliza inteligência artificial para interpretar solicitações em linguagem natural e se comunica com um backend responsável pelo processamento e consulta de rotas.

## 2. Tecnologias utilizadas

- Python 3.12
- Django 5.2
- Django REST Framework
- Google Gemini API
- SDK oficial `google-genai`
- Banco de dados e arquivos GTFS utilizados pelo módulo de rotas.

## 3. Arquitetura do projeto

O backend está dividido em aplicativos com responsabilidades distintas.

### Aplicativo `ia`

Responsável por:
- Interpretar mensagens dos usuários.
- Identificar origem, destino, horário, data e preferências.
- Solicitar informações adicionais quando necessário.
- Disponibilizar endpoints para o frontend.
- Preparar os dados interpretados para consulta ao sistema de rotas, respeitando a separação de responsabilidades entre os aplicativos.

Arquivos principais:
- `prompts.py`: instruções do agente.
- `services.py`: comunicação com o Gemini.
- `views.py`: endpoints HTTP.
- `urls.py`: rotas da API.
- `tests.py`: testes automatizados.

### Aplicativo `rotas`

Responsável por:
- Consultar dados GTFS.
- Processar informações de linhas e paradas.
- Calcular e disponibilizar opções de deslocamento.

**Importante:** não modificar o aplicativo `rotas` sem necessidade e sem alinhar previamente com a pessoa responsável por esse módulo.

## 4. Regras de desenvolvimento

- Utilize Python 3.12 e respeite as dependências existentes.
- Escreva código simples, legível e organizado.
- Utilize nomes de variáveis e funções em português, seguindo o padrão existente.
- Evite duplicação de código.
- Separe responsabilidades entre views, services e prompts.
- Não introduza dependências sem necessidade.
- Não faça alterações em módulos de outros integrantes sem autorização.
- Não substitua funcionalidades existentes sem compreender sua finalidade.

## 5. Regras para inteligência artificial

- Utilize o SDK oficial `google-genai`.
- O modelo atualmente configurado é `gemini-3.5-flash`.
- A chave da API deve ser carregada pela variável de ambiente `GEMINI_API_KEY`.
- Nunca exponha chaves, tokens ou credenciais.
- Não coloque informações sensíveis diretamente no código.
- Valide e trate as respostas do modelo.
- Não confie cegamente nas informações produzidas pelo Gemini.
- O Gemini interpreta as solicitações; o sistema de rotas é responsável pelos cálculos e dados reais.
- Nunca invente linhas, horários, paradas ou itinerários.

## 6. Testes e qualidade

- Escreva testes automatizados para novas funcionalidades.
- Utilize mocks para simular serviços externos, como a API do Gemini.
- Não realize chamadas reais ao Gemini durante testes unitários.
- Execute `python manage.py check` após alterações no backend.
- Execute `python manage.py test ia` para testar o aplicativo de IA.
- Não considere uma funcionalidade concluída sem verificar seu funcionamento.

## 7. Segurança

- Nunca leia, imprima ou compartilhe o conteúdo real do `.env`.
- Mantenha `.env` fora do Git.
- Atualize `.env.example` quando novas variáveis de ambiente forem adicionadas.
- Não remova validações de entrada.
- Trate erros de serviços externos sem expor informações internas ao usuário.

## 8. Forma de trabalhar

Antes de implementar qualquer funcionalidade:

1. Analise os arquivos relacionados.
2. Entenda a arquitetura existente.
3. Identifique quais arquivos precisam ser modificados.
4. Explique brevemente a abordagem proposta.
5. Evite alterações fora do escopo solicitado.

Durante a implementação:

- Faça alterações pequenas e organizadas.
- Preserve funcionalidades existentes.
- Não reescreva arquivos inteiros sem necessidade.

Ao terminar:

1. Informe os arquivos criados e modificados.
2. Explique as alterações realizadas.
3. Execute os testes pertinentes.
4. Informe erros encontrados e limitações.
5. Não afirme que testes passaram sem executá-los.