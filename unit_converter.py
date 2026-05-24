"""
Conversão de unidades para exames laboratoriais.
Fatores baseados em peso molecular (MW) e referências clínicas padronizadas.
"""
from __future__ import annotations
import re


# ---------------------------------------------------------------------------
# Normalização de unidade para lookup interno
# ---------------------------------------------------------------------------

def _norm(u: str) -> str:
    """
    Normaliza string de unidade para lookup interno.
    Apenas para comparação/busca — não altera o valor exibido ao usuário.
    """
    u = u.strip()
    # Variantes Unicode de µ (antes do lowercase)
    u = u.replace("μ", "µ").replace("Μ", "µ")
    # Dígitos sobrescritos
    u = u.replace("³", "3").replace("²", "2").replace("¹", "1")
    # Lowercase + sem espaços
    u = u.lower().replace(" ", "")
    return u


def norm_unit(u: str) -> str:
    """Versão pública de _norm para uso externo."""
    return _norm(u)


# ---------------------------------------------------------------------------
# Helpers de parsing e formatação
# ---------------------------------------------------------------------------

def _parse(val: str) -> float | None:
    try:
        s = str(val).strip()
        if ',' in s:
            # Brazilian format: period = thousands separator, comma = decimal
            s = s.replace('.', '').replace(',', '.')
        elif re.match(r'^[1-9]\d{0,2}(\.\d{3})+$', s):
            # Thousands-only: "4.710" → 4710 (leading digit must be non-zero)
            s = s.replace('.', '')
        return float(s)
    except (ValueError, AttributeError):
        return None


def _fmt(v: float) -> str:
    """Formata número com separador de milhar e vírgula decimal (padrão brasileiro)."""
    rounded = round(v, 3)
    if rounded == int(rounded):
        n = int(rounded)
        return f"{n:,}".replace(",", ".")   # 4710 → "4.710"
    s = f"{rounded:.3f}".rstrip("0")
    int_s, dec_s = s.split(".")
    int_fmt = f"{int(int_s):,}".replace(",", ".")
    return f"{int_fmt},{dec_s}"             # 1000.5 → "1.000,5"


# ---------------------------------------------------------------------------
# Conversões universais (independentes do exame)
# Chave: _norm(unidade_origem) → (unidade_canônica_exibição, fator)
# ---------------------------------------------------------------------------

UNIVERSAL: dict[str, tuple[str, float]] = {

    # ── Contagens hematológicas ─────────────────────────────────────────────
    # 1 mm³ = 1 µL (por definição SI); Mil = 10³
    "mil/mm3":          ("/µL", 1_000),
    "mil/µl":           ("/µL", 1_000),
    "/mm3":             ("/µL", 1),          # /mm³ e /µL são idênticos
    "/µl":              ("/µL", 1),          # normaliza grafia (µL vs µl já feito pelo _norm)
    "/ul":              ("/µL", 1),
    "/microl":          ("/µL", 1),
    "10^3/µl":          ("/µL", 1_000),
    "10^3/ul":          ("/µL", 1_000),
    "10^3/mm3":         ("/µL", 1_000),
    "×10^3/µl":         ("/µL", 1_000),
    "x10^3/µl":         ("/µL", 1_000),
    "*10^3/µl":         ("/µL", 1_000),

    # Eritrócitos em escala de milhões (mantém a escala 10^6/µL)
    "10^6/mm3":         ("10^6/µL", 1),
    "10^6/µl":          ("10^6/µL", 1),
    "10^6/ul":          ("10^6/µL", 1),
    "×10^6/µl":         ("10^6/µL", 1),
    "x10^6/µl":         ("10^6/µL", 1),
    "milhoes/mm3":      ("10^6/µL", 1),      # "milhões/mm³" após _norm
    "milhões/mm3":      ("10^6/µL", 1),      # ã sobrevive ao _norm
    "milhoes/µl":       ("10^6/µL", 1),
    "milhoes/ul":       ("10^6/µL", 1),

    # ── Proteínas / Albumina (g/L → g/dL) ───────────────────────────────────
    "g/l":              ("g/dL", 0.1),

    # ── PCR / substâncias em mg/L → mg/dL ───────────────────────────────────
    "mg/l":             ("mg/dL", 0.1),

    # ── Hormônios: unidades de µIU — mUI/L = µUI/mL (1:1 numericamente) ────
    # µIU/mL = 10⁻⁶ IU / 10⁻³ L  =  10⁻³ IU/L  =  mIU/L  → fator 1
    "uiu/ml":           ("µUI/mL", 1),       # uIU/mL (ASCII u = µ) após _norm
    "uiu/l":            ("µUI/mL", 1),       # uIU/L
    "uui/ml":           ("µUI/mL", 1),       # uUI/mL
    "uui/l":            ("µUI/mL", 1),
    "mui/ml":           ("µUI/mL", 1),       # mUI/mL (milli = micro aqui)
    "mui/l":            ("µUI/mL", 1),       # mUI/L
    "miu/ml":           ("µUI/mL", 1),       # mIU/mL
    "miu/l":            ("µUI/mL", 1),       # mIU/L
    "muui/ml":          ("µUI/mL", 1),
    "muui/l":           ("µUI/mL", 1),
    "µiu/ml":           ("µUI/mL", 1),       # µIU/mL
    "µiu/l":            ("µUI/mL", 1),
    "µui/l":            ("µUI/mL", 1),
}


