// Mock data — 10 coletas anuais (2015–2024)
// Narrativa: adulto masculino, 35 anos em 2015. Déficit de Vit D corrigido em 2019,
// testosterona em declínio progressivo, pré-diabetes emergindo a partir de 2021,
// dislipidemia instalada em 2022, estresse oxidativo e inflamatório em 2020.

const EXAMS = {
  // ── Eritrograma ──────────────────────────────────────────────────────────
  eritrocitos:              { nome: 'Eritrócitos',               unidade: 'M/µL',    categoria: 'Eritrograma',              valor_referencia: '4.5 - 6.0'   },
  hemoglobina:              { nome: 'Hemoglobina',                unidade: 'g/dL',    categoria: 'Eritrograma',              valor_referencia: '13.5 - 17.5' },
  hematocrito:              { nome: 'Hematócrito',                unidade: '%',       categoria: 'Eritrograma',              valor_referencia: '40 - 52'     },
  vcm:                      { nome: 'VCM',                        unidade: 'fL',      categoria: 'Eritrograma',              valor_referencia: '80 - 100'    },
  hcm:                      { nome: 'HCM',                        unidade: 'pg',      categoria: 'Eritrograma',              valor_referencia: '26 - 34'     },
  chcm:                     { nome: 'CHCM',                       unidade: 'g/dL',    categoria: 'Eritrograma',              valor_referencia: '32 - 36'     },
  rdw:                      { nome: 'RDW',                        unidade: '%',       categoria: 'Eritrograma',              valor_referencia: '11.5 - 14.5' },
  // ── Leucograma ───────────────────────────────────────────────────────────
  leucocitos:               { nome: 'Leucócitos',                 unidade: '10³/µL',  categoria: 'Leucograma',               valor_referencia: '4.0 - 11.0'  },
  neutrofilos:              { nome: 'Neutrófilos',                unidade: '%',       categoria: 'Leucograma',               valor_referencia: '45 - 70'     },
  linfocitos:               { nome: 'Linfócitos',                 unidade: '%',       categoria: 'Leucograma',               valor_referencia: '20 - 40'     },
  monocitos:                { nome: 'Monócitos',                  unidade: '%',       categoria: 'Leucograma',               valor_referencia: '2 - 10'      },
  eosinofilos:              { nome: 'Eosinófilos',                unidade: '%',       categoria: 'Leucograma',               valor_referencia: '1 - 5'       },
  basofilos:                { nome: 'Basófilos',                  unidade: '%',       categoria: 'Leucograma',               valor_referencia: '0 - 1'       },
  // ── Plaquetas ────────────────────────────────────────────────────────────
  plaquetas:                { nome: 'Plaquetas',                  unidade: '10³/µL',  categoria: 'Plaquetas',                valor_referencia: '150 - 400'   },
  // ── Bioquímica ───────────────────────────────────────────────────────────
  glicose:                  { nome: 'Glicose',                    unidade: 'mg/dL',   categoria: 'Bioquímica',               valor_referencia: '70 - 99'     },
  creatinina:               { nome: 'Creatinina',                 unidade: 'mg/dL',   categoria: 'Bioquímica',               valor_referencia: '0.7 - 1.2'   },
  ureia:                    { nome: 'Ureia',                      unidade: 'mg/dL',   categoria: 'Bioquímica',               valor_referencia: '15 - 45'     },
  acido_urico:              { nome: 'Ácido Úrico',                unidade: 'mg/dL',   categoria: 'Bioquímica',               valor_referencia: '3.5 - 7.2'   },
  bilirrubina_total:        { nome: 'Bilirrubina Total',          unidade: 'mg/dL',   categoria: 'Bioquímica',               valor_referencia: '0.3 - 1.2'   },
  bilirrubina_direta:       { nome: 'Bilirrubina Direta',         unidade: 'mg/dL',   categoria: 'Bioquímica',               valor_referencia: '0 - 0.3'     },
  // ── Enzimas ──────────────────────────────────────────────────────────────
  tgo:                      { nome: 'TGO (AST)',                  unidade: 'U/L',     categoria: 'Enzimas',                  valor_referencia: '10 - 40'     },
  tgp:                      { nome: 'TGP (ALT)',                  unidade: 'U/L',     categoria: 'Enzimas',                  valor_referencia: '7 - 56'      },
  ggt:                      { nome: 'GGT',                        unidade: 'U/L',     categoria: 'Enzimas',                  valor_referencia: '9 - 48'      },
  fosfatase_alcalina:       { nome: 'Fosfatase Alcalina',         unidade: 'U/L',     categoria: 'Enzimas',                  valor_referencia: '44 - 147'    },
  ldh:                      { nome: 'LDH',                        unidade: 'U/L',     categoria: 'Enzimas',                  valor_referencia: '140 - 280'   },
  // ── Lipidograma ──────────────────────────────────────────────────────────
  colesterol_total:         { nome: 'Colesterol Total',           unidade: 'mg/dL',   categoria: 'Lipidograma',              valor_referencia: '< 200'       },
  hdl:                      { nome: 'HDL',                        unidade: 'mg/dL',   categoria: 'Lipidograma',              valor_referencia: '> 40'        },
  ldl:                      { nome: 'LDL',                        unidade: 'mg/dL',   categoria: 'Lipidograma',              valor_referencia: '< 130'       },
  triglicerideos:           { nome: 'Triglicerídeos',             unidade: 'mg/dL',   categoria: 'Lipidograma',              valor_referencia: '< 150'       },
  vldl:                     { nome: 'VLDL',                       unidade: 'mg/dL',   categoria: 'Lipidograma',              valor_referencia: '< 30'        },
  nao_hdl:                  { nome: 'Colesterol não-HDL',         unidade: 'mg/dL',   categoria: 'Lipidograma',              valor_referencia: '< 160'       },
  // ── Glicêmicos ───────────────────────────────────────────────────────────
  hemoglobina_glicada:      { nome: 'Hemoglobina Glicada (HbA1c)',unidade: '%',       categoria: 'Glicêmicos',               valor_referencia: '< 5.7'       },
  insulina:                 { nome: 'Insulina',                   unidade: 'µUI/mL',  categoria: 'Glicêmicos',               valor_referencia: '2.6 - 24.9'  },
  peptideo_c:               { nome: 'Peptídeo C',                 unidade: 'ng/mL',   categoria: 'Glicêmicos',               valor_referencia: '0.9 - 4.0'   },
  // ── Hormônios ────────────────────────────────────────────────────────────
  tsh:                      { nome: 'TSH',                        unidade: 'mUI/L',   categoria: 'Hormônios',                valor_referencia: '0.4 - 4.0'   },
  t4_livre:                 { nome: 'T4 Livre',                   unidade: 'ng/dL',   categoria: 'Hormônios',                valor_referencia: '0.8 - 1.8'   },
  t3_livre:                 { nome: 'T3 Livre',                   unidade: 'pg/mL',   categoria: 'Hormônios',                valor_referencia: '2.0 - 4.4'   },
  testosterone_total:       { nome: 'Testosterona Total',         unidade: 'ng/dL',   categoria: 'Hormônios',                valor_referencia: '300 - 1000'  },
  testosterone_livre:       { nome: 'Testosterona Livre',         unidade: 'pg/mL',   categoria: 'Hormônios',                valor_referencia: '5.0 - 21.0'  },
  dhea_s:                   { nome: 'DHEA-S',                     unidade: 'µg/dL',   categoria: 'Hormônios',                valor_referencia: '80 - 560'    },
  cortisol:                 { nome: 'Cortisol (matinal)',          unidade: 'µg/dL',   categoria: 'Hormônios',                valor_referencia: '6.2 - 19.4'  },
  igf1:                     { nome: 'IGF-1 (Somatomedina C)',     unidade: 'ng/mL',   categoria: 'Hormônios',                valor_referencia: '115 - 307'   },
  prolactina:               { nome: 'Prolactina',                 unidade: 'ng/mL',   categoria: 'Hormônios',                valor_referencia: '2.5 - 17.0'  },
  lh:                       { nome: 'LH',                         unidade: 'mUI/mL',  categoria: 'Hormônios',                valor_referencia: '1.7 - 8.6'   },
  fsh:                      { nome: 'FSH',                        unidade: 'mUI/mL',  categoria: 'Hormônios',                valor_referencia: '1.5 - 12.4'  },
  estradiol:                { nome: 'Estradiol',                  unidade: 'pg/mL',   categoria: 'Hormônios',                valor_referencia: '< 40'        },
  pth:                      { nome: 'PTH (Paratormônio)',         unidade: 'pg/mL',   categoria: 'Hormônios',                valor_referencia: '15 - 65'     },
  aldosterona:              { nome: 'Aldosterona',                unidade: 'ng/dL',   categoria: 'Hormônios',                valor_referencia: '4 - 31'      },
  // ── Vitaminas / Minerais ─────────────────────────────────────────────────
  vitamina_d:               { nome: 'Vitamina D (25-OH)',         unidade: 'ng/mL',   categoria: 'Vitaminas / Minerais',     valor_referencia: '30 - 100'    },
  vitamina_b12:             { nome: 'Vitamina B12',               unidade: 'pg/mL',   categoria: 'Vitaminas / Minerais',     valor_referencia: '200 - 900'   },
  acido_folico:             { nome: 'Ácido Fólico',               unidade: 'ng/mL',   categoria: 'Vitaminas / Minerais',     valor_referencia: '2.7 - 17.0'  },
  vitamina_a:               { nome: 'Vitamina A (Retinol)',       unidade: 'µg/dL',   categoria: 'Vitaminas / Minerais',     valor_referencia: '30 - 65'     },
  vitamina_e:               { nome: 'Vitamina E (α-Tocoferol)',   unidade: 'mg/L',    categoria: 'Vitaminas / Minerais',     valor_referencia: '5.5 - 17.0'  },
  vitamina_c:               { nome: 'Vitamina C',                 unidade: 'mg/dL',   categoria: 'Vitaminas / Minerais',     valor_referencia: '0.4 - 2.0'   },
  ferritina:                { nome: 'Ferritina',                  unidade: 'ng/mL',   categoria: 'Vitaminas / Minerais',     valor_referencia: '12 - 300'    },
  ferro:                    { nome: 'Ferro Sérico',               unidade: 'µg/dL',   categoria: 'Vitaminas / Minerais',     valor_referencia: '60 - 180'    },
  saturacao_transferrina:   { nome: 'Saturação de Transferrina',  unidade: '%',       categoria: 'Vitaminas / Minerais',     valor_referencia: '20 - 50'     },
  tibc:                     { nome: 'TIBC',                       unidade: 'µg/dL',   categoria: 'Vitaminas / Minerais',     valor_referencia: '250 - 370'   },
  zinco:                    { nome: 'Zinco',                      unidade: 'µg/dL',   categoria: 'Vitaminas / Minerais',     valor_referencia: '70 - 120'    },
  magnesio:                 { nome: 'Magnésio',                   unidade: 'mg/dL',   categoria: 'Vitaminas / Minerais',     valor_referencia: '1.7 - 2.5'   },
  calcio:                   { nome: 'Cálcio',                     unidade: 'mg/dL',   categoria: 'Vitaminas / Minerais',     valor_referencia: '8.5 - 10.5'  },
  fosforo:                  { nome: 'Fósforo',                    unidade: 'mg/dL',   categoria: 'Vitaminas / Minerais',     valor_referencia: '2.5 - 4.5'   },
  selenio:                  { nome: 'Selênio',                    unidade: 'µg/L',    categoria: 'Vitaminas / Minerais',     valor_referencia: '70 - 150'    },
  cobre:                    { nome: 'Cobre',                      unidade: 'µg/dL',   categoria: 'Vitaminas / Minerais',     valor_referencia: '70 - 140'    },
  // ── Inflamação / Imunologia ───────────────────────────────────────────────
  pcr:                      { nome: 'PCR (Proteína C-Reativa)',   unidade: 'mg/L',    categoria: 'Imunologia / Inflamação',  valor_referencia: '< 3.0'       },
  vhs:                      { nome: 'VHS',                        unidade: 'mm/h',    categoria: 'Imunologia / Inflamação',  valor_referencia: '0 - 15'      },
  fibrinogenio:             { nome: 'Fibrinogênio',               unidade: 'mg/dL',   categoria: 'Imunologia / Inflamação',  valor_referencia: '200 - 400'   },
  // ── Coagulação ───────────────────────────────────────────────────────────
  tp_inr:                   { nome: 'TP / INR',                   unidade: '',        categoria: 'Coagulação',               valor_referencia: '0.8 - 1.2'   },
  ttpa:                     { nome: 'TTPA (relação)',              unidade: '',        categoria: 'Coagulação',               valor_referencia: '0.8 - 1.2'   },
  // ── Proteínas Séricas ─────────────────────────────────────────────────────
  albumina:                 { nome: 'Albumina',                   unidade: 'g/dL',    categoria: 'Proteínas Séricas',        valor_referencia: '3.5 - 5.0'   },
  proteinas_totais:         { nome: 'Proteínas Totais',           unidade: 'g/dL',    categoria: 'Proteínas Séricas',        valor_referencia: '6.0 - 8.0'   },
}

