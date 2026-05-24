import os
import base64
import hashlib
import json
import re
from pathlib import Path
from dotenv import load_dotenv
from flask import Flask, request, jsonify, render_template
from openai import OpenAI
from werkzeug.utils import secure_filename
from unit_converter import convert_exam_to_target, norm_unit, auto_normalize_dataset

load_dotenv()

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = None

client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

DATA_DIR = Path("data")
DATA_DIR.mkdir(exist_ok=True)
DB_FILE = DATA_DIR / "db.json"


# ── migrate cache/ → data/ on first run ──────────────────────────────────────
def migrate_cache():
    old_cache = Path("cache")
    if not old_cache.exists():
        return
    files = list(old_cache.glob("*.json"))
    if not files:
        return
    merged: dict = {}
    for f in files:
        try:
            d = json.loads(f.read_text(encoding="utf-8"))
            dest = DATA_DIR / f.name
            if not dest.exists():
                dest.write_bytes(f.read_bytes())
            for date, exams in d.items():
                if date in merged:
                    merged[date].update(exams)
                else:
                    merged[date] = exams
        except Exception:
            pass
    if merged and not DB_FILE.exists():
        DB_FILE.write_text(json.dumps(merged, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"[migrate] {len(files)} arquivo(s) migrados de cache/ → data/")


migrate_cache()


# ── db helpers ────────────────────────────────────────────────────────────────
def load_db() -> dict:
    if DB_FILE.exists():
        return json.loads(DB_FILE.read_text(encoding="utf-8"))
    return {}


def save_db(data: dict) -> None:
    DB_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def merge_into_db(new_data: dict) -> dict:
    """Merge keep-first: nunca sobrescreve chave já existente na mesma data."""
    db = load_db()
    for date, exams in new_data.items():
        if date not in db:
            db[date] = {}
        for key, exam in exams.items():
            if key not in db[date]:          # dedup exato: mantém o primeiro
                db[date][key] = exam
    save_db(db)
    return db


# ── pdf cache helpers ─────────────────────────────────────────────────────────
def pdf_cache_key(pdf_bytes: bytes) -> str:
    return hashlib.sha256(pdf_bytes).hexdigest()


def load_pdf_cache(key: str) -> dict | None:
    path = DATA_DIR / f"{key}.json"
    if path.exists():
        return json.loads(path.read_text(encoding="utf-8"))
    return None


def save_pdf_cache(key: str, data: dict) -> None:
    path = DATA_DIR / f"{key}.json"
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


# ── prompts ───────────────────────────────────────────────────────────────────
SYSTEM_PROMPT = (
    "Você converte laudos médicos em PDF em JSON estruturado, com fidelidade absoluta ao laudo original. "
    "Você extrai — nunca interpreta, classifica ou converte valores entre unidades."
)

USER_PROMPT = """Retorne EXCLUSIVAMENTE um objeto JSON válido. Sem markdown, sem ```json, sem comentários, sem texto antes ou depois. A resposta começa com { e termina com }.

SCHEMA:
{
  "dd-mm-aaaa": {
    "chave_canonica": {
      "nome": "Nome padronizado",
      "categoria": "Categoria do exame",
      "valor": "valor exato do laudo",
      "unidade": "unidade do laudo (grafia normalizada — mg/dl→mg/dL, /ul→/µL, u/L→U/L, fl→fL etc.)",
      "valor_referencia": "intervalo para adulto masculino",
      "valor_percentual": "apenas leucograma",
      "unidade_percentual": "apenas leucograma",
      "referencia_percentual": "apenas leucograma"
    }
  }
}
Os três últimos campos aparecem APENAS para células do leucograma. Omita-os nos demais exames.

REGRAS:
1. Fidelidade: copie valor e unidade EXATAMENTE como no laudo. Preserve vírgula decimal brasileira e casas originais. Nunca arredonde.
2. Sem interpretação: ignore marcadores visuais (*, ↑, ↓, H, L). Não classifique resultados.
3. Data: agrupe por data de COLETA no formato dd-mm-aaaa. Múltiplas coletas → chaves separadas. Sem data: "sem-data".
4. Referência masculina: quando houver faixas por sexo, use a de adulto masculino. Sem referência no laudo: string vazia "".
5. Ausência: campo não presente → "". Nunca use "N/A" ou similares.
6. Completude: inclua TODOS os resultados. Não omita nada.

NORMALIZAÇÃO DE CHAVES:
Dois nomes referem-se ao mesmo exame quando medem o mesmo analito clínico na mesma matriz biológica — independente de abreviação, idioma, acentuação ou qualificadores ("Sérica", "de Jejum", "Total", "Quantitativa"). Use conhecimento médico para reconhecer equivalência.

CATÁLOGO CANÔNICO:

Eritrograma (separar em entradas individuais):
  eritrocitos | hemoglobina | hematocrito | vcm | hcm | chcm | rdw

Leucograma (separar cada célula, com valor absoluto E percentual):
  leucocitos | neutrofilos | linfocitos | monocitos | eosinofilos | basofilos | bastonetes | segmentados | mielocitos | metamielocitos | blastos | promielocitos

Plaquetas: plaquetas | vpm

Bioquímica:
  glicose | ureia | creatinina | acido_urico | sodio | potassio | cloro | calcio | magnesio | fosforo | ferro | ferritina | transferrina | saturacao_transferrina | proteinas_totais | albumina | globulinas | bilirrubina_total | bilirrubina_direta | bilirrubina_indireta

Enzimas: tgo | tgp | ggt | fosfatase_alcalina | ldh | amilase | lipase | ck | ck_mb

Lipidograma: colesterol_total | hdl | ldl | vldl | triglicerides | nao_hdl

Glicêmicos: hba1c | insulina | peptideo_c | frutosamina

Hormônios:
  tsh | t4_livre | t3_livre | t4_total | t3_total | anti_tpo | anti_tg | cortisol | prolactina | testosterona_total | testosterona_livre | estradiol | lh | fsh | beta_hcg | shbg | dhea_s | igf1

Vitaminas / Minerais:
  vitamina_b12 | vitamina_d | acido_folico | vitamina_b6 | zinco | cobre | selenio

Coagulação: tp | inr | ttpa | fibrinogenio | d_dimero

Imunologia / Inflamação: pcr | vhs | fator_reumatoide | aso | fan | c3 | c4 | ige_total | anti_musculo_liso | anti_mitocondrial

Marcadores tumorais: psa_total | psa_livre | afp | cea | ca_19_9 | ca_125 | ca_15_3 | ca_72_4 | nse | cyfra_211

Urinálise (separar em entradas individuais; qualitativos com unidade vazia):
  cor | aspecto | ph_urina | densidade | proteinas_urina | glicose_urina | cetonas | urobilinogenio | bilirrubina_urina | hemoglobina_urina | nitrito | leucocitos_fita | hemacias_sedimento | leucocitos_sedimento | celulas_epiteliais | cilindros | cristais | bacterias | muco | proteinuria_24h | clearance_creatinina | microalbuminuria

Gasometria (arterial/venosa — separar cada parâmetro):
  ph | pco2 | po2 | hco3 | be | saturacao_o2 | so2 | tco2 | acido_latico

Proteínas Séricas (eletroforese — separar fração absoluta e percentual):
  albumina_percentual | alf1_globulina | alf1_globulina_percentual | alf2_globulina | alf2_globulina_percentual | beta1_globulina | beta1_globulina_percentual | beta2_globulina | beta2_globulina_percentual | gama_globulina | gama_globulina_percentual

Sorologias (infecciosas, TORCH, respiratórias — incluir índices quando presentes):
  Hepatites: hbsag | anti_hbs | anti_hbc_total | anti_hbc_igm | anti_hcv | indice_hbsag | indice_anti_hbs | indice_anti_hbc_total | indice_anti_hbc_igm | indice_anti_hcv
  HIV/DST: anti_hiv_12 | indice_hiv | sifilis_anticorpos_totais_especificos_anti_t_pallidum | indice_sifilis
  TORCH: citomegalovirus_igg | citomegalovirus_igm | rubeola_igg | rubeola_igm | toxoplasmose_igg | toxoplasmose_igm | herpes_simples_igg | herpes_simples_igm
  Respiratórias/outras: influenza_a | influenza_b | influenza_h1n1 | ns1_dengue | teste_rapido_dengue_igg | teste_rapido_dengue_igm | hemocultura_1_amostra | hemocultura_anaerobios_1_amostra | hemocultura_anaerobios_2_amostra

DESAMBIGUAÇÃO DE SIGLAS:
- PCR + unidade mg/L ou mg/dL → pcr (Proteína C Reativa). Resultado "Detectado/Não detectado" → use chave descritiva (ex: pcr_sars_cov2), NÃO pcr.
- TP + segundos, junto a INR/TTPA → tp. TP + g/dL, contexto proteico → proteinas_totais.
- FA + U/L, contexto hepático → fosfatase_alcalina. FA + título autoimune → fan.
- Ca + mg/dL → calcio. CA 19-9, CA 125, CA 15-3 → marcadores tumorais.
- K, Na, Mg, Fe isolados em contexto de íons → potassio, sodio, magnesio, ferro.
- pH + contexto urinário → ph_urina (Urinálise). pH + contexto gasométrico → ph (Gasometria).
- SO2/SatO2 em gasometria → saturacao_o2 (Gasometria). SO2 em urina → so2_urina.
Fallback: exame fora do catálogo → chave snake_case do nome técnico em português (sem acentos). Categoria "Outros"."""


# ── openai call ───────────────────────────────────────────────────────────────
def clean_json_response(text: str) -> str:
    text = text.strip()
    match = re.search(r"```(?:json)?\s*([\s\S]+?)\s*```", text)
    if match:
        return match.group(1).strip()
    return text


def merge_by_date(pairs: list) -> dict:
    result: dict = {}
    for k, v in pairs:
        if k in result and isinstance(result[k], dict) and isinstance(v, dict):
            result[k].update(v)
        else:
            result[k] = v
    return result



def call_openai(pdf_bytes: bytes, filename: str) -> dict:
    b64 = base64.standard_b64encode(pdf_bytes).decode("utf-8")
    response = client.responses.create(
        model="gpt-4o",
        instructions=SYSTEM_PROMPT,
        input=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "input_file",
                        "filename": filename,
                        "file_data": f"data:application/pdf;base64,{b64}",
                    },
                    {"type": "input_text", "text": USER_PROMPT},
                ],
            }
        ],
    )
    raw = clean_json_response(response.output_text)
    parsed = json.loads(raw, object_pairs_hook=merge_by_date)
    return auto_normalize_dataset(parsed)