# ---------------------------------------------------------------------------
# Conversões por exame
# Chave: (_norm(unidade_origem), chave_exame) → (unidade_exibição, fator)
# Fatores derivados de MW (g/mol) via: mmol/L → mg/dL = valor × MW/10
# ---------------------------------------------------------------------------

PER_EXAM: dict[tuple[str, str], tuple[str, float]] = {

    # ── Glicose (MW 180.16) ─────────────────────────────────────────────────
    ("mmol/l",  "glicose"):            ("mg/dL",  18.016),
    ("mg/dl",   "glicose"):            ("mmol/L",  0.05551),

    # ── Ureia — molécula completa (MW 60.06) ─────────────────────────────────
    # Atenção: labs brasileiros reportam ureia (60.06), não BUN (28.014)
    ("mmol/l",  "ureia"):              ("mg/dL",   6.006),
    ("mg/dl",   "ureia"):              ("mmol/L",  0.16650),

    # ── Creatinina (MW 113.12) ───────────────────────────────────────────────
    ("mmol/l",  "creatinina"):         ("mg/dL",  11.312),
    ("µmol/l",  "creatinina"):         ("mg/dL",   0.011312),   # 113.12/10000
    ("mg/dl",   "creatinina"):         ("µmol/L",  88.402),

    # ── Ácido Úrico (MW 168.11) ───────────────────────────────────────────────
    ("mmol/l",  "acido_urico"):        ("mg/dL",  16.811),
    ("µmol/l",  "acido_urico"):        ("mg/dL",   0.016811),
    ("mg/dl",   "acido_urico"):        ("µmol/L",  59.485),

    # ── Cálcio (MW 40.078) ────────────────────────────────────────────────────
    ("mmol/l",  "calcio"):             ("mg/dL",   4.008),
    ("µmol/l",  "calcio"):             ("mg/dL",   0.004008),
    ("meq/l",   "calcio"):             ("mg/dL",   2.004),      # Ca²⁺: 1 mEq = 0.5 mmol
    ("mg/dl",   "calcio"):             ("mmol/L",  0.24951),

    # ── Magnésio (MW 24.305) ──────────────────────────────────────────────────
    ("mmol/l",  "magnesio"):           ("mg/dL",   2.431),
    ("µmol/l",  "magnesio"):           ("mg/dL",   0.002431),
    ("meq/l",   "magnesio"):           ("mg/dL",   1.215),      # Mg²⁺: 1 mEq = 0.5 mmol
    ("mg/dl",   "magnesio"):           ("mmol/L",  0.41144),

    # ── Fósforo (MW 30.974) ───────────────────────────────────────────────────
    ("mmol/l",  "fosforo"):            ("mg/dL",   3.097),
    ("µmol/l",  "fosforo"):            ("mg/dL",   0.003097),
    ("mg/dl",   "fosforo"):            ("mmol/L",  0.32285),

    # ── Bilirrubinas (MW 584.66, fator clínico 17.1) ─────────────────────────
    ("µmol/l",  "bilirrubina_total"):     ("mg/dL", 0.058466),  # 1/17.104
    ("µmol/l",  "bilirrubina_direta"):    ("mg/dL", 0.058466),
    ("µmol/l",  "bilirrubina_indireta"):  ("mg/dL", 0.058466),
    ("mg/dl",   "bilirrubina_total"):     ("µmol/L", 17.104),
    ("mg/dl",   "bilirrubina_direta"):    ("µmol/L", 17.104),
    ("mg/dl",   "bilirrubina_indireta"):  ("µmol/L", 17.104),

    # ── Eletrólitos monovalentes: mmol/L ≡ mEq/L (valência 1, fator 1) ──────
    ("mmol/l",  "sodio"):              ("mEq/L",   1.0),
    ("meq/l",   "sodio"):              ("mmol/L",  1.0),
    ("mmol/l",  "potassio"):           ("mEq/L",   1.0),
    ("meq/l",   "potassio"):           ("mmol/L",  1.0),
    ("mmol/l",  "cloro"):              ("mEq/L",   1.0),
    ("meq/l",   "cloro"):              ("mmol/L",  1.0),

    # ── Ferro (MW 55.845) ─────────────────────────────────────────────────────
    ("µmol/l",  "ferro"):              ("µg/dL",   5.585),
    ("µg/dl",   "ferro"):              ("µmol/L",  0.17907),
    ("mg/dl",   "ferro"):              ("µg/dL",  1_000),       # mg → µg: ×1000

    # ── Proteínas / Albumina (g/L ↔ g/dL) ────────────────────────────────────
    ("g/l",     "proteinas_totais"):   ("g/dL",    0.1),
    ("g/dl",    "proteinas_totais"):   ("g/L",    10.0),
    ("g/l",     "albumina"):           ("g/dL",    0.1),
    ("g/dl",    "albumina"):           ("g/L",    10.0),
    ("g/l",     "globulinas"):         ("g/dL",    0.1),
    ("g/l",     "hemoglobina"):        ("g/dL",    0.1),
    ("g/l",     "chcm"):               ("g/dL",    0.1),

    # ── Lipidograma (colesterol MW 386.65, triglicerídeos MW 885.44) ─────────
    ("mmol/l",  "colesterol_total"):   ("mg/dL",  38.665),
    ("mg/dl",   "colesterol_total"):   ("mmol/L",  0.025863),
    ("mmol/l",  "hdl"):                ("mg/dL",  38.665),
    ("mg/dl",   "hdl"):                ("mmol/L",  0.025863),
    ("mmol/l",  "ldl"):                ("mg/dL",  38.665),
    ("mg/dl",   "ldl"):                ("mmol/L",  0.025863),
    ("mmol/l",  "vldl"):               ("mg/dL",  38.665),
    ("mg/dl",   "vldl"):               ("mmol/L",  0.025863),
    ("mmol/l",  "nao_hdl"):            ("mg/dL",  38.665),
    ("mg/dl",   "nao_hdl"):            ("mmol/L",  0.025863),
    ("mmol/l",  "triglicerides"):      ("mg/dL",  88.544),      # triolein padrão NIST
    ("mg/dl",   "triglicerides"):      ("mmol/L",  0.011294),

    # ── Hormônios Tireoidianos ────────────────────────────────────────────────
    # T4 Livre (MW 776.87): pmol/L → ng/dL  (factor = MW/10000 = 0.077687)
    ("pmol/l",  "t4_livre"):           ("ng/dL",   0.07769),
    ("ng/dl",   "t4_livre"):           ("pmol/L", 12.872),

    # T3 Livre (MW 651.00): pmol/L → pg/mL  (factor = MW/1000 = 0.6510)
    ("pmol/l",  "t3_livre"):           ("pg/mL",   0.6510),
    ("pg/ml",   "t3_livre"):           ("pmol/L",  1.5361),

    # T4 Total (MW 776.87): nmol/L → µg/dL  (factor = MW/10000 = 0.077687)
    ("nmol/l",  "t4_total"):           ("µg/dL",   0.07769),

    # T3 Total (MW 651.00): nmol/L → ng/dL  (factor = MW/10 = 65.10)
    ("nmol/l",  "t3_total"):           ("ng/dL",  65.10),

    # TSH / Insulina: µUI/mL = mUI/L (equivalentes — conversões feitas no UNIVERSAL)

    # ── Cortisol (MW 362.46): nmol/L → µg/dL (fator 0.03625) ────────────────
    ("nmol/l",  "cortisol"):           ("µg/dL",   0.03625),
    ("µg/dl",   "cortisol"):           ("nmol/L", 27.589),

    # ── Testosterona Total (MW 288.43): nmol/L → ng/dL ───────────────────────
    ("nmol/l",  "testosterona_total"): ("ng/dL",  28.843),
    ("ng/dl",   "testosterona_total"): ("nmol/L",  0.03467),

    # ── Testosterona Livre (MW 288.43): pmol/L → pg/mL ────────────────────────
    ("pmol/l",  "testosterona_livre"): ("pg/mL",   0.2884),
    ("pg/ml",   "testosterona_livre"): ("pmol/L",  3.467),

    # ── Estradiol (MW 272.39): pmol/L → pg/mL (fator = MW/1000 = 0.2724) ────
    ("pmol/l",  "estradiol"):          ("pg/mL",   0.2724),
    ("pg/ml",   "estradiol"):          ("pmol/L",  3.671),

    # ── Prolactina: mUI/L → ng/mL (fator empírico 1/21.2) ────────────────────
    # Não há MW único (é uma proteína); fator WHO 3rd IRP 84/500: 1 ng/mL ≈ 21.2 mUI/L
    ("mui/l",   "prolactina"):         ("ng/mL",   0.04717),
    ("miu/l",   "prolactina"):         ("ng/mL",   0.04717),
    ("ng/ml",   "prolactina"):         ("mUI/L",  21.200),

    # ── DHEA-S (MW 368.51): µmol/L → µg/dL ───────────────────────────────────
    ("µmol/l",  "dhea_s"):             ("µg/dL",  36.851),
    ("µg/dl",   "dhea_s"):             ("µmol/L",  0.02714),

    # ── LH / FSH / Beta-hCG (proteínas): mUI/mL = µUI/mL ────────────────────
    # Já tratados via UNIVERSAL para unificação de notação

    # ── Vitamina D — 25-OH (MW 400.64): nmol/L → ng/mL ───────────────────────
    ("nmol/l",  "vitamina_d"):         ("ng/mL",   0.40064),
    ("ng/ml",   "vitamina_d"):         ("nmol/L",  2.4960),

    # ── Vitamina B12 / Cianocobalamina (MW 1355.37): pmol/L → pg/mL ──────────
    ("pmol/l",  "vitamina_b12"):       ("pg/mL",   1.3554),
    ("pg/ml",   "vitamina_b12"):       ("pmol/L",  0.7378),

    # ── Ácido Fólico / Folato (MW 441.40): nmol/L → ng/mL ────────────────────
    ("nmol/l",  "acido_folico"):       ("ng/mL",   0.44140),
    ("ng/ml",   "acido_folico"):       ("nmol/L",  2.2655),

    # ── Ferritina: ng/mL ≡ µg/L (1:1); sem conversão molar em uso clínico ────

    # ── Fibrinogênio (g/L → mg/dL e mg/L → mg/dL) ────────────────────────────
    ("g/l",     "fibrinogenio"):       ("mg/dL",  100.0),
    ("mg/l",    "fibrinogenio"):       ("mg/dL",    0.1),
    ("mg/dl",   "fibrinogenio"):       ("g/L",      0.01),

    # ── PCR: mg/L ↔ mg/dL (labs brasileiros usam mg/dL; PCR-us usa mg/L) ─────
    ("mg/l",    "pcr"):                ("mg/dL",    0.1),
    ("mg/dl",   "pcr"):                ("mg/L",    10.0),

    # ── Urina: mg/L → mg/dL ───────────────────────────────────────────────────
    ("mg/l",    "proteinas_urina"):    ("mg/dL",    0.1),
    ("mg/l",    "microalbuminuria"):   ("mg/dL",    0.1),
}