//                           2015    2016    2017    2018    2019    2020    2021    2022    2023    2024
const SERIES = {
  // ── Eritrograma ─────────────────────────────────────────────────────────
  eritrocitos:           ['5.12', '5.08', '5.20', '5.15', '5.02', '4.98', '5.10', '5.05', '4.96', '5.03'],
  hemoglobina:           ['15.8', '15.6', '16.0', '15.7', '15.4', '15.2', '15.5', '15.3', '15.1', '15.4'],
  hematocrito:           ['47.2', '46.8', '47.8', '47.0', '46.2', '45.8', '46.5', '46.0', '45.5', '46.1'],
  vcm:                   ['92',   '92',   '91',   '91',   '92',   '93',   '91',   '92',   '91',   '92'  ],
  hcm:                   ['30.9', '30.7', '30.8', '30.6', '30.8', '30.5', '30.4', '30.6', '30.5', '30.7'],
  chcm:                  ['33.5', '33.4', '33.6', '33.5', '33.4', '33.2', '33.3', '33.4', '33.2', '33.5'],
  rdw:                   ['12.8', '12.9', '12.7', '13.0', '13.1', '13.3', '13.2', '13.4', '13.5', '13.3'],
  // ── Leucograma ──────────────────────────────────────────────────────────
  leucocitos:            ['6.8',  '7.2',  '6.5',  '7.0',  '6.3',  '8.1',  '7.4',  '6.9',  '7.1',  '6.6' ],
  neutrofilos:           ['58',   '60',   '57',   '62',   '55',   '65',   '59',   '61',   '57',   '60'  ],
  linfocitos:            ['31',   '29',   '32',   '28',   '33',   '25',   '30',   '27',   '32',   '29'  ],
  monocitos:             ['7',    '6',    '7',    '6',    '7',    '6',    '7',    '7',    '7',    '7'   ],
  eosinofilos:           ['3',    '4',    '3',    '3',    '4',    '3',    '3',    '4',    '3',    '3'   ],
  basofilos:             ['1',    '1',    '1',    '1',    '1',    '1',    '1',    '1',    '1',    '1'   ],
  // ── Plaquetas ───────────────────────────────────────────────────────────
  plaquetas:             ['248',  '235',  '262',  '241',  '255',  '229',  '244',  '238',  '251',  '246' ],
  // ── Bioquímica ──────────────────────────────────────────────────────────
  glicose:               ['88',   '91',   '90',   '93',   '95',   '97',   '101',  '105',  '108',  '104' ],
  creatinina:            ['0.92', '0.95', '0.90', '0.93', '0.96', '0.94', '0.97', '0.95', '0.98', '0.96'],
  ureia:                 ['32',   '34',   '31',   '35',   '33',   '36',   '38',   '35',   '37',   '36'  ],
  acido_urico:           ['5.2',  '5.4',  '5.1',  '5.6',  '5.8',  '6.0',  '6.5',  '7.0',  '7.5',  '7.3' ],
  // ácido úrico acima de 7.2 em 2022-2024 → alterado (hiperuricemia)
  bilirrubina_total:     ['0.72', '0.68', '0.75', '0.70', '0.71', '0.74', '0.69', '0.73', '0.71', '0.70'],
  bilirrubina_direta:    ['0.18', '0.17', '0.19', '0.17', '0.18', '0.19', '0.17', '0.18', '0.17', '0.18'],
  // ── Enzimas ─────────────────────────────────────────────────────────────
  tgo:                   ['24',   '26',   '23',   '25',   '27',   '48',   '38',   '28',   '26',   '25'  ],
  // TGO acima de 40 em 2020 (48) → alterado
  tgp:                   ['22',   '25',   '21',   '24',   '28',   '62',   '45',   '30',   '26',   '24'  ],
  // TGP acima de 56 em 2020 (62) → alterado
  ggt:                   ['18',   '20',   '17',   '19',   '22',   '55',   '38',   '24',   '21',   '20'  ],
  // GGT acima de 48 em 2020 (55) → alterado
  fosfatase_alcalina:    ['72',   '78',   '68',   '75',   '80',   '88',   '82',   '76',   '74',   '77'  ],
  ldh:                   ['188',  '195',  '182',  '192',  '198',  '248',  '225',  '205',  '196',  '200' ],
  // ── Lipidograma ─────────────────────────────────────────────────────────
  colesterol_total:      ['178',  '183',  '181',  '188',  '192',  '198',  '205',  '218',  '212',  '208' ],
  // acima de 200 de 2021 em diante → alterado
  hdl:                   ['52',   '50',   '54',   '51',   '49',   '48',   '46',   '44',   '43',   '45'  ],
  // HDL caindo (risco se < 40, mas já em tendência ruim)
  ldl:                   ['108',  '113',  '110',  '118',  '124',  '128',  '138',  '148',  '142',  '138' ],
  // LDL acima de 130 de 2021 em diante → alterado
  triglicerideos:        ['92',   '100',  '88',   '108',  '122',  '158',  '172',  '185',  '168',  '152' ],
  // triglicerídeos acima de 150 de 2020 em diante → alterado
  vldl:                  ['18',   '20',   '17',   '21',   '24',   '31',   '34',   '37',   '33',   '30'  ],
  // VLDL acima de 30 de 2020 em diante → alterado
  nao_hdl:               ['126',  '133',  '127',  '137',  '143',  '150',  '159',  '174',  '169',  '163' ],
  // não-HDL acima de 160 em 2022-2023 → alterado
  // ── Glicêmicos ──────────────────────────────────────────────────────────
  hemoglobina_glicada:   ['5.2',  '5.3',  '5.2',  '5.3',  '5.4',  '5.5',  '5.7',  '5.9',  '6.1',  '5.9' ],
  // HbA1c acima de 5.7 de 2021 em diante → pré-diabetes/DM2
  insulina:              ['8.5',  '9.2',  '8.8',  '9.8',  '11.2', '13.5', '14.8', '16.2', '17.5', '16.8'],
  peptideo_c:            ['1.4',  '1.5',  '1.4',  '1.6',  '1.8',  '2.1',  '2.4',  '2.8',  '3.2',  '3.0' ],
  // ── Hormônios ───────────────────────────────────────────────────────────
  tsh:                   ['1.82', '2.10', '1.95', '2.32', '1.78', '2.05', '1.92', '2.18', '2.01', '1.88'],
  t4_livre:              ['1.22', '1.18', '1.25', '1.20', '1.24', '1.19', '1.21', '1.17', '1.23', '1.20'],
  t3_livre:              ['3.2',  '3.1',  '3.3',  '3.0',  '3.2',  '2.9',  '3.0',  '2.8',  '2.9',  '3.0' ],
  testosterone_total:    ['520',  '498',  '475',  '448',  '415',  '378',  '340',  '305',  '278',  '292' ],
  // abaixo de 300 em 2023 (278) → alterado (hipogonadismo borderline)
  testosterone_livre:    ['14.8', '14.0', '13.2', '12.1', '10.8', '9.5',  '8.2',  '6.8',  '5.2',  '5.8' ],
  // tendência de queda; abaixo de 5.0 em 2023 (5.2 borderline)
  dhea_s:                ['398',  '372',  '345',  '318',  '290',  '262',  '235',  '208',  '182',  '195' ],
  // declínio fisiológico com a idade, mas abaixo de 200 em 2023 → atenção
  cortisol:              ['12.5', '13.2', '11.8', '14.1', '13.6', '22.8', '19.8', '15.2', '13.8', '14.1'],
  // cortisol acima de 19.4 em 2020 (22.8) → estresse do isolamento
  igf1:                  ['262',  '248',  '238',  '225',  '210',  '195',  '180',  '165',  '152',  '160' ],
  // declínio progressivo com a idade, dentro do ref mas em queda
  prolactina:            ['8.2',  '7.8',  '9.1',  '8.5',  '10.2', '13.8', '12.5', '9.8',  '8.6',  '9.2' ],
  lh:                    ['3.8',  '3.5',  '4.1',  '4.4',  '4.8',  '5.6',  '6.4',  '7.5',  '9.2',  '8.8' ],
  // LH acima de 8.6 em 2023 (9.2) → compensatório à baixa testosterona
  fsh:                   ['3.2',  '3.0',  '3.5',  '3.8',  '4.2',  '4.8',  '5.5',  '6.2',  '7.1',  '6.8' ],
  estradiol:             ['22',   '24',   '21',   '26',   '28',   '34',   '38',   '43',   '46',   '44'  ],
  // estradiol acima de 40 de 2022 em diante → alterado (aromatização aumentada)
  pth:                   ['88',   '95',   '102',  '75',   '42',   '36',   '40',   '34',   '30',   '32'  ],
  // PTH elevado (> 65) em 2015-2017 quando Vit D estava muito baixa → hiperparatireoidismo secundário
  aldosterona:           ['12',   '14',   '11',   '15',   '13',   '18',   '16',   '14',   '13',   '15'  ],
  // ── Vitaminas / Minerais ────────────────────────────────────────────────
  vitamina_d:            ['14',   '12',   '10',   '18',   '36',   '42',   '38',   '44',   '48',   '45'  ],
  // deficiência grave 2015-2017 (< 20 ng/mL), corrigida com suplementação em 2019
  vitamina_b12:          ['412',  '385',  '368',  '342',  '385',  '295',  '312',  '380',  '405',  '428' ],
  // B12 caindo para 295 em 2020 → borderline baixa
  acido_folico:          ['4.2',  '3.8',  '2.5',  '2.1',  '4.5',  '3.8',  '4.2',  '5.0',  '5.5',  '5.2' ],
  // ácido fólico abaixo de 2.7 em 2017 (2.5) e 2018 (2.1) → alterado
  vitamina_a:            ['42',   '38',   '32',   '28',   '45',   '48',   '44',   '38',   '35',   '40'  ],
  // vitamina A abaixo de 30 em 2018 (28) → alterado
  vitamina_e:            ['9.2',  '8.8',  '8.2',  '7.8',  '9.5',  '10.2', '9.8',  '8.8',  '8.2',  '8.6' ],
  vitamina_c:            ['1.2',  '1.0',  '0.8',  '0.6',  '1.1',  '0.5',  '0.7',  '0.9',  '1.0',  '1.1' ],
  // vitamina C caindo para 0.5 em 2020 → borderline baixa (< 0.4 seria deficiência)
  ferritina:             ['145',  '132',  '158',  '141',  '168',  '125',  '152',  '138',  '161',  '149' ],
  ferro:                 ['98',   '92',   '105',  '96',   '110',  '88',   '102',  '94',   '108',  '100' ],
  saturacao_transferrina:['28',   '26',   '24',   '22',   '30',   '25',   '28',   '24',   '26',   '25'  ],
  tibc:                  ['312',  '328',  '342',  '355',  '298',  '285',  '308',  '325',  '318',  '310' ],
  zinco:                 ['78',   '72',   '65',   '62',   '82',   '75',   '68',   '60',   '65',   '68'  ],
  // zinco abaixo de 70 em 2017 (65), 2018 (62), 2021 (68 borderline), 2022 (60) → alterado
  magnesio:              ['2.0',  '1.9',  '1.8',  '1.6',  '2.1',  '1.9',  '1.7',  '1.6',  '1.5',  '1.7' ],
  // magnésio abaixo de 1.7 em 2018 (1.6), 2022 (1.6), 2023 (1.5) → alterado
  calcio:                ['9.2',  '9.0',  '9.1',  '9.4',  '9.3',  '9.2',  '9.3',  '9.1',  '9.0',  '9.2' ],
  fosforo:               ['3.2',  '3.0',  '3.1',  '3.3',  '3.2',  '3.1',  '3.0',  '2.9',  '2.8',  '3.0' ],
  selenio:               ['58',   '54',   '50',   '48',   '65',   '62',   '55',   '50',   '52',   '56'  ],
  // selênio consistentemente abaixo de 70 → deficiência crônica
  cobre:                 ['92',   '88',   '95',   '85',   '98',   '102',  '95',   '88',   '92',   '96'  ],
  // ── Inflamação ──────────────────────────────────────────────────────────
  pcr:                   ['1.2',  '1.4',  '0.9',  '1.5',  '1.8',  '5.2',  '4.1',  '2.0',  '1.5',  '1.3' ],
  // PCR acima de 3.0 em 2020 (5.2) e 2021 (4.1) → inflamação aguda
  vhs:                   ['8',    '9',    '7',    '10',   '11',   '22',   '18',   '12',   '10',   '9'   ],
  // VHS acima de 15 em 2020 (22) e 2021 (18) → inflamação
  fibrinogenio:          ['285',  '298',  '272',  '305',  '318',  '428',  '385',  '322',  '305',  '295' ],
  // fibrinogênio acima de 400 em 2020 (428) → fase aguda
  // ── Coagulação ──────────────────────────────────────────────────────────
  tp_inr:                ['1.02', '0.98', '1.05', '1.00', '1.03', '1.08', '1.05', '1.02', '1.00', '1.02'],
  ttpa:                  ['0.95', '0.98', '0.92', '1.00', '0.96', '1.02', '0.98', '0.96', '0.94', '0.97'],
  // ── Proteínas Séricas ───────────────────────────────────────────────────
  albumina:              ['4.5',  '4.4',  '4.6',  '4.3',  '4.5',  '4.2',  '4.3',  '4.4',  '4.2',  '4.3' ],
  proteinas_totais:      ['7.2',  '7.0',  '7.3',  '7.1',  '7.2',  '7.0',  '7.1',  '7.2',  '7.0',  '7.1' ],
}

const DATES = [
  '15-03-2015',
  '22-05-2016',
  '10-01-2017',
  '08-07-2018',
  '14-04-2019',
  '02-09-2020',
  '17-02-2021',
  '29-06-2022',
  '11-10-2023',
  '05-03-2024',
]

const mockData = {}
DATES.forEach((date, i) => {
  mockData[date] = {}
  for (const [key, meta] of Object.entries(EXAMS)) {
    mockData[date][key] = { ...meta, valor: SERIES[key][i] }
  }
})

export default mockData