# ── routes ────────────────────────────────────────────────────────────────────
@app.route("/")
def index():
    return render_template("index.html")


# data API
@app.route("/api/data", methods=["GET"])
def get_data():
    return jsonify({"success": True, "data": load_db()})


@app.route("/api/data/merge", methods=["POST"])
def api_merge():
    body = request.get_json(silent=True)
    if not body or "data" not in body:
        return jsonify({"error": "Campo 'data' obrigatório"}), 400
    updated = merge_into_db(body["data"])
    return jsonify({"success": True, "data": updated})


@app.route("/api/data/exam", methods=["POST"])
def add_exam():
    body = request.get_json(silent=True) or {}
    date, key, exam = body.get("date"), body.get("key"), body.get("exam")
    if not date or not key or not exam:
        return jsonify({"error": "date, key e exam são obrigatórios"}), 400
    db = load_db()
    db.setdefault(date, {})[key] = exam
    save_db(db)
    return jsonify({"success": True, "data": db})


@app.route("/api/data/exam", methods=["DELETE"])
def delete_exam():
    body = request.get_json(silent=True) or {}
    date, key = body.get("date"), body.get("key")
    db = load_db()
    if date in db and key in db[date]:
        del db[date][key]
        if not db[date]:
            del db[date]
        save_db(db)
    return jsonify({"success": True, "data": db})