# ---------------------------------------------------------------------------
# Grupos de equivalência — unidades numericamente idênticas, só notação diferente
# Qualquer conversão entre duas unidades do mesmo grupo tem fator 1.
# ---------------------------------------------------------------------------

_EQUIV_GROUPS: list[frozenset[str]] = [
    # Grupo 0 — /µL e sinônimos (1 mm³ = 1 µL por definição SI)
    frozenset({"/µl", "/ul", "/mm3", "/microl"}),

    # Grupo 1 — eritrócitos em escala de milhões (10^6/µL = 10^6/mm³ = milhões/mm³)
    frozenset({
        "10^6/µl", "10^6/ul", "10^6/mm3",
        "milhoes/mm3", "milhões/mm3", "milhoes/µl", "milhoes/ul",
        "×10^6/µl", "x10^6/µl",
    }),

    # Grupo 2 — milhares (Mil/mm³ = 10³/µL — todas expressam contagem ×10³/µL)
    frozenset({
        "mil/mm3", "mil/µl",
        "10^3/µl", "10^3/ul", "10^3/mm3",
        "×10^3/µl", "x10^3/µl", "*10^3/µl",
    }),

    # Grupo 3 — µUI/mL = mUI/L = mIU/L = uIU/mL (1 µIU/mL = 1 mIU/L)
    frozenset({
        "µui/ml", "µiu/ml", "µui/l", "µiu/l",
        "uiu/ml", "uui/ml", "uiu/l", "uui/l",
        "mui/ml", "miu/ml", "mui/l", "miu/l",
        "muui/ml", "muui/l",
    }),
]

