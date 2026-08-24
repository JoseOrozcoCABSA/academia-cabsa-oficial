from __future__ import annotations

import csv
import json
import os
import re
import unicodedata
from datetime import datetime
from pathlib import Path

import pandas as pd
import pymysql
from dotenv import dotenv_values

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT.parent.parent / "academia_archivos" / "Trabajos Cupone Rifa CABSA"
BACKUPS = ROOT / "database-backups"

GROUP_FILES = [
    ("Becados FOMAQRO", ["Becados FOMAQRO - 2025"], "becadosFOMAQRO.csv"),
    ("FONSTE Andrea", ["Club Fonsnte", "Club FONSTE"], "FONSTEAndrea.csv"),
    ("FOMAQRO", [], "fomaqro.csv"),
    ("Técnica 2", ["Tecnica 2 Sonora", "Técnica 2 Sonora", "Tecnica 2"], "tecnica2.csv"),
    ("Amado Nervo", ["Amado Nervo Primaria"], "amadoNervo.csv"),
    ("Rafael Ramírez", ["Rafeal Ramírez", "Rafael Ramirez"], "rafaelRamirez.csv"),
    ("Centro Escolar Cajeme", [], "centroEscolarCajeme.csv"),
]


def normalized_header(value: object) -> str:
    text = unicodedata.normalize("NFD", str(value or "").strip().lower())
    return re.sub(r"\s+", " ", "".join(char for char in text if unicodedata.category(char) != "Mn").replace("_", " "))


def clean(value: object, maximum: int) -> str:
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return ""
    return str(value).strip()[:maximum]


def email(value: object) -> str:
    return re.sub(r"\s+", "", clean(value, 190).lower())


def code(value: object) -> str:
    text = clean(value, 190).upper().replace("–", "-").replace("—", "-").replace("−", "-")
    return re.sub(r"[^A-Z0-9_-]", "", text)


def rfc(value: object) -> str:
    return re.sub(r"[^A-Z0-9&Ñ]", "", clean(value, 24).upper())


def read_csv_rows(path: Path) -> list[dict[str, str]]:
    for encoding in ("utf-8-sig", "cp1252", "latin1"):
        try:
            with path.open("r", encoding=encoding, newline="") as stream:
                reader = csv.DictReader(stream)
                rows = list(reader)
            break
        except UnicodeDecodeError:
            continue
    else:
        raise RuntimeError(f"No fue posible leer {path.name}")
    result = []
    for number, row in enumerate(rows, start=2):
        mapped = {normalized_header(key): value for key, value in row.items()}
        item = {
            "line": number,
            "email": email(mapped.get("correo") or mapped.get("email")),
            "code": code(mapped.get("codigo beca") or mapped.get("codigo") or mapped.get("clave oficial")),
            "rfc": rfc(mapped.get("rfc")),
            "name": clean(mapped.get("socio") or mapped.get("nombre") or mapped.get("nombre docente"), 255),
            "username": clean(mapped.get("usuario"), 120),
        }
        if any(item[key] for key in ("email", "code", "rfc", "name", "username")):
            result.append(item)
    return result


def chunks(rows: list[tuple], size: int = 500):
    for start in range(0, len(rows), size):
        yield rows[start:start + size]


env = dotenv_values(ROOT / ".env")
connection = pymysql.connect(
    host=env.get("DB_HOST"), port=int(env.get("DB_PORT") or 3306),
    user=env.get("DB_USER"), password=env.get("DB_PASSWORD"),
    database=env.get("DB_NAME"), charset="utf8mb4", autocommit=False,
    cursorclass=pymysql.cursors.DictCursor,
)

report = {"createdAt": datetime.now().isoformat(), "central": {}, "groups": []}
BACKUPS.mkdir(parents=True, exist_ok=True)