@app.route("/api/data", methods=["DELETE"])
def reset_data():
    save_db({})
    return jsonify({"success": True, "data": {}})


@app.route("/api/data/convert-unit", methods=["POST"])
def convert_unit():
    body = request.get_json(silent=True) or {}
    exam_key   = body.get("exam_key", "")
    target_unit = body.get("target_unit", "")
    if not exam_key or not target_unit:
        return jsonify({"error": "exam_key e target_unit são obrigatórios"}), 400

    db = load_db()
    converted = 0
    skipped = 0
    skipped_nonnumeric = 0
    unknown_units: set = set()

    for date, exams in db.items():
        if exam_key not in exams:
            continue
        exam = exams[exam_key]
        current_unit = exam.get("unidade", "")
        if norm_unit(current_unit) == norm_unit(target_unit):
            # mesma unidade, diferença só de grafia → atualiza só o texto
            if current_unit != target_unit:
                exams[exam_key] = {**exam, "unidade": target_unit}
                converted += 1
            else:
                skipped += 1
            continue
        # verifica se o valor é numérico antes de tentar converter
        try:
            float(str(exam.get("valor", "")).replace(",", ".").strip())
        except (ValueError, AttributeError):
            skipped_nonnumeric += 1
            continue
        result = convert_exam_to_target(exam_key, exam, target_unit)
        if result is None:
            unknown_units.add(current_unit)
        else:
            db[date][exam_key] = result
            converted += 1

    save_db(db)
    return jsonify({
        "success": True,
        "converted": converted,
        "skipped": skipped,
        "skipped_nonnumeric": skipped_nonnumeric,
        "unknown_units": list(unknown_units),
    })