# Índice rápido: _norm(unidade) → índice do grupo
_EQUIV_INDEX: dict[str, int] = {
    u: i for i, g in enumerate(_EQUIV_GROUPS) for u in g
}

# Conversões com fator real entre grupos de equivalência diferentes
# Chave: (from_group_idx, to_group_idx) → fator multiplicador
_BETWEEN_GROUPS: dict[tuple[int, int], float] = {
    (2, 0): 1_000,    # Mil/mm³ (grupo 2) → /µL (grupo 0): ×1000
    (0, 2): 0.001,    # /µL (grupo 0) → Mil/mm³ (grupo 2): ÷1000
}


# ---------------------------------------------------------------------------
# Lógica principal
# ---------------------------------------------------------------------------

def _resolve_factor(exam_key: str, from_unit: str, to_unit: str) -> float | None:
    """
    Retorna o fator de conversão de from_unit → to_unit para exam_key.
    Retorna None se não houver conversão conhecida.
    Retorna 1.0 se as unidades forem matematicamente equivalentes (notação diferente).
    """
    from_norm = _norm(from_unit)
    to_norm   = _norm(to_unit)

    if from_norm == to_norm:
        return 1.0

    fi = _EQUIV_INDEX.get(from_norm)
    ti = _EQUIV_INDEX.get(to_norm)

    # Mesmo grupo de equivalência → fator 1, só muda grafia
    if fi is not None and fi == ti:
        return 1.0

    # Grupos diferentes com fator conhecido (ex: Mil/mm³ ↔ /µL)
    if fi is not None and ti is not None:
        between = _BETWEEN_GROUPS.get((fi, ti))
        if between is not None:
            return between

    # Verifica se o alvo é equivalente ao canônico de uma entrada de tabela
    def _target_matches(canonical: str) -> bool:
        cn = _norm(canonical)
        if cn == to_norm:
            return True
        # alvo pode ser outra grafia do mesmo grupo do canônico
        ci = _EQUIV_INDEX.get(cn)
        return ci is not None and ci == ti

    # 1) Busca per-exame (mais específica)
    per = PER_EXAM.get((from_norm, exam_key))
    if per and _target_matches(per[0]):
        return per[1]

    # 2) Busca universal — tenta from_norm e, se não encontrar, outros membros
    #    do mesmo grupo de equivalência de from
    def _lookup_universal(key: str):
        return UNIVERSAL.get(key)

    uni = _lookup_universal(from_norm)
    if uni is None and fi is not None:
        for u in _EQUIV_GROUPS[fi]:
            uni = _lookup_universal(u)
            if uni:
                break

    if uni and _target_matches(uni[0]):
        return uni[1]

    return None