try:
    with connection.cursor() as cursor:
        cursor.execute("""CREATE TABLE IF NOT EXISTS usuarios_base_central_importaciones (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,nombre_archivo VARCHAR(255) NOT NULL,
          nombre_hoja VARCHAR(190) NULL,total_filas INT UNSIGNED NOT NULL DEFAULT 0,
          es_vigente TINYINT(1) NOT NULL DEFAULT 1,creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY(id),KEY central_import_current_idx(es_vigente,creado_en)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci""")
        cursor.execute("""CREATE TABLE IF NOT EXISTS usuarios_base_central_filas (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,importacion_id BIGINT UNSIGNED NOT NULL,
          numero_fila INT UNSIGNED NOT NULL,rfc VARCHAR(24) NOT NULL DEFAULT '',
          nombre VARCHAR(255) NOT NULL DEFAULT '',correo VARCHAR(190) NOT NULL DEFAULT '',
          correo_oficial VARCHAR(190) NOT NULL DEFAULT '',codigo VARCHAR(190) NOT NULL DEFAULT '',
          creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(id),
          UNIQUE KEY central_row_import_line_uq(importacion_id,numero_fila),
          KEY central_row_email_idx(importacion_id,correo),KEY central_row_official_email_idx(importacion_id,correo_oficial),
          KEY central_row_rfc_idx(importacion_id,rfc),KEY central_row_code_idx(importacion_id,codigo)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci""")

        central_frame = pd.read_excel(SOURCE / "final.xlsx", sheet_name="final", dtype=str).fillna("")
        central_rows = [(
            index + 2, rfc(row.get("RFC")), clean(row.get("SOCIO"), 255), email(row.get("correo")),
            email(row.get("correo_encontrado_sistema_oficial")), code(row.get("codigo_sistema_oficial")),
        ) for index, row in central_frame.iterrows()]
        central_rows = [row for row in central_rows if any(row[1:])]
        cursor.execute("UPDATE usuarios_base_central_importaciones SET es_vigente=0 WHERE es_vigente=1")
        cursor.execute(
            "INSERT INTO usuarios_base_central_importaciones(nombre_archivo,nombre_hoja,total_filas,es_vigente) VALUES(%s,%s,%s,1)",
            ("final.xlsx", "final", len(central_rows)),
        )
        central_import_id = cursor.lastrowid
        for batch in chunks(central_rows):
            cursor.executemany(
                "INSERT INTO usuarios_base_central_filas(importacion_id,numero_fila,rfc,nombre,correo,correo_oficial,codigo) VALUES(%s,%s,%s,%s,%s,%s,%s)",
                [(central_import_id, *row) for row in batch],
            )
        report["central"] = {"importId": central_import_id, "rows": len(central_rows), "file": "final.xlsx", "sheet": "final"}

        for canonical, aliases, filename in GROUP_FILES:
            candidates = [canonical, *aliases]
            placeholders = ",".join(["%s"] * len(candidates))
            cursor.execute(f"SELECT id,nombre FROM usuarios_grupos WHERE nombre IN ({placeholders}) ORDER BY FIELD(nombre,{placeholders}) LIMIT 1", (*candidates, *candidates))
            group = cursor.fetchone()
            if not group:
                cursor.execute(
                    """INSERT INTO usuarios_grupos(nombre,descripcion,clave_estado,estado,clave_municipio,municipio,creado_en,actualizado_en)
                       VALUES(%s,%s,'','','','',NOW(),NOW())""",
                    (canonical, f"Padrón comparativo importado desde {filename}"),
                )
                group = {"id": cursor.lastrowid, "nombre": canonical}
            elif group["nombre"] != canonical:
                cursor.execute("UPDATE usuarios_grupos SET nombre=%s,actualizado_en=NOW() WHERE id=%s", (canonical, group["id"]))
                group["nombre"] = canonical

            rows = read_csv_rows(SOURCE / filename)
            cursor.execute("UPDATE usuarios_padrones_grupos_importaciones SET es_vigente=0 WHERE grupo_id=%s AND es_vigente=1", (group["id"],))
            cursor.execute(
                """INSERT INTO usuarios_padrones_grupos_importaciones
                   (grupo_id,nombre_archivo,nombre_hoja,nivel_membresia_id,total_filas,es_vigente,creado_en)
                   VALUES(%s,%s,'CSV',6,%s,1,NOW())""",
                (group["id"], filename, len(rows)),
            )
            import_id = cursor.lastrowid
            values = [(import_id, group["id"], row["line"], row["email"], row["code"], row["rfc"], row["name"], row["username"], "{}") for row in rows]
            for batch in chunks(values):
                cursor.executemany(
                    """INSERT INTO usuarios_padrones_grupos_filas
                       (importacion_id,grupo_id,numero_fila,correo,codigo,rfc,nombre,usuario,datos_adicionales)
                       VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
                    batch,
                )
            cursor.execute(
                """INSERT INTO usuarios_padrones_grupos_historial(grupo_id,importacion_id,accion,afectados,detalle,creado_en)
                   VALUES(%s,%s,'INITIAL_IMPORT',%s,%s,NOW())""",
                (group["id"], import_id, len(rows), json.dumps({"fileName": filename, "source": "initial CABSA datasets"})),
            )
            cursor.execute(
                """INSERT INTO usuarios_miembros_grupos(grupo_id,usuario_oficial_id,wp_user_id,agregado_en)
                   SELECT DISTINCT %s,o.id,o.wp_user_id,NOW() FROM usuarios_padrones_grupos_filas r
                   INNER JOIN usuarios_oficiales o ON LOWER(TRIM(o.correo)) COLLATE utf8mb4_unicode_ci=r.correo COLLATE utf8mb4_unicode_ci
                   WHERE r.importacion_id=%s AND r.correo<>''
                   ON DUPLICATE KEY UPDATE agregado_en=VALUES(agregado_en)""",
                (group["id"], import_id),
            )
            official_matches = cursor.rowcount
            cursor.execute(
                """INSERT INTO usuarios_grupos_cuentas(grupo_id,user_id,creado_por_user_id,estado,agregado_en,actualizado_en)
                   SELECT DISTINCT %s,c.id,c.id,'ACTIVE',NOW(),NOW() FROM usuarios_padrones_grupos_filas r
                   INNER JOIN usuarios_cuentas c ON LOWER(TRIM(c.email)) COLLATE utf8mb4_unicode_ci=r.correo COLLATE utf8mb4_unicode_ci
                   WHERE r.importacion_id=%s AND r.correo<>''
                   ON DUPLICATE KEY UPDATE estado='ACTIVE',actualizado_en=NOW()""",
                (group["id"], import_id),
            )
            account_matches = cursor.rowcount
            report["groups"].append({"id": group["id"], "name": group["nombre"], "file": filename, "importId": import_id, "rows": len(rows), "officialMatches": official_matches, "accountMatches": account_matches})

    connection.commit()
except Exception:
    connection.rollback()
    raise
finally:
    connection.close()

stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
(BACKUPS / f"initial-analysis-import-{stamp}.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
print(json.dumps(report, ensure_ascii=False, indent=2))
