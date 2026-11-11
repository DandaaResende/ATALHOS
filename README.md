# 🚌 Atalhos — O aplicativo que encurta seu percurso

**Atalhos** é uma plataforma inteligente de mobilidade urbana que utiliza agentes de Inteligência Artificial para ajudar passageiros a planejar seus deslocamentos no transporte público.

Por meio de uma interação em linguagem natural, o usuário pode informar seu destino, suas preferências e suas necessidades. A plataforma analisa as informações disponíveis e recomenda alternativas de trajeto personalizadas.

> **Mais do que indicar caminhos, queremos ajudar cada passageiro a decidir como chegar ao seu destino.**

---

## Objetivo do projeto

Tornar o transporte público mais acessível, previsível e fácil de utilizar, oferecendo informações contextualizadas e recomendações que consideram as necessidades individuais de cada passageiro.

## Principais funcionalidades

- **Planejamento inteligente de trajetos:** recomenda caminhos considerando as necessidades e preferências do passageiro.
- **Interação por linguagem natural:** permite que o usuário faça solicitações de maneira simples e conversacional.
- **Informações contextualizadas:** consulta uma base de conhecimento sobre linhas, itinerários e funcionamento do transporte público.
- **Recomendações personalizadas:** avalia diferentes alternativas para indicar opções adequadas à realidade do usuário.
- **Avaliações de viagens e motoristas:** permite registrar avaliações vinculadas ao número do veículo e à data e horário do percurso.

## Inteligência Artificial

A solução utiliza uma arquitetura **multi-agente**, na qual diferentes agentes especializados colaboram para interpretar solicitações, consultar informações e avaliar alternativas de deslocamento.

| Tecnologia | Aplicação |
|---|---|
| **Gemini** | Modelo de linguagem responsável pela interpretação de solicitações e geração de respostas. |
| **Groq** | Plataforma de inferência utilizada para executar modelos de linguagem com baixa latência. |
| **RAG** | Técnica que permite consultar uma base de conhecimento antes de gerar respostas, fornecendo informações mais contextualizadas. |
| **Python** | Desenvolvimento e integração das funcionalidades de IA e processamento de dados. |


## Visão geral da arquitetura

```text
              ┌──────────────────┐
              │    FRONTEND      │
              │ React + TS       │
              └────────┬─────────┘
                       │
                       ▼
              ┌──────────────────┐
              │    BACKEND       │
              │   TypeScript     │
              └────────┬─────────┘
                       │
              ┌────────┴─────────┐
              ▼                  ▼
      ┌──────────────┐   ┌──────────────┐
      │  Agentes IA  │   │  Banco de    │
      │ Python       │   │  Dados       │
      │ Gemini/Groq  │   │ PostgreSQL   │
      │ RAG          │   │ SQLite       │
      └──────────────┘   └──────────────┘
```

## Nosso diferencial

Enquanto soluções convencionais se concentram em indicar rotas, o **Atalhos** busca auxiliar o passageiro na tomada de decisão.

A plataforma considera que cada pessoa possui necessidades diferentes e que o melhor trajeto nem sempre é simplesmente o mais curto.

## Impacto esperado

- Maior autonomia para os passageiros.
- Mais previsibilidade nos deslocamentos.
- Facilidade de acesso às informações do transporte público.
- Recomendações mais adequadas às necessidades individuais.
- Melhoria na experiência de utilização do transporte coletivo.

---

<details>
<summary>📋 Entregas e atividades por área (CC e Design)</summary>

### 💻 Ciência da Computação (CC)

- [ ] Definição da arquitetura geral do sistema.
- [ ] Estruturação do backend e das APIs.
- [ ] Modelagem e implementação do banco de dados.
- [ ] Desenvolvimento e integração dos agentes de IA.
- [ ] Implementação da estratégia RAG e da base de conhecimento.
- [ ] Integração entre frontend, backend e serviços de IA.
- [ ] Testes das funcionalidades e integração.
- [ ] Documentação técnica e instruções de execução.

### 🎨 Design

- [ ] Definição da identidade visual e linguagem gráfica.
- [ ] Pesquisa com usuários e levantamento de necessidades.
- [ ] Definição das personas e jornadas dos passageiros.
- [ ] Mapeamento dos fluxos de navegação.
- [ ] Criação dos wireframes.
- [ ] Desenvolvimento do protótipo de alta fidelidade.
- [ ] Definição dos componentes e padrões visuais.
- [ ] Testes de usabilidade e validação da experiência.

</details>

---

## 📌 Status do projeto

🚧 Em desenvolvimento.

---

**Atalhos — Menos incerteza, mais caminhos.** 🚌