def _convert_reference(ref_str: str, factor: float) -> str:
    """Aplica fator de conversão à string de valor_referencia preservando o formato."""
    if not ref_str or factor == 1.0:
        return ref_str
    s = ref_str.strip()
    if not s:
        return ref_str

    # Range: "X - Y", "X – Y", "X a Y"
    m = re.search(r'([\d.,]+)\s*(?:[-–]|\ba\b)\s*([\d.,]+)', s)
    if m:
        min_v = _parse(m.group(1))
        max_v = _parse(m.group(2))
        if min_v is not None and max_v is not None:
            return f"{_fmt(min_v * factor)} - {_fmt(max_v * factor)}"

    # Max-only: "< N", "≤ N", "até N", "ate N"
    m = re.search(r'(<[=]?|≤|at[eé])\s*([\d.,]+)', s, re.IGNORECASE)
    if m:
        v = _parse(m.group(2))
        if v is not None:
            return f"{m.group(1)} {_fmt(v * factor)}"

    # Min-only: "> N", "≥ N", "acima de N"
    m = re.search(r'(>[=]?|≥|acima\s+de)\s*([\d.,]+)', s, re.IGNORECASE)
    if m:
        v = _parse(m.group(2))
        if v is not None:
            return f"{m.group(1)} {_fmt(v * factor)}"

    return ref_str


