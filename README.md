# Cronos Labs

Aplicacao web para acompanhamento longitudinal de exames laboratoriais. Faz upload de laudos em PDF, extrai os resultados automaticamente via GPT-4o e exibe o historico em graficos interativos ao longo do tempo.

---

## Visao geral

O fluxo principal e simples: voce envia um ou mais PDFs de exames, o backend chama a API da OpenAI para extrair os dados em JSON estruturado, e o frontend exibe tudo organizado por categoria com graficos de evolucao temporal. Cada coleta fica registrada com sua data original e os valores sao comparados com os valores de referencia para indicar alteracoes.

O sistema tambem funciona em **modo demonstracao** — sem backend, sem API key — carregando 10 anos de dados ficticios diretamente no frontend.

---

## Funcionalidades

**Dashboard**
Visao consolidada de todos os exames com o valor mais recente, indicador de tendencia (acima / normal / abaixo do valor de referencia) e sparkline de evolucao. Filtros rapidos por painel: Hemograma, Lipidograma, Tireoide, Vitaminas e outros.

**Graficos**
Grafico de linha interativo para qualquer exame, com linha de referencia sobreposta e navegacao por categoria. Clique em qualquer card do dashboard para abrir diretamente o grafico do exame.

**Tabela**
Visao cruzada de todas as coletas em formato de tabela, com destaque visual para valores fora da referencia.

**Adicionar exames**
Upload de PDFs via drag-and-drop. Suporta multiplos arquivos simultaneamente. O backend usa cache por hash SHA-256 do arquivo para evitar chamadas duplicadas a API.

**Gerenciar**
Ferramentas de qualidade do banco de dados:
- Deteccao e unificacao de chaves duplicadas (mesmo exame com nomes diferentes entre laudos)
- Deteccao de conflitos de unidade (mesmo exame em unidades diferentes ao longo do tempo)
- Conversao de unidades em massa
- Normalizacao automatica do banco
- Reset completo dos dados

**Exportar**
Exportacao do banco completo em JSON.

---

## Modo demonstracao

O frontend inicia em modo demonstracao por padrao, sem necessidade de backend rodando. Os dados representam 10 coletas anuais (2015-2024) de um adulto do sexo masculino com evolucao clinica realista: deficit de vitamina D corrigido em 2019, pre-diabetes emergindo a partir de 2021, dislipidemia instalada em 2022, declinio progressivo de testosterona, inflamacao aguda em 2020 e deficiencia cronica de selenio.

Um aviso discreto no canto inferior da tela indica que os dados sao ficticios.

Para desativar o modo demonstracao e usar o backend real, crie um arquivo `.env.local` dentro de `front/` com:

```
VITE_DEMO=false
```

---

## Requisitos

**Backend**
- Python 3.11+
- Chave de API da OpenAI (`OPENAI_API_KEY`)

**Frontend**
- Node.js 18+

---

## Instalacao e execucao

**Backend**

```bash
# Crie e ative o ambiente virtual
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Instale as dependencias
pip install -r requirements.txt

# Configure a chave da OpenAI
echo "OPENAI_API_KEY=sk-..." > .env

# Inicie o servidor
python app.py
```

O backend sobe em `http://localhost:5000`.

**Frontend**

```bash
cd front
npm install
npm run dev
```

O frontend sobe em `http://localhost:3002` e faz proxy automatico das rotas `/api` e `/process` para o backend.

---

## Estrutura do projeto

```
cronos-labs/
  app.py                  # servidor Flask + integracao OpenAI
  unit_converter.py       # conversao e normalizacao de unidades
  requirements.txt
  templates/
    index.html            # fallback HTML
  front/
    src/
      pages/              # Dashboard, Graficos, Tabela, Adicionar, Gerenciar, Exportar
      components/         # Layout, Sidebar, Sparkline, ExamLineChart
      store/
        examStore.jsx     # contexto global + modo demo
      data/
        mockData.js       # 10 coletas ficticias para demonstracao
      utils/
        examUtils.js      # parsing, formatacao, filtros, deteccao de conflitos
```

---

## Formato do banco de dados

Os dados ficam em `data/db.json` com a seguinte estrutura:

```json
{
  "dd-mm-aaaa": {
    "chave_canonica": {
      "nome": "Nome do exame",
      "categoria": "Categoria",
      "valor": "valor exato do laudo",
      "unidade": "mg/dL",
      "valor_referencia": "70 - 99"
    }
  }
}
```

Cada chave de nivel superior e uma data de coleta. O GPT-4o extrai os valores com fidelidade absoluta ao laudo original, sem interpretar ou converter unidades.

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Backend | Python, Flask, OpenAI API (GPT-4o) |
| Frontend | React 18, Vite, Tailwind CSS, Recharts |
| Armazenamento | JSON local (arquivo unico) |