@app.route("/api/data/merge-keys", methods=["POST"])
def merge_keys():
    """Unifica chaves sinônimas em uma chave canônica em todo o banco."""
    body = request.get_json(silent=True) or {}
    aliases        = body.get("aliases", [])       # chaves a renomear
    canonical_key  = body.get("canonical_key", "")
    canonical_name = body.get("canonical_name", "")

    if not aliases or not canonical_key:
        return jsonify({"error": "aliases e canonical_key são obrigatórios"}), 400

    db = load_db()
    for date, exams in db.items():
        for old_key in aliases:
            if old_key == canonical_key or old_key not in exams:
                continue
            exam = exams.pop(old_key)
            if canonical_key not in exams:          # não sobrescreve se já existir
                exams[canonical_key] = {
                    **exam,
                    "nome": canonical_name or exam.get("nome", canonical_key),
                }
    save_db(db)
    return jsonify({"success": True, "data": db})


@app.route("/api/data/normalize", methods=["POST"])
def normalize_existing():
    """Aplica normalização automática de unidades e formatação ao banco existente."""
    db = load_db()
    normalized = auto_normalize_dataset(db)
    save_db(normalized)
    return jsonify({"success": True, "data": normalized})


# pdf processing
@app.route("/process", methods=["POST"])
def process():
    if "files" not in request.files:
        return jsonify({"error": "Nenhum arquivo enviado"}), 400

    files = request.files.getlist("files")
    valid_files = [f for f in files if f and f.filename.lower().endswith(".pdf")]

    if not valid_files:
        return jsonify({"error": "Nenhum PDF válido encontrado"}), 400

    new_data: dict = {}
    errors: list = []
    cached_count: int = 0

    for file in valid_files:
        filename = secure_filename(file.filename)
        try:
            pdf_bytes = file.read()
            key = pdf_cache_key(pdf_bytes)

            data = load_pdf_cache(key)
            if data is not None:
                cached_count += 1
            else:
                data = call_openai(pdf_bytes, filename)
                save_pdf_cache(key, data)

            for date, exams in data.items():
                if date in new_data:
                    new_data[date].update(exams)
                else:
                    new_data[date] = exams

        except json.JSONDecodeError as exc:
            errors.append(f"{filename}: JSON inválido retornado ({exc})")
        except Exception as exc:
            errors.append(f"{filename}: {exc}")

    if not new_data and errors:
        return jsonify({"error": "; ".join(errors)}), 500

    db = merge_into_db(new_data)

    return jsonify({
        "success": True,
        "data": db,
        "errors": errors,
        "cached": cached_count,
        "total": len(valid_files),
    })


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