def convert_exam_to_target(exam_key: str, exam: dict, target_unit: str) -> dict | None:
    """
    Converte o valor do exame para target_unit.
    Retorna cópia atualizada ou None se a conversão não for conhecida.
    Preserva valor_original / unidade_original quando houve conversão real.
    """
    from_unit = exam.get("unidade", "")
    factor = _resolve_factor(exam_key, from_unit, target_unit)

    if factor is None:
        return None

    numeric = _parse(exam.get("valor", ""))
    if numeric is None:
        return None

    result = dict(exam)
    if factor != 1.0:
        result["valor_original"]   = exam.get("valor", "")
        result["unidade_original"] = from_unit
        result["convertido"]       = True

    result["valor"]   = _fmt(numeric * factor)
    result["unidade"] = target_unit
    if factor != 1.0:
        result["valor_referencia"] = _convert_reference(
            exam.get("valor_referencia", ""), factor
        )
    result.pop("unidade_canonica",     None)
    result.pop("conversao_necessaria", None)
    return result


def available_targets(exam_key: str, from_unit: str) -> list[str]:
    """
    Retorna lista de unidades-alvo conhecidas para este par (exame, unidade_origem).
    """
    from_norm = _norm(from_unit)
    targets: list[str] = []

    per = PER_EXAM.get((from_norm, exam_key))
    if per:
        targets.append(per[0])

    uni = UNIVERSAL.get(from_norm)
    if uni and uni[0] not in targets:
        targets.append(uni[0])

    return targets


# ---------------------------------------------------------------------------
# Normalização automática pós-extração
# ---------------------------------------------------------------------------

# ---------------------------------------------------------------------------
# Mapa de categorias canônicas para chaves conhecidas
# Aplicado em normalize_exam quando a categoria é "Outros" ou vazia,
# corrigindo dados extraídos antes do prompt incluir essas categorias.
# ---------------------------------------------------------------------------

CATEGORY_MAP: dict[str, str] = {
    # Gasometria
    'ph':           'Gasometria', 'pco2':         'Gasometria',
    'po2':          'Gasometria', 'hco3':          'Gasometria',
    'be':           'Gasometria', 'saturacao_o2':  'Gasometria',
    'so2':          'Gasometria', 'tco2':          'Gasometria',
    'acido_latico': 'Gasometria',

    # Proteínas Séricas (eletroforese)
    'albumina_percentual':       'Proteínas Séricas',
    'alf1_globulina':            'Proteínas Séricas',
    'alf1_globulina_percentual': 'Proteínas Séricas',
    'alf2_globulina':            'Proteínas Séricas',
    'alf2_globulina_percentual': 'Proteínas Séricas',
    'beta1_globulina':           'Proteínas Séricas',
    'beta1_globulina_percentual':'Proteínas Séricas',
    'beta2_globulina':           'Proteínas Séricas',
    'beta2_globulina_percentual':'Proteínas Séricas',
    'gama_globulina':            'Proteínas Séricas',
    'gama_globulina_percentual': 'Proteínas Séricas',

    # Sorologias
    'anti_hbc_igm':              'Sorologias',
    'anti_hbc_total':            'Sorologias',
    'anti_hbs':                  'Sorologias',
    'anti_hcv':                  'Sorologias',
    'hbsag':                     'Sorologias',
    'indice_anti_hbc_igm':       'Sorologias',
    'indice_anti_hbc_total':     'Sorologias',
    'indice_anti_hcv':           'Sorologias',
    'indice_hbsag':              'Sorologias',
    'anti_hiv_12':               'Sorologias',
    'indice_hiv':                'Sorologias',
    'sifilis_anticorpos_totais_especificos_anti_t_pallidum': 'Sorologias',
    'indice_sifilis':            'Sorologias',
    'ns1_dengue':                'Sorologias',
    'teste_rapido_dengue_igg':   'Sorologias',
    'teste_rapido_dengue_igm':   'Sorologias',
    'influenza_a':               'Sorologias',
    'influenza_b':               'Sorologias',
    'influenza_h1n1':            'Sorologias',
    'citomegalovirus_igg':       'Sorologias',
    'citomegalovirus_igm':       'Sorologias',
    'rubeola_igg':               'Sorologias',
    'rubeola_igm':               'Sorologias',
    'toxoplasmose_igg':          'Sorologias',
    'toxoplasmose_igm':          'Sorologias',
    'hemocultura_1_amostra':          'Sorologias',
    'hemocultura_anaerobios_1_amostra':'Sorologias',
    'hemocultura_anaerobios_2_amostra':'Sorologias',

    # Imunologia / Inflamação
    'anti_musculo_liso':         'Imunologia / Inflamação',

    # Bioquímica — metabolismo do ferro
    'capacidade_fixacao_latente_ferro': 'Bioquímica',
    'capacidade_total_fixacao_ferro':   'Bioquímica',
}


LEUCOGRAM_KEYS: frozenset[str] = frozenset({
    'leucocitos', 'neutrofilos', 'linfocitos', 'monocitos',
    'eosinofilos', 'basofilos', 'bastonetes', 'segmentados',
    'mielocitos', 'metamielocitos', 'blastos', 'promielocitos',
})

PLATELET_KEYS: frozenset[str] = frozenset({'plaquetas'})

# (conjunto de chaves, unidade-alvo canônica)
AUTO_RULES: list[tuple[frozenset[str], str]] = [
    (LEUCOGRAM_KEYS,           '/µL'),
    (PLATELET_KEYS,            '/µL'),
    (frozenset({'glicose'}),   'mg/dL'),
    (frozenset({'eritrocitos'}), 'Milhões/mm³'),
]


def _reformat_numeric_fields(exam: dict) -> dict:
    """Re-formata campos numéricos com separador de milhar brasileiro."""
    result = dict(exam)
    for field in ('valor', 'valor_percentual'):
        v = result.get(field)
        if v and v != '':
            numeric = _parse(str(v))
            if numeric is not None:
                result[field] = _fmt(numeric)
    return result


def normalize_exam(key: str, exam: dict) -> dict:
    """Aplica regra de unidade canônica, reformata valores e corrige categoria."""
    result = dict(exam)
    # Corrige categoria para chaves conhecidas atualmente em 'Outros' / vazio
    if result.get('categoria') in ('Outros', '', None) and key in CATEGORY_MAP:
        result['categoria'] = CATEGORY_MAP[key]
    # Aplica regra de conversão de unidade
    for keys_set, target_unit in AUTO_RULES:
        if key in keys_set:
            converted = convert_exam_to_target(key, result, target_unit)
            if converted is not None:
                result = converted
            break
    return _reformat_numeric_fields(result)


def _fix_stale_reference(key: str, exam: dict) -> dict:
    """
    Para exames com convertido=True cuja valor_referencia não foi atualizada
    na conversão original, reaplica _convert_reference usando unidade_original.
    """
    from_unit = exam.get('unidade_original', '')
    to_unit   = exam.get('unidade', '')
    ref       = exam.get('valor_referencia', '')

    if not ref or not from_unit or not to_unit:
        return exam

    factor = _resolve_factor(key, from_unit, to_unit)
    if factor is None or factor == 1.0:
        return exam

    # Extrai o primeiro número da referência para checar se está na escala original
    m = re.search(r'[\d.,]+', ref)
    if not m:
        return exam
    ref_first = _parse(m.group(0))
    curr_val  = _parse(exam.get('valor', ''))

    if ref_first is None or curr_val is None or curr_val == 0:
        return exam

    # Se aplicar o fator traz ref_first para a escala de curr_val,
    # a referência ainda está na unidade original → converte
    scaled = ref_first * factor
    ratio  = scaled / curr_val
    if 0.05 <= ratio <= 20:
        return {**exam, 'valor_referencia': _convert_reference(ref, factor)}

    return exam


def auto_normalize_dataset(data: dict) -> dict:
    """Aplica normalize_exam a todo o dataset e corrige referências desatualizadas."""
    out: dict = {}
    for date, exams in data.items():
        out[date] = {}
        for key, exam in exams.items():
            result = normalize_exam(key, exam)
            if result.get('convertido'):
                result = _fix_stale_reference(key, result)
            out[date][key] = result
    return out
